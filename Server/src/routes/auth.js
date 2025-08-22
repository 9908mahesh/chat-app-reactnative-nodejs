const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');


router.post('/register', async (req, res) => {
const { name, email, password } = req.body;
if (!name || !email || !password) return res.status(400).json({ error: 'missing fields' });


const exists = await User.findOne({ email });
if (exists) return res.status(400).json({ error: 'email exists' });


const hash = await bcrypt.hash(password, 10);
const user = await User.create({ name, email, passwordHash: hash });
const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
});


router.post('/login', async (req, res) => {
const { email, password } = req.body;
const user = await User.findOne({ email });
if (!user) return res.status(400).json({ error: 'invalid creds' });
const ok = await bcrypt.compare(password, user.passwordHash);
if (!ok) return res.status(400).json({ error: 'invalid creds' });
const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
});


module.exports = router;
