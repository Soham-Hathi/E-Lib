import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '../ThemeContext';

const SHELF_TABS = [
  { key: 'currently_reading', label: '📖 Currently Reading' },
  { key: 'want_to_read', label: '🔖 Want to Read' },
  { key: 'completed', label: '✅ Completed' },
  { key: 'favorites', label: '⭐ Favorites' },
  { key: 'wishlist', label: '🎁 Wishlist' },
];

const Bookshelf = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('currently_reading');
  const [bookshelfItems, setBookshelfItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const token = localStorage.getItem('token');

  const fetchBookshelf = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await axios.get('http://localhost:3000/bookshelf', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookshelfItems(res.data.bookshelf || []);
    } catch (err) {
      console.error('Error fetching bookshelf:', err);
      setError(err.response?.data?.message || 'Failed to load your personal bookshelf.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookshelf();
  }, [token]);

  const handleShelfChange = async (bookId, newShelf) => {
    try {
      await axios.post(
        'http://localhost:3000/bookshelf',
        { bookId, shelf: newShelf },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatusMsg(`Moved book to ${newShelf.replace('_', ' ')}`);
      setTimeout(() => setStatusMsg(''), 3000);
      fetchBookshelf();
    } catch (err) {
      console.error('Failed to change shelf:', err);
    }
  };

  const handleRemoveFromShelf = async (bookId) => {
    if (!window.confirm('Remove this book from your bookshelf?')) return;
    try {
      await axios.delete(`http://localhost:3000/bookshelf/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatusMsg('Removed from bookshelf');
      setTimeout(() => setStatusMsg(''), 3000);
      fetchBookshelf();
    } catch (err) {
      console.error('Failed to remove from bookshelf:', err);
    }
  };

  if (!token) {
    return (
      <div className={`min-h-screen py-24 px-4 flex items-center justify-center ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className={`max-w-md w-full p-8 rounded-2xl border text-center shadow-xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="w-16 h-16 mx-auto mb-4 bg-cyan-500/10 text-cyan-500 rounded-full flex items-center justify-center text-3xl font-bold">
            📚
          </div>
          <h2 className="text-2xl font-bold mb-2">Your Personal Bookshelf</h2>
          <p className={`text-sm mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Sign in to track reading progress, organize custom shelves, save annotations, and access your cloud library from any device.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/login"
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl transition shadow-lg shadow-cyan-600/20"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className={`px-6 py-2.5 rounded-xl font-semibold transition border ${
                isDarkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredItems = bookshelfItems.filter((item) => item.shelf === activeTab);

  return (
    <div className={`min-h-screen py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-cyan-500 text-sm font-semibold tracking-wider uppercase mb-1">
              <span>Cloud Reading Hub</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              My Personal Bookshelf
            </h1>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Organize your digital library, track reading milestones, and resume reading instantly.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/books"
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-semibold rounded-xl shadow-md transition"
            >
              + Discover Books
            </Link>
          </div>
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div className="mb-6 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold flex items-center justify-between animate-fade-in">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg('')} className="font-bold">&times;</button>
          </div>
        )}

        {/* Shelf Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none border-b border-slate-800">
          {SHELF_TABS.map((tab) => {
            const count = bookshelfItems.filter((i) => i.shelf === tab.key).length;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-md'
                    : isDarkMode
                    ? 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : isDarkMode
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 text-sm">Loading your personal bookshelf...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className={`p-16 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200'}`}>
            <span className="text-4xl mb-3 block">📖</span>
            <h3 className="text-xl font-bold mb-2">No books on this shelf yet</h3>
            <p className={`text-sm max-w-md mx-auto mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Start populating your {activeTab.replace('_', ' ')} list by exploring our vast library of verified literature, programming, and science texts.
            </p>
            <Link
              to="/books"
              className="inline-flex items-center px-6 py-2.5 rounded-xl font-semibold text-sm bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-lg shadow-cyan-600/20"
            >
              Browse Catalog &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredItems.map((item) => {
              const book = item.book;
              if (!book) return null;
              return (
                <div
                  key={item._id}
                  className={`group rounded-2xl border overflow-hidden flex flex-col transition hover:shadow-2xl hover:-translate-y-1 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Book Cover */}
                  <div className="relative aspect-[3/4] bg-slate-800 overflow-hidden">
                    <img
                      src={book.image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=500&q=80'}
                      alt={book.name}
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=500&q=80';
                      }}
                    />
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md bg-slate-900/80 text-cyan-400 border border-cyan-500/30">
                        {book.category || 'General'}
                      </span>
                    </div>

                    {book.price === 0 && (
                      <div className="absolute bottom-2 left-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/90 text-white">
                          Free Edition
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Info */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm line-clamp-1 group-hover:text-cyan-400 transition">
                        {book.name}
                      </h4>
                      <p className={`text-xs mt-0.5 line-clamp-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {book.authors?.join(', ') || 'Author'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col gap-2.5">
                      {/* Shelf Selector Dropdown */}
                      <div className="flex items-center justify-between text-xs">
                        <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Shelf:</span>
                        <select
                          value={item.shelf}
                          onChange={(e) => handleShelfChange(book._id, e.target.value)}
                          className={`text-xs rounded-lg px-2 py-1 outline-none font-medium border ${
                            isDarkMode
                              ? 'bg-slate-800 border-slate-700 text-slate-200'
                              : 'bg-slate-100 border-slate-300 text-slate-800'
                          }`}
                        >
                          <option value="currently_reading">📖 Reading</option>
                          <option value="want_to_read">🔖 Want to Read</option>
                          <option value="completed">✅ Completed</option>
                          <option value="favorites">⭐ Favorite</option>
                          <option value="wishlist">🎁 Wishlist</option>
                        </select>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          to={`/reader/${book._id}`}
                          className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold text-center transition shadow-sm"
                        >
                          Read Now
                        </Link>
                        <Link
                          to={`/shop/${book._id}`}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold text-center transition border ${
                            isDarkMode
                              ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                              : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          Details
                        </Link>
                      </div>

                      <button
                        onClick={() => handleRemoveFromShelf(book._id)}
                        className="text-[11px] text-rose-400 hover:text-rose-300 text-center transition"
                      >
                        Remove from shelf
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookshelf;
