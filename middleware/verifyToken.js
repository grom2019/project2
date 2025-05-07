// === middleware/verifyToken.js ===
const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    console.warn('❌ No Authorization header');
    return res.status(403).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.warn('❌ Malformed Authorization header');
    return res.status(403).json({ error: 'Access denied. Malformed token.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

module.exports = verifyToken;
