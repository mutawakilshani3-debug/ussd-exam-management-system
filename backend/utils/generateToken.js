const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function generateAccessToken(userId, role) {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

module.exports = { generateAccessToken, generateRefreshToken };
