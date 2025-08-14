const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the users database.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER,
        role TEXT,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations (id)
    )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });
});

function createUser(username, password, callback) {
    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            return callback(err);
        }
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], function(err) {
            if (err) {
                return callback(err);
            }
            callback(null, { id: this.lastID });
        });
    });
}

function findUser(username, callback) {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) {
            return callback(err);
        }
        callback(null, row);
    });
}

function createConversation(userId, title, callback) {
    db.run('INSERT INTO conversations (user_id, title) VALUES (?, ?)', [userId, title], function(err) {
        if (err) {
            return callback(err);
        }
        callback(null, { id: this.lastID });
    });
}

function addMessage(conversationId, role, content, callback) {
    db.run('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)', [conversationId, role, content], function(err) {
        if (err) {
            return callback(err);
        }
        callback(null, { id: this.lastID });
    });
}

function getConversations(userId, callback) {
    db.all('SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
        if (err) {
            return callback(err);
        }
        callback(null, rows);
    });
}

function getMessages(conversationId, callback) {
    db.all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [conversationId], (err, rows) => {
        if (err) {
            return callback(err);
        }
        callback(null, rows);
    });
}

module.exports = {
    createUser,
    findUser,
    createConversation,
    addMessage,
    getConversations,
    getMessages,
    db
};
