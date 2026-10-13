import mongoose from 'mongoose';

const annotationSchema = new mongoose.Schema({
  cfi: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    default: '',
  },
  note: {
    type: String,
    default: '',
  },
  color: {
    type: String,
    default: '#fef08a', // default yellow highlight
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const bookmarkSchema = new mongoose.Schema({
  cfi: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: 'Bookmark',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const readerProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
    index: true,
  },
  cfi: {
    type: String,
    default: '', // epub CFI or section identifier
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  annotations: [annotationSchema],
  bookmarks: [bookmarkSchema],
  lastReadAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure a user has only one progress document per book
readerProgressSchema.index({ userId: 1, bookId: 1 }, { unique: true });

const ReaderProgress = mongoose.model('ReaderProgress', readerProgressSchema);

export default ReaderProgress;
