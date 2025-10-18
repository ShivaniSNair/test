const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// register — creates user with 'pending' status
router.post('/register', async (req, res) => {
  const { name, email, reg_no, year, domain } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });

  const ref_code = (domain || 'KRAFTERS').slice(0,6).toUpperCase() + Math.floor(1000 + Math.random()*9000);

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already used' });

    const user = await prisma.user.create({
      data: {
        name,
        email,
        reg_no,
        year,
        domain,
        ref_code,
        status: 'pending',
        role: 'member'
      }
    });

    // In a real app: send email to admin with ref_code. Here we return ref_code for testing.
    res.json({ message: 'Registered. Await admin approval.', ref_code, userId: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.status !== 'approved') return res.status(403).json({ error: 'Account not approved' });

    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
