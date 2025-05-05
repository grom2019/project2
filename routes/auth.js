// routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
const pool = require('../db');
const sendConfirmationEmail = require('../utils/mailer');
require('dotenv').config();

const router = express.Router();

// ✅ РЕЄСТРАЦІЯ
router.post('/register', async (req, res) => {
  const { username, email, password, token } = req.body;

  try {
    // ✅ CAPTCHA перевірка
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify`, null, {
      params: {
        secret: secretKey,
        response: token,
      },
    });

    if (!response.data.success) {
      return res.status(400).json({ error: 'CAPTCHA verification failed' });
    }

    // 🔍 Перевірка чи користувач вже існує
    const existingUser = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const emailToken = crypto.randomBytes(32).toString('hex');

    // 📝 Додаємо користувача
    await pool.query(
      'INSERT INTO users (username, email, password, email_token, is_verified) VALUES ($1, $2, $3, $4, $5)',
      [username, email, hashed, emailToken, false]
    );

    // 📧 Надсилання підтвердження
    await sendConfirmationEmail(email, emailToken); // ✅ тут передаємо email, а не username

    res.status(201).json({ message: 'Registration successful! Check your email to verify.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error registering user' });
  }
});

// ✅ Верифікація
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email_token=$1', [token]);
    if (result.rows.length === 0) {
      return res.status(400).send('Invalid or expired token');
    }

    await pool.query('UPDATE users SET is_verified=true, email_token=NULL WHERE email_token=$1', [token]);

    res.send('✅ Email successfully verified!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Verification failed');
  }
});

// ✅ Логін
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    if (!user.is_verified) {
      return res.status(400).json({ error: 'Please verify your email before logging in' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
