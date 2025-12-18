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

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
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
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

/* ================== DB & TABLES ================== */
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

  // Users
  await db.execute(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(100) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL)`);

  // Chat Messages
  await db.execute(`CREATE TABLE IF NOT EXISTS messages (id INT AUTO_INCREMENT PRIMARY KEY, author VARCHAR(100), text TEXT, file_url VARCHAR(500), file_type VARCHAR(100), file_name VARCHAR(255), file_size INT, reply_to INT NULL, time DATETIME DEFAULT CURRENT_TIMESTAMP)`);

  // Feed Posts
  await db.execute(`CREATE TABLE IF NOT EXISTS posts (id INT AUTO_INCREMENT PRIMARY KEY, author VARCHAR(100), text TEXT, type ENUM('post', 'dua') DEFAULT 'post', time DATETIME DEFAULT CURRENT_TIMESTAMP)`);

  // Dua Confirmations (UPDATED WITH is_thanked)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS dua_confirmations (
      id INT AUTO_INCREMENT PRIMARY KEY, 
      dua_id INT, 
      user_id VARCHAR(100), 
      is_thanked BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
      UNIQUE KEY unique_dua_user (dua_id, user_id), 
      FOREIGN KEY (dua_id) REFERENCES posts(id) ON DELETE CASCADE
    )
  `);

  // Multiple Files for Posts
  await db.execute(`CREATE TABLE IF NOT EXISTS post_files (id INT AUTO_INCREMENT PRIMARY KEY, post_id INT, file_url VARCHAR(500), file_type VARCHAR(100), file_name VARCHAR(255), FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE)`);

  // Comments
  await db.execute(`CREATE TABLE IF NOT EXISTS comments (id INT AUTO_INCREMENT PRIMARY KEY, post_id INT, author VARCHAR(100), text TEXT, reply_to INT NULL, time DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE)`);

  console.log("✅ Database System and Dua Feature Ready");
  await seedUsers();
}

async function seedUsers() {
  const defaultPassword = "123456";
  for (const username of ALLOWED_USERS) {
    try {
      const hash = await bcrypt.hash(defaultPassword, 10);
      await db.execute("INSERT IGNORE INTO users (username, password) VALUES (?, ?)", [username, hash]);
    } catch (err) { console.error("Error seeding user:", username, err); }
  }
}

/* ================== AUTH MIDDLEWARE ================== */
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });
  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!ALLOWED_USERS.includes(decoded.userId)) return res.status(403).json({ error: "Forbidden" });
    req.user = decoded;
    next();
  } catch (err) { res.status(401).json({ error: "Invalid token" }); }
}

/* ================== AUTH ROUTES ================== */
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
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

/* ================== FEED POSTS ROUTES ================== */
app.get("/api/posts", auth, async (req, res) => {
  try {
    // UPDATED QUERY: Includes 'id' and 'is_thanked' in the JSON object
    const [posts] = await db.execute(`
      SELECT p.*, 
      (SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', dc.id, 
            'username', dc.user_id, 
            'is_thanked', dc.is_thanked
          )
        ) 
       FROM dua_confirmations dc 
       WHERE dc.dua_id = p.id) AS confirmations
      FROM posts p 
      ORDER BY p.time DESC
    `);

    for (let post of posts) {
      const [files] = await db.execute("SELECT file_url, file_type, file_name FROM post_files WHERE post_id = ?", [post.id]);
      const [comments] = await db.execute(`SELECT c.*, r.author AS reply_to_name FROM comments c LEFT JOIN comments r ON c.reply_to = r.id WHERE c.post_id = ? ORDER BY c.time ASC`, [post.id]);
      post.files = files;
      post.comments = comments;
      post.confirmations = post.confirmations || []; 
    }
    res.json(posts);
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: "Fetch error" }); 
  }
});

app.post("/api/posts", auth, upload.array("files", 10), async (req, res) => {
  try {
    const author = req.user.userId;
    const { text, type } = req.body; 
    const [result] = await db.execute("INSERT INTO posts (author, text, type) VALUES (?, ?, ?)", [author, text || null, type || 'post']);
    const postId = result.insertId;

    if (req.files) {
      for (let file of req.files) {
        await db.execute("INSERT INTO post_files (post_id, file_url, file_type, file_name) VALUES (?, ?, ?, ?)", [postId, `/uploads/${file.filename}`, file.mimetype, file.originalname]);
      }
    }
    
    io.emit("newPost", { id: postId, author, text, type: type || 'post' });
    res.json({ success: true, id: postId });
  } catch (err) { res.status(500).send(); }
});

