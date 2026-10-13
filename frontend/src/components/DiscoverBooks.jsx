import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiSearch, FiExternalLink, FiDownload, FiBookOpen, FiShoppingCart, FiLayers } from 'react-icons/fi';
import { API_BASE_URL } from '../config/api';

const DiscoverBooks = () => {
  const [query, setQuery] = useState('science');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'free', 'paid'
  const [activeProvider, setActiveProvider] = useState('all'); // 'all', 'gutendex', 'openlibrary', 'googlebooks', 'doab'
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cached, setCached] = useState(false);

  const fetchDiscovery = async (searchQuery, filter, provider) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/book/discover`, {
        params: {
          query: searchQuery.trim(),
          filter,
          provider,
          limit: 24,
        },
      });
      setBooks(response.data.items || []);
      setCached(Boolean(response.data.cached));
    } catch (err) {
      console.error('Discovery error:', err);
      setError(err.response?.data?.message || 'Failed to search external book catalogs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscovery('literature', 'all', 'all');
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDiscovery(query, activeFilter, activeProvider);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    fetchDiscovery(query, filter, activeProvider);
  };

  const handleProviderChange = (provider) => {
    setActiveProvider(provider);
    fetchDiscovery(query, activeFilter, provider);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 mb-3">
            <FiLayers /> Unified Global Catalog Discovery
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Explore Millions of Books Across the Web
          </h1>
          <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Search verified public domain works from Project Gutenberg, bibliographic records from Open Library, 
            Google Books previews, and peer-reviewed academic monographs from DOAB.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto mb-8">
          <div className="relative flex items-center shadow-md rounded-2xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, author, topic, or keyword (e.g. Shakespeare, Machine Learning, Philosophy)..."
              className="w-full px-5 py-4 text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-400 bg-transparent focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm sm:text-base flex items-center gap-2 transition disabled:opacity-50"
            >
              <FiSearch className="text-lg" />
              <span>Search</span>
            </button>
          </div>
        </form>

        {/* Filters and Providers */}
        <div className="flex flex-wrap items-center justify-between gap-4 max-w-5xl mx-auto mb-8 pb-4 border-b border-gray-200 dark:border-gray-800">
          {/* Access Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Access:</span>
            <div className="inline-flex rounded-lg bg-gray-200 dark:bg-gray-800 p-1">
              {[
                { id: 'all', label: 'All Access' },
                { id: 'free', label: 'Free & Public Domain' },
                { id: 'paid', label: 'Commercial / Paid' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleFilterChange(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    activeFilter === tab.id
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Provider Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Source:</span>
            <select
              value={activeProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Providers (Unified)</option>
              <option value="gutendex">Project Gutenberg (Public Domain)</option>
              <option value="openlibrary">Open Library</option>
              <option value="googlebooks">Google Books</option>
              <option value="doab">DOAB (Open Access Academic)</option>
            </select>
          </div>
        </div>

        {/* Status / Notice */}
        {cached && (
          <div className="text-center text-xs text-green-600 dark:text-green-400 mb-4 font-medium">
            ⚡ Instant cached discovery result
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="max-w-2xl mx-auto p-4 mb-6 bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-center text-sm">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Querying global book registries...</p>
          </div>
        )}

        {/* Books Grid */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {books.length > 0 ? (
              books.map((book) => {
                const isFree = book.price === 0 || book.accessType === 'free_download' || book.accessType === 'open_access';
                const hasEpub = Boolean(book.downloadUrl);
                const hasPreview = Boolean(book.previewUrl);
                const isPaid = Boolean(book.purchaseUrl || (book.price && book.price > 0));

                return (
                  <div
                    key={book.sourceId}
                    className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition duration-200"
                  >
                    {/* Cover Image */}
                    <div className="relative h-60 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <img
                        src={book.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'}
                        alt={book.title}
                        className="w-full h-full object-cover object-center"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400';
                        }}
                      />
                      {/* Provider Badge */}
                      <span className="absolute top-3 left-3 px-2 py-1 bg-black/75 backdrop-blur text-white text-[10px] font-semibold uppercase tracking-wider rounded-md">
                        {book.source === 'gutendex' ? 'Gutenberg' : book.source}
                      </span>
                      {/* Rights Status Badge */}
                      <span
                        className={`absolute top-3 right-3 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                          isFree
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {isFree ? 'FREE ACCESS' : (book.price ? `₹${book.price}` : 'COMMERCIAL')}
                      </span>
                    </div>

                    {/* Book Details */}
                    <div className="p-5 flex flex-col flex-grow">
                      <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1 line-clamp-1">
                        {book.categories?.[0] || 'Literature'}
                      </span>
                      <h3 className="font-bold text-base text-gray-900 dark:text-white line-clamp-2 mb-1" title={book.title}>
                        {book.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-3">
                        by {(book.authors || []).join(', ') || 'Unknown Author'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3 mb-4 leading-relaxed">
                        {book.description || 'Public catalog listing with verified licensing metadata.'}
                      </p>

                      {/* Action Links */}
                      <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700/60 flex flex-col gap-2">
                        {hasEpub && (
                          <a
                            href={book.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 px-3 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition shadow-sm"
                          >
                            <FiDownload /> Read / Download
                          </a>
                        )}

                        {hasPreview && !hasEpub && (
                          <a
                            href={book.previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition shadow-sm"
                          >
                            <FiBookOpen /> Read Preview
                          </a>
                        )}

                        {isPaid && (
                          <a
                            href={book.purchaseUrl || book.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition shadow-sm"
                          >
                            <FiShoppingCart /> Buy from Provider
                          </a>
                        )}

                        <a
                          href={book.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-1.5 px-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-[11px] font-medium rounded-lg flex items-center justify-center gap-1 transition"
                        >
                          <FiExternalLink /> Source Info
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-16 text-center text-gray-500 dark:text-gray-400">
                No external catalog books found matching &quot;{query}&quot;. Try a broader term.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoverBooks;
