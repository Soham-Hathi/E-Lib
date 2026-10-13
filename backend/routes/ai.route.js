import express from 'express';
import {
  chatWithAI,
  summarizeBook,
  generateStudyTool,
  chatWithBook,
} from '../controllers/ai.controller.js';

const router = express.Router();

router.post('/chat', chatWithAI);
router.post('/chat-with-book', chatWithBook);
router.post('/summarize', summarizeBook);
router.post('/study-tools', generateStudyTool);

export default router;

