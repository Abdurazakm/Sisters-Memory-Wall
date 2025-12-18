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

  // Users (Updated with last_feed_check)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY, 
      username VARCHAR(100) UNIQUE NOT NULL, 
      password VARCHAR(255) NOT NULL,
      profile_photo VARCHAR(500) DEFAULT NULL,
      bio TEXT DEFAULT NULL,
      last_feed_check DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Profile Photo History
  await db.execute(`
    CREATE TABLE IF NOT EXISTS profile_photos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100),
      photo_url VARCHAR(500),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Chat Messages
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
      is_read BOOLEAN DEFAULT FALSE, 
      time DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Feed Posts
  await db.execute(`CREATE TABLE IF NOT EXISTS posts (id INT AUTO_INCREMENT PRIMARY KEY, author VARCHAR(100), text TEXT, type ENUM('post', 'dua') DEFAULT 'post', time DATETIME DEFAULT CURRENT_TIMESTAMP)`);

  // Dua Confirmations
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

  console.log("✅ Database System Ready with Feed Tracking");
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
    req.user = decoded;
    next();
  } catch (err) { res.status(401).json({ error: "Invalid token" }); }
}

/* ================== UNREAD / NOTIFICATION ROUTES ================== */

app.get("/api/unread-counts", auth, async (req, res) => {
  try {
    const username = req.user.userId;

    // 1. Count Unread Chat Messages
    const [chatRows] = await db.execute(
      "SELECT COUNT(*) as count FROM messages WHERE author != ? AND is_read = false", 
      [username]
    );

    // 2. Count Unread Feed Posts (Posts created after user's last check)
    const [feedRows] = await db.execute(
      `SELECT COUNT(*) as count FROM posts 
       WHERE author != ? 
       AND time > (SELECT last_feed_check FROM users WHERE username = ?)`,
      [username, username]
    );

    res.json({ 
      unreadChat: chatRows[0].count, 
      unreadFeed: feedRows[0].count 
    });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

app.post("/api/mark-read", auth, async (req, res) => {
  try {
    const { type } = req.body;
    const username = req.user.userId;

    if (type === 'chat') {
      await db.execute("UPDATE messages SET is_read = true WHERE author != ? AND is_read = false", [username]);
    } else if (type === 'feed') {
      await db.execute("UPDATE users SET last_feed_check = NOW() WHERE username = ?", [username]);
    }
    
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

/* ================== AUTH & PROFILE ROUTES ================== */
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.execute("SELECT * FROM users WHERE username = ?", [username]);
    if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });
    
    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    
    const token = jwt.sign({ userId: username }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ 
      token, 
      username: rows[0].username, 
      profilePhoto: rows[0].profile_photo,
      bio: rows[0].bio 
    });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

app.get("/api/profile/:username", auth, async (req, res) => {
  try {
    const [user] = await db.execute("SELECT username, profile_photo, bio FROM users WHERE username = ?", [req.params.username]);
    const [history] = await db.execute("SELECT photo_url, created_at FROM profile_photos WHERE username = ? ORDER BY created_at DESC", [req.params.username]);
    
    if(!user.length) return res.status(404).json({ error: "User not found" });
    res.json({ ...user[0], history });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

app.post("/api/profile/photo", auth, upload.single("photo"), async (req, res) => {
  try {
    const username = req.user.userId;
    const newPhotoUrl = `/uploads/${req.file.filename}`;
    const [currentUser] = await db.execute("SELECT profile_photo FROM users WHERE username = ?", [username]);
    if (currentUser[0].profile_photo) {
      await db.execute("INSERT INTO profile_photos (username, photo_url) VALUES (?, ?)", [username, currentUser[0].profile_photo]);
    }
    await db.execute("UPDATE users SET profile_photo = ? WHERE username = ?", [newPhotoUrl, username]);
    res.json({ success: true, photoUrl: newPhotoUrl });
  } catch (err) { res.status(500).json({ error: "Upload failed" }); }
});

app.put("/api/profile/settings", auth, async (req, res) => {
  try {
    const oldUsername = req.user.userId;
    const { newUsername, newPassword, bio, currentPassword } = req.body;
    const [userRows] = await db.execute("SELECT password FROM users WHERE username = ?", [oldUsername]);
    if (!userRows.length) return res.status(404).json({ error: "User not found" });
    const isMatch = await bcrypt.compare(currentPassword, userRows[0].password);
    if (!isMatch) return res.status(401).json({ error: "Current password is incorrect." });

    if (newPassword && newPassword.trim() !== "") {
      const hash = await bcrypt.hash(newPassword, 10);
      await db.execute("UPDATE users SET password = ? WHERE username = ?", [hash, oldUsername]);
    }
    if (bio !== undefined) await db.execute("UPDATE users SET bio = ? WHERE username = ?", [bio, oldUsername]);
    if (newUsername && newUsername !== oldUsername) {
      const [existing] = await db.execute("SELECT id FROM users WHERE username = ?", [newUsername]);
      if (existing.length > 0) return res.status(400).json({ error: "Username taken." });
      await db.execute("UPDATE users SET username = ? WHERE username = ?", [newUsername, oldUsername]);
      await db.execute("UPDATE posts SET author = ? WHERE author = ?", [newUsername, oldUsername]);
      await db.execute("UPDATE messages SET author = ? WHERE author = ?", [newUsername, oldUsername]);
      await db.execute("UPDATE comments SET author = ? WHERE author = ?", [newUsername, oldUsername]);
      await db.execute("UPDATE profile_photos SET username = ? WHERE username = ?", [newUsername, oldUsername]);
      await db.execute("UPDATE dua_confirmations SET user_id = ? WHERE user_id = ?", [newUsername, oldUsername]);
    }
    res.json({ success: true, message: "Settings updated successfully" });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

/* ================== FEED POSTS ROUTES ================== */
app.get("/api/posts", auth, async (req, res) => {
  try {
    const [posts] = await db.execute(`
      SELECT p.*, (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', dc.id, 'username', dc.user_id, 'is_thanked', dc.is_thanked)) FROM dua_confirmations dc WHERE dc.dua_id = p.id) AS confirmations
      FROM posts p ORDER BY p.time DESC
    `);
    for (let post of posts) {
      const [files] = await db.execute("SELECT file_url, file_type, file_name FROM post_files WHERE post_id = ?", [post.id]);
      const [comments] = await db.execute(`SELECT c.*, r.author AS reply_to_name FROM comments c LEFT JOIN comments r ON c.reply_to = r.id WHERE c.post_id = ? ORDER BY c.time ASC`, [post.id]);
      post.files = files;
      post.comments = comments;
      post.confirmations = post.confirmations || []; 
    }
    res.json(posts);
  } catch (err) { res.status(500).json({ error: "Fetch error" }); }
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

app.post("/api/dua/confirm/:id", auth, async (req, res) => {
  try {
    const duaId = req.params.id;
    const userId = req.user.userId;
    await db.execute("INSERT IGNORE INTO dua_confirmations (dua_id, user_id) VALUES (?, ?)", [duaId, userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Confirmation failed" }); }
});

app.post("/api/dua/thank/:confId", auth, async (req, res) => {
  try {
    const { confId } = req.params;
    const currentUsername = req.user.userId;
    const [rows] = await db.execute(`SELECT p.author FROM posts p JOIN dua_confirmations dc ON p.id = dc.dua_id WHERE dc.id = ?`, [confId]);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    if (rows[0].author !== currentUsername) return res.status(403).json({ error: "Unauthorized" });
    await db.execute("UPDATE dua_confirmations SET is_thanked = TRUE WHERE id = ?", [confId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

app.put("/api/posts/:id", auth, async (req, res) => {
  try {
    const { text } = req.body;
    const [rows] = await db.execute("SELECT author FROM posts WHERE id = ?", [req.params.id]);
    if (!rows.length || rows[0].author !== req.user.userId) return res.status(403).send();
    await db.execute("UPDATE posts SET text = ? WHERE id = ?", [text, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).send(); }
});

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
    let fileData = [null, null, null, null];
    if (req.file) fileData = [`/uploads/${req.file.filename}`, req.file.mimetype, req.file.originalname, req.file.size];

    const [result] = await db.execute("INSERT INTO messages (author, text, file_url, file_type, file_name, file_size, reply_to) VALUES (?, ?, ?, ?, ?, ?, ?)", [author, text || null, ...fileData, replyTo || null]);
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