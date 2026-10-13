import mongoose from 'mongoose';

const bookshelfSchema = new mongoose.Schema({
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
  shelf: {
    type: String,
    enum: ['currently_reading', 'want_to_read', 'completed', 'wishlist', 'favorites'],
    default: 'want_to_read',
    index: true,
  },
  notes: {
    type: String,
    default: '',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// A book can appear in a user's collection uniquely
bookshelfSchema.index({ userId: 1, bookId: 1 }, { unique: true });

const Bookshelf = mongoose.model('Bookshelf', bookshelfSchema);

export default Bookshelf;
