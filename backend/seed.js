import mongoose from 'mongoose';
import Book from "./models/book.model.js";
import { freeBooks, paidBooks } from "./config/booksCatalog.js";

/**
 * Seeds or updates the enterprise catalog of books.
 * Uses upsert by name to preserve MongoDB _id references (critical for existing orders and cart items).
 */
export const seedCatalog = async () => {
  try {
    const allBooks = [...freeBooks, ...paidBooks];
    console.log(`[Catalog] Starting upsert of ${allBooks.length} books (${freeBooks.length} free, ${paidBooks.length} paid)...`);

    let upsertedCount = 0;
    for (const book of allBooks) {
      await Book.findOneAndUpdate(
        { name: book.name },
        { $set: book },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      upsertedCount++;
    }

    const totalInDb = await Book.countDocuments();
    const freeCount = await Book.countDocuments({ price: 0 });
    const paidCount = await Book.countDocuments({ price: { $gt: 0 } });

    console.log(`[Catalog] Successfully seeded catalog!`);
    console.log(`[Catalog] Total Books: ${totalInDb} | Free Books: ${freeCount} | Paid Books: ${paidCount}`);

    return { total: totalInDb, free: freeCount, paid: paidCount };
  } catch (error) {
    console.error("[Catalog] Error seeding catalog:", error.message);
    throw error;
  }
};

/**
 * Backward-compatible function called at server startup in index.js.
 * Only seeds if the current database catalog is incomplete (< 150 books) or forced.
 */
export const seedBooksFromAPI = async (force = false) => {
  try {
    const existingCount = await Book.countDocuments();
    if (existingCount >= 150 && !force) {
      console.log(`[Catalog] Found ${existingCount} books in database. Catalog is already fully populated.`);
      return;
    }

    console.log(`[Catalog] Current book count is ${existingCount}. Populating full catalog of 160 books...`);
    await seedCatalog();
  } catch (error) {
    console.error("[Catalog] Error during seed check:", error.message);
  }
};

// Allow direct execution: `node --import ./polyfill.js seed.js`
if (process.argv[1] && (process.argv[1].endsWith('seed.js') || process.argv[1].includes('seed.js'))) {
  const mongoUri = process.env.MongoDBURI || 'mongodb://127.0.0.1:27017/bookstore';
  console.log(`[Seed CLI] Connecting to MongoDB: ${mongoUri}...`);
  mongoose.connect(mongoUri)
    .then(async () => {
      console.log('[Seed CLI] Connected. Executing catalog seed...');
      await seedCatalog();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed CLI] Connection or execution error:', err.message);
      process.exit(1);
    });
}
