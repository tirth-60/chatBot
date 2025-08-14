const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./database');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('./'));

// Session middleware
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Initialize Gemini API
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

// API endpoint for user registration
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.createUser(username, password, (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Error creating user' });
        }
        res.json({ message: 'User created successfully', userId: user.id });
    });
});

// API endpoint for user login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.findUser(username, (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
                req.session.userId = user.id;
                res.json({ message: 'Logged in successfully' });
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        });
    });
});

// API endpoint for user logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
});

// API endpoint to check login status
app.get('/api/user', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true });
    } else {
        res.json({ loggedIn: false });
    }
});

// API endpoint to get user's conversations
app.get('/api/conversations', isAuthenticated, (req, res) => {
    db.getConversations(req.session.userId, (err, conversations) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching conversations' });
        }
        res.json(conversations);
    });
});

// API endpoint to get messages for a conversation
app.get('/api/conversations/:id', isAuthenticated, (req, res) => {
    const conversationId = req.params.id;
    db.getMessages(conversationId, (err, messages) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching messages' });
        }
        res.json(messages);
    });
});

// API endpoint to get AI response
app.post('/api/chat', isAuthenticated, async (req, res) => {
  try {
    const { message, history, conversationId } = req.body;
    let currentConversationId = conversationId;

    // If there's no conversationId, create a new conversation
    if (!currentConversationId) {
        const title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
        db.createConversation(req.session.userId, title, (err, newConversation) => {
            if (err) {
                return res.status(500).json({ error: 'Error creating conversation' });
            }
            currentConversationId = newConversation.id;
            db.addMessage(currentConversationId, 'user', message, (err) => {
                if (err) console.error('Error saving message');
            });
            getAIResponseAndSave(req, res, message, history, currentConversationId);
        });
    } else {
        db.addMessage(currentConversationId, 'user', message, (err) => {
            if (err) console.error('Error saving message');
        });
        getAIResponseAndSave(req, res, message, history, currentConversationId);
    }
} catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
}
});

async function getAIResponseAndSave(req, res, message, history, conversationId) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(message);
        const response = await result.response.text();

        db.addMessage(conversationId, 'assistant', response, (err) => {
            if (err) console.error('Error saving AI response');
        });

        res.json({ response, conversationId });
    } catch (error) {
        console.error('Error getting AI response:', error);
        res.status(500).json({ error: 'Failed to get AI response' });
    }
}

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});