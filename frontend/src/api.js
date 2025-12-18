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
 * Creates a post or dua request. 
 * @param {FormData} formData - Contains 'text', 'type' (post/dua), and 'files'
 */
export const createPost = async (formData) => {
  const res = await api.post("/api/posts", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

/**
 * Confirms a Dua request (The "Ameen" action).
 * @param {number} id - The ID of the Dua post
 */
export const confirmDua = async (id) => {
  const res = await api.post(`/api/dua/confirm/${id}`);
  return res.data;
};

/**
 * Updates only the text content of a post.
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
export const sayAminToDua = async (confirmationId) => {
  const response = await fetch(`${BACKEND_URL}/api/dua/thank/${confirmationId}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
    },
  });
  return response.json();
};

export default api;
