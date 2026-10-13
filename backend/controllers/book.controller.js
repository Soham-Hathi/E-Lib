import Book from '../models/book.model.js';

// Get all books from database with search, category filter, and rights enforcement
export const getBook = async (req, res) => {
    try {
        const { search, category, isPro, rightsStatus, paginated, page = 1, limit, freeOnly, paidOnly } = req.query;

        // Never serve blocked works
        const query = { rightsStatus: { $ne: 'blocked' } };

        if (freeOnly === 'true') {
            query.price = 0;
        } else if (paidOnly === 'true') {
            query.price = { $gt: 0 };
        }

        if (category && category !== 'All') {
            query.category = new RegExp(`^${category}$`, 'i');
        }

        if (rightsStatus) {
            query.rightsStatus = rightsStatus;
        }

        if (isPro !== undefined) {
            query.isPro = isPro === 'true';
        }

        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            query.$or = [
                { name: searchRegex },
                { description: searchRegex },
                { category: searchRegex },
                { authors: searchRegex },
            ];
        }

        if (paginated === 'true') {
            const pageNum = Math.max(1, parseInt(page, 10));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit || 50, 10)));
            const skip = (pageNum - 1) * limitNum;

            const [books, total] = await Promise.all([
                Book.find(query).skip(skip).limit(limitNum).sort({ createdAt: -1 }),
                Book.countDocuments(query),
            ]);

            return res.status(200).json({
                books,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    pages: Math.ceil(total / limitNum),
                },
            });
        }

        // Default: return array for backward compatibility with existing components (returns up to 500 books)
        const unpaginatedLimit = limit ? Math.min(1000, Math.max(1, parseInt(limit, 10))) : 500;
        const books = await Book.find(query).limit(unpaginatedLimit).sort({ createdAt: -1 });
        res.status(200).json(books);
    } catch (error) {
        console.error("Error fetching books:", error.message);
        res.status(500).json({ error: error.message });
    }
};

// Get one particular book
export const getOneBook = async (req, res) => {
    const { id } = req.params;
    try {
        const book = await Book.findById(id);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        res.status(200).json(book);
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};

// Upload a new book
export const uploadBook = async (req, res) => {
    const { name, bookUrl, price, category, description } = req.body;
    const image = req.file ? req.file.path : null;

    const book = new Book({ name, bookUrl, price, category, description, image });

    try {
        const newBook = await book.save();
        res.status(201).json({ message: "Book uploaded successfully", book: newBook });
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};

// Update an existing book
export const updateBook = async (req, res) => {
    try {
        const updatedBook = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedBook) return res.status(404).json({ message: "Book not found" });
        res.status(200).json({ message: "Book Updated Successfully", book: updatedBook });
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};

// Delete a book
export const deleteBook = async (req, res) => {
    try {
        const deletedBook = await Book.findByIdAndDelete(req.params.id);
        if (!deletedBook) return res.status(404).json({ message: "Book not found" });
        res.status(200).json({ message: "Book Deleted Successfully", book: deletedBook });
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};

/**
 * On-demand multi-provider book discovery (Gutendex, Open Library, Google Books, DOAB)
 */
export const discoverBooks = async (req, res) => {
    try {
        const { query, provider = 'all', filter = 'all', page = 1, limit = 20 } = req.query;
        if (!query || !query.trim()) {
            return res.status(400).json({ message: "Search query is required." });
        }

        const { unifiedSearch } = await import('../services/bookProviders.service.js');
        const data = await unifiedSearch({
            query: query.trim(),
            provider,
            filter,
            page: Math.max(1, parseInt(page, 10) || 1),
            limit: Math.min(50, Math.max(1, parseInt(limit, 10) || 20)),
        });

        res.status(200).json(data);
    } catch (error) {
        console.error("Discovery error:", error.message);
        res.status(500).json({ message: "Book discovery error", error: error.message });
    }
};