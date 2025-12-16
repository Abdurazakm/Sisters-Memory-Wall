const express = require("express");
const http = require("http");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const socketIo = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "http://localhost:5173" },
});

app.use(cors());
app.use(express.json());

const ALLOWED_USERS = ["sister1", "sister2", "sister3", "sister4"];
let db;

/* ---------------- DB ---------------- */
async function connectDB() {
  const temp = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  await temp.execute("CREATE DATABASE IF NOT EXISTS sisters_memory_wall");
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
      time DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("✅ Database ready");
  await seedUsers();
}

/* ---------------- SEED USERS (RUNS SAFELY) ---------------- */
async function seedUsers() {
  const defaultPassword = "123456";

  for (const username of ALLOWED_USERS) {
    const hash = await bcrypt.hash(defaultPassword, 10);
    try {
      await db.execute(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        [username, hash]
      );
      console.log("👤 Created user:", username);
    } catch {
      // user already exists → ignore
    }
  }
}

/* ---------------- AUTH MIDDLEWARE ---------------- */
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!ALLOWED_USERS.includes(decoded.userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

/* ---------------- LOGIN ONLY ---------------- */
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!ALLOWED_USERS.includes(username)) {
    return res.status(403).json({ error: "Not allowed" });
  }

  const [rows] = await db.execute(
    "SELECT * FROM users WHERE username = ?",
    [username]
  );

  if (!rows.length) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, rows[0].password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { userId: username },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token });
});

/* ---------------- MESSAGE ROUTES ---------------- */
app.get("/api/messages", auth, async (req, res) => {
  const [rows] = await db.execute(
    "SELECT * FROM messages ORDER BY time"
  );
  res.json(rows);
});

app.post("/api/messages", auth, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) {
    return res.status(400).json({ error: "Message required" });
  }

  const author = req.user.userId;

  const [r] = await db.execute(
    "INSERT INTO messages (author, text) VALUES (?, ?)",
    [author, text]
  );

  const msg = {
    id: r.insertId,
    author,
    text,
    time: new Date(),
  };

  io.emit("newMessage", msg);
  res.json(msg);
});

/* ---------------- SOCKET AUTH ---------------- */
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!ALLOWED_USERS.includes(decoded.userId)) {
      return next(new Error("Forbidden"));
    }

    socket.user = decoded;
    next();
  } catch {
    next(new Error("Auth error"));
  }
});

io.on("connection", (socket) => {
  console.log("🔌", socket.user.userId, "connected");
});

/* ---------------- START ---------------- */
server.listen(4000, async () => {
  await connectDB();
  console.log("🚀 Backend running on port 4000");
});
