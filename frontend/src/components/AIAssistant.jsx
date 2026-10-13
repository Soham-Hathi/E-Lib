import { useState, useRef, useEffect } from 'react';
import { BsFillChatFill } from 'react-icons/bs';
import { IoCloseSharp, IoSend } from 'react-icons/io5';
import { FiBookOpen } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AIAssistant = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            sender: 'ai',
            text: 'Hello! I am your E-Library AI Study & Reading Assistant. Ask me for book recommendations, study topics, or free books in our collection!',
            citedBooks: [],
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const toggleChat = () => setIsOpen(!isOpen);

    const handleSendMessage = async (textToSend) => {
        const query = (textToSend || input).trim();
        if (!query) return;

        setMessages(prev => [...prev, { sender: 'user', text: query }]);
        setInput('');
        setLoading(true);

        try {
            const res = await axios.post(`${API_BASE_URL}/ai/chat`, { message: query });
            setMessages(prev => [
                ...prev,
                {
                    sender: 'ai',
                    text: res.data.reply || 'Here is what I found in our catalog.',
                    citedBooks: res.data.citedBooks || [],
                    provider: res.data.provider,
                }
            ]);
        } catch (error) {
            const errorMsg = error.response?.data?.reply || error.response?.data?.message || "Sorry, I'm having trouble connecting to the catalog right now. Please try again in a moment.";
            setMessages(prev => [...prev, { sender: 'ai', text: errorMsg, citedBooks: [] }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        handleSendMessage();
    };

    const handleBookClick = (bookId) => {
        if (bookId) {
            navigate(`/shop/${bookId}`);
        }
    };

    // Helper to render bold markdown (**text**) safely
    const formatMessageText = (text = '') => {
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="font-semibold text-blue-900 dark:text-blue-300">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <div className="fixed bottom-5 right-5 z-50">
            {isOpen ? (
                <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl w-84 sm:w-96 h-[500px] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-300 transform origin-bottom-right">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3.5 flex justify-between items-center shadow-md">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <BsFillChatFill className="text-white text-sm" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm leading-tight">AI Book Assistant</h3>
                                <p className="text-[11px] text-blue-100">Grounded catalog search & study tutor</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleChat}
                            className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition"
                            aria-label="Close Chat"
                        >
                            <IoCloseSharp className="text-xl" />
                        </button>
                    </div>

                    {/* Quick suggestion prompt chips if few messages */}
                    {messages.length <= 2 && (
                        <div className="bg-blue-50/70 dark:bg-gray-900/50 px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 flex gap-1.5 overflow-x-auto text-[11px] text-blue-700 dark:text-blue-300 whitespace-nowrap">
                            <button
                                onClick={() => handleSendMessage('Recommend popular books')}
                                className="px-2 py-1 bg-white dark:bg-gray-800 rounded-full border border-blue-200 dark:border-gray-700 hover:bg-blue-50 transition"
                            >
                                📚 Popular Books
                            </button>
                            <button
                                onClick={() => handleSendMessage('Find free public domain books')}
                                className="px-2 py-1 bg-white dark:bg-gray-800 rounded-full border border-blue-200 dark:border-gray-700 hover:bg-blue-50 transition"
                            >
                                🆓 Free Books
                            </button>
                            <button
                                onClick={() => handleSendMessage('Technology & Programming')}
                                className="px-2 py-1 bg-white dark:bg-gray-800 rounded-full border border-blue-200 dark:border-gray-700 hover:bg-blue-50 transition"
                            >
                                💻 Technology
                            </button>
                        </div>
                    )}
                    
                    {/* Message stream */}
                    <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3 scroll-smooth">
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex flex-col gap-1.5 max-w-[88%] ${
                                    msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                                }`}
                            >
                                <div
                                    className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                                        msg.sender === 'user'
                                            ? 'bg-blue-600 text-white rounded-br-none'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-200 dark:border-gray-600'
                                    }`}
                                >
                                    {formatMessageText(msg.text)}
                                </div>

                                {/* Render clickable citations if available */}
                                {msg.citedBooks && msg.citedBooks.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1 max-w-full">
                                        {msg.citedBooks.map((b) => (
                                            <button
                                                key={b.id || b._id}
                                                onClick={() => handleBookClick(b.id || b._id)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-gray-700 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-500 rounded-lg text-[11px] font-medium text-blue-700 dark:text-blue-300 transition shadow-xs text-left"
                                            >
                                                <FiBookOpen className="text-blue-600 dark:text-blue-400 shrink-0" />
                                                <span className="truncate max-w-[150px]">{b.name}</span>
                                                <span className="text-gray-500 dark:text-gray-400 font-normal">
                                                    {b.price === 0 ? 'Free' : `₹${b.price}`}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-none text-xs text-gray-500 dark:text-gray-400 self-start">
                                <span>Searching library catalog...</span>
                                <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-100"></span>
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-200"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input bar */}
                    <form onSubmit={handleSubmit} className="p-2 border-t dark:border-gray-700 flex bg-gray-50 dark:bg-gray-900 items-center gap-1.5">
                        <input 
                            type="text" 
                            className="flex-1 bg-white dark:bg-gray-800 border dark:border-gray-600 px-3 py-2 text-xs sm:text-sm rounded-full text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                            placeholder="Ask about books, genres, or topics..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading}
                        />
                        <button 
                            type="submit" 
                            className="text-white bg-blue-600 hover:bg-blue-700 p-2.5 rounded-full transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shrink-0" 
                            disabled={loading || !input.trim()}
                            aria-label="Send Message"
                        >
                            <IoSend className="text-sm" />
                        </button>
                    </form>
                </div>
            ) : (
                <button 
                    onClick={toggleChat}
                    className="group relative bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-4 rounded-full shadow-2xl transition transform hover:scale-110 flex items-center justify-center"
                    aria-label="Open AI Assistant"
                >
                    <BsFillChatFill className="text-2xl" />
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500 border-2 border-white"></span>
                    </span>
                </button>
            )}
        </div>
    );
};

export default AIAssistant;
