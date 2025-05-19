const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    console.warn('❌ No Authorization header');
    return res.status(403).json({ error: 'Access denied. No token provided.' });
  }

  // Очікуємо формат: "Bearer <token>"
  if (!authHeader.startsWith('Bearer ')) {
    console.warn('❌ Authorization header is malformed');
    return res.status(403).json({ error: 'Access denied. Malformed token.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.warn('❌ Token missing after Bearer');
    return res.status(403).json({ error: 'Access denied. Token missing.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role; // Додаємо роль для подальшої авторизації
    next();
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

module.exports = verifyToken;
