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

// Функція для відправки помилок
const sendError = (res, status, message) => res.status(status).json({ error: message });

// === РЕЄСТРАЦІЯ ===
router.post('/register', async (req, res) => {
  const { username, email, password, token } = req.body;

  try {
    const captchaResponse = await axios.post(`https://www.google.com/recaptcha/api/siteverify`, null, {
      params: { secret: process.env.RECAPTCHA_SECRET_KEY, response: token },
    });

    if (!captchaResponse.data.success) return sendError(res, 400, 'CAPTCHA verification failed');

    const { rows } = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    if (rows.length) return sendError(res, 400, 'User already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    const emailToken = crypto.randomBytes(32).toString('hex');
    const { rows: newUser } = await pool.query(
      'INSERT INTO users (username, email, password, email_token, is_verified) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [username, email, hashedPassword, emailToken, true]
    );

    await sendConfirmationEmail(email, emailToken);

    // Затримка для перевірки через 10 секунд
    setTimeout(async () => {
      await pool.query('UPDATE users SET is_verified=true WHERE id=$1', [newUser[0].id]);
    }, 10000);

    res.status(201).json({ message: 'Registration successful! Check your email to verify.' });
  } catch (err) {
    console.error(err);
    sendError(res, 500, 'Error registering user');
  }
});

// === ВХІД ===
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    if (!rows.length) return sendError(res, 400, 'User not found');

    const user = rows[0];
    if (!await bcrypt.compare(password, user.password)) return sendError(res, 400, 'Invalid password');
    if (!user.is_verified) return sendError(res, 400, 'Please verify your email before logging in');

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (err) {
    console.error('Login failed:', err);
    sendError(res, 500, 'Login failed');
  }
});

// === ПЕРЕГЛЯД ПРОФІЛЮ ===
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, username, email, first_name, last_name, patronymic, birth_date,
              military_unit, rank, position, mos, avatar_url
       FROM users WHERE id=$1`,
      [req.userId]
    );
    if (!rows.length) return sendError(res, 404, 'User not found');
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Profile error:', err);
    sendError(res, 500, 'Could not fetch profile');
  }
});

// === ОНОВЛЕННЯ ПРОФІЛЮ ===
router.put('/profile', verifyToken, async (req, res) => {
  const {
    first_name,
    last_name,
    patronymic,
    birth_date,
    military_unit,
    rank,
    position,
    mos,
    avatar_url
  } = req.body;

  try {
    const query = `
      UPDATE users SET 
        first_name=$1,
        last_name=$2,
        patronymic=$3,
        birth_date=$4,
        military_unit=$5,
        rank=$6,
        position=$7,
        mos=$8,
        avatar_url=$9
      WHERE id=$10 RETURNING *`;

    const values = [
      first_name,
      last_name,
      patronymic,
      birth_date,
      military_unit,
      rank,
      position,
      mos,
      avatar_url,
      req.userId
    ];

    const { rows } = await pool.query(query, values);

    res.status(200).json({ message: 'Profile updated', user: rows[0] });
  } catch (err) {
    console.error('Update profile error:', err);
    sendError(res, 500, 'Failed to update profile');
  }
});

module.exports = router;
