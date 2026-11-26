'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * Zero-dependency, cross-platform ZIP archiver & safe extractor for shareable Theme Packs.
 * Uses Node.js built-in zlib (DEFLATE / STORE) with strict zip-slip path traversal protection.
 */

const MAX_FILES = 128;
const MAX_SINGLE_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 64 * 1024 * 1024;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function collectFilesRecursive(rootDir, baseDir = rootDir, out = []) {
  for (const ent of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (ent.name === '.DS_Store' || ent.name === 'Thumbs.db') continue;
    const abs = path.join(rootDir, ent.name);
    if (ent.isDirectory()) {
      collectFilesRecursive(abs, baseDir, out);
    } else if (ent.isFile()) {
      const rel = path.relative(baseDir, abs).replace(/\\/g, '/');
      out.push({ rel, abs });
    }
  }
  return out;
}

/**
 * Creates a standard ZIP archive buffer from a directory.
 */
function createZipBufferFromDir(dirPath) {
  const files = collectFilesRecursive(path.resolve(dirPath));
  if (files.length > MAX_FILES) {
    throw new Error(`Theme Pack exceeds maximum file count (${MAX_FILES}).`);
  }

  const localParts = [];
  const centralParts = [];
  let offset = 0;
  let totalRaw = 0;

  for (const item of files) {
    const raw = fs.readFileSync(item.abs);
    if (raw.length > MAX_SINGLE_FILE_BYTES) {
      throw new Error(`File "${item.rel}" exceeds 25 MB limit.`);
    }
    totalRaw += raw.length;
    if (totalRaw > MAX_TOTAL_BYTES) {
      throw new Error('Theme Pack exceeds 64 MB uncompressed limit.');
    }

    const nameBuf = Buffer.from(item.rel, 'utf8');
    const crc = crc32(raw);

    // Already-compressed media formats store cleanly without wasting CPU
    const ext = path.extname(item.rel).toLowerCase();
    const skipDeflate = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.mp4', '.woff2'].includes(ext);
    const deflated = skipDeflate ? raw : zlib.deflateRawSync(raw, { level: 6 });
    const useDeflate = !skipDeflate && deflated.length < raw.length;
    const body = useDeflate ? deflated : raw;
    const method = useDeflate ? 8 : 0;

    // Local file header (30 bytes + name)
    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(20, 4); // version needed
    lfh.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    lfh.writeUInt16LE(method, 8);
    lfh.writeUInt16LE(0, 10);
    lfh.writeUInt16LE(0, 12);
    lfh.writeUInt32LE(crc, 14);
    lfh.writeUInt32LE(body.length, 18);
    lfh.writeUInt32LE(raw.length, 22);
    lfh.writeUInt16LE(nameBuf.length, 26);
    lfh.writeUInt16LE(0, 28);

    localParts.push(lfh, nameBuf, body);

    // Central directory header (46 bytes + name)
    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(0x02014b50, 0);
    cdh.writeUInt16LE(20, 4);
    cdh.writeUInt16LE(20, 6);
    cdh.writeUInt16LE(0x0800, 8);
    cdh.writeUInt16LE(method, 10);
    cdh.writeUInt16LE(0, 12);
    cdh.writeUInt16LE(0, 14);
    cdh.writeUInt32LE(crc, 16);
    cdh.writeUInt32LE(body.length, 20);
    cdh.writeUInt32LE(raw.length, 24);
    cdh.writeUInt16LE(nameBuf.length, 28);
    cdh.writeUInt16LE(0, 30);
    cdh.writeUInt16LE(0, 32);
    cdh.writeUInt16LE(0, 34);
    cdh.writeUInt16LE(0, 36);
    cdh.writeUInt32LE(0, 38);
    cdh.writeUInt32LE(offset, 42);

    centralParts.push(cdh, nameBuf);
    offset += lfh.length + nameBuf.length + body.length;
  }

  const centralBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralBuf, eocd]);
}

function createZipFromDir(dirPath, outZipPath) {
  const buf = createZipBufferFromDir(dirPath);
  fs.mkdirSync(path.dirname(path.resolve(outZipPath)), { recursive: true });
  fs.writeFileSync(outZipPath, buf);
  return { ok: true, filePath: outZipPath, bytes: buf.length };
}

/**
 * Safely extracts a ZIP file into destDir with strict zip-slip & size guards.
 * Supports both flat archives (theme.json at root) and single-top-folder archives (<slug>/theme.json).
 */
