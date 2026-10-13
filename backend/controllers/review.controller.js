import Review from '../models/review.model.js';
import Order from '../models/order.model.js';
import Book from '../models/book.model.js';

/**
 * Fetch reviews and aggregated rating stats for a specific book
 */
export const getBookReviews = async (req, res) => {
  try {
    const { bookId } = req.params;

    if (!bookId) {
      return res.status(400).json({ message: 'bookId is required' });
    }

    const reviews = await Review.find({ bookId }).sort({ createdAt: -1 });

    const totalReviews = reviews.length;
    let averageRating = 0;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (totalReviews > 0) {
      const sum = reviews.reduce((acc, rev) => {
        const r = Math.min(5, Math.max(1, Math.round(rev.rating)));
        distribution[r] = (distribution[r] || 0) + 1;
        return acc + rev.rating;
      }, 0);
      averageRating = Number((sum / totalReviews).toFixed(1));
    }

    res.status(200).json({
      reviews,
      stats: {
        averageRating,
        totalReviews,
        distribution,
      },
    });
  } catch (error) {
    console.error('Error fetching book reviews:', error);
    res.status(500).json({ message: 'Error retrieving reviews', error: error.message });
  }
};

/**
 * Submit or update a user review for a book
 */
export const addOrUpdateReview = async (req, res) => {
  try {
    const userId = req.user._id;
    const userName = req.user.fullname || 'Reader';
    const userEmail = req.user.email;
    const bookId = req.params.bookId || req.body.bookId;
    const { rating, title = '', comment } = req.body;

    if (!bookId) {
      return res.status(400).json({ message: 'bookId is required' });
    }

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: 'Rating must be a number between 1 and 5' });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: 'Review comment cannot be empty' });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Check if user is a verified buyer (has a non-cancelled completed order for this book)
    const order = await Order.findOne({
      userID: userId,
      productID: bookId,
      isCancelled: { $ne: true },
    });
    const isVerifiedBuyer = Boolean(order || book.price === 0);

    const review = await Review.findOneAndUpdate(
      { userId, bookId },
      {
        $set: {
          userName,
          userEmail,
          rating: numRating,
          title: title.trim(),
          comment: comment.trim(),
          isVerifiedBuyer,
          createdAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      message: 'Review submitted successfully',
      review,
    });
  } catch (error) {
    console.error('Error saving review:', error);
    res.status(500).json({ message: 'Error saving review', error: error.message });
  }
};

/**
 * Delete a user review
 */
export const deleteReview = async (req, res) => {
  try {
    const userId = req.user._id;
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Allow author or admin to delete
    if (review.userId.toString() !== userId.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to delete this review' });
    }

    await Review.findByIdAndDelete(reviewId);
    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Error deleting review', error: error.message });
  }
};
