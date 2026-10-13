// PaidBooks.jsx
import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { FiShoppingCart, FiCheck } from 'react-icons/fi';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const PaidBooks = () => {
  const [books, setBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState(null);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/book/getbook`);
        setBooks(response.data || []);
      } catch (error) {
        console.error("Error fetching books:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  const handleQuickAdd = (e, book) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(book, 1);
    setAddedId(book._id);
    setTimeout(() => setAddedId(null), 2500);
  };

  // Filter paid books (price > 0) and apply search query
  const filteredPaidBooks = books
    .filter((book) => book.price && book.price > 0)
    .filter((book) => {
      const q = searchQuery.toLowerCase();
      return (
        (book.name && book.name.toLowerCase().includes(q)) ||
        (book.category && book.category.toLowerCase().includes(q))
      );
    });

  const token = localStorage.getItem('token');

  return (
    <section className="text-gray-600 body-font dark:bg-gray-800 min-h-screen">
      <div className="container px-5 py-8 mx-auto">
        <div className="flex-grow mx-4 mt-3 max-w-xl mx-auto">
          <input
            type="text"
            placeholder="Search books by title or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>

        <div className="flex flex-col text-center w-full my-8">
          <h1 className="sm:text-3xl text-2xl font-medium title-font mb-2 text-gray-900 dark:text-white">
            Featured Pro & Study Books
          </h1>
          <p className="lg:w-2/3 mx-auto leading-relaxed text-base dark:text-gray-300">
            Explore curated textbooks, guides, and study companions to elevate your learning.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-10 dark:text-white">Loading catalog...</div>
        ) : (
          <div className="flex flex-wrap -m-4">
            {filteredPaidBooks.length > 0 ? (
              filteredPaidBooks.map((book) => (
                <div className="lg:w-1/3 sm:w-1/2 p-4" key={book._id}>
                  <Link to={`/shop/${book._id}`} className="block">
                    <div className="flex relative h-80 rounded-lg overflow-hidden shadow-md group">
                      <img
                        alt={book.name}
                        className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        src={book.image || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400"}
                      />
                      <div className="px-8 py-8 relative z-10 w-full border-4 border-gray-200 bg-white dark:bg-gray-900 opacity-0 group-hover:opacity-95 transition-opacity duration-300 flex flex-col justify-center">
                        <h2 className="tracking-widest text-xs uppercase title-font font-semibold text-blue-500 mb-1">
                          {book.category}
                        </h2>
                        <h1 className="title-font text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {book.name}
                        </h1>
                        <p className="leading-relaxed font-bold text-lg text-blue-600 dark:text-blue-400 mb-3">
                          ₹{book.price}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-auto">
                          <button
                            onClick={(e) => handleQuickAdd(e, book)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow"
                          >
                            {addedId === book._id ? (
                              <>
                                <FiCheck className="text-sm" /> Added
                              </>
                            ) : (
                              <>
                                <FiShoppingCart className="text-sm" /> Add to Cart
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))
            ) : (
              <div className="w-full text-center py-12 text-gray-500 dark:text-gray-400">
                No books found matching your criteria.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default PaidBooks;