function extractZipSafe(zipPath, destDir) {
  const buf = fs.readFileSync(zipPath);
  if (buf.length < 22) throw new Error('Invalid ZIP archive.');

  // Locate End of Central Directory (EOCD)
  let eocdPos = -1;
  const minPos = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= minPos; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdPos = i;
      break;
    }
  }
  if (eocdPos < 0) throw new Error('ZIP central directory not found.');

  const entryCount = buf.readUInt16LE(eocdPos + 10);
  const cdOffset = buf.readUInt32LE(eocdPos + 16);
  if (entryCount > MAX_FILES) {
    throw new Error(`Archive contains too many entries (limit: ${MAX_FILES}).`);
  }

  const entries = [];
  let ptr = cdOffset;
  for (let i = 0; i < entryCount; i++) {
    if (ptr + 46 > buf.length || buf.readUInt32LE(ptr) !== 0x02014b50) {
      throw new Error('Corrupt ZIP central directory entry.');
    }
    const method = buf.readUInt16LE(ptr + 10);
    const expectedCrc = buf.readUInt32LE(ptr + 16);
    const compSize = buf.readUInt32LE(ptr + 20);
    const uncompSize = buf.readUInt32LE(ptr + 24);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localHeaderOffset = buf.readUInt32LE(ptr + 42);
    const rawName = buf.subarray(ptr + 46, ptr + 46 + nameLen).toString('utf8');
    ptr += 46 + nameLen + extraLen + commentLen;

    const normalized = rawName.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized || normalized.endsWith('/')) continue;
    if (
      normalized.includes('..') ||
      /^[a-zA-Z]:/.test(normalized) ||
      normalized.includes('\0')
    ) {
      throw new Error(`Unsafe archive path rejected: ${rawName}`);
    }
    if (uncompSize > MAX_SINGLE_FILE_BYTES) {
      throw new Error(`Entry "${normalized}" exceeds 25 MB limit.`);
    }

    entries.push({
      name: normalized,
      method,
      expectedCrc,
      compSize,
      uncompSize,
      localHeaderOffset,
    });
  }

  // Strip common single top-level folder prefix if theme.json sits one level down
  let stripPrefix = '';
  const hasRootManifest = entries.some((e) => e.name.toLowerCase() === 'theme.json');
  if (!hasRootManifest && entries.length > 0) {
    const firstParts = entries[0].name.split('/');
    if (firstParts.length > 1) {
      const candidate = `${firstParts[0]}/`;
      if (entries.every((e) => e.name.startsWith(candidate))) {
        stripPrefix = candidate;
      }
    }
  }

  const rootAbs = path.resolve(destDir);
  fs.mkdirSync(rootAbs, { recursive: true });

  let totalWritten = 0;
  const writtenFiles = [];

  for (const e of entries) {
    const rel = stripPrefix ? e.name.slice(stripPrefix.length) : e.name;
    if (!rel || rel.includes('..')) continue;
    const outPath = path.resolve(rootAbs, rel);
    if (!outPath.startsWith(rootAbs + path.sep) && outPath !== rootAbs) {
      throw new Error(`Path traversal rejected: ${e.name}`);
    }

    const lh = e.localHeaderOffset;
    if (lh + 30 > buf.length || buf.readUInt32LE(lh) !== 0x04034b50) {
      throw new Error('Corrupt ZIP local file header.');
    }
    const lhNameLen = buf.readUInt16LE(lh + 26);
    const lhExtraLen = buf.readUInt16LE(lh + 28);
    const dataStart = lh + 30 + lhNameLen + lhExtraLen;
    const dataEnd = dataStart + e.compSize;
    if (dataEnd > buf.length) throw new Error('Truncated ZIP entry data.');

    const compData = buf.subarray(dataStart, dataEnd);
    let rawData;
    if (e.method === 0) {
      rawData = compData;
    } else if (e.method === 8) {
      rawData = zlib.inflateRawSync(compData, { maxOutputLength: MAX_SINGLE_FILE_BYTES });
    } else {
      throw new Error(`Unsupported ZIP compression method (${e.method}).`);
    }

    if (crc32(rawData) !== e.expectedCrc) {
      throw new Error(`Checksum mismatch in archive entry: ${rel}`);
    }

    totalWritten += rawData.length;
    if (totalWritten > MAX_TOTAL_BYTES) {
      throw new Error('Archive exceeds 64 MB extracted size limit.');
    }

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, rawData);
    writtenFiles.push(rel);
  }

  return { ok: true, files: writtenFiles };
}

module.exports = {
  createZipBufferFromDir,
  createZipFromDir,
  extractZipSafe,
};
