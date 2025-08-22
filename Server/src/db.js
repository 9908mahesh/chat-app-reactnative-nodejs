const mongoose = require('mongoose');

async function connect(uri) {
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}

module.exports = { connect };
