'use strict';

const REPO_OWNER = 'yammdd';
const REPO_NAME = 'antigravity-mod';
const LATEST_RELEASE_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
const RELEASES_PAGE_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`;

function parseSemver(tag) {
  const m = String(tag || '').trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return [0, 0, 0];
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  }
  return 0;
}

async function checkForUpdates(currentVersion) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(LATEST_RELEASE_API, {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': `antigravity-themes/${currentVersion || '1.0.0'}`,
      },
    });
    if (!res.ok) {
      return {
        ok: false,
        currentVersion,
        error: `GitHub API returned HTTP ${res.status}`,
        releasesUrl: RELEASES_PAGE_URL,
      };
    }
    const data = await res.json();
    const latestTag = String(data.tag_name || '').trim();
    const latestVersion = latestTag.replace(/^v/i, '') || currentVersion;
    const updateAvailable = compareSemver(latestVersion, currentVersion) > 0;
    const exeAsset = Array.isArray(data.assets)
      ? data.assets.find((a) => /\.exe$|\.dmg$|\.AppImage$/i.test(a.name || ''))
      : null;

    return {
      ok: true,
      currentVersion,
      latestVersion,
      latestTag,
      updateAvailable,
      releaseUrl: data.html_url || RELEASES_PAGE_URL,
      downloadUrl: exeAsset?.browser_download_url || data.html_url || RELEASES_PAGE_URL,
      publishedAt: data.published_at || '',
      name: data.name || latestTag,
    };
  } catch (err) {
    return {
      ok: false,
      currentVersion,
      error: err.name === 'AbortError' ? 'Update check timed out' : err.message,
      releasesUrl: RELEASES_PAGE_URL,
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  parseSemver,
  compareSemver,
  checkForUpdates,
  RELEASES_PAGE_URL,
};
