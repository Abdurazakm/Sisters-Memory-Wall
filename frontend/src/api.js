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

/* ---------------- MESSAGES ---------------- */
export const getMessages = async () => {
  const res = await api.get("/api/messages");
  return res.data;
};

export const addMessage = async (data) => {
  const res = await api.post("/api/messages", data);
  return res.data;
};

export default api;
