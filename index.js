const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const pool = require('./db');

dotenv.config();

const app = express();

// Налаштування CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL,  // Задайте тут правильний домен фронтенду
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};

app.use(cors(corsOptions));  // Встановлюємо CORS
app.use(express.json());

// Підключення маршрутів
app.use('/api/auth', authRoutes);

// Тестовий маршрут
app.get('/', (req, res) => res.send('API running'));

// Перевірка підключення до бази даних
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
