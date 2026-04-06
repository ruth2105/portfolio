const mongoose = require('mongoose');

const artistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  bio: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  socialMedia: {
    instagram: { type: String, default: '' },
    facebook: { type: String, default: '' },
    twitter: { type: String, default: '' },
    behance: { type: String, default: '' }
  },
  profileImage: {
    type: String,
    default: ''
  },
  education: [{
    degree: String,
    institution: String,
    year: String
  }],
  exhibitions: [{
    title: String,
    venue: String,
    year: String,
    type: { type: String, enum: ['solo', 'group'], default: 'group' }
  }],
  awards: [{
    title: String,
    organization: String,
    year: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Artist', artistSchema);