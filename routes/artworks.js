const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const Artwork = require('../models/Artwork');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'uploads/artworks';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'artwork-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all published artworks (public route)
router.get('/public', async (req, res) => {
  try {
    const { category, featured, limit = 20, page = 1 } = req.query;
    
    const filter = { isPublished: true };
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (featured === 'true') {
      filter.isFeatured = true;
    }

    const artworks = await Artwork.find(filter)
      .populate('artist', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Artwork.countDocuments(filter);

    res.json({
      artworks,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Fetch artworks error:', error);
    res.status(500).json({ message: 'Server error fetching artworks' });
  }
});

// Get single artwork (public route)
router.get('/public/:id', async (req, res) => {
  try {
    const artwork = await Artwork.findOneAndUpdate(
      { _id: req.params.id, isPublished: true },
      { $inc: { viewCount: 1 } },
      { new: true }
    ).populate('artist', 'name bio socialMedia');

    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    res.json(artwork);
  } catch (error) {
    console.error('Fetch artwork error:', error);
    res.status(500).json({ message: 'Server error fetching artwork' });
  }
});

// Get artist's artworks (protected route)
router.get('/', auth, async (req, res) => {
  try {
    const { category, published, limit = 20, page = 1 } = req.query;
    
    const filter = { artist: req.artistId };
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (published !== undefined) {
      filter.isPublished = published === 'true';
    }

    const artworks = await Artwork.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Artwork.countDocuments(filter);

    res.json({
      artworks,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Fetch artworks error:', error);
    res.status(500).json({ message: 'Server error fetching artworks' });
  }
});

// Create new artwork (protected route)
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }

    // Process image with Sharp
    const processedImagePath = `uploads/artworks/processed-${req.file.filename}`;
    await sharp(req.file.path)
      .resize(1200, 1200, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toFile(processedImagePath);

    // Delete original file
    await fs.unlink(req.file.path);

    const artworkData = {
      ...req.body,
      artist: req.artistId,
      image: {
        filename: `processed-${req.file.filename}`,
        originalName: req.file.originalname,
        path: processedImagePath,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    };

    // Parse tags if they're sent as a string
    if (typeof artworkData.tags === 'string') {
      artworkData.tags = artworkData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    const artwork = new Artwork(artworkData);
    await artwork.save();

    res.status(201).json({
      message: 'Artwork created successfully',
      artwork
    });
  } catch (error) {
    console.error('Create artwork error:', error);
    res.status(500).json({ message: 'Server error creating artwork' });
  }
});

// Update artwork (protected route)
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const artwork = await Artwork.findOne({ _id: req.params.id, artist: req.artistId });
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    const updates = { ...req.body };

    // Handle new image upload
    if (req.file) {
      // Delete old image
      if (artwork.image && artwork.image.path) {
        try {
          await fs.unlink(artwork.image.path);
        } catch (error) {
          console.log('Old image file not found:', error.message);
        }
      }

      // Process new image
      const processedImagePath = `uploads/artworks/processed-${req.file.filename}`;
      await sharp(req.file.path)
        .resize(1200, 1200, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 85 })
        .toFile(processedImagePath);

      // Delete original file
      await fs.unlink(req.file.path);

      updates.image = {
        filename: `processed-${req.file.filename}`,
        originalName: req.file.originalname,
        path: processedImagePath,
        size: req.file.size,
        mimetype: req.file.mimetype
      };
    }

    // Parse tags if they're sent as a string
    if (typeof updates.tags === 'string') {
      updates.tags = updates.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    const updatedArtwork = await Artwork.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Artwork updated successfully',
      artwork: updatedArtwork
    });
  } catch (error) {
    console.error('Update artwork error:', error);
    res.status(500).json({ message: 'Server error updating artwork' });
  }
});

// Delete artwork (protected route)
router.delete('/:id', auth, async (req, res) => {
  try {
    const artwork = await Artwork.findOne({ _id: req.params.id, artist: req.artistId });
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    // Delete image file
    if (artwork.image && artwork.image.path) {
      try {
        await fs.unlink(artwork.image.path);
      } catch (error) {
        console.log('Image file not found:', error.message);
      }
    }

    await Artwork.findByIdAndDelete(req.params.id);

    res.json({ message: 'Artwork deleted successfully' });
  } catch (error) {
    console.error('Delete artwork error:', error);
    res.status(500).json({ message: 'Server error deleting artwork' });
  }
});

module.exports = router;