const express = require('express');
const Artist = require('../models/Artist');

const router = express.Router();

// Get artist public profile
router.get('/profile/:id', async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id)
      .select('-password -email')
      .populate({
        path: 'artworks',
        match: { isPublished: true },
        options: { sort: { createdAt: -1 } }
      });

    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    res.json(artist);
  } catch (error) {
    console.error('Fetch artist profile error:', error);
    res.status(500).json({ message: 'Server error fetching artist profile' });
  }
});

// Get artist by email/username (for portfolio URL)
router.get('/by-email/:email', async (req, res) => {
  try {
    const artist = await Artist.findOne({ email: req.params.email })
      .select('-password');

    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    res.json(artist);
  } catch (error) {
    console.error('Fetch artist by email error:', error);
    res.status(500).json({ message: 'Server error fetching artist' });
  }
});

module.exports = router;