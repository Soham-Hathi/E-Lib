import express from 'express';
import {
  getUserBookshelf,
  updateBookshelf,
  removeFromBookshelf,
  checkShelfStatus,
} from '../controllers/bookshelf.controller.js';
import { authMiddleware } from '../Authenticate/AdminMiddleWare.js';

const router = express.Router();

router.get('/', authMiddleware, getUserBookshelf);
router.post('/', authMiddleware, updateBookshelf);
router.get('/status/:bookId', authMiddleware, checkShelfStatus);
router.delete('/:bookId', authMiddleware, removeFromBookshelf);

export default router;
