import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '../ThemeContext';

const Reader = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  // Book & Content State
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reader Settings State
  const [readerTheme, setReaderTheme] = useState('dark'); // 'light', 'sepia', 'dark'
  const [fontSize, setFontSize] = useState(18); // in px
  const [lineHeight, setLineHeight] = useState(1.8);
  const [fontFamily, setFontFamily] = useState('serif'); // 'serif', 'sans-serif', 'monospace'

  // Reading Progress & Bookmarks State
  const [bookmarks, setBookmarks] = useState([]);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showChaptersDrawer, setShowChaptersDrawer] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);

  // Audio / Text-to-Speech State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const speechRef = useRef(null);

  // AI Chat State
  const [aiChatMessages, setAiChatMessages] = useState([]);
  const [aiInputText, setAiInputText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Quiz State
  const [quizData, setQuizData] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const token = localStorage.getItem('token');
  const readerContentRef = useRef(null);

  // Fetch Book Content
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await axios.get(`http://localhost:3000/reader/content/${id}`);
        setBook(res.data.book);
        setChapters(res.data.chapters || []);

        // Load saved progress if authenticated
        if (token) {
          try {
            const progRes = await axios.get(`http://localhost:3000/reader/progress/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (progRes.data) {
              setBookmarks(progRes.data.bookmarks || []);
              if (progRes.data.cfi) {
                const savedChIdx = parseInt(progRes.data.cfi, 10);
                if (!isNaN(savedChIdx) && savedChIdx >= 0 && savedChIdx < (res.data.chapters || []).length) {
                  setCurrentChapterIndex(savedChIdx);
                }
              }
              if (progRes.data.percentage) {
                setReadingProgress(progRes.data.percentage);
              }
            }
          } catch (progErr) {
            console.warn('Could not fetch saved progress:', progErr.message);
          }
        }
      } catch (err) {
        console.error('Error fetching reader content:', err);
        setError(err.response?.data?.message || 'Unable to load book content. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [id, token]);

  // Sync Progress to Backend
  const saveProgressToBackend = async (chIndex) => {
    if (!token || chapters.length === 0) return;
    const pct = Math.round(((chIndex + 1) / chapters.length) * 100);
    setReadingProgress(pct);
    try {
      await axios.post(
        'http://localhost:3000/reader/progress',
        {
          bookId: id,
          cfi: String(chIndex),
          percentage: pct,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.warn('Failed to sync reading progress:', err.message);
    }
  };

  const handleChapterSelect = (index) => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }
    setCurrentChapterIndex(index);
    setShowChaptersDrawer(false);
    saveProgressToBackend(index);
    if (readerContentRef.current) {
      readerContentRef.current.scrollTop = 0;
    }
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      handleChapterSelect(currentChapterIndex + 1);
    }
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      handleChapterSelect(currentChapterIndex - 1);
    }
  };

  // Bookmark Toggle
  const handleToggleBookmark = async () => {
    if (!token) {
      alert('Please log in to save bookmarks to your cloud library.');
      return;
    }
    const currentChapter = chapters[currentChapterIndex];
    try {
      const res = await axios.post(
        'http://localhost:3000/reader/bookmark',
        {
          bookId: id,
          cfi: String(currentChapterIndex),
          title: currentChapter?.title || `Chapter ${currentChapterIndex + 1}`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBookmarks(res.data.bookmarks || []);
    } catch (err) {
      console.error('Bookmark error:', err);
    }
  };

  const isCurrentBookmarked = bookmarks.some((b) => b.cfi === String(currentChapterIndex));

  // Audio / Speech Narration
  const toggleAudio = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const currentText = chapters[currentChapterIndex]?.content || '';
    if (!currentText) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentText);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsPlayingAudio(false);
      if (currentChapterIndex < chapters.length - 1) {
        handleNextChapter();
      }
    };

    utterance.onerror = () => {
      setIsPlayingAudio(false);
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
  };

  const handleRateChange = (newRate) => {
    setSpeechRate(newRate);
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }
  };

  // AI Chat with Book
  const handleSendAiMessage = async (e) => {
    e?.preventDefault();
    if (!aiInputText.trim() || aiLoading) return;

    const userMsg = aiInputText.trim();
    setAiChatMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setAiInputText('');
    setAiLoading(true);

    try {
      const currentChapter = chapters[currentChapterIndex];
      const res = await axios.post('http://localhost:3000/ai/chat-with-book', {
        bookId: id,
        message: userMsg,
        chapterTitle: currentChapter?.title,
        excerpt: currentChapter?.content?.substring(0, 300),
      });

      setAiChatMessages((prev) => [
        ...prev,
        { sender: 'ai', text: res.data.reply || 'Here is what I found in the text.' },
      ]);
    } catch (err) {
      setAiChatMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'Apologies, I encountered an issue retrieving an answer. Please try again.' },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Generate Interactive Chapter Quiz
  const handleGenerateQuiz = async () => {
    setShowQuizModal(true);
    if (quizData) return;
    setQuizLoading(true);
    try {
      const currentChapter = chapters[currentChapterIndex];
      const res = await axios.post('http://localhost:3000/ai/study-tools', {
        toolType: 'quiz',
        bookId: id,
        bookTitle: book?.name,
        content: `${book?.name}: ${currentChapter?.title} - ${currentChapter?.content?.slice(0, 500)}`,
      });
      setQuizData(res.data);
      setQuizAnswers({});
      setQuizSubmitted(false);
    } catch (err) {
      console.error('Quiz generation error:', err);
    } finally {
      setQuizLoading(false);
    }
  };

  // Theme Styling Map
  const themeStyles = {
    dark: {
      bg: '#0f172a',
      cardBg: '#1e293b',
      text: '#f1f5f9',
      subText: '#94a3b8',
      border: '#334155',
      accent: '#38bdf8',
      buttonBg: '#2563eb',
    },
    sepia: {
      bg: '#fbf0d9',
      cardBg: '#f4e4c1',
      text: '#3b2f2f',
      subText: '#6f5e53',
      border: '#e6d3ad',
      accent: '#c05621',
      buttonBg: '#b7791f',
    },
    light: {
      bg: '#f8fafc',
      cardBg: '#ffffff',
      text: '#0f172a',
      subText: '#475569',
      border: '#e2e8f0',
      accent: '#0284c7',
      buttonBg: '#0284c7',
    },
  };

  const activeTheme = themeStyles[readerTheme];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium tracking-wide">Opening digital e-reader...</p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center text-2xl font-bold">
            !
          </div>
          <h2 className="text-2xl font-bold mb-2">Book Content Unavailable</h2>
          <p className="text-slate-400 mb-6">{error || 'Could not find readable content for this work.'}</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
            >
              Go Back
            </button>
            <Link
              to="/books"
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition"
            >
              Explore Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentChapter = chapters[currentChapterIndex] || {
    title: 'Chapter Overview',
    content: 'Content loading...',
  };

  return (
    <div
      style={{
        backgroundColor: activeTheme.bg,
        color: activeTheme.text,
        minHeight: '100vh',
        transition: 'background-color 0.25s, color 0.25s',
      }}
      className="flex flex-col"
    >
      {/* Top Reader Navigation Bar */}
      <header
        style={{
          backgroundColor: activeTheme.cardBg,
          borderColor: activeTheme.border,
        }}
        className="sticky top-0 z-40 border-b px-4 py-3 flex items-center justify-between shadow-sm"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            title="Exit Reader"
            className="p-2 rounded-lg hover:bg-black/10 transition text-sm flex items-center gap-1 font-medium"
          >
            &larr; Exit
          </button>
          <div className="hidden sm:block">
            <h1 className="font-semibold text-sm line-clamp-1 max-w-xs">{book.name}</h1>
            <p style={{ color: activeTheme.subText }} className="text-xs">
              {book.authors?.join(', ') || 'Author'}
            </p>
          </div>
        </div>

        {/* Reader Progress Indicator */}
        <div className="flex items-center gap-2 text-xs">
          <div className="w-24 sm:w-36 bg-black/10 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${readingProgress || Math.round(((currentChapterIndex + 1) / chapters.length) * 100)}%` }}
            ></div>
          </div>
          <span className="font-semibold" style={{ color: activeTheme.subText }}>
            {readingProgress || Math.round(((currentChapterIndex + 1) / chapters.length) * 100)}%
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Table of Contents Drawer Button */}
          <button
            onClick={() => setShowChaptersDrawer(!showChaptersDrawer)}
            className="p-2 rounded-lg hover:bg-black/10 transition text-xs font-medium flex items-center gap-1"
            title="Table of Contents"
          >
            <span>📖</span>
            <span className="hidden md:inline">Chapters</span>
          </button>

          {/* Bookmark Button */}
          <button
            onClick={handleToggleBookmark}
            className={`p-2 rounded-lg hover:bg-black/10 transition text-xs font-medium flex items-center gap-1 ${
              isCurrentBookmarked ? 'text-amber-500' : ''
            }`}
            title={isCurrentBookmarked ? 'Bookmarked' : 'Add Bookmark'}
          >
            <span>{isCurrentBookmarked ? '★' : '☆'}</span>
            <span className="hidden md:inline">Bookmark</span>
          </button>

          {/* Audio Narration Button */}
          <button
            onClick={toggleAudio}
            className={`p-2 rounded-lg transition text-xs font-medium flex items-center gap-1 ${
              isPlayingAudio ? 'bg-cyan-500/20 text-cyan-500 font-bold' : 'hover:bg-black/10'
            }`}
            title={isPlayingAudio ? 'Pause Narration' : 'Listen Narration'}
          >
            <span>{isPlayingAudio ? '⏸' : '🔊'}</span>
            <span className="hidden md:inline">{isPlayingAudio ? 'Listening...' : 'Listen'}</span>
          </button>

          {/* AI Study Companion Modal Button */}
          <button
            onClick={() => setShowAIAssistant(true)}
            className="px-2.5 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg transition text-xs font-semibold flex items-center gap-1 shadow-sm"
          >
            <span>✨</span>
            <span>AI Tutor</span>
          </button>

          {/* Chapter Quiz Button */}
          <button
            onClick={handleGenerateQuiz}
            className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg transition text-xs font-semibold flex items-center gap-1 shadow-sm"
          >
            <span>🎯</span>
            <span className="hidden sm:inline">Quiz</span>
          </button>
        </div>
      </header>

      {/* Reader Customization Settings Sub-Bar */}
      <div
        style={{
          backgroundColor: activeTheme.cardBg,
          borderColor: activeTheme.border,
        }}
        className="border-b px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-3"
      >
        {/* Theme Palette Switcher */}
        <div className="flex items-center gap-1">
          <span style={{ color: activeTheme.subText }} className="mr-1">
            Theme:
          </span>
          <button
            onClick={() => setReaderTheme('dark')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition ${
              readerTheme === 'dark' ? 'bg-slate-900 text-cyan-400 ring-1 ring-cyan-500' : 'bg-slate-800 text-slate-300'
            }`}
          >
            Dark
          </button>
          <button
            onClick={() => setReaderTheme('sepia')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition ${
              readerTheme === 'sepia' ? 'bg-[#f4e4c1] text-[#3b2f2f] ring-1 ring-amber-700' : 'bg-[#e8d7b3] text-[#4a3931]'
            }`}
          >
            Sepia
          </button>
          <button
            onClick={() => setReaderTheme('light')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition ${
              readerTheme === 'light' ? 'bg-white text-slate-900 ring-1 ring-slate-400' : 'bg-slate-200 text-slate-700'
            }`}
          >
            Light
          </button>
        </div>

        {/* Font Size & Typography */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span style={{ color: activeTheme.subText }}>Font:</span>
            <button
              onClick={() => setFontSize((f) => Math.max(14, f - 2))}
              className="px-2 py-0.5 rounded bg-black/10 hover:bg-black/20 font-bold"
              title="Decrease Font Size"
            >
              A-
            </button>
            <span className="w-6 text-center font-semibold">{fontSize}</span>
            <button
              onClick={() => setFontSize((f) => Math.min(32, f + 2))}
              className="px-2 py-0.5 rounded bg-black/10 hover:bg-black/20 font-bold"
              title="Increase Font Size"
            >
              A+
            </button>
          </div>

          {/* Typeface Switcher */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => setFontFamily('serif')}
              className={`px-2 py-0.5 rounded ${fontFamily === 'serif' ? 'bg-black/20 font-bold' : ''}`}
            >
              Serif
            </button>
            <button
              onClick={() => setFontFamily('sans-serif')}
              className={`px-2 py-0.5 rounded ${fontFamily === 'sans-serif' ? 'bg-black/20 font-bold' : ''}`}
            >
              Sans
            </button>
          </div>

          {/* Speech Rate */}
          {isPlayingAudio && (
            <div className="flex items-center gap-1 bg-cyan-500/10 px-2 py-0.5 rounded text-cyan-400">
              <span>Speed:</span>
              {[1, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleRateChange(rate)}
                  className={`px-1.5 py-0.5 rounded ${speechRate === rate ? 'bg-cyan-500 text-white font-bold' : ''}`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Reader Viewport */}
      <main
        ref={readerContentRef}
        className="flex-1 overflow-y-auto max-w-3xl w-full mx-auto px-6 py-12 md:py-16"
        style={{
          fontFamily:
            fontFamily === 'serif'
              ? 'Merriweather, Georgia, Cambria, serif'
              : 'Inter, system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Chapter Header */}
        <div className="mb-8 pb-6 border-b" style={{ borderColor: activeTheme.border }}>
          <div className="flex items-center justify-between text-xs uppercase tracking-wider mb-2" style={{ color: activeTheme.subText }}>
            <span>
              Chapter {currentChapterIndex + 1} of {chapters.length}
            </span>
            {isCurrentBookmarked && <span className="text-amber-500 font-semibold">★ Saved Bookmark</span>}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 leading-tight">
            {currentChapter.title}
          </h2>
          {currentChapter.subtitle && (
            <p className="text-sm italic" style={{ color: activeTheme.subText }}>
              {currentChapter.subtitle}
            </p>
          )}
        </div>

        {/* Chapter Reading Text */}
        <article
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: lineHeight,
          }}
          className="space-y-6 text-justify selection:bg-cyan-500/30"
        >
          {currentChapter.content ? (
            currentChapter.content.split('\n\n').map((paragraph, idx) => (
              <p key={idx} className="leading-relaxed">
                {paragraph}
              </p>
            ))
          ) : (
            <p>No content available for this section.</p>
          )}
        </article>

        {/* Chapter Navigation Pagination Controls */}
        <div
          className="mt-16 pt-8 border-t flex items-center justify-between gap-4"
          style={{ borderColor: activeTheme.border }}
        >
          <button
            onClick={handlePrevChapter}
            disabled={currentChapterIndex === 0}
            className={`px-5 py-3 rounded-xl font-medium text-sm flex items-center gap-2 transition ${
              currentChapterIndex === 0
                ? 'opacity-30 cursor-not-allowed'
                : 'bg-black/10 hover:bg-black/20'
            }`}
          >
            &larr; Previous Chapter
          </button>

          <span className="text-xs font-semibold" style={{ color: activeTheme.subText }}>
            {currentChapterIndex + 1} / {chapters.length}
          </span>

          <button
            onClick={handleNextChapter}
            disabled={currentChapterIndex === chapters.length - 1}
            className={`px-5 py-3 rounded-xl font-medium text-sm flex items-center gap-2 transition ${
              currentChapterIndex === chapters.length - 1
                ? 'opacity-30 cursor-not-allowed'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}
          >
            Next Chapter &rarr;
          </button>
        </div>
      </main>

      {/* Chapters Table of Contents Drawer */}
      {showChaptersDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowChaptersDrawer(false)}
          ></div>
          <div
            style={{
              backgroundColor: activeTheme.cardBg,
              color: activeTheme.text,
              borderColor: activeTheme.border,
            }}
            className="relative w-full max-w-xs md:max-w-sm h-full shadow-2xl p-6 flex flex-col border-r z-10"
          >
            <div className="flex items-center justify-between pb-4 border-b mb-4" style={{ borderColor: activeTheme.border }}>
              <h3 className="font-bold text-lg">Table of Contents</h3>
              <button
                onClick={() => setShowChaptersDrawer(false)}
                className="p-1 rounded-lg hover:bg-black/10 text-xl"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {chapters.map((ch, idx) => {
                const isSelected = idx === currentChapterIndex;
                const isBookmarked = bookmarks.some((b) => b.cfi === String(idx));
                return (
                  <button
                    key={ch.id || idx}
                    onClick={() => handleChapterSelect(idx)}
                    className={`w-full text-left p-3 rounded-xl transition text-sm flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-cyan-600 text-white font-semibold'
                        : 'hover:bg-black/10'
                    }`}
                  >
                    <div>
                      <p className="font-medium line-clamp-1">{ch.title}</p>
                      {ch.subtitle && (
                        <p className={`text-xs ${isSelected ? 'text-cyan-100' : ''}`} style={{ color: !isSelected ? activeTheme.subText : undefined }}>
                          {ch.subtitle}
                        </p>
                      )}
                    </div>
                    {isBookmarked && <span className="text-amber-400 font-bold">★</span>}
                  </button>
                );
              })}
            </div>

            {/* Quick Actions Footer */}
            <div className="pt-4 border-t mt-4 text-xs" style={{ borderColor: activeTheme.border }}>
              <div className="flex justify-between items-center" style={{ color: activeTheme.subText }}>
                <span>Saved Bookmarks: {bookmarks.length}</span>
                <Link to="/bookshelf" className="text-cyan-500 hover:underline">
                  View Bookshelf &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Tutor Floating Assistant Modal */}
      {showAIAssistant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAIAssistant(false)}
          ></div>
          <div
            style={{
              backgroundColor: activeTheme.cardBg,
              color: activeTheme.text,
              borderColor: activeTheme.border,
            }}
            className="relative w-full max-w-lg h-[550px] rounded-2xl shadow-2xl border flex flex-col z-10 overflow-hidden"
          >
            {/* AI Modal Header */}
            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-cyan-600/20 to-indigo-600/20" style={{ borderColor: activeTheme.border }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <div>
                  <h3 className="font-bold text-sm">AI Study Companion</h3>
                  <p className="text-xs" style={{ color: activeTheme.subText }}>
                    Grounded in "{book.name}"
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAIAssistant(false)}
                className="p-1 rounded-lg hover:bg-black/10 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {aiChatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-sm" style={{ color: activeTheme.subText }}>
                  <span className="text-3xl mb-2">🎓</span>
                  <p className="font-semibold text-base mb-1" style={{ color: activeTheme.text }}>
                    Ask anything about this chapter!
                  </p>
                  <p className="text-xs mb-4">
                    Get summaries, explain complex vocabulary, analyze themes, or discover literary context.
                  </p>
                  <div className="flex flex-col gap-2 w-full max-w-xs text-xs">
                    <button
                      onClick={() => {
                        setAiInputText('What is the main theme of this chapter?');
                      }}
                      className="p-2 rounded-lg bg-black/10 hover:bg-black/20 text-left transition"
                    >
                      💡 "What is the main theme of this chapter?"
                    </button>
                    <button
                      onClick={() => {
                        setAiInputText('Summarize key arguments in simple terms.');
                      }}
                      className="p-2 rounded-lg bg-black/10 hover:bg-black/20 text-left transition"
                    >
                      📖 "Summarize key arguments in simple terms."
                    </button>
                  </div>
                </div>
              ) : (
                aiChatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.sender === 'user'
                          ? 'bg-cyan-600 text-white rounded-br-none'
                          : 'bg-black/10 rounded-bl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              {aiLoading && (
                <div className="flex items-center gap-2 text-xs italic text-cyan-400">
                  <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  Analyzing text...
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendAiMessage} className="p-3 border-t flex gap-2" style={{ borderColor: activeTheme.border }}>
              <input
                type="text"
                value={aiInputText}
                onChange={(e) => setAiInputText(e.target.value)}
                placeholder="Ask about themes, characters, or key ideas..."
                className="flex-1 bg-black/10 border border-transparent focus:border-cyan-500 rounded-xl px-3 py-2 text-sm outline-none transition"
              />
              <button
                type="submit"
                disabled={!aiInputText.trim() || aiLoading}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Chapter Study Quiz Modal */}
      {showQuizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowQuizModal(false)}
          ></div>
          <div
            style={{
              backgroundColor: activeTheme.cardBg,
              color: activeTheme.text,
              borderColor: activeTheme.border,
            }}
            className="relative w-full max-w-xl max-h-[85vh] rounded-2xl shadow-2xl border flex flex-col z-10 overflow-hidden"
          >
            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-purple-600/20 to-pink-600/20" style={{ borderColor: activeTheme.border }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <h3 className="font-bold text-sm">
                  {quizData?.title || 'Interactive Comprehension Quiz'}
                </h3>
              </div>
              <button
                onClick={() => setShowQuizModal(false)}
                className="p-1 rounded-lg hover:bg-black/10 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {quizLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm" style={{ color: activeTheme.subText }}>
                    Crafting personalized quiz questions...
                  </p>
                </div>
              ) : quizData?.questions?.length > 0 ? (
                quizData.questions.map((q, qIdx) => {
                  const selected = quizAnswers[qIdx];
                  const isCorrect = selected === q.correctIndex;
                  return (
                    <div
                      key={qIdx}
                      className="p-4 rounded-xl border bg-black/5"
                      style={{ borderColor: activeTheme.border }}
                    >
                      <p className="font-semibold text-sm mb-3">
                        {qIdx + 1}. {q.question}
                      </p>
                      <div className="space-y-2">
                        {q.options?.map((opt, optIdx) => {
                          const isOptionSelected = selected === optIdx;
                          let btnStyle = 'hover:bg-black/10';
                          if (quizSubmitted) {
                            if (optIdx === q.correctIndex) {
                              btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-semibold';
                            } else if (isOptionSelected) {
                              btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-400 line-through';
                            }
                          } else if (isOptionSelected) {
                            btnStyle = 'bg-purple-600 text-white font-medium';
                          }

                          return (
                            <button
                              key={optIdx}
                              disabled={quizSubmitted}
                              onClick={() =>
                                setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))
                              }
                              className={`w-full text-left p-2.5 rounded-lg border border-transparent transition text-xs flex items-center gap-2 ${btnStyle}`}
                            >
                              <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && q.explanation && (
                        <div className="mt-3 p-2.5 bg-black/10 rounded-lg text-xs" style={{ color: activeTheme.subText }}>
                          <span className="font-bold text-cyan-400">Insight: </span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-sm" style={{ color: activeTheme.subText }}>
                  No quiz questions could be generated for this chapter.
                </p>
              )}
            </div>

            {quizData?.questions?.length > 0 && (
              <div className="p-4 border-t flex justify-end gap-3" style={{ borderColor: activeTheme.border }}>
                {!quizSubmitted ? (
                  <button
                    onClick={() => setQuizSubmitted(true)}
                    disabled={Object.keys(quizAnswers).length < quizData.questions.length}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
                  >
                    Submit Answers
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setQuizSubmitted(false);
                      setQuizAnswers({});
                    }}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition"
                  >
                    Retake Quiz
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reader;
