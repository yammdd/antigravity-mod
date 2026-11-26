'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');

const MIME_MAP = Object.freeze({
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
  '.ogg': 'video/ogg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
});

class LocalMediaServer {
  constructor() {
    this.server = null;
    this.port = 0;
    this.token = crypto.randomBytes(16).toString('hex');
    this.registry = new Map(); // id -> absolute path
  }

  register(id, filePath) {
    if (!id || !filePath) return null;
    this.registry.set(String(id), path.resolve(filePath));
    return this.getUrl(id);
  }

  unregister(id) {
    this.registry.delete(String(id));
  }

  getUrl(id) {
    if (!this.port || !id) return '';
    return `http://127.0.0.1:${this.port}/media/${this.token}/${encodeURIComponent(String(id))}`;
  }

  start() {
    return new Promise((resolve, reject) => {
      if (this.server) {
        resolve(this.port);
        return;
      }

      this.server = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('X-Content-Type-Options', 'nosniff');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405);
          res.end('Method not allowed');
          return;
        }

        const parsed = new URL(req.url || '/', 'http://127.0.0.1');
        const match = parsed.pathname.match(/^\/media\/([a-f0-9]{32})\/([^/]+)$/);
        if (!match || match[1] !== this.token) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        const mediaId = decodeURIComponent(match[2]);
        const filePath = this.registry.get(mediaId);
        if (!filePath || !fs.existsSync(filePath)) {
          res.writeHead(404);
          res.end('Media not found');
          return;
        }

        let stat;
        try {
          stat = fs.statSync(filePath);
        } catch (_) {
          res.writeHead(500);
          res.end('Stat error');
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_MAP[ext] || 'application/octet-stream';
        const total = stat.size;
        const range = req.headers.range;

        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
          if (Number.isNaN(start) || start >= total || end >= total || start > end) {
            res.writeHead(416, { 'Content-Range': `bytes */${total}` });
            res.end();
            return;
          }
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
          });
          if (req.method === 'HEAD') {
            res.end();
            return;
          }
          const stream = fs.createReadStream(filePath, { start, end });
          stream.on('error', () => {
            if (!res.headersSent) res.writeHead(500);
            res.end();
          });
          stream.pipe(res);
          return;
        }

        res.writeHead(200, {
          'Content-Length': total,
          'Accept-Ranges': 'bytes',
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
        });
        if (req.method === 'HEAD') {
          res.end();
          return;
        }
        const stream = fs.createReadStream(filePath);
        stream.on('error', () => {
          if (!res.headersSent) res.writeHead(500);
          res.end();
        });
        stream.pipe(res);
      });

      this.server.on('error', reject);
      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server.address();
        this.port = addr && typeof addr === 'object' ? addr.port : 0;
        resolve(this.port);
      });
    });
  }

  stop() {
    if (!this.server) return;
    try {
      this.server.close();
    } catch (_) {}
    this.server = null;
    this.port = 0;
  }
}

module.exports = { LocalMediaServer, MIME_MAP };
