import express from 'express';
import {
  getBookReviews,
  addOrUpdateReview,
  deleteReview,
} from '../controllers/review.controller.js';
import { authMiddleware } from '../Authenticate/AdminMiddleWare.js';

const router = express.Router();

router.get('/:bookId', getBookReviews);
router.post('/:bookId', authMiddleware, addOrUpdateReview);
router.delete('/:reviewId', authMiddleware, deleteReview);

export default router;
