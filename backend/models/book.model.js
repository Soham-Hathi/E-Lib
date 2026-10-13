import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  authors: {
    type: [String],
    default: [],
    index: true,
  },
  price: {
    type: Number,
    default: 0,
    index: true,
  },
  category: {
    type: String,
    default: 'General',
    index: true,
  },
  image: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  // Rights & Legal Licensing Fields
  rightsStatus: {
    type: String,
    enum: [
      'verified_public_domain',
      'verified_open_license',
      'external_preview_only',
      'external_borrowing_only',
      'rights_pending',
      'blocked',
    ],
    default: 'verified_public_domain',
    index: true,
  },
  license: {
    type: String,
    default: 'Public Domain',
  },
  licenseUrl: {
    type: String,
    default: '',
  },
  sourceProvider: {
    type: String,
    enum: ['gutenberg', 'openlibrary', 'googlebooks', 'custom_upload', 'fallback'],
    default: 'googlebooks',
    index: true,
  },
  sourceId: {
    type: String,
    index: true,
  },
  sourceUrl: {
    type: String,
    default: '',
  },
  bookUrl: {
    type: String,
    default: '',
  },
  // Digital format download/streaming links
  formats: {
    epub: { type: String, default: '' },
    pdf: { type: String, default: '' },
    text: { type: String, default: '' },
  },
  language: {
    type: String,
    default: 'en',
    index: true,
  },
  readingLevel: {
    type: String,
    default: 'All Levels',
  },
  isPro: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Text index for fast multi-field searching
bookSchema.index({ name: 'text', description: 'text', category: 'text' });

const Book = mongoose.model('Book', bookSchema);

export default Book;