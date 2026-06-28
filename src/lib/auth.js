const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const verified = jwt.verify(token, 'your_secret_key');
    req.userId = verified.userId;
    next();
  } catch (err) {
    res.status(403).json({ success: false, error: 'Invalid token' });
  }
};

module.exports = { authenticate };
