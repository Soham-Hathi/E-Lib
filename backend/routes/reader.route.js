import express from 'express';
import {
  getProgress,
  saveProgress,
  addAnnotation,
  getUserLibrary,
  getBookContent,
  toggleBookmark,
} from '../controllers/reader.controller.js';
import { authMiddleware } from '../Authenticate/AdminMiddleWare.js';

const router = express.Router();

router.get('/content/:bookId', getBookContent);
router.get('/progress/:bookId', authMiddleware, getProgress);
router.post('/progress', authMiddleware, saveProgress);
router.post('/annotation', authMiddleware, addAnnotation);
router.post('/bookmark', authMiddleware, toggleBookmark);
router.get('/library', authMiddleware, getUserLibrary);

export default router;

