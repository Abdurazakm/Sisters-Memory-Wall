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
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, true),
});

/* ================== DB ================== */
async function connectDB() {
  const temp = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  await temp.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
  await temp.end();

  db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    )
  `);

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

async function seedUsers() {
  const defaultPassword = "123456";
  for (const username of ALLOWED_USERS) {
    try {
      const hash = await bcrypt.hash(defaultPassword, 10);
      await db.execute("INSERT IGNORE INTO users (username, password) VALUES (?, ?)", [username, hash]);
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
    if (!ALLOWED_USERS.includes(decoded.userId)) return res.status(403).json({ error: "Forbidden" });
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

/* ================== LOGIN ================== */
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!ALLOWED_USERS.includes(username)) return res.status(403).json({ error: "Not allowed" });
  try {
    const [rows] = await db.execute("SELECT * FROM users WHERE username = ?", [username]);
    if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });
    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ userId: username }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { username } });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================== GET MESSAGES (WITH JOIN FOR REPLIES) ================== */
app.get("/api/messages", auth, async (req, res) => {
  try {
    // JOIN query to get reply details (author and text)
    const [rows] = await db.execute(`
      SELECT 
        m1.*, 
        m2.author AS reply_author, 
        m2.text AS reply_text,
        m2.file_name AS reply_file_name
      FROM messages m1
      LEFT JOIN messages m2 ON m1.reply_to = m2.id
      ORDER BY m1.time ASC
    `);
    
    const messages = rows.map(msg => ({
      id: msg.id,
      author: msg.author,
      text: msg.text,
      file_url: msg.file_url,
      file_type: msg.file_type,
      file_name: msg.file_name,
      time: msg.time,
      replyTo: msg.reply_to ? {
        id: msg.reply_to,
        author: msg.reply_author,
        text: msg.reply_text,
        file_name: msg.reply_file_name
      } : null
    }));
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/* ================== SEND MESSAGE (WITH POPULATED REPLY) ================== */
app.post("/api/messages", auth, upload.single("file"), async (req, res) => {
  try {
    const author = req.user.userId;
    const text = req.body.text || null;
    const replyToId = req.body.replyTo || null;

    let file_url = null, file_type = null, file_name = null, file_size = null;
    if (req.file) {
      file_url = `/uploads/${req.file.filename}`;
      file_type = req.file.mimetype;
      file_name = req.body.fileName || req.file.originalname;
      file_size = req.body.fileSize || req.file.size;
    }

    const [result] = await db.execute(
      "INSERT INTO messages (author, text, file_url, file_type, file_name, file_size, reply_to) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [author, text, file_url, file_type, file_name, file_size, replyToId]
    );

    // Fetch the newly created message JOINED with the original message details
    const [newMessageRows] = await db.execute(`
      SELECT 
        m1.*, 
        m2.author AS reply_author, 
        m2.text AS reply_text,
        m2.file_name AS reply_file_name
      FROM messages m1
      LEFT JOIN messages m2 ON m1.reply_to = m2.id
      WHERE m1.id = ?
    `, [result.insertId]);

    const msgData = newMessageRows[0];
    const msg = {
      id: msgData.id,
      author: msgData.author,
      text: msgData.text,
      file_url: msgData.file_url,
      file_type: msgData.file_type,
      file_name: msgData.file_name,
      time: msgData.time,
      replyTo: msgData.reply_to ? {
        id: msgData.reply_to,
        author: msgData.reply_author,
        text: msgData.reply_text,
        file_name: msgData.reply_file_name
      } : null
    };

    io.emit("newMessage", msg);
    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

/* ================== REMAINING ROUTES ================== */

app.put("/api/messages/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    await db.execute("UPDATE messages SET text = ? WHERE id = ?", [text, id]);
    const [rows] = await db.execute("SELECT * FROM messages WHERE id = ?", [id]);
    io.emit("updateMessage", rows[0]);
    res.json(rows[0]);
  } catch (err) { res.status(500).send(); }
});

app.delete("/api/messages/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute("SELECT file_url FROM messages WHERE id = ?", [id]);
    if (rows[0]?.file_url) {
      const filePath = path.join(__dirname, rows[0].file_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.execute("DELETE FROM messages WHERE id = ?", [id]);
    io.emit("deleteMessage", { id });
    res.json({ success: true });
  } catch (err) { res.status(500).send(); }
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) { next(new Error("Auth error")); }
});

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.user.userId);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, async () => {
  await connectDB();
  console.log(`🚀 Backend running on port ${PORT}`);
});