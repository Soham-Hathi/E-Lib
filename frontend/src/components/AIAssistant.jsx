import { useState } from 'react';
import { BsFillChatFill } from 'react-icons/bs';
import { IoCloseSharp, IoSend } from 'react-icons/io5';
import axios from 'axios';

const AIAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([{ sender: 'ai', text: 'Hi! I am your AI Book Assistant. How can I help you find your next great read?' }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const toggleChat = () => setIsOpen(!isOpen);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input.trim();
        setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            const res = await axios.post('http://localhost:3000/ai/chat', { message: userMsg });
            setMessages(prev => [...prev, { sender: 'ai', text: res.data.reply }]);
        } catch (error) {
            setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I'm having trouble thinking right now. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-5 right-5 z-50">
            {isOpen ? (
                <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-lg w-80 h-96 flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-300 transform origin-bottom-right">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 flex justify-between items-center shadow-md">
                        <div className="flex items-center gap-2">
                            <BsFillChatFill />
                            <h3 className="font-semibold text-sm">AI Book Assistant</h3>
                        </div>
                        <IoCloseSharp className="cursor-pointer text-xl hover:text-red-200 transition" onClick={toggleChat} />
                    </div>
                    
                    <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3 scroll-smooth">
                        {messages.map((msg, i) => (
                            <div key={i} className={`p-3 rounded-lg max-w-[85%] text-sm leading-relaxed shadow-sm ${msg.sender === 'user' ? 'bg-blue-100 text-blue-900 self-end rounded-br-none' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 self-start rounded-bl-none'}`}>
                                {msg.text}
                            </div>
                        ))}
                        {loading && <div className="text-gray-500 text-xs italic ml-2 flex items-center gap-1">
                            <span className="animate-bounce">.</span>
                            <span className="animate-bounce delay-100">.</span>
                            <span className="animate-bounce delay-200">.</span>
                        </div>}
                    </div>

                    <form onSubmit={sendMessage} className="p-2 border-t dark:border-gray-700 flex bg-gray-50 dark:bg-gray-900 items-center">
                        <input 
                            type="text" 
                            className="flex-1 bg-transparent outline-none px-3 py-2 text-sm dark:text-white rounded-l-full bg-white dark:bg-gray-800 border dark:border-gray-600 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none transition-all" 
                            placeholder="Ask for a book..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <button type="submit" className="text-white bg-blue-600 hover:bg-blue-700 p-2 ml-1 rounded-full transition-transform transform hover:scale-105 disabled:opacity-50" disabled={loading || !input.trim()}>
                            <IoSend />
                        </button>
                    </form>
                </div>
            ) : (
                <button 
                    onClick={toggleChat}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-4 rounded-full shadow-lg transition-transform transform hover:scale-110 flex items-center justify-center animate-bounce"
                >
                    <BsFillChatFill className="text-2xl" />
                </button>
            )}
        </div>
    );
};

export default AIAssistant;
