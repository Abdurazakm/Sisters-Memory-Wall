import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import EmojiPicker from "emoji-picker-react";
import {
  FiSmile,
  FiPaperclip,
  FiMic,
  FiSend,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiArrowLeft
} from "react-icons/fi";
import { getMessages, addMessage } from "../api";
import { useNavigate } from "react-router-dom";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export default function MessageBoard() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const emojiPickerRef = useRef(null);

  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username") || "sister";

  const navigate = useNavigate();

  /* ---------------- SOCKET ---------------- */
  useEffect(() => {
    if (!token || socketRef.current) return;

    const socket = io(BACKEND_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("newMessage", (msg) => {
      if (!msg?.id || msg.author === username) return;
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
    });

    socket.on("updateMessage", (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
      );
    });

    socket.on("deleteMessage", ({ id }) => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    });

    return () => socket.disconnect();
  }, [token, username]);

  /* ---------------- LOAD ---------------- */
  useEffect(() => {
    getMessages().then((data) =>
      setMessages(
        (data || []).sort(
          (a, b) => new Date(a.time) - new Date(b.time)
        )
      )
    );
  }, []);

  /* ---------------- AUTO SCROLL TO BOTTOM ---------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---------------- SEND MESSAGE ---------------- */
  const sendMessage = async () => {
    if (!text.trim()) return;
    setText("");
    const saved = await addMessage({ text });
    setMessages((prev) => [...prev, saved]);
  };

/* ---------------- SEND FILE ---------------- */
const sendFile = async (file) => {
  if (!file) return;
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${BACKEND_URL}/api/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }, // no content-type for multipart
      body: formData,
    });

    const msg = await res.json();
    if (msg?.id) setMessages((prev) => [...prev, msg]);
  } catch (err) {
    console.error("File upload failed:", err);
  }
};

/* ---------------- AUDIO RECORD ---------------- */
const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const file = new File([blob], `audio_${Date.now()}.webm`, { type: "audio/webm" });
      await sendFile(file);
    };

    recorder.start();
    setRecording(true);
  } catch (err) {
    console.error("Audio recording failed:", err);
    alert("Cannot access microphone.");
  }
};

const stopRecording = () => {
  if (mediaRecorderRef.current) {
    mediaRecorderRef.current.stop();
    setRecording(false);
  }
};


  /* ---------------- EDIT / DELETE ---------------- */
  const saveEdit = async (id) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/messages/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: editText }),
      });
      const updated = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === id ? updated : m)));
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteMessage = async (id) => {
    try {
      await fetch(`${BACKEND_URL}/api/messages/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section className="h-screen flex flex-col bg-gray-100 relative">

      {/* Back to Home */}
      <div className="p-3 bg-white shadow flex items-center gap-2 sticky top-0 z-50">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-purple-600 hover:text-purple-800 font-semibold"
        >
          <FiArrowLeft /> Back to Home
        </button>
      </div>

      {/* Messages container (grow upwards) */}
      <div className="flex-1 overflow-y-auto flex flex-col justify-end px-2 sm:px-4 py-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-3 w-full">
          {messages.map((m) => {
            const isMine = m.author === username;
            const letter = m.author?.[0]?.toUpperCase();

            return (
              <div
                key={m.id}
                className={`flex gap-2 w-full ${isMine ? "justify-end" : "justify-start"}`}
              >
                {!isMine && (
                  <div className="w-8 h-8 rounded-full bg-purple-400 text-white flex items-center justify-center font-bold shrink-0">
                    {letter}
                  </div>
                )}

                <div
                  className={`relative max-w-[85%] sm:max-w-[70%] p-3 rounded-2xl shadow break-words
                    ${isMine
                      ? "bg-purple-500 text-white rounded-br-none"
                      : "bg-white text-gray-900 rounded-bl-none"}`}
                >
                  {isMine && (
                    <div className="absolute -top-2 -right-2 flex gap-1">
                      <button
                        onClick={() => { setEditingId(m.id); setEditText(m.text); }}
                        className="text-blue-400 hover:text-blue-600"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        onClick={() => deleteMessage(m.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  )}

                  {!isMine && (
                    <p className="text-xs font-semibold opacity-60 mb-1">{m.author}</p>
                  )}

                  {editingId === m.id ? (
                    <div className="flex gap-1">
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 px-2 rounded border"
                      />
                      <button
                        onClick={() => saveEdit(m.id)}
                        className="text-green-500 hover:text-green-700"
                      >
                        <FiCheck />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <FiX />
                      </button>
                    </div>
                  ) : (
                    m.text && <p>{m.text}</p>
                  )}

                  {m.file_type?.startsWith("image") && (
                    <img
                      src={`${BACKEND_URL}${m.file_url}`}
                      className="mt-2 rounded-lg max-w-full"
                    />
                  )}

                  {m.file_type?.startsWith("audio") && (
                    <audio controls src={`${BACKEND_URL}${m.file_url}`} className="mt-1 w-full" />
                  )}

                  <p className="text-[10px] text-right opacity-70 mt-1">
                    {new Date(m.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                {isMine && (
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
                    {letter}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input section */}
      <div className="border-t bg-white p-2 flex gap-2 items-center sticky bottom-0 z-50 relative" ref={emojiPickerRef}>
        <button onClick={() => setShowEmoji(!showEmoji)}><FiSmile size={20} /></button>

        <input type="file" hidden id="file" onChange={(e) => sendFile(e.target.files[0])} />
        <label htmlFor="file"><FiPaperclip size={20} /></label>

        <button onClick={recording ? stopRecording : startRecording}>
          <FiMic size={20} className={recording ? "text-red-500" : ""} />
        </button>

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 px-3 py-2 rounded-full border text-sm"
          placeholder="Message..."
        />

        <button onClick={sendMessage}><FiSend size={20} /></button>

        {showEmoji && (
          <div
            className="absolute bottom-14 z-50"
            style={{ left: 0 }}
          >
            <EmojiPicker onEmojiClick={(e) => setText((prev) => prev + e.emoji)} />
          </div>
        )}
      </div>
    </section>
  );
}
