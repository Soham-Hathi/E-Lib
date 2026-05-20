import express from 'express';
import { chatWithAI, summarizeBook } from '../controllers/ai.controller.js';

const router = express.Router();

router.post('/chat', chatWithAI);
router.post('/summarize', summarizeBook);

export default router;
