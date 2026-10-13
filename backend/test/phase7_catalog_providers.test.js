import test from 'node:test';
import assert from 'node:assert/strict';
import { unifiedSearch } from '../services/bookProviders.service.js';

// Preserve real fetch
const originalFetch = globalThis.fetch;

const mockGutendexResponse = {
  count: 1,
  results: [
    {
      id: 84,
      title: 'Frankenstein; or, the modern prometheus',
      authors: [{ name: 'Mary Wollstonecraft Shelley', birth_year: 1797, death_year: 1851 }],
      subjects: ['Science fiction', 'Monsters -- Fiction', 'Gothic fiction'],
      languages: ['en'],
      formats: {
        'application/epub+zip': 'https://www.gutenberg.org/ebooks/84.epub.images',
        'text/html': 'https://www.gutenberg.org/files/84/84-h/84-h.htm',
        'image/jpeg': 'https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg',
      },
    },
  ],
};

test.beforeEach(() => {
  globalThis.fetch = async (url) => {
    return {
      ok: true,
      status: 200,
      json: async () => mockGutendexResponse,
    };
  };
});

test.after(() => {
  globalThis.fetch = originalFetch;
});

test('CAT-01: unifiedSearch returns normalized structure with required fields', async () => {
  const result = await unifiedSearch({ query: 'Frankenstein-test', provider: 'gutendex', limit: 2 });
  assert.ok(result, 'Result should exist');
  assert.equal(typeof result.total, 'number');
  assert.ok(Array.isArray(result.items), 'items should be an array');
  assert.ok(result.items.length > 0, 'Should find at least 1 book');

  const book = result.items[0];
  assert.equal(book.source, 'gutendex');
  assert.equal(book.sourceId, 'gutenberg_84');
  assert.equal(book.title, 'Frankenstein; or, the modern prometheus');
  assert.deepEqual(book.authors, ['Mary Wollstonecraft Shelley']);
  assert.equal(book.rightsStatus, 'verified_public_domain');
  assert.equal(book.accessType, 'free_download');
  assert.equal(book.price, 0);
  assert.equal(book.currency, 'INR');
  assert.equal(book.sourceUrl, 'https://www.gutenberg.org/ebooks/84');
  assert.equal(book.downloadUrl, 'https://www.gutenberg.org/ebooks/84.epub.images');
});

test('CAT-02: unifiedSearch caches results in-memory on subsequent queries', async () => {
  const query = 'Hamlet-cache-test';
  const first = await unifiedSearch({ query, provider: 'gutendex', limit: 1 });
  assert.ok(first.items.length > 0);

  const second = await unifiedSearch({ query, provider: 'gutendex', limit: 1 });
  assert.equal(second.cached, true, 'Second call should be served from memory cache');
  assert.equal(second.items[0].title, first.items[0].title);
});

test('CAT-03: Empty search query returns safe empty payload without crashing', async () => {
  const res = await unifiedSearch({ query: '   ' });
  assert.equal(res.total, 0);
  assert.deepEqual(res.items, []);
});

test('CAT-04: Filter parameter restricts results appropriately', async () => {
  const freeRes = await unifiedSearch({ query: 'Physics-test', provider: 'gutendex', filter: 'free', limit: 3 });
  for (const item of freeRes.items) {
    assert.ok(item.price === 0 || item.accessType === 'free_download' || item.accessType === 'open_access');
  }
});

test('CAT-05: Normalized items obey required enterprise schema', async () => {
  const res = await unifiedSearch({ query: 'Austen-test', provider: 'gutendex', limit: 1 });
  assert.ok(res.items.length > 0);
  const item = res.items[0];

  const validRights = ['verified_public_domain', 'verified_open_license', 'external_preview_only', 'rights_pending', 'unknown'];
  assert.ok(validRights.includes(item.rightsStatus), `rightsStatus ${item.rightsStatus} must be valid`);

  const validAccess = ['free_download', 'preview_only', 'external_purchase', 'open_access', 'metadata_only'];
  assert.ok(validAccess.includes(item.accessType), `accessType ${item.accessType} must be valid`);
});
