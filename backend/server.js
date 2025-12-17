const express = require("express");
const http = require("http");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const socketIo = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { 
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
});

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const ALLOWED_USERS = ["sister1", "sister2", "sister3", "sister4"];
let db;

// Create uploads directory if it doesn't exist
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads", { recursive: true });
}

/* ================== MULTER CONFIG ================== */
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, "uploads"),
  filename: (_, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => cb(null, true),
});

/* ================== DB ================== */
async function connectDB() {
  const temp = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  await temp.execute(
    `CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`
  );
  await temp.end();

  db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  // Create users table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    )
  `);

  // Create messages table with file metadata + reply_to
  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      author VARCHAR(100),
      text TEXT,
      file_url VARCHAR(500),
      file_type VARCHAR(100),
      file_name VARCHAR(255),
      file_size INT,
      reply_to INT NULL,
      time DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_time (time),
      INDEX idx_author (author),
      INDEX idx_reply_to (reply_to)
    )
  `);

  console.log("✅ Database ready");
  await seedUsers();
}

/* ================== SEED USERS ================== */
async function seedUsers() {
  const defaultPassword = "123456";

  for (const username of ALLOWED_USERS) {
    try {
      const hash = await bcrypt.hash(defaultPassword, 10);
      await db.execute(
        "INSERT IGNORE INTO users (username, password) VALUES (?, ?)",
        [username, hash]
      );
      console.log("👤 Created/Updated user:", username);
    } catch (err) {
      console.error("Error seeding user:", username, err);
    }
  }
}

/* ================== AUTH ================== */
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!ALLOWED_USERS.includes(decoded.userId))
      return res.status(403).json({ error: "Forbidden" });

    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(401).json({ error: "Invalid token" });
  }
}

/* ================== LOGIN ================== */
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!ALLOWED_USERS.includes(username))
    return res.status(403).json({ error: "Not allowed" });

  try {
    const [rows] = await db.execute(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (!rows.length)
      return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid)
      return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { userId: username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ 
      token, 
      user: { username } 
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================== GET MESSAGES ================== */
app.get("/api/messages", auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM messages ORDER BY time ASC"
    );
    
    const messages = rows.map(msg => ({
      id: msg.id,
      author: msg.author,
      text: msg.text,
      replyTo: msg.reply_to,
      file_url: msg.file_url,
      file_type: msg.file_type,
      file_name: msg.file_name,
      file_size: msg.file_size,
      time: msg.time
    }));
    
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/* ================== SEND MESSAGE (TEXT / FILE / AUDIO / REPLY) ================== */
app.post(
  "/api/messages",
  auth,
  upload.single("file"),
  async (req, res) => {
    try {
      const author = req.user.userId;
      const text = req.body.text || null;
      const fileName = req.body.fileName || null;
      const fileSize = req.body.fileSize || null;
      const replyTo = req.body.replyTo || null;

      if (!text && !req.file)
        return res.status(400).json({ error: "Message or file required" });

      let file_url = null;
      let file_type = null;
      let file_name = null;
      let file_size = null;

      if (req.file) {
        file_url = `/uploads/${req.file.filename}`;
        file_type = req.file.mimetype;
        file_name = fileName || req.file.originalname;
        file_size = fileSize || req.file.size;
      }

      const [result] = await db.execute(
        "INSERT INTO messages (author, text, file_url, file_type, file_name, file_size, reply_to) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [author, text, file_url, file_type, file_name, file_size, replyTo]
      );

      const [newMessage] = await db.execute(
        "SELECT * FROM messages WHERE id = ?",
        [result.insertId]
      );

      const msg = {
        id: result.insertId,
        author,
        text,
        replyTo,
        file_url,
        file_type,
        file_name,
        file_size,
        time: new Date(newMessage[0].time)
      };

      io.emit("newMessage", msg);
      res.json(msg);
    } catch (err) {
      console.error("Error sending message:", err);
      res.status(500).json({ error: "Failed to send message" });
    }
  }
);

/* ================== GET FILE INFO ================== */
app.get("/api/messages/:id/file", auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await db.execute(
      "SELECT file_url, file_type, file_name, file_size FROM messages WHERE id = ?",
      [id]
    );

    if (!rows.length) return res.status(404).json({ error: "File not found" });

    const file = rows[0];
    const filePath = path.join(__dirname, file.file_url);

    if (!fs.existsSync(filePath))
      return res.status(404).json({ error: "File not found on server" });

    res.json(file);
  } catch (err) {
    console.error("Error getting file info:", err);
    res.status(500).json({ error: "Failed to get file info" });
  }
});

