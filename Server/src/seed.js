require('dotenv').config();
const { connect } = require('./db');
const User = require('./models/User');
const bcrypt = require('bcrypt');

async function seed() {
  await connect(process.env.MONGO_URI);
  await User.deleteMany({});
  const users = [
    { name: 'Alice', email: 'alice@example.com', password: 'password123' },
    { name: 'Bob', email: 'bob@example.com', password: 'password123' }
  ];
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await User.create({ name: u.name, email: u.email, passwordHash: hash });
  }
  console.log('Seed done');
  process.exit(0);
}
seed();
