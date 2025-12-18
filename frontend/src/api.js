import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const api = axios.create({
  baseURL: API_URL,
});

/* ---------------- TOKEN HANDLING ---------------- */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ---------------- AUTH ---------------- */
export const login = async (data) => {
  const res = await api.post("/api/login", data);
  return res.data;
};

/* ---------------- PROFILE & SETTINGS ---------------- */

/**
 * Fetches user profile data, including photo history and bio.
 */
export const getUserProfile = async (username) => {
  try {
    const res = await api.get(`/api/profile/${username}`);
    return res.data;
  } catch (err) {
    console.error(`API Error fetching profile for ${username}:`, err.response?.data || err.message);
    throw err;
  }
};

/**
 * Uploads a new profile photo.
 */
export const updateProfilePhoto = async (formData) => {
  const res = await api.post("/api/profile/photo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

/**
 * Updates username, password, or bio.
 */
export const updateUserSettings = async (settingsData) => {
  const res = await api.put("/api/profile/settings", settingsData);
  return res.data;
};

/* ---------------- NOTIFICATIONS & BADGES ---------------- */

/**
 * Fetches unread counts for chat and feed notifications.
 */
export const getUnreadCounts = async () => {
  const res = await api.get("/api/unread-counts");
  return res.data;
};

/**
 * Tells the server to mark all unread messages as seen.
 */
export const markMessagesAsRead = async () => {
  const res = await api.post("/api/mark-read");
  return res.data;
};

/* ---------------- CHAT MESSAGES ---------------- */
export const getMessages = async () => {
  const res = await api.get("/api/messages");
  return res.data;
};

export const addMessage = async (formData) => {
  const res = await api.post("/api/messages", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

/* ---------------- FEED POSTS ---------------- */
export const getPosts = async () => {
  const res = await api.get("/api/posts");
  return res.data;
};

export const createPost = async (formData) => {
  const res = await api.post("/api/posts", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

/* ---------------- DUA SPECIFIC ---------------- */

export const confirmDua = async (id) => {
  const res = await api.post(`/api/dua/confirm/${id}`);
  return res.data;
};

export const sayAminToDua = async (confirmationId) => {
  const res = await api.post(`/api/dua/thank/${confirmationId}`);
  return res.data;
};

/* ---------------- EDIT / DELETE ---------------- */

export const updatePost = async (id, text) => {
  const res = await api.put(`/api/posts/${id}`, { text });
  return res.data;
};

export const deletePost = async (id) => {
  const res = await api.delete(`/api/posts/${id}`);
  return res.data;
};

/* ---------------- COMMENTS ---------------- */
export const addComment = async (postId, text, replyTo = null) => {
  const res = await api.post(`/api/posts/${postId}/comments`, { text, replyTo });
  return res.data;
};

export const deleteComment = async (id) => {
  const res = await api.delete(`/api/comments/${id}`);
  return res.data;
};

export const updateComment = async (id, text) => {
  const res = await api.put(`/api/comments/${id}`, { text });
  return res.data;
};

export default api;
