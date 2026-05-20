import { GoogleGenerativeAI } from '@google/generative-ai';
import Book from '../models/book.model.js';

export const chatWithAI = async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ reply: "Error: GEMINI_API_KEY is not configured in the backend environment." });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const { message } = req.body;
        
        // Fetch books for context
        const books = await Book.find().limit(50);
        const bookContext = books.map(b => `- ${b.name} (${b.category}): ${b.description}`).join("\n");

        const prompt = `You are a helpful and playful AI Book Store Assistant. 
The user said: "${message}"

Here is a list of books in our store:
${bookContext}

Answer the user's query playfully and recommend books from our store if relevant. Try to keep your answer concise (under 100 words). Format your response using markdown if helpful.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ reply: text });
    } catch (error) {
        console.error("AI Chat Error: ", error);
        res.status(500).json({ reply: "Sorry, I'm having trouble connecting to my AI brain right now!" });
    }
};

export const summarizeBook = async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ summary: "Error: GEMINI_API_KEY is missing." });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const { name, description } = req.body;

        const prompt = `Provide a fun, short, 2-to-3 sentence AI summary and recommendation for a book called "${name}". 
Its description is: "${description}". 
Tell the user why they should read it!`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ summary: text });
    } catch (error) {
        console.error("AI Summary Error: ", error);
        res.status(500).json({ summary: "Sorry, I couldn't generate a summary right now." });
    }
};
