const express = require('express');
const multer = require('multer');
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const router = express.Router();

// === Налаштування multer ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// === Додати заявку ===
router.post('/', verifyToken, upload.array('documents'), async (req, res) => {
  try {
    const {
      first_name, last_name, patronymic, birth_date,
      military_unit, rank, position, mos,
      email, phone, comment, agreement,
      command_id, brigade_name, vacancy_title
    } = req.body;

    const documentPaths = req.files ? req.files.map(file => file.filename) : [];
    const agreementValue = agreement === 'true';

    await pool.query(`
      INSERT INTO applications (
        user_id, command_id, brigade_name, vacancy_title,
        first_name, last_name, patronymic, birth_date,
        military_unit, rank, position, mos,
        email, phone, comment, agreement, documents
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    `, [
      req.userId, command_id, brigade_name, vacancy_title,
      first_name, last_name, patronymic, birth_date,
      military_unit, rank, position, mos,
      email, phone, comment, agreementValue, documentPaths
    ]);

    res.status(201).json({ message: 'Заявка успішно надіслана' });
  } catch (err) {
    console.error('❌ Помилка збереження заявки:', err);
    res.status(500).json({ error: 'Помилка збереження заявки' });
  }
});

// === Отримати всі заявки (тільки для адміна) ===
router.get('/', verifyToken, async (req, res) => {
  try {
    const { rows: userRows } = await pool.query('SELECT role FROM users WHERE id=$1', [req.userId]);
    if (!userRows.length || userRows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Доступ заборонено' });
    }

    const { rows } = await pool.query('SELECT * FROM applications ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Помилка отримання заявок' });
  }
});

// === Оновити заявку ===
router.put('/:id', verifyToken, async (req, res) => {
  const id = req.params.id;
  const { comment, vacancy_title, brigade_name, rank, position } = req.body;

  try {
    const { rows: userRows } = await pool.query('SELECT role FROM users WHERE id=$1', [req.userId]);
    if (!userRows.length || userRows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Доступ заборонено' });
    }

    const { rows } = await pool.query(`
      UPDATE applications SET
        comment=$1, vacancy_title=$2, brigade_name=$3, rank=$4, position=$5
      WHERE id=$6 RETURNING *
    `, [comment, vacancy_title, brigade_name, rank, position, id]);

    res.json({ message: 'Заявку оновлено', application: rows[0] });
  } catch (err) {
    console.error('❌ Помилка оновлення заявки:', err);
    res.status(500).json({ error: 'Помилка оновлення заявки' });
  }
});

// === Видалити заявку ===
router.delete('/:id', verifyToken, async (req, res) => {
  const id = req.params.id;

  try {
    const { rows: userRows } = await pool.query('SELECT role FROM users WHERE id=$1', [req.userId]);
    if (!userRows.length || userRows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Доступ заборонено' });
    }

    await pool.query('DELETE FROM applications WHERE id=$1', [id]);
    res.json({ message: 'Заявку видалено' });
  } catch (err) {
    console.error('❌ Помилка видалення заявки:', err);
    res.status(500).json({ error: 'Помилка видалення заявки' });
  }
});

// === Отримати статистику заявок по бригадах (доступно всім) ===
router.get('/stats/brigades', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT brigade_name, COUNT(*) AS application_count
      FROM applications
      GROUP BY brigade_name
      ORDER BY application_count DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error('❌ Помилка отримання статистики:', err);
    res.status(500).json({ error: 'Помилка отримання статистики' });
  }
});

module.exports = router;