/* ================== EDIT MESSAGE ================== */
app.put("/api/messages/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text?.trim())
      return res.status(400).json({ error: "Text required" });

    const [rows] = await db.execute(
      "SELECT * FROM messages WHERE id = ?",
      [id]
    );

    if (!rows.length) return res.status(404).json({ error: "Message not found" });
    if (rows[0].author !== req.user.userId)
      return res.status(403).json({ error: "Not allowed" });

    await db.execute("UPDATE messages SET text = ? WHERE id = ?", [text, id]);

    const updated = { ...rows[0], text };
    io.emit("updateMessage", updated);
    res.json(updated);
  } catch (err) {
    console.error("Error editing message:", err);
    res.status(500).json({ error: "Failed to edit message" });
  }
});

/* ================== DELETE MESSAGE ================== */
app.delete("/api/messages/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute("SELECT * FROM messages WHERE id = ?", [id]);

    if (!rows.length) return res.status(404).json({ error: "Message not found" });
    if (rows[0].author !== req.user.userId)
      return res.status(403).json({ error: "Not allowed" });

    if (rows[0].file_url) {
      const filePath = path.join(__dirname, rows[0].file_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await db.execute("DELETE FROM messages WHERE id = ?", [id]);
    io.emit("deleteMessage", { id });
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(500).json({ error: "Failed to delete message" });
  }
});

/* ================== GET ALL FILES ================== */
app.get("/api/files", auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM messages WHERE file_url IS NOT NULL ORDER BY time DESC"
    );
    
    const files = rows.map(msg => ({
      id: msg.id,
      author: msg.author,
      text: msg.text,
      replyTo: msg.reply_to,
      file_url: msg.file_url,
      file_type: msg.file_type,
      file_name: msg.file_name,
      file_size: msg.file_size,
      time: msg.time
    }));
    
    res.json(files);
  } catch (err) {
    console.error("Error fetching files:", err);
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

/* ================== SOCKET AUTH ================== */
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error: No token"));
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!ALLOWED_USERS.includes(decoded.userId)) return next(new Error("Forbidden"));

    socket.user = decoded;
    next();
  } catch (err) {
    console.error("Socket auth error:", err);
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.user.userId);
  
  socket.on("disconnect", () => {
    console.log("🔌 Disconnected:", socket.user.userId);
  });
});

/* ================== CLEANUP OLD FILES ================== */
async function cleanupOldFiles() {
  try {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [oldMessages] = await db.execute(
      "SELECT id, file_url FROM messages WHERE file_url IS NOT NULL AND time < ?",
      [cutoffDate]
    );
    
    for (const msg of oldMessages) {
      const filePath = path.join(__dirname, msg.file_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await db.execute("DELETE FROM messages WHERE id = ?", [msg.id]);
    }
    
    console.log(`🧹 Cleaned up ${oldMessages.length} old files`);
  } catch (err) {
    console.error("Cleanup error:", err);
  }
}
setInterval(cleanupOldFiles, 60 * 60 * 1000);

/* ================== HEALTH CHECK ================== */
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uploads: fs.readdirSync("uploads").length
  });
});

/* ================== START ================== */
const PORT = process.env.PORT || 4000;

server.listen(PORT, async () => {
  await connectDB();
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
