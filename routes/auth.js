// === routes/auth.js ===
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
const pool = require('../db');
const sendConfirmationEmail = require('../utils/mailer');
const verifyToken = require('../middleware/verifyToken');
require('dotenv').config();

const router = express.Router();

// Реєстрація
router.post('/register', async (req, res) => {
  const { username, email, password, token } = req.body;

  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const captchaResponse = await axios.post(`https://www.google.com/recaptcha/api/siteverify`, null, {
      params: {
        secret: secretKey,
        response: token,
      },
    });

    if (!captchaResponse.data.success) {
      return res.status(400).json({ error: 'CAPTCHA verification failed' });
    }

    const existingUser = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const emailToken = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      'INSERT INTO users (username, email, password, email_token, is_verified) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [username, email, hashedPassword, emailToken, true]
    );

    const userId = result.rows[0].id;
    await sendConfirmationEmail(email, emailToken);

    setTimeout(async () => {
      try {
        await pool.query('UPDATE users SET is_verified=true WHERE id=$1', [userId]);
        console.log(`User ${username} has been verified after delay.`);
      } catch (err) {
        console.error('Error verifying user after delay:', err);
      }
    }, 10000);

    res.status(201).json({ message: 'Registration successful! Check your email to verify.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error registering user' });
  }
});

// Логін
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    if (!user.is_verified) {
      return res.status(400).json({ error: 'Please verify your email before logging in' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Перевірка профілю (protected route)
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [req.userId]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user.rows[0]);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Could not fetch profile' });
  }
});

module.exports = router;