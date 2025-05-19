const express = require('express');
const multer = require('multer');
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const router = express.Router();

// === Налаштування зберігання файлів ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// === Збереження заявки ===
router.post('/', verifyToken, upload.array('documents'), async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      patronymic,
      birth_date,
      military_unit,
      rank,
      position,
      mos,
      email,
      phone,
      comment,
      agreement,
      command_id,       // очікуємо текст (slug)
      brigade_name,
      vacancy_title
    } = req.body;

    const documentPaths = req.files?.map(file => file.filename) || [];

    const agreementValue = agreement === 'true'; // перетворення рядка в boolean

    await pool.query(`
      INSERT INTO applications (
        user_id, command_id, brigade_name, vacancy_title,
        first_name, last_name, patronymic, birth_date,
        military_unit, rank, position, mos,
        email, phone, comment, agreement, documents
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, $16, $17
      )
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

module.exports = router;
