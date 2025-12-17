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

/* ---------------- CHAT MESSAGES ---------------- */
export const getMessages = async () => {
  const res = await api.get("/api/messages");
  return res.data;
};

export const addMessage = async (formData) => {
  // Using multipart/form-data here in case you upload files in chat
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

/**
 * Creates a post with multiple files. 
 * @param {FormData} formData - Should contain 'text' and multiple 'files' append fields
 */
export const createPost = async (formData) => {
  const res = await api.post("/api/posts", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

/**
 * Updates only the text content of a post.
 * @param {number} id 
 * @param {string} text 
 */
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
