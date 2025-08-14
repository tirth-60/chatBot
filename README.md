# ASK Tirth AI Chatbot

A simple AI chatbot using Google's Gemini API.

## Setup and Running

### Prerequisites
- Node.js installed on your system
- A Google Gemini API key (already configured in .env file)
  - Note: The application now uses the `gemini-1.5-flash` model instead of `gemini-1.5-pro` to avoid quota limitations

### Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   node server.js
   ```

3. Open the application:
   - Open `index.html` in your browser
   - Or use a local server like Live Server in VS Code

### Troubleshooting

If the chatbot is not working:

1. Make sure the server is running (you should see "Server running on port 3000" in the terminal)
2. Check that your API key in the .env file is valid
3. Check the browser console for any errors
4. Ensure you have an internet connection for the API calls to work
5. If you see an "API quota exceeded" error, you've reached the usage limits of your Google Gemini API key. The application will show a detailed error message with:
   - Information about why quota limits occur
   - A countdown timer showing when you can try again
   - A "Try Again" button that appears when the countdown completes
   - Suggestions for resolving the issue

   Note: The application now uses the `gemini-1.5-flash` model instead of `gemini-1.5-pro` to avoid quota limitations. If you're still experiencing quota issues, you may need to:
   - Wait for your quota to reset (usually after 24 hours)
   - Check your usage in the Google AI Studio dashboard
   - Consider upgrading to a paid tier for higher limits

## Features

- Real-time chat interface
- Message history
- Typing indicators
- Clear chat functionality
- Enhanced error handling:
  - Detailed API quota exceeded error messages
  - Countdown timer for retry attempts
  - Automatic retry functionality
  - User-friendly error notifications