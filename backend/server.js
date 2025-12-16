const express = require("express");
const http = require("http");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const socketIo = require("socket.io");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "http://localhost:5173" },
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const ALLOWED_USERS = ["sister1", "sister2", "sister3", "sister4"];
let db;

/* ================== MULTER CONFIG ================== */
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, "uploads"),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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
      file_url VARCHAR(255),
      file_type VARCHAR(50),
      time DATETIME DEFAULT CURRENT_TIMESTAMP
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
        "INSERT INTO users (username, password) VALUES (?, ?)",
        [username, hash]
      );
      console.log("👤 Created user:", username);
    } catch {
      // already exists
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
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

/* ================== LOGIN ================== */
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!ALLOWED_USERS.includes(username))
    return res.status(403).json({ error: "Not allowed" });

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
    { expiresIn: "1d" }
  );

  res.json({ token });
});

/* ================== GET MESSAGES ================== */
app.get("/api/messages", auth, async (_, res) => {
  const [rows] = await db.execute(
    "SELECT * FROM messages ORDER BY time ASC"
  );
  res.json(rows);
});

/* ================== SEND MESSAGE (TEXT / FILE / AUDIO) ================== */
app.post(
  "/api/messages",
  auth,
  upload.single("file"),
  async (req, res) => {
    const author = req.user.userId;
    const text = req.body.text || null;

    if (!text && !req.file)
      return res.status(400).json({ error: "Message or file required" });

    let file_url = null;
    let file_type = null;

    if (req.file) {
      file_url = `/uploads/${req.file.filename}`;
      file_type = req.file.mimetype;
    }

    const [r] = await db.execute(
      "INSERT INTO messages (author, text, file_url, file_type) VALUES (?, ?, ?, ?)",
      [author, text, file_url, file_type]
    );

    const msg = {
      id: r.insertId,
      author,
      text,
      file_url,
      file_type,
      time: new Date(),
    };

    io.emit("newMessage", msg);
    res.json(msg);
  }
);

/* ================== EDIT MESSAGE ================== */
app.put("/api/messages/:id", auth, async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;

  if (!text?.trim())
    return res.status(400).json({ error: "Text required" });

  const [rows] = await db.execute(
    "SELECT * FROM messages WHERE id = ?",
    [id]
  );

  if (!rows.length)
    return res.status(404).json({ error: "Message not found" });

  if (rows[0].author !== req.user.userId)
    return res.status(403).json({ error: "Not allowed" });

  await db.execute(
    "UPDATE messages SET text = ? WHERE id = ?",
    [text, id]
  );

  const updated = { ...rows[0], text };
  io.emit("updateMessage", updated);
  res.json(updated);
});

/* ================== DELETE MESSAGE ================== */
app.delete("/api/messages/:id", auth, async (req, res) => {
  const { id } = req.params;

  const [rows] = await db.execute(
    "SELECT * FROM messages WHERE id = ?",
    [id]
  );

  if (!rows.length)
    return res.status(404).json({ error: "Message not found" });

  if (rows[0].author !== req.user.userId)
    return res.status(403).json({ error: "Not allowed" });

  await db.execute("DELETE FROM messages WHERE id = ?", [id]);

  io.emit("deleteMessage", { id });
  res.json({ success: true });
});

/* ================== SOCKET AUTH ================== */
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!ALLOWED_USERS.includes(decoded.userId))
      return next(new Error("Forbidden"));

    socket.user = decoded;
    next();
  } catch {
    next(new Error("Auth error"));
  }
});

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.user.userId);
});

/* ================== START ================== */
server.listen(4000, async () => {
  await connectDB();
  console.log("🚀 Backend running on http://localhost:4000");
});
