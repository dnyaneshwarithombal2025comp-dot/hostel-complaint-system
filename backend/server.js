const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Use environment variable for JWT secret (add it in Vercel dashboard)
const JWT_SECRET = process.env.JWT_SECRET || 'secretkey123'; // fallback for local dev

// ... (all your routes remain exactly the same, but replace 'secretkey123' with JWT_SECRET)

// For example:
// jwt.sign(..., JWT_SECRET, ...)
// jwt.verify(token, JWT_SECRET)

// ✅ CHANGE 1: Remove app.listen() and replace with export for Vercel
// Only listen when running locally (not on Vercel)
if (process.env.VERCEL) {
  // On Vercel, we just export the app
  module.exports = app;
} else {
  // Local development
  const PORT = process.env.PORT || 5002;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}