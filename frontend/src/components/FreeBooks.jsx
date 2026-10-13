import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const FreeBooks = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const freeBooks = books.filter((book) => !book.price || book.price === 0);

  return (
    <section className="text-gray-600 body-font dark:bg-gray-800 py-16">
      <div className="container px-5 mx-auto">
        <div className="flex flex-col text-center w-full mb-12">
          <h1 className="sm:text-3xl text-2xl font-bold title-font mb-3 text-gray-900 dark:text-white">
            Featured Free Public Domain & Open Access Books
          </h1>
          <p className="lg:w-2/3 mx-auto leading-relaxed text-sm text-gray-600 dark:text-gray-300">
            Enjoy our curated selection of classic works, available completely free to read and study anytime.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-10 dark:text-gray-300">Loading catalog...</div>
        ) : (
          <div className="flex flex-wrap -m-4">
            {freeBooks.length > 0 ? (
              freeBooks.map((book) => (
                <div className="lg:w-1/3 sm:w-1/2 p-4" key={book._id}>
                  <Link to={`/shop/${book._id}`} className="block group">
                    <div className="flex relative h-80 rounded-xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-700">
                      <img
                        alt={book.name}
                        className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        src={book.image || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=400"}
                      />
                      <div className="px-6 py-6 relative z-10 w-full bg-white/95 dark:bg-gray-900/95 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center">
                        <span className="tracking-widest text-xs uppercase font-semibold text-green-600 dark:text-green-400 mb-1">
                          {book.category || 'Classic'}
                        </span>
                        <h2 className="title-font text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {book.name}
                        </h2>
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3 mb-4">
                          {book.description}
                        </p>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="font-bold text-green-600 dark:text-green-400 text-sm">
                            FREE
                          </span>
                          <span className="text-xs bg-blue-600 text-white font-medium px-3 py-1.5 rounded-lg shadow">
                            Read Now &rarr;
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))
            ) : (
              <div className="w-full text-center py-8 text-gray-500 dark:text-gray-400">
                No free books currently in this catalog view.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default FreeBooks;
