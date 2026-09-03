const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: 'User'
  },
  role: {
    type: String,
    enum: ['tech', 'marketing'],
    required: true,
    default: 'tech'
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
