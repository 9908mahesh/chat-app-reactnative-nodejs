const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');


router.get('/', auth, async (req, res) => {
const users = await User.find({ _id: { $ne: req.user._id } }).select('-passwordHash');
res.json(users);
});


module.exports = router;
