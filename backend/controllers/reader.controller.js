import ReaderProgress from '../models/readerProgress.model.js';
import Book from '../models/book.model.js';
import { REAL_BOOK_CONTENTS } from '../config/realBookTexts.js';

export const getProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bookId } = req.params;

    const progress = await ReaderProgress.findOne({ userId, bookId });
    if (!progress) {
      return res.status(200).json({ cfi: '', percentage: 0, annotations: [], bookmarks: [] });
    }

    res.status(200).json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving reading progress', error: error.message });
  }
};

export const saveProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bookId, cfi, percentage } = req.body;

    if (!bookId) {
      return res.status(400).json({ message: 'bookId is required' });
    }

    const progress = await ReaderProgress.findOneAndUpdate(
      { userId, bookId },
      {
        $set: {
          cfi: cfi || '',
          percentage: Math.min(100, Math.max(0, Number(percentage) || 0)),
          lastReadAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    res.status(200).json({ message: 'Reading progress saved', progress });
  } catch (error) {
    res.status(500).json({ message: 'Error saving progress', error: error.message });
  }
};

export const addAnnotation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bookId, cfi, text, note, color } = req.body;

    if (!bookId || !cfi) {
      return res.status(400).json({ message: 'bookId and cfi are required' });
    }

    const progress = await ReaderProgress.findOneAndUpdate(
      { userId, bookId },
      {
        $push: {
          annotations: { cfi, text, note, color, createdAt: new Date() },
        },
        $set: { lastReadAt: new Date() },
      },
      { new: true, upsert: true }
    );

    res.status(201).json({ message: 'Annotation saved', annotations: progress.annotations });
  } catch (error) {
    res.status(500).json({ message: 'Error adding annotation', error: error.message });
  }
};

export const getUserLibrary = async (req, res) => {
  try {
    const userId = req.user._id;
    const items = await ReaderProgress.find({ userId })
      .populate('bookId')
      .sort({ lastReadAt: -1 });

    const bookshelf = items
      .filter((item) => item.bookId) // Filter out any deleted books
      .map((item) => ({
        book: item.bookId,
        percentage: item.percentage,
        cfi: item.cfi,
        lastReadAt: item.lastReadAt,
        notesCount: item.annotations.length,
      }));

    res.status(200).json(bookshelf);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching personal bookshelf', error: error.message });
  }
};

/**
 * Fetch readable multi-chapter digital book content for the in-browser reader
 */
export const getBookContent = async (req, res) => {
  try {
    const { bookId } = req.params;
    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const title = book.name || 'Untitled Book';
    const author = (book.authors && book.authors.length > 0) ? book.authors.join(', ') : 'Distinguished Author';
    const category = book.category || 'General Literature';
    const description = book.description || 'A timeless, captivating exploration of ideas, human experience, and intellect.';

    // Prioritize authentic verbatim chapters if available
    let chapters = REAL_BOOK_CONTENTS[book.name] || REAL_BOOK_CONTENTS[book.name.trim()];

    if (!chapters || chapters.length === 0) {
      // Structured high-quality overview chapters tailored to this work
      chapters = [
        {
          id: 'ch-preface',
          title: 'Author Introduction & Core Premise',
          subtitle: `Overview by ${author}`,
          content: `Welcome to "${title}".\n\n${description}\n\nThis edition provides an immersive reading experience. As you study this work, reflect on the primary thesis presented by ${author}, utilize the in-line annotations and highlights, and consult the AI study companion for instant literary and technical insights.`,
        },
        {
          id: 'ch-1',
          title: 'Part I: Foundations and Core Principles',
          subtitle: `Key Concepts in ${category}`,
          content: `In the opening movement of "${title}", ${author} sets forth the core dilemmas and fundamental premises.\n\n"${description.slice(0, 220)}..."\n\nEvery foundational work establishes a framework for evaluating evidence, human action, and systematic inquiry. Pay close attention to the structural assumptions introduced here, which guide the progression of ideas throughout the entire text.`,
        },
        {
          id: 'ch-2',
          title: 'Part II: In-Depth Exploration and Analysis',
          subtitle: 'Core Dynamics and Structural Themes',
          content: `Progressing through "${title}", the author delves into the practical and philosophical implications of the central argument.\n\nHere, the dialogue shifts from initial definitions to the complex realities of execution and human psychology. Whether examining narrative developments or principles of ${category}, the work demonstrates how enduring truths transcend transient circumstances.`,
        },
        {
          id: 'ch-3',
          title: 'Part III: Synthesis and Concluding Takeaways',
          subtitle: 'Critical Insights and Review',
          content: `In the concluding chapters of "${title}", ${author} draws together the central arguments into a coherent, actionable synthesis.\n\nProfound literature and rigorous study do not leave us where they found us—they refine our perspective. Review your bookmarks and saved notes, and test your retention with the integrated comprehension quiz!`,
        },
      ];
    }

    res.status(200).json({
      book: {
        _id: book._id,
        name: book.name,
        authors: book.authors,
        category: book.category,
        image: book.image,
        price: book.price,
        rightsStatus: book.rightsStatus,
        formats: book.formats,
        sourceUrl: book.sourceUrl,
      },
      chapters,
    });
  } catch (error) {
    console.error('Error fetching book content:', error);
    res.status(500).json({ message: 'Error retrieving book text content', error: error.message });
  }
};

/**
 * Toggle bookmark for a chapter/section
 */
export const toggleBookmark = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bookId, cfi, title } = req.body;

    if (!bookId || !cfi) {
      return res.status(400).json({ message: 'bookId and cfi are required' });
    }

    const progress = await ReaderProgress.findOne({ userId, bookId });
    if (!progress) {
      const newProgress = new ReaderProgress({
        userId,
        bookId,
        bookmarks: [{ cfi, title: title || 'Bookmark', createdAt: new Date() }],
      });
      await newProgress.save();
      return res.status(200).json({ bookmarks: newProgress.bookmarks });
    }

    const existingIdx = progress.bookmarks.findIndex((b) => b.cfi === cfi);
    if (existingIdx > -1) {
      // Remove bookmark
      progress.bookmarks.splice(existingIdx, 1);
    } else {
      // Add bookmark
      progress.bookmarks.push({ cfi, title: title || 'Bookmark', createdAt: new Date() });
    }

    await progress.save();
    res.status(200).json({ bookmarks: progress.bookmarks });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling bookmark', error: error.message });
  }
};
