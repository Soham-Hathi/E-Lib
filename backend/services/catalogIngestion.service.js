import Book from '../models/book.model.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ingest verified public-domain literature from Gutendex (Project Gutenberg)
 * @param {Object} options
 * @param {string} options.topic - Topic or category query (e.g. 'fiction', 'philosophy', 'science')
 * @param {number} options.limit - Max number of books to ingest (default 10)
 */
export const ingestFromGutendex = async ({ topic = 'fiction', limit = 10 } = {}) => {
  const results = { ingested: 0, skipped: 0, failed: 0, items: [] };

  try {
    console.log(`[Ingestion] Querying Gutendex for public domain works on topic "${topic}"...`);
    const response = await fetch(`https://gutendex.com/books/?topic=${encodeURIComponent(topic)}`);

    if (!response.ok) {
      throw new Error(`Gutendex API responded with status ${response.status}`);
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      console.log(`[Ingestion] No books returned for topic "${topic}".`);
      return results;
    }

    const booksToProcess = data.results.slice(0, limit);

    for (const item of booksToProcess) {
      try {
        const sourceId = `gutenberg_${item.id}`;
        
        // Deduplication: check if book already exists by sourceId or title
        const existing = await Book.findOne({
          $or: [{ sourceId }, { name: item.title }],
        });

        if (existing) {
          results.skipped += 1;
          continue;
        }

        // Formats extraction
        const formats = item.formats || {};
        const epubUrl = formats['application/epub+zip'] || '';
        const htmlUrl = formats['text/html'] || formats['text/html; charset=utf-8'] || '';
        const txtUrl = formats['text/plain; charset=utf-8'] || formats['text/plain'] || '';
        const coverImage = formats['image/jpeg'] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400';

        // Author extraction
        const authors = (item.authors || []).map((a) => a.name);
        const category = item.subjects && item.subjects.length > 0 ? item.subjects[0].split(' -- ')[0] : topic;

        const newBook = new Book({
          name: item.title,
          authors: authors.length > 0 ? authors : ['Unknown Author'],
          price: 0, // Public domain works are free
          category: category.substring(0, 50),
          image: coverImage,
          description: `A classic work by ${authors.join(', ') || 'Unknown Author'}, part of the public domain collection.`,
          rightsStatus: 'verified_public_domain',
          license: 'Project Gutenberg License / Public Domain',
          sourceProvider: 'gutenberg',
          sourceId,
          sourceUrl: `https://www.gutenberg.org/ebooks/${item.id}`,
          bookUrl: htmlUrl || txtUrl,
          formats: {
            epub: epubUrl,
            pdf: '',
            text: txtUrl,
          },
          language: item.languages && item.languages.length > 0 ? item.languages[0] : 'en',
          isPro: false,
        });

        await newBook.save();
        results.ingested += 1;
        results.items.push({ id: newBook._id, name: newBook.name });
        
        // Polite delay between DB writes
        await delay(100);
      } catch (itemError) {
        console.warn(`[Ingestion] Failed to import item ${item.id}:`, itemError.message);
        results.failed += 1;
      }
    }

    console.log(`[Ingestion] Completed topic "${topic}". Ingested: ${results.ingested}, Skipped (duplicate): ${results.skipped}`);
    return results;
  } catch (err) {
    console.error(`[Ingestion Error]:`, err.message);
    throw err;
  }
};
