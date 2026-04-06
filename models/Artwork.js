const mongoose = require('mongoose');

const artworkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  medium: {
    type: String,
    required: true
  },
  dimensions: {
    type: String,
    default: ''
  },
  year: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['painting', 'drawing', 'sculpture', 'photography', 'printmaking', 'mixed-media', 'other'],
    default: 'painting'
  },
  tags: [{
    type: String,
    trim: true
  }],
  image: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String
  },
  price: {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    isForSale: { type: Boolean, default: false }
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  },
  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist',
    required: true
  }
}, {
  timestamps: true
});

// Index for better search performance
artworkSchema.index({ title: 'text', description: 'text', tags: 'text' });
artworkSchema.index({ category: 1, isPublished: 1 });
artworkSchema.index({ artist: 1, isPublished: 1 });

module.exports = mongoose.model('Artwork', artworkSchema);