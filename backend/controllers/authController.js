const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Ensure JWT_SECRET is available or provide a default for local dev
const JWT_SECRET = process.env.JWT_SECRET || 'webiox_super_secret_key_123!';

// Setup default admin user or update password
const setupDefaultUser = async () => {
  try {
    const hashedPassword = await bcrypt.hash('webiox@07', 10);
    const existingAdmin = await User.findOne({ email: 'admin@webiox.tech' });
    
    if (!existingAdmin) {
      await User.create({
        email: 'admin@webiox.tech',
        password: hashedPassword,
        name: 'Admin User'
      });
      console.log('Default admin user created: admin@webiox.tech');
    } else {
      // Force update password to new default just in case it was created with old one
      existingAdmin.password = hashedPassword;
      await existingAdmin.save();
    }
  } catch (err) {
    console.error('Failed to setup default user:', err);
  }
};

const login = async (req, res) => {
  await setupDefaultUser(); // Ensure default user exists

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    // 1. Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 2. Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 3. Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  login,
  getMe,
  setupDefaultUser
};
