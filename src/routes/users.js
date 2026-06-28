const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pgPool: pool } = require('../lib/db');

(async () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      mobileno VARCHAR(20) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
  try {
    await pool.query(schema);
  } catch (err) {
    console.error('Postgres Init Error:', err.message);
  }
})();

router.post('/signup', async (req, res) => {
  const { username, mobileno, password } = req.body;
  if (!username || !mobileno || !password) return res.status(400).json({ error: "Required fields missing" });
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, mobileno, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [username, mobileno, hash]
    );
    res.status(201).json({ success: true, userId: result.rows[0].id });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: "Username or Phone number is already taken." });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ userId: user.id }, 'your_secret_key', { expiresIn: '2h' });
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
