CREATE TABLE user(
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR (255) UNIQUE NOT NULL,
    password VARCHAR (255) UNIQUE NOT NULL,
    email VARCHAR (255) UNIQUE NOT NULL
)

CREATE TABLE chatHistory(
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id INTEGER NOT NULL,
    chatName VARCHAR (255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user (id)ON DELETE CASCADE
   
)

CREATE TABLE messages(
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    chat_id INTEGER NOT NULL,
    sender ENUM('user', 'bot') NOT NULL,
    messages TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chatHistory(id) ON DELETE CASCADE
)


//examples for chat history for user_id 1
INSERT INTO chatHistory (user_id, chatName) VALUES (1, "What is the capital of Malaysia?");
INSERT INTO chatHistory (user_id, chatName) VALUES (1, "Best places to visit");
INSERT INTO chatHistory (user_id, chatName) VALUES (1, "How to learn Python?");
INSERT INTO chatHistory (user_id, chatName) VALUES (1, "Tips for saving money");
INSERT INTO chatHistory (user_id, chatName) VALUES (1, "Weather forecast tomorrow");

//examples for user details login 
Name    Password    Email
mom     mom         mom@gmail.com
dad     dad         dad@gmail.com
hello   hello       hello@gmail.com
yoyo    yoyo        yoyo@gmail.com


