import dotenv from "dotenv";
import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import axios from "axios";
import bcrypt, { hash } from "bcrypt";

dotenv.config(); // Load environment variables

const app = express();
app.use(express.json());
app.use(cors());

const IMAGGA_API_KEY = "acc_3e27924f9c18e49";
const IMAGGA_API_SECRET = "25aa22b49a6f8e54b7344e4df0d460aa";

const RECAPTCHA_SECRET_KEY = "6LfdQfQqAAAAAPXrGUjjGTjzyeXNqoS-R2R9t6lp";

// Connect to MySQL
const database = mysql.createPool({
  host: "localhost",
  user: "test",
  password: "test",
  database: "backend",
});

database
  .getConnection()
  .then(() => console.log("Connected to MySQL Database"))
  .catch((err) => console.error("MySQL Connection Failed:", err));

//captcha
app.post("/verify-recaptcha", async (req, res) => {
  const { token } = req.body;
  const secretKey = RECAPTCHA_SECRET_KEY;
  const verificationURL = "https://www.google.com/recaptcha/api/siteverify";

  try {
    const params = new URLSearchParams();
    params.append("secret", secretKey);
    params.append("response", token);

    const { data } = await axios.post(verificationURL, params);

    if (data.success && data.score > 0.5) {
      return res
        .status(200)
        .json({ success: true, message: "CAPTCHA verified!" });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "CAPTCHA verification failed." });
    }
  } catch (error) {
    console.error("Error verifying reCAPTCHA:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

//upload to know about what is in the image
app.post("/upload", async (req, res) => {
  try {
    const { imageUrl } = req.body; // 🔹 Get the image URL from frontend

    if (!imageUrl) {
      return res.status(400).json({ error: "No image URL provided" });
    }

    // 🔹 Send the image URL to Imagga
    const imaggaResponse = await axios.get("https://api.imagga.com/v2/tags", {
      params: { image_url: imageUrl },
      auth: { username: IMAGGA_API_KEY, password: IMAGGA_API_SECRET },
    });

    const filteredTags = imaggaResponse.data.result.tags
      .filter((tag) => tag.confidence > 50)
      .map((tag) => tag.tag.en);

    // 🔹 Send Imagga results to frontend
    res.json({ imageUrl, tags: filteredTags });
  } catch (error) {
    console.error(
      "Error analyzing image:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: "Server error analyzing image" });
  }
});

//sign up
app.post("/signup", async (req, res) => {
  const { username, password, email } = req.body;
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const query = "INSERT INTO user (username,password, email) VALUES (?, ?, ?)";
  const values = [username, hashedPassword, email];
  try {
    const [response] = await database.execute(query, values);
    if (response.affectedRows > 0) {
      res.status(200).json({ message: "User has been added." });
    } else {
      res.status(404).json({ message: "User not added." });
    }
  } catch (error) {
    console.error("Error signing up", error);
    res.status(500).json("Server error");
  }
});

//check if username already in the database
app.post("/checkUsernameExist", async (req, res) => {
  const { username } = req.body;
  const query = "SELECT * FROM user WHERE username = ?";
  const values = [username];

  try {
    const [result] = await database.query(query, values);
    if (result.length > 0) {
      res.status(200).json({ message: "Username exist in database." });
    } else {
      res.status(404).json({ message: "Username does not exist." });
    }
  } catch (error) {
    console.error("Error checking if username exist", error);
    res.status(500).json("Server error");
  }
});

//check if email already in the database
app.post("/checkEmailExist", async (req, res) => {
  const { email } = req.body;
  const query = "SELECT * FROM user WHERE email = ?";
  const values = [email];

  try {
    const [result] = await database.query(query, values);
    if (result.length > 0) {
      res.status(200).json({ message: "Email exist in database." });
    } else {
      res.status(404).json({ message: "Email does not exist." });
    }
  } catch (error) {
    console.error("Error checking if email exist", error);
    res.status(500).json("Server error");
  }
});

//get userID from username
app.post("/get_userID_from_username", async (req, res) => {
  const { username } = req.body;
  const query = "SELECT id FROM user WHERE username = ?";
  const values = [username];

  try {
    const [result] = await database.query(query, values);
    if (result.length > 0) {
      res.status(200).json({ message: "User ID found using username", result });
    } else {
      res.status(404).json({ message: "User ID not found from username." });
    }
  } catch (error) {
    console.error("Error getting userID from username", error);
    res.status(500).json("Server error.");
  }
});

//get email with this userID
app.post("/get_email_with_userID", async (req, res) => {
  const { userID } = req.body;
  const query = "SELECT email FROM user WHERE id = ?";
  const values = [userID];
  try {
    const [result] = await database.query(query, values);
    if (result.length > 0) {
      res.status(200).json({ message: "Email found with this userID", result });
    } else {
      res
        .status(404)
        .json({ message: "Email not found with the user with this userID" });
    }
  } catch (error) {
    console.error("Error checking if email is the same with user with that ID");
    res.status(500).json("Server error.");
  }
});

//reset password
app.post("/resetPassword", async (req, res) => {
  const { userID, password } = req.body;
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const query = "UPDATE user SET password = ? WHERE id = ?";
  const values = [hashedPassword, userID];
  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Password reset done." });
    } else {
      res.status(404).json({ message: "Password reset failed." });
    }
  } catch (error) {
    console.error("Error resetting password", error);
    res.status(500).json("Server error.");
  }
});

//login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const query = "SELECT password FROM user WHERE username = ?";
  try {
    const [result] = await database.query(query, [username]);
    if (result.length > 0) {
      const hashedPassword = result[0].password;
      const match = await bcrypt.compare(password, hashedPassword);

      if (match) {
        res.status(200).json({ message: "Login success." });
      } else {
        res.status(401).json({ message: "Invalid password." });
      }
    } else {
      res.status(404).json({ message: "User not found." });
    }
  } catch (error) {
    console.error("Error logging in", error);
    res.status(500).json("Server error.");
  }
});

//check userID
app.post("/getUserID", async (req, res) => {
  const { username } = req.body;
  const query = "SELECT id FROM user WHERE username = ?";
  const values = [username];

  try {
    const [result] = await database.query(query, values);
    if (result.length > 0) {
      res.status(200).json({ message: "User ID found", userID: result[0] });
    } else {
      res.status(404).json({ message: "User ID not found." });
    }
  } catch (error) {
    console.error("Error getting userID", error);
    res.status(500).json("Server error");
  }
});

//check if user has any chat history
app.post("/checkChatHistory", async (req, res) => {
  const { userID } = req.body;
  const query = "SELECT * FROM chatHistory WHERE user_id = ?";
  const values = [userID];

  try {
    const [getChatHistoryResult] = await database.query(query, values);
    if (getChatHistoryResult.length > 0) {
      res.status(200).json({
        message: "Chat history associated with user found",
        chatHistory: getChatHistoryResult,
      });
    } else {
      res
        .status(404)
        .json({ message: "Chat history not found associated with user." });
    }
  } catch (error) {
    console.error("Error getting chat history", error);
    res.status(500).json("Server error.");
  }
});

//inserting new chat title into the chat history
app.post("/adding_new_chat_title", async (req, res) => {
  const { userID, userChatTitle } = req.body;
  const query = "INSERT INTO chatHistory (user_id, chatName) VALUES (?, ?)";
  const values = [userID, userChatTitle];

  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Chat title added." });
    } else {
      res.status(404).json({ message: "Chat title not added." });
    }
  } catch (error) {
    console.error("Error adding new chat title", error);
    res.status(500).json("Server error");
  }
});

//insert message into the table as user
app.post("/send_message_as_user", async (req, res) => {
  const { chat_id, sender, messages } = req.body;
  const query =
    "INSERT INTO messages (chat_id, sender, messages) VALUES (?, ?, ?)";
  const values = [chat_id, sender, messages];

  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "User message added." });
    } else {
      res.status(404).json({ message: "User message not added." });
    }
  } catch (error) {
    console.error("Error putting sent messages as user");
    res.status(500).json("Server error");
  }
});

//insert message into the table as bot
app.post("/send_message_as_bot", async (req, res) => {
  const { chat_id, sender, messages } = req.body;
  const query =
    "INSERT INTO messages (chat_id, sender, messages) VALUES (?, ?, ?)";
  const values = [chat_id, sender, messages];

  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Bot message added." });
    } else {
      res.status(404).json({ message: "Bot message not added." });
    }
  } catch (error) {
    console.error("Error putting sent messages as bot");
    res.status(500).json("Server error");
  }
});

//get all messages from chatID
app.post("/get_all_messages", async (req, res) => {
  const { chat_id } = req.body;
  const query = "SELECT * FROM messages WHERE chat_id = ?";
  const values = [chat_id];

  try {
    const [result] = await database.query(query, values);
    if (result.length > 0) {
      res
        .status(200)
        .json({ message: "Messages found for chatID", data: result });
    } else {
      res.status(404).json({ message: "Messages not found for chatID" });
    }
  } catch (error) {
    console.error("Error getting all messages from chatID");
    res.status(500).json("Server error");
  }
});

//delete chat history
app.post("/delete_chat_history", async (req, res) => {
  const { chat_id } = req.body;
  const query = "DELETE FROM chatHistory WHERE id = ?";
  const values = [chat_id];

  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Chat history deleted." });
    } else {
      res.status(404).json({ message: "Chat history not deleted." });
    }
  } catch (error) {
    console.error("Error deleting chat history", error);
    res.status(500).json("Server error");
  }
});

//edit chathistory name
app.post("/edit_chat_history", async (req, res) => {
  const { chatName, chat_id } = req.body;
  const query = "UPDATE chatHistory SET chatName = ? WHERE id = ?";
  const values = [chat_id, chatName];

  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Chat history edited successfully." });
    } else {
      res.status(404).json({ message: "Chat history not" });
    }
  } catch (error) {
    console.error("Error editing chat history name", error);
    res.status(500).json("Server error.");
  }
});

// Start the server
app.listen(8000, () => {
  console.log("Server running on port 8000");
});
