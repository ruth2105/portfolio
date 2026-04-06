const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Artist = require('../models/Artist');
const auth = require('../middleware/auth');

const router = express.Router();

// Register new artist
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if artist already exists
    const existingArtist = await Artist.findOne({ email });
    if (existingArtist) {
      return res.status(400).json({ message: 'Artist already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new artist
    const artist = new Artist({
      name,
      email,
      password: hashedPassword
    });

    await artist.save();

    // Generate JWT token
    const token = jwt.sign(
      { artistId: artist._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Artist registered successfully',
      token,
      artist: {
        id: artist._id,
        name: artist.name,
        email: artist.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login artist
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find artist
    const artist = await Artist.findOne({ email });
    if (!artist) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, artist.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { artistId: artist._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      artist: {
        id: artist._id,
        name: artist.name,
        email: artist.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current artist profile
router.get('/profile', auth, async (req, res) => {
  try {
    const artist = await Artist.findById(req.artistId).select('-password');
    res.json(artist);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Update artist profile
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password; // Don't allow password updates through this route
    delete updates.email; // Don't allow email updates through this route

    const artist = await Artist.findByIdAndUpdate(
      req.artistId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      artist
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

module.exports = router;