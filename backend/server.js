const express = require("express");
const http = require("http");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const socketIo = require("socket.io");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { 
    origin: "https://4plusone.netlify.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  },
});

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

app.use(cors({
  origin: "https://4plusone.netlify.app",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Added OPTIONS
  allowedHeaders: ["Content-Type", "Authorization"],   // Explicitly allow these
  credentials: true
}));

// Add this right after the cors middleware to handle preflight globally
app.options("*", cors());app.use(express.json());

const ALLOWED_USERS = ["Abdurazaqm", "Semira", "ZebibaS", "Hawlet", "ZebibaM"];

/* ================== MULTER CONFIG ================== */
const storage = multer.memoryStorage();
const upload = multer({ 
  storage, 
  limits: { fileSize: 50 * 1024 * 1024 } 
});

/* ================== STORAGE HELPER ================== */
async function uploadToSupabase(file) {
  try {
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(fileName, file.buffer, { 
        contentType: file.mimetype, 
        upsert: false 
      });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fileName);
    return publicUrl;
  } catch (err) {
    console.error("Storage Error:", err);
    throw err;
  }
}

/* ================== AUTH MIDDLEWARE ================== */
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });
  try {
    const token = header.split(" ")[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) { res.status(401).json({ error: "Invalid token" }); }
}

/* ================== AUTH & PROFILE ROUTES ================== */
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const { data: user } = await supabase.from('users').select('*').eq('username', username).single();
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: username }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, username: user.username, profilePhoto: user.profile_photo, bio: user.bio });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

app.get("/api/profile/:username", auth, async (req, res) => {
  try {
    const { data: user } = await supabase.from('users').select('username, profile_photo, bio').eq('username', req.params.username).single();
    const { data: history } = await supabase.from('profile_photos').select('photo_url, created_at').eq('username', req.params.username).order('created_at', { ascending: false });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ ...user, history });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

app.post("/api/profile/photo", auth, upload.single("photo"), async (req, res) => {
  try {
    const username = req.user.userId;
    const publicUrl = await uploadToSupabase(req.file);
    const { data: user } = await supabase.from('users').select('profile_photo').eq('username', username).single();
    if (user?.profile_photo) {
      await supabase.from('profile_photos').insert({ username, photo_url: user.profile_photo });
    }
    await supabase.from('users').update({ profile_photo: publicUrl }).eq('username', username);
    res.json({ success: true, photoUrl: publicUrl });
  } catch (err) { res.status(500).json({ error: "Upload failed" }); }
});

// FIXED SETTINGS ROUTE
app.put("/api/profile/settings", auth, async (req, res) => {
  try {
    const oldUsername = req.user.userId;
    const { newUsername, newPassword, bio, currentPassword } = req.body;

    // 1. Get current user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('password')
      .eq('username', oldUsername)
      .single();

    if (userError || !user) return res.status(404).json({ error: "User not found" });

    // 2. Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ error: "Current password is incorrect." });

    let updates = {};
    if (bio !== undefined) updates.bio = bio;
    if (newPassword && newPassword.trim() !== "") {
      updates.password = await bcrypt.hash(newPassword, 10);
    }

    // 3. Handle Username Change
    if (newUsername && newUsername !== oldUsername) {
      const { data: existing } = await supabase.from('users').select('username').eq('username', newUsername).maybeSingle();
      if (existing) return res.status(400).json({ error: "Username taken." });

      // If your Supabase doesn't have "ON UPDATE CASCADE" enabled on foreign keys, 
      // you must update all related tables manually:
      await supabase.from('posts').update({ author: newUsername }).eq('author', oldUsername);
      await supabase.from('messages').update({ author: newUsername }).eq('author', oldUsername);
      await supabase.from('comments').update({ author: newUsername }).eq('author', oldUsername);
      await supabase.from('profile_photos').update({ username: newUsername }).eq('username', oldUsername);
      await supabase.from('dua_confirmations').update({ username: newUsername }).eq('username', oldUsername);
      
      updates.username = newUsername;
    }

    // 4. Update the user
    const { error: updateError } = await supabase.from('users').update(updates).eq('username', oldUsername);
    if (updateError) throw updateError;

    res.json({ success: true, message: "Settings updated successfully" });
  } catch (err) { 
    console.error("Settings Update Error:", err);
    res.status(500).json({ error: "Server error" }); 
  }
});

/* ================== FEED POSTS ROUTES ================== */
app.get("/api/posts", auth, async (req, res) => {
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        author_details:users!posts_author_fkey(profile_photo),
        post_files (*),
        confirmations:dua_confirmations!dua_confirmations_post_id_fkey (*),
        comments (
          *,
          reply_to_name:comments!reply_to(author)
        )
      `)
      .order('time', { ascending: false });

    if (error) throw error;

    const formattedPosts = posts.map(post => ({
      ...post,
      author_photo: post.author_details?.profile_photo,
      comments: (post.comments || []).map(c => ({
        ...c,
        reply_to_name: c.reply_to_name?.author || null
      })).sort((a, b) => new Date(a.time) - new Date(b.time))
    }));

    res.json(formattedPosts);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/posts", auth, upload.array("files", 10), async (req, res) => {
  try {
    const author = req.user.userId;
    const { text, type } = req.body;
    const { data: post, error: postErr } = await supabase.from('posts').insert({ author, text, type: type || 'post' }).select().single();
    if (postErr) throw postErr;

    if (req.files && req.files.length > 0) {
      const filesData = await Promise.all(req.files.map(async (file) => {
        const url = await uploadToSupabase(file);
        return { post_id: post.id, file_url: url, file_type: file.mimetype, file_name: file.originalname };
      }));
      await supabase.from('post_files').insert(filesData.filter(f => f !== null));
    }

    io.emit("newPost", post);
    res.json({ success: true, id: post.id });
  } catch (err) { res.status(500).json({ error: "Failed to create post" }); }
});

app.put("/api/posts/:id", auth, async (req, res) => {
  try {
    const { text } = req.body;
    const { data, error } = await supabase
      .from('posts')
      .update({ text })
      .eq('id', req.params.id)
      .eq('author', req.user.userId)
      .select()
      .single();

    if (error) throw error;
    io.emit("newPost"); 
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

app.delete("/api/posts/:id", auth, async (req, res) => {
  try {
    const { data: post } = await supabase.from('posts').select('author').eq('id', req.params.id).single();
    if (!post || post.author !== req.user.userId) return res.status(403).send();
    await supabase.from('posts').delete().eq('id', req.params.id);
    io.emit("newPost");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Delete failed" }); }
});

/* ================== DUA CONFIRMATION ROUTES ================== */
app.post("/api/dua/confirm/:postId", auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const username = req.user.userId;
    const { data: existing } = await supabase.from('dua_confirmations').select('*').eq('post_id', postId).eq('username', username).maybeSingle();
    if (existing) return res.status(400).json({ error: "Already confirmed" });

    await supabase.from('dua_confirmations').insert([{ post_id: postId, username: username, is_thanked: false }]);
    io.emit("duaUpdate", { postId, type: 'CONFIRMATION', user: username }); 
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Failed to confirm Dua" }); }
});

app.post("/api/dua/thank/:confId", auth, async (req, res) => {
  try {
    const { confId } = req.params;
    const { data: conf } = await supabase.from('dua_confirmations').select('post_id').eq('id', confId).single();
    if (!conf) return res.status(404).json({ error: "Not found" });

    await supabase.from('dua_confirmations').update({ is_thanked: true }).eq('id', confId);
    io.emit("duaUpdate", { postId: conf.post_id, type: 'THANK' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Failed to say Amin" }); }
});

/* ================== CHAT MESSAGES ================== */
app.get("/api/messages", auth, async (req, res) => {
  try {
    const { data } = await supabase.from('messages').select('*, replyTo:messages(id, author, text, file_name)').order('time', { ascending: true });
    const formattedData = data.map(msg => ({ ...msg, replyTo: Array.isArray(msg.replyTo) ? msg.replyTo[0] : msg.replyTo }));
    res.json(formattedData);
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

app.post("/api/messages", auth, upload.single("file"), async (req, res) => {
  try {
    const author = req.user.userId;
    const { text, replyTo } = req.body;
    let fileObj = {};
    if (req.file) {
      const url = await uploadToSupabase(req.file);
      fileObj = { file_url: url, file_type: req.file.mimetype, file_name: req.file.originalname, file_size: req.file.size };
    }
    const { data: rawMsg } = await supabase.from('messages').insert({ author, text, reply_to: replyTo && replyTo !== "null" ? replyTo : null, ...fileObj }).select('*, replyTo:messages(id, author, text, file_name)').single();
    const formattedMsg = { ...rawMsg, replyTo: Array.isArray(rawMsg.replyTo) ? rawMsg.replyTo[0] : rawMsg.replyTo };
    io.emit("newMessage", formattedMsg);
    res.json(formattedMsg);
  } catch (err) { res.status(500).json({ error: "Failed to send message" }); }
});

app.put("/api/messages/:id", auth, async (req, res) => {
  try {
    const { text } = req.body;
    const { data } = await supabase.from('messages').update({ text }).eq('id', req.params.id).eq('author', req.user.userId).select('*, replyTo:messages(id, author, text, file_name)').single();
    const formatted = { ...data, replyTo: Array.isArray(data.replyTo) ? data.replyTo[0] : data.replyTo };
    io.emit("updateMessage", formatted);
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

app.delete("/api/messages/:id", auth, async (req, res) => {
  try {
    await supabase.from('messages').delete().eq('id', req.params.id).eq('author', req.user.userId);
    io.emit("deleteMessage", { id: parseInt(req.params.id) });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Delete failed" }); }
});

/* ================== UNREAD TRACKING ================== */
app.get("/api/unread-counts", auth, async (req, res) => {
  try {
    const username = req.user.userId;
    const { count: chatCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).neq('author', username).eq('is_read', false);
    const { data: user } = await supabase.from('users').select('last_feed_check').eq('username', username).single();
    const lastCheck = user?.last_feed_check || '1970-01-01T00:00:00Z';
    const { count: feedCount } = await supabase.from('posts').select('*', { count: 'exact', head: true }).neq('author', username).gt('time', lastCheck);
    res.json({ unreadChat: chatCount || 0, unreadFeed: feedCount || 0 });
  } catch (err) { res.json({ unreadChat: 0, unreadFeed: 0 }); }
});

app.post("/api/mark-read", auth, async (req, res) => {
  try {
    const { type } = req.body;
    const username = req.user.userId;
    if (type === 'chat') {
      await supabase.from('messages').update({ is_read: true }).neq('author', username).eq('is_read', false);
    } else if (type === 'feed') {
      await supabase.from('users').update({ last_feed_check: new Date().toISOString() }).eq('username', username);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Mark read failed" }); }
});

/* ================== COMMENT ROUTES ================== */
app.post("/api/posts/:postId/comments", auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { text, replyTo } = req.body; 
    const { data: comment } = await supabase.from('comments').insert({ post_id: postId, author: req.user.userId, text, reply_to: replyTo || null }).select(`*, reply_to_name:comments!reply_to(author)`).single();
    res.json({ ...comment, reply_to_name: comment.reply_to_name?.author || null });
  } catch (err) { res.status(500).json({ error: "Failed to add comment" }); }
});

app.put("/api/comments/:id", auth, async (req, res) => {
  try {
    const { text } = req.body;
    const { data } = await supabase.from('comments').update({ text }).eq('id', req.params.id).eq('author', req.user.userId).select().single();
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

app.delete("/api/comments/:id", auth, async (req, res) => {
  try {
    await supabase.from('comments').delete().eq('id', req.params.id).eq('author', req.user.userId);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Delete failed" }); }
});

/* ================== SEEDING & START ================== */
async function seedUsers() {
  try {
    const hash = await bcrypt.hash("123456", 10);
    for (const username of ALLOWED_USERS) {
      await supabase.from('users').upsert({ username, password: hash }, { onConflict: 'username' });
    }
  } catch (err) { console.error("Seeding Error:", err); }
}

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) { next(new Error("Auth error")); }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, async () => {
  await seedUsers();
  console.log(`🚀 Supabase Server running on port ${PORT}`);
});