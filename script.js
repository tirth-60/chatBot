// DOM Elements
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const clearButton = document.getElementById('clear-button');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const loginButton = document.getElementById('login-button');
const historyList = document.getElementById('history-list');

// Chat history
let chatHistory = [];
let conversationHistory = [];

// Function to create a message element
function createMessageElement(content, isUser, isHtml = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add(isUser ? 'user-message' : 'ai-message');
    
    if (isHtml) {
        messageDiv.innerHTML = content;
    } else {
        messageDiv.textContent = content;
    }
    
    // Add timestamp
    const timeSpan = document.createElement('div');
    timeSpan.classList.add('message-time');
    const now = new Date();
    timeSpan.textContent = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    messageDiv.appendChild(timeSpan);
    
    return messageDiv;
}

// Function to display typing indicator
function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.classList.add('typing-indicator');
    indicator.innerHTML = '<span></span><span></span><span></span>';
    indicator.id = 'typing-indicator';
    chatContainer.appendChild(indicator);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Function to remove typing indicator
function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Function to handle user message
function handleUserMessage(existingMessage) {
    // Use existing message (for retry) or get from input field
    const message = existingMessage || userInput.value.trim();
    if (!message) return;
    
    // Add user message to chat
    const userMessageElement = createMessageElement(message, true);
    chatContainer.appendChild(userMessageElement);
    
    // Clear input field
    userInput.value = '';
    
    // Save to chat history
    chatHistory.push({ role: 'user', content: message });
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Show typing indicator
    showTypingIndicator();
    
    // Get AI response from backend
    getAIResponse(message);

    // Add to history panel
    if (!existingMessage) {
        updateHistory(message);
    }
}

// Function to check if server is running
async function isServerRunning() {
    try {
        // Use the health check endpoint to verify server status
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch('http://localhost:3000/health', {
            method: 'GET',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            return data.status === 'ok';
        }
        
        return false;
    } catch (error) {
        console.error('Server check error:', error);
        return false;
    }
}

// Function to get AI response from backend
async function getAIResponse(userMessage) {
    try {
        // Check if server is running
        const serverRunning = await isServerRunning();
        
        if (!serverRunning) {
            throw new Error('Server is not running. Please start the server with "node server.js"');
        }
        
        // Call backend API with absolute URL
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: userMessage,
                history: chatHistory
            }),
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
            }
            // Check if it's a quota exceeded error
            if (response.status === 429) {
                throw new Error('API quota exceeded. Please try again later.');
            }
            throw new Error('Failed to get response from server');
        }
        
        const data = await response.json();
        const aiResponse = data.response;
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Add AI response to chat
        const formattedResponse = marked.parse(aiResponse);
        const aiMessageElement = createMessageElement(formattedResponse, false, true);
        chatContainer.appendChild(aiMessageElement);
        
        // If this is a quota exceeded fallback response, don't save to history
        if (!data.quotaExceeded) {
            // Save to chat history
            chatHistory.push({ role: 'assistant', content: aiResponse });
        }
        
        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
    } catch (error) {
        console.error('Error getting AI response:', error);
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Display more informative error message
        let errorMsg = "Sorry, I encountered an error. ";
        
        if (error.message.includes("Server is not running")) {
            errorMsg += "The server is not running. Please start the server by running 'npm start' in the terminal.";
        } else if (error.message.includes("API quota exceeded")) {
            // Create a special error message for quota exceeded
            const errorDiv = document.createElement('div');
            errorDiv.classList.add('ai-message', 'error-message');
            
            // Check if we have retry information from the server
            let retryAfter = 60; // Default to 60 seconds if not provided
            let quotaDetails = {};
            
            // Try to extract retry information from the error response
            try {
                if (error.response && error.response.json) {
                    const errorData = await error.response.json();
                    if (errorData.retryAfter) {
                        retryAfter = errorData.retryAfter;
                    }
                    if (errorData.quotaDetails) {
                        quotaDetails = errorData.quotaDetails;
                    }
                }
            } catch (parseError) {
                console.error('Error parsing error response:', parseError);
            }
            
            // Create a countdown timer element
            const countdownId = 'quota-countdown-' + Date.now();
            
            errorDiv.innerHTML = `
                <div class="quota-error">
                    <h3>⚠️ API Quota Exceeded</h3>
                    <p>The Google Gemini API quota has been exceeded. This typically happens when:</p>
                    <ul>
                        <li>You've reached the free tier usage limits</li>
                        <li>There are too many requests in a short period</li>
                        <li>Your API key has usage restrictions</li>
                    </ul>
                    <p>Possible solutions:</p>
                    <ul>
                        <li>Wait <span id="${countdownId}">${retryAfter}</span> seconds and try again</li>
                        <li>Check your Google AI Studio dashboard for quota information</li>
                        <li>Consider upgrading to a paid tier if you need more capacity</li>
                    </ul>
                </div>
                <div class="message-time">${new Date().getHours()}:${new Date().getMinutes().toString().padStart(2, '0')}</div>
            `;
            
            chatContainer.appendChild(errorDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            
            // Start the countdown timer
            const countdownElement = document.getElementById(countdownId);
            if (countdownElement && retryAfter > 0) {
                let secondsLeft = retryAfter;
                const countdownInterval = setInterval(() => {
                    secondsLeft--;
                    if (secondsLeft <= 0) {
                        clearInterval(countdownInterval);
                        countdownElement.textContent = '0';
                        // Add a retry button
                        const retryButton = document.createElement('button');
                        retryButton.textContent = 'Try Again';
                        retryButton.classList.add('retry-button');
                        retryButton.onclick = () => handleUserMessage(chatHistory[chatHistory.length - 1].content);
                        errorDiv.appendChild(retryButton);
                    } else {
                        countdownElement.textContent = secondsLeft;
                    }
                }, 1000);
            }
            
            return; // Exit early after displaying custom message
        } else if (error.message.includes("Failed to get response")) {
            errorMsg += "Failed to get a response from the server. Please check your API key and server logs.";
        } else {
            errorMsg += "Please try again or check the console for more details.";
        }
        
        const errorMessage = createMessageElement(errorMsg, false);
        chatContainer.appendChild(errorMessage);
    }
}

// Function to clear chat
function clearChat() {
    chatContainer.innerHTML = '';
    chatHistory = [];
    // Start a new conversation in the history
    conversationHistory.push([]);
}

// Function to update history panel
function updateHistory(message) {
    const listItem = document.createElement('li');
    listItem.textContent = message.substring(0, 30) + (message.length > 30 ? '...' : '');
    listItem.dataset.chatHistory = JSON.stringify(chatHistory);
    listItem.addEventListener('click', () => {
        loadConversation(listItem.dataset.chatHistory);
    });
    historyList.prepend(listItem);
}

// Function to load a conversation from history
function loadConversation(historyJson) {
    chatHistory = JSON.parse(historyJson);
    chatContainer.innerHTML = '';
    chatHistory.forEach(item => {
        const messageElement = createMessageElement(item.content, item.role === 'user');
        chatContainer.appendChild(messageElement);
    });
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Event listeners
sendButton.addEventListener('click', () => handleUserMessage());

userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        handleUserMessage();
    }
});

clearButton.addEventListener('click', clearChat);

darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('darkMode', 'enabled');
    } else {
        localStorage.removeItem('darkMode');
    }
});

loginButton.addEventListener('click', () => {
    window.location.href = 'login.html';
});

// Initial setup
window.addEventListener('load', async () => {
    // Check login status
    const response = await fetch('/api/user');
    const data = await response.json();
    if (data.loggedIn) {
        loginButton.textContent = 'Logout';
        loginButton.removeEventListener('click', () => {
            window.location.href = 'login.html';
        });
        // Chat history
let chatHistory = [];
let currentConversationId = null;

// ... (createMessageElement, showTypingIndicator, removeTypingIndicator functions remain the same)

// Function to handle user message
function handleUserMessage(existingMessage) {
    const message = existingMessage || userInput.value.trim();
    if (!message) return;

    const userMessageElement = createMessageElement(message, true);
    chatContainer.appendChild(userMessageElement);
    userInput.value = '';
    chatHistory.push({ role: 'user', content: message });
    chatContainer.scrollTop = chatContainer.scrollHeight;
    showTypingIndicator();
    getAIResponse(message);
}

// ... (isServerRunning function remains the same)

// Function to get AI response from backend
async function getAIResponse(userMessage) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userMessage,
                history: chatHistory,
                conversationId: currentConversationId
            }),
        });

        if (!response.ok) {
            if (response.status === 401) window.location.href = '/login.html';
            throw new Error('Failed to get response from server');
        }

        const data = await response.json();
        const aiResponse = data.response;
        currentConversationId = data.conversationId;

        removeTypingIndicator();
        const formattedResponse = marked.parse(aiResponse);
        const aiMessageElement = createMessageElement(formattedResponse, false, true);
        chatContainer.appendChild(aiMessageElement);
        chatHistory.push({ role: 'assistant', content: aiResponse });
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Refresh history list if it's a new conversation
        if (chatHistory.length <= 2) {
            loadConversations();
        }
    } catch (error) {
        console.error('Error getting AI response:', error);
        removeTypingIndicator();
        const errorMessage = createMessageElement("Sorry, I encountered an error.", false);
        chatContainer.appendChild(errorMessage);
    }
}

// Function to clear chat
function clearChat() {
    chatContainer.innerHTML = '';
    chatHistory = [];
    currentConversationId = null;
    // Initial greeting
    setTimeout(() => {
        const greeting = createMessageElement("Hello! I'm your AI assistant. How can I help you today?", false);
        chatContainer.appendChild(greeting);
        chatHistory.push({ role: 'assistant', content: "Hello! I'm your AI assistant. How can I help you today?" });
    }, 100);
}

// Function to load conversations into the history panel
async function loadConversations() {
    const response = await fetch('/api/conversations');
    if (response.ok) {
        const conversations = await response.json();
        historyList.innerHTML = '';
        conversations.forEach(conv => {
            const listItem = document.createElement('li');
            listItem.textContent = conv.title;
            listItem.dataset.conversationId = conv.id;
            listItem.addEventListener('click', () => {
                loadConversation(conv.id);
            });
            historyList.appendChild(listItem);
        });
    }
}

// Function to load a conversation from history
async function loadConversation(conversationId) {
    const response = await fetch(`/api/conversations/${conversationId}`);
    if (response.ok) {
        const messages = await response.json();
        chatContainer.innerHTML = '';
        chatHistory = [];
        currentConversationId = conversationId;
        messages.forEach(item => {
            const isHtml = item.role === 'assistant';
            const content = isHtml ? marked.parse(item.content) : item.content;
            const messageElement = createMessageElement(content, item.role === 'user', isHtml);
            chatContainer.appendChild(messageElement);
            chatHistory.push(item);
        });
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// Event listeners
sendButton.addEventListener('click', () => handleUserMessage());
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') handleUserMessage();
});
clearButton.addEventListener('click', clearChat);
darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');
});
loginButton.addEventListener('click', () => {
    window.location.href = 'login.html';
});

// Initial setup
window.addEventListener('load', async () => {
    const response = await fetch('/api/user');
    const data = await response.json();
    if (data.loggedIn) {
        loginButton.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
        loginButton.removeEventListener('click', () => { window.location.href = 'login.html'; });
        loginButton.addEventListener('click', async () => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/login.html';
        });
        loadConversations();
    } else {
        window.location.href = '/login.html';
    }

    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }
    clearChat();
});

    }

    // Load dark mode preference
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }

    // Initial greeting
    setTimeout(() => {
        const greeting = createMessageElement("Hello! I'm your AI assistant. How can I help you today?", false);
        chatContainer.appendChild(greeting);
        chatHistory.push({ role: 'assistant', content: "Hello! I'm your AI assistant. How can I help you today?" });
    }, 500);
});
