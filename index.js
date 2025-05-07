
// === server.js ===
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const pool = require('./db');

dotenv.config();
const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => res.send('API running'));

pool.query('SELECT NOW()', (err, resDb) => {
  if (err) {
    console.error('❌ Error connecting to the database:', err.stack);
  } else {
    console.log('✅ Connected to the database at:', resDb.rows[0].now);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});