import express from 'express';
import { deleteBook, getBook, getOneBook, updateBook, uploadBook, discoverBooks } from '../controllers/book.controller.js';
import { isAdminMiddleware } from '../Authenticate/AdminMiddleWare.js';
// import {isAdmin} from '../Authenticate/AdminMiddleWare.js';
import upload from '../config/multer.js';
import { ingestFromGutendex } from '../services/catalogIngestion.service.js';

const router = express.Router();

router.get('/discover', discoverBooks);
router.get('/getbook', getBook);
router.get('/getonebook/:id', getOneBook);
// Protect route with middleware BEFORE triggering file upload storage
router.post('/uploadbook', isAdminMiddleware, upload.single('image'), uploadBook);
router.put('/updatebook/:id', isAdminMiddleware, updateBook);
router.delete('/deletebook/:id', isAdminMiddleware, deleteBook);

// Admin-controlled verified catalog ingestion
router.post('/ingest', isAdminMiddleware, async (req, res) => {
  try {
    const { topic = 'fiction', limit = 10 } = req.body;
    const result = await ingestFromGutendex({ topic, limit: Math.min(25, Number(limit) || 10) });
    res.status(200).json({ message: "Ingestion completed successfully", ...result });
  } catch (error) {
    res.status(500).json({ message: "Ingestion failed", error: error.message });
  }
});

export default router;