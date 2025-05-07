// === server.js ===
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const pool = require('./db');

dotenv.config();
const { FRONTEND_URL, PORT = 5000 } = process.env;  // Деструктуризація для зручності
const app = express();

app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => res.send('API running'));

// Підключення до бази даних
pool.query('SELECT NOW()', (err, { rows }) => {
  if (err) {
    console.error('❌ Error connecting to the database:', err.stack);
  } else {
    console.log('✅ Connected to the database at:', rows[0].now);
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
