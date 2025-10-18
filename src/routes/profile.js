const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const auth = require('../middleware/auth');
const { isPlatformAllowed, isValidUrlForPlatform, ALLOWED_PLATFORMS } = require('../utils/platform');
const validator = require('validator');

// public profile by username
router.get('/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const profile = await prisma.profile.findUnique({
      where: { username },
      include: { socialLinks: true, user: true }
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // only public info
    res.json({
      username: profile.username,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      themeColor: profile.themeColor,
      socialLinks: profile.socialLinks.map(s => ({ platform: s.platform, url: s.url }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// get my profile
router.get('/me', auth, async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user.id }, include: { socialLinks: true }});
    if (!profile) return res.json({ profile: null });
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// create or update profile
router.post('/', auth, async (req, res) => {
  const { username, bio, avatarUrl, themeColor } = req.body;

  if (req.user.status !== 'approved') return res.status(403).json({ error: 'User is not approved' });
  if (!username) return res.status(400).json({ error: 'username required' });
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'username must be 3-20 chars lower-case letters, numbers or underscore' });
  if (themeColor && !/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(themeColor)) return res.status(400).json({ error: 'themeColor must be a hex color like #1a73e8' });

  try {
    // ensure username unique (allow if it's user's own)
    const existing = await prisma.profile.findUnique({ where: { username }});
    if (existing && existing.userId !== req.user.id) return res.status(400).json({ error: 'username already taken' });

    const profile = await prisma.profile.upsert({
      where: { userId: req.user.id },
      update: {
        username,
        bio,
        avatarUrl,
        themeColor
      },
      create: {
        userId: req.user.id,
        username,
        bio,
        avatarUrl,
        themeColor
      }
    });

    res.json({ profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// add or update social links for authenticated user's profile
router.post('/links', auth, async (req, res) => {
  const { links } = req.body; // expect [{ platform, url }, ...]
  if (!Array.isArray(links)) return res.status(400).json({ error: 'links must be an array' });
  if (req.user.status !== 'approved') return res.status(403).json({ error: 'User is not approved' });

  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user.id }});
    if (!profile) return res.status(400).json({ error: 'Create profile first' });

    const results = [];
    for (const link of links) {
      const { platform, url } = link;
      if (!platform || !url) {
        results.push({ platform, url, ok: false, error: 'platform and url required' });
        continue;
      }
      if (!isPlatformAllowed(platform)) {
        results.push({ platform, url, ok: false, error: 'Platform not allowed', allowed: ALLOWED_PLATFORMS });
        continue;
      }
      if (!isValidUrlForPlatform(platform, url)) {
        results.push({ platform, url, ok: false, error: 'URL not valid for platform' });
        continue;
      }

      // upsert the link (simple approach: delete existing with same platform then create)
      await prisma.socialLink.deleteMany({ where: { profileId: profile.id, platform }});
      const created = await prisma.socialLink.create({
        data: { profileId: profile.id, platform, url }
      });
      results.push({ platform, url, ok: true, id: created.id });
    }

    // return full updated list
    const updated = await prisma.socialLink.findMany({ where: { profileId: profile.id }});
    res.json({ results, socialLinks: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
