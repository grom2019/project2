const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const authRoutes = require('./routes/auth');
const applicationsRoutes = require('./routes/applications');
const pool = require('./db');

dotenv.config();
const { FRONTEND_URL, PORT = 5000 } = process.env;

const app = express();

app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // статичні файли (документи)

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationsRoutes);

app.get('/', (req, res) => res.send('API running'));

pool.query('SELECT NOW()', (err, { rows }) => {
  if (err) {
    console.error('❌ Error connecting to the database:', err.stack);
  } else {
    console.log('✅ Connected to the database at:', rows[0].now);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
