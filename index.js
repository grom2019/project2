const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const pool = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Підключення маршрутів
app.use('/api/auth', authRoutes);

// Тестовий маршрут
app.get('/', (req, res) => res.send('API running'));

// Перевірка підключення до бази
pool.query('SELECT NOW()', (err, resDb) => {
  if (err) {
    console.error('❌ Error connecting to the database:', err.stack);
  } else {
    console.log('✅ Connected to the database at:', resDb.rows[0].now);
  }
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
