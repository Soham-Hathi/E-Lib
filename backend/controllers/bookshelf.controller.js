import Bookshelf from '../models/bookshelf.model.js';
import Book from '../models/book.model.js';

/**
 * Get all books saved in current user's bookshelf
 */
export const getUserBookshelf = async (req, res) => {
  try {
    const userId = req.user._id;
    const { shelf } = req.query;

    const query = { userId };
    if (shelf) {
      query.shelf = shelf;
    }

    const items = await Bookshelf.find(query)
      .populate('bookId')
      .sort({ updatedAt: -1 });

    const formatted = items
      .filter((item) => item.bookId) // exclude dangling refs
      .map((item) => ({
        _id: item._id,
        book: item.bookId,
        shelf: item.shelf,
        notes: item.notes,
        updatedAt: item.updatedAt,
      }));

    res.status(200).json({ bookshelf: formatted });
  } catch (error) {
    console.error('Error fetching bookshelf:', error);
    res.status(500).json({ message: 'Error retrieving bookshelf', error: error.message });
  }
};

/**
 * Add or update a book in user's bookshelf
 */
export const updateBookshelf = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bookId, shelf = 'want_to_read', notes = '' } = req.body;

    if (!bookId) {
      return res.status(400).json({ message: 'bookId is required' });
    }

    const validShelves = ['currently_reading', 'want_to_read', 'completed', 'wishlist', 'favorites'];
    if (!validShelves.includes(shelf)) {
      return res.status(400).json({ message: `Invalid shelf category. Allowed: ${validShelves.join(', ')}` });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const item = await Bookshelf.findOneAndUpdate(
      { userId, bookId },
      {
        $set: {
          shelf,
          notes: notes.trim(),
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    ).populate('bookId');

    res.status(200).json({ message: `Saved to ${shelf.replace('_', ' ')}`, item });
  } catch (error) {
    console.error('Error updating bookshelf:', error);
    res.status(500).json({ message: 'Error updating bookshelf', error: error.message });
  }
};

/**
 * Remove a book from user's bookshelf
 */
export const removeFromBookshelf = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bookId } = req.params;

    await Bookshelf.findOneAndDelete({ userId, bookId });
    res.status(200).json({ message: 'Removed from bookshelf' });
  } catch (error) {
    console.error('Error removing from bookshelf:', error);
    res.status(500).json({ message: 'Error removing from bookshelf', error: error.message });
  }
};

/**
 * Check if a book is already on user's shelf
 */
export const checkShelfStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bookId } = req.params;

    const item = await Bookshelf.findOne({ userId, bookId });
    res.status(200).json({
      inShelf: Boolean(item),
      shelf: item ? item.shelf : null,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking shelf status', error: error.message });
  }
};