// DUA CONFIRMATION (AMEEN)
app.post("/api/dua/confirm/:id", auth, async (req, res) => {
  try {
    const duaId = req.params.id;
    const userId = req.user.userId;

    await db.execute(
      "INSERT IGNORE INTO dua_confirmations (dua_id, user_id) VALUES (?, ?)",
      [duaId, userId]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Confirmation failed" });
  }
});

// NEW: SAY AMIN (THANK THE PERSON)
app.post("/api/dua/thank/:confId", auth, async (req, res) => {
  try {
    const { confId } = req.params;
    const currentUsername = req.user.userId;

    // Verify ownership: Only post author can say Amin
    const [rows] = await db.execute(`
      SELECT p.author 
      FROM posts p
      JOIN dua_confirmations dc ON p.id = dc.dua_id
      WHERE dc.id = ?`, 
      [confId]
    );

    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    if (rows[0].author !== currentUsername) return res.status(403).json({ error: "Unauthorized" });

    await db.execute("UPDATE dua_confirmations SET is_thanked = TRUE WHERE id = ?", [confId]);
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// EDIT POST
app.put("/api/posts/:id", auth, async (req, res) => {
  try {
    const { text } = req.body;
    const [rows] = await db.execute("SELECT author FROM posts WHERE id = ?", [req.params.id]);
    if (!rows.length || rows[0].author !== req.user.userId) return res.status(403).send();

    await db.execute("UPDATE posts SET text = ? WHERE id = ?", [text, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).send(); }
});

// DELETE POST
app.delete("/api/posts/:id", auth, async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT author FROM posts WHERE id = ?", [req.params.id]);
    if (!rows.length || rows[0].author !== req.user.userId) return res.status(403).send();

    const [files] = await db.execute("SELECT file_url FROM post_files WHERE post_id = ?", [req.params.id]);
    files.forEach(f => {
      const p = path.join(__dirname, f.file_url);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });

    await db.execute("DELETE FROM posts WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).send(); }
});

/* ================== COMMENT ROUTES ================== */
app.post("/api/posts/:postId/comments", auth, async (req, res) => {
  try {
    const { text, replyTo } = req.body;
    const [result] = await db.execute("INSERT INTO comments (post_id, author, text, reply_to) VALUES (?, ?, ?, ?)", [req.params.postId, req.user.userId, text, replyTo || null]);
    const [comment] = await db.execute(`SELECT c.*, r.author AS reply_to_name FROM comments c LEFT JOIN comments r ON c.reply_to = r.id WHERE c.id = ?`, [result.insertId]);
    res.json(comment[0]);
  } catch (err) { res.status(500).send(); }
});

app.put("/api/comments/:id", auth, async (req, res) => {
  try {
    const { text } = req.body;
    await db.execute("UPDATE comments SET text = ? WHERE id = ? AND author = ?", [text, req.params.id, req.user.userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).send(); }
});

app.delete("/api/comments/:id", auth, async (req, res) => {
  try {
    await db.execute("DELETE FROM comments WHERE id = ? AND author = ?", [req.params.id, req.user.userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).send(); }
});

/* ================== CHAT MESSAGE ROUTES ================== */
app.get("/api/messages", auth, async (req, res) => {
  try {
    const [rows] = await db.execute(`SELECT m1.*, m2.author AS reply_author, m2.text AS reply_text FROM messages m1 LEFT JOIN messages m2 ON m1.reply_to = m2.id ORDER BY m1.time ASC`);
    res.json(rows);
  } catch (err) { res.status(500).send(); }
});

app.post("/api/messages", auth, upload.single("file"), async (req, res) => {
  try {
    const author = req.user.userId;
    const { text, replyTo } = req.body;
    let file = [null, null, null, null];
    if (req.file) file = [`/uploads/${req.file.filename}`, req.file.mimetype, req.file.originalname, req.file.size];

    const [result] = await db.execute("INSERT INTO messages (author, text, file_url, file_type, file_name, file_size, reply_to) VALUES (?, ?, ?, ?, ?, ?, ?)", [author, text || null, ...file, replyTo || null]);
    const [newMsg] = await db.execute(`SELECT m1.*, m2.author AS reply_author, m2.text AS reply_text FROM messages m1 LEFT JOIN messages m2 ON m1.reply_to = m2.id WHERE m1.id = ?`, [result.insertId]);
    
    io.emit("newMessage", newMsg[0]);
    res.json(newMsg[0]);
  } catch (err) { res.status(500).send(); }
});

/* ================== SOCKET SETUP ================== */
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) { next(new Error("Auth error")); }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, async () => {
  await connectDB();
  console.log(`🚀 Backend running on port ${PORT}`);
});