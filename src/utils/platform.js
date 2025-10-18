// Allowed platforms + helper validation
const validator = require('validator');

const ALLOWED_PLATFORMS = [
  'GitHub',
  'LinkedIn',
  'Instagram',
  'Twitter',
  'Website',
  'Portfolio',
  'Facebook',
  'YouTube'
];

function isPlatformAllowed(name) {
  return ALLOWED_PLATFORMS.includes(name);
}

function isValidUrlForPlatform(platform, url) {
  if (!validator.isURL(url, { require_protocol: true })) return false;
  // simple platform-specific checks (non-exhaustive)
  const lower = url.toLowerCase();
  switch (platform) {
    case 'GitHub':
      return /github\.com\/[A-Za-z0-9_-]+/.test(lower);
    case 'LinkedIn':
      return /linkedin\.com\/in\/|linkedin\.com\/pub\//.test(lower);
    case 'Instagram':
      return /instagram\.com\/[A-Za-z0-9_.]+/.test(lower);
    case 'Twitter':
      return /twitter\.com\/[A-Za-z0-9_]+/.test(lower);
    case 'YouTube':
      return /youtube\.com\/(channel|user|c)\/|youtu\.be\//.test(lower);
    case 'Website':
    case 'Portfolio':
    case 'Facebook':
      return true; // accept general URLs for these
    default:
      return false;
  }
}

module.exports = { ALLOWED_PLATFORMS, isPlatformAllowed, isValidUrlForPlatform };
