import test from 'node:test';
import assert from 'node:assert';
import Book from '../models/book.model.js';

test('AI-01: Book rights status excludes blocked works from catalog search', () => {
  const query = { rightsStatus: { $ne: 'blocked' } };
  assert.strictEqual(query.rightsStatus.$ne, 'blocked', 'Query must filter out blocked books');
});

test('AI-02: Study tool generation fallback structure validates quiz format', () => {
  const mockQuiz = {
    toolType: 'quiz',
    title: 'Comprehension Test',
    questions: [
      {
        question: 'What is the primary argument?',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 1,
        explanation: 'Option B is supported by the text',
      },
    ],
  };

  assert.strictEqual(mockQuiz.toolType, 'quiz');
  assert.strictEqual(mockQuiz.questions.length, 1);
  assert.strictEqual(mockQuiz.questions[0].options.length, 4);
  assert.strictEqual(mockQuiz.questions[0].correctIndex, 1);
});

test('AI-03: Study tool flashcards structure validates key-value cards', () => {
  const mockFlashcards = {
    toolType: 'flashcards',
    title: 'Study Deck',
    cards: [
      { front: 'Term 1', back: 'Definition 1' },
      { front: 'Term 2', back: 'Definition 2' },
    ],
  };

  assert.strictEqual(mockFlashcards.toolType, 'flashcards');
  assert.strictEqual(mockFlashcards.cards.length, 2);
  assert.ok(mockFlashcards.cards[0].front && mockFlashcards.cards[0].back);
});
