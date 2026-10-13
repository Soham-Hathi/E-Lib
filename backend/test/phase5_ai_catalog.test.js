import test, { describe, before, after } from 'node:test';
import assert from 'node:assert';
import { Buffer } from 'node:buffer';
if (typeof globalThis.SlowBuffer === 'undefined') {
  globalThis.SlowBuffer = Buffer;
}

import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Book from '../models/book.model.js';
import { searchCatalog, chatWithAI, summarizeBook } from '../controllers/ai.controller.js';

let mongoServer;
let testApp;
let server;
let baseUrl;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  testApp = express();
  testApp.use(express.json());
  testApp.post('/ai/chat', chatWithAI);
  testApp.post('/ai/summarize', summarizeBook);

  await new Promise((resolve) => {
    server = testApp.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  // Seed sample books for catalog search
  await Book.create([
    {
      name: 'Python Data Science Handbook',
      category: 'Technology',
      authors: ['Jake VanderPlas'],
      price: 399,
      description: 'Essential guide for data manipulation and analysis in Python.',
      rightsStatus: 'verified_open_license',
    },
    {
      name: 'The Great Gatsby',
      category: 'Fiction',
      authors: ['F. Scott Fitzgerald'],
      price: 0,
      description: 'Classic American novel exploring wealth, love, and ambition in the 1920s.',
      rightsStatus: 'verified_public_domain',
    },
    {
      name: 'Restricted Copyrighted Work',
      category: 'Restricted',
      authors: ['Unknown'],
      price: 999,
      description: 'A blocked manuscript with pending rights.',
      rightsStatus: 'blocked',
    },
  ]);
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Phase 5: AI & Catalog Search Grounding Tests', () => {
  test('AI-CAT-01: searchCatalog filters out blocked works and matches keyword terms', async () => {
    const { books } = await searchCatalog('python data science');
    assert.strictEqual(books.length, 1);
    assert.strictEqual(books[0].name, 'Python Data Science Handbook');

    // Ensure blocked book is never returned
    const blockedCheck = books.some((b) => b.rightsStatus === 'blocked');
    assert.strictEqual(blockedCheck, false);
  });

  test('AI-CAT-02: searchCatalog handles free queries properly', async () => {
    const { books } = await searchCatalog('free public domain books');
    assert.ok(books.length >= 1);
    const freeBook = books.find((b) => b.name === 'The Great Gatsby');
    assert.ok(freeBook, 'Great Gatsby must be returned for free query');
  });

  test('AI-CAT-03: Chat endpoint handles user greetings with catalog guidance and recommendations', async () => {
    const res = await fetch(`${baseUrl}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello! Can you help me?' }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.reply.includes('AI Study Assistant') || data.reply.includes('Hello'));
    assert.ok(Array.isArray(data.citedBooks));
    assert.ok(data.citedBooks.length > 0);
  });

  test('AI-CAT-04: Chat endpoint grounds search queries in local catalog without crashing or leaking keys', async () => {
    const res = await fetch(`${baseUrl}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Do you have any books on Python?' }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.reply.includes('Python Data Science Handbook'));
    assert.ok(Array.isArray(data.citedBooks));
    const pythonCitation = data.citedBooks.find((b) => b.name === 'Python Data Science Handbook');
    assert.ok(pythonCitation, 'Should cite Python book');
    // Ensure sensitive strings are not leaked
    assert.strictEqual(data.reply.includes('GEMINI_API_KEY'), false);
    assert.strictEqual(data.reply.includes('undefined'), false);
  });

  test('AI-CAT-05: Book summary returns educational summary in fallback mode', async () => {
    const res = await fetch(`${baseUrl}/ai/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'The Great Gatsby',
        description: 'Classic American novel exploring wealth, love, and ambition in the 1920s.',
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.summary.includes('The Great Gatsby'));
  });
});
