import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import { io } from "socket.io-client";
import EmojiPicker from "emoji-picker-react";
import {
  FiSmile, FiPaperclip, FiMic, FiSend, FiEdit2, FiTrash2, FiCheck, FiX,
  FiArrowLeft, FiImage, FiVideo, FiFileText, FiHeadphones, FiDownload,
  FiPlay, FiPause, FiMoreVertical, FiCornerUpLeft,
} from "react-icons/fi";
import { getMessages, addMessage } from "../api";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

/* ---------------- HELPERS ---------------- */
const getFileType = (fileType, fileName) => {
  if (fileType) {
    if (fileType.startsWith("image/")) return "image";
    if (fileType.startsWith("video/")) return "video";
    if (fileType.startsWith("audio/")) return "audio";
    if (fileType.includes("pdf")) return "pdf";
    if (fileType.includes("word") || fileType.includes("document")) return "document";
  }
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "image";
  if (["mp4", "mov", "webm"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a"].includes(ext)) return "audio";
  return "file";
};

/* ---------------- SUB-COMPONENTS ---------------- */
const FileIcon = ({ type, size = 20 }) => {
  switch (type) {
    case "image": return <FiImage size={size} />;
    case "video": return <FiVideo size={size} />;
    case "audio": return <FiHeadphones size={size} />;
    default: return <FiFileText size={size} />;
  }
};

const AudioPlayer = memo(({ src, isMine }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
    };
  }, []);

  const togglePlay = () => {
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} w-full`}>
      <audio ref={audioRef} src={src} preload="metadata" onEnded={() => setIsPlaying(false)} />
      <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg ${isMine ? "bg-purple-100" : "bg-gray-100"} w-full max-w-[280px] sm:max-w-md`}>
        <button onClick={togglePlay} className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${isMine ? "bg-purple-500" : "bg-gray-700"} text-white shrink-0`}>
          {isPlaying ? <FiPause size={18} /> : <FiPlay size={18} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-[10px] sm:text-xs mb-1">
            <span className="font-medium truncate">Voice Note</span>
            <span className="shrink-0">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>
          <div className="h-1 bg-gray-300 rounded-full relative">
            <div className={`absolute h-full rounded-full ${isMine ? "bg-purple-500" : "bg-gray-600"}`} style={{ width: `${(currentTime / duration) * 100 || 0}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
});

const MessageItem = memo(({ message, isMine, editingId, setEditingId, setEditText, editText, onSave, onDelete, renderFile, setReplyTo, onReplyClick }) => {
  const letter = message.author?.[0]?.toUpperCase();
  const isEditing = editingId === message.id;
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const closeMenu = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(false); };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  return (
    <div id={`msg-${message.id}`} className={`flex gap-2 w-full transition-all duration-300 ${isMine ? "justify-end" : "justify-start"}`}>
      {!isMine && <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-400 text-white flex items-center justify-center font-bold shrink-0 text-sm">{letter}</div>}

      <div className={`relative max-w-[88%] sm:max-w-[70%] p-3 rounded-2xl shadow break-words ${isMine ? "bg-purple-500 text-white rounded-br-none" : "bg-white text-gray-900 rounded-bl-none"}`}>
        {!isEditing && (
          <div className="absolute top-1 right-1" ref={menuRef}>
            <button onClick={() => setOpenMenu((p) => !p)} className={`p-1 rounded-full hover:bg-black/10 ${isMine ? "text-white" : "text-gray-400"}`}>
              <FiMoreVertical size={14} />
            </button>
            {openMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-white text-gray-800 rounded-lg shadow-lg z-30 overflow-hidden border text-sm">
                <button onClick={() => { setReplyTo({ id: message.id, author: message.author, text: message.text, file_name: message.file_name }); setOpenMenu(false); }} className="w-full px-3 py-2 hover:bg-gray-100 flex items-center gap-2 border-b">
                  <FiCornerUpLeft size={14} /> Reply
                </button>
                {isMine && (
                  <>
                    <button onClick={() => { setEditingId(message.id); setEditText(message.text || ""); setOpenMenu(false); }} className="w-full px-3 py-2 hover:bg-gray-100 flex items-center gap-2 border-b">
                      <FiEdit2 size={14} /> Edit
                    </button>
                    <button onClick={() => { setOpenMenu(false); onDelete(message.id); }} className="w-full px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2">
                      <FiTrash2 size={14} /> Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {!isMine && <p className="text-[10px] font-bold opacity-80 mb-1">{message.author}</p>}

        {message.replyTo && (
          <div 
            onClick={() => onReplyClick(message.replyTo.id)}
            className={`mb-2 p-2 rounded border-l-4 text-[11px] cursor-pointer hover:bg-black/5 transition-colors ${isMine ? "bg-white/20 border-white/60" : "bg-gray-100 border-purple-500"}`}
          >
            <p className="font-semibold opacity-80">{message.replyTo.author}</p>
            <p className="truncate opacity-80">{message.replyTo.text || message.replyTo.file_name || "Original message"}</p>
          </div>
        )}

        {isEditing ? (
          <div className="flex gap-1 items-center">
            <input value={editText} onChange={(e) => setEditText(e.target.value)} className="flex-1 px-2 py-1 rounded border text-gray-900 text-sm w-full" autoFocus />
            <button onClick={() => onSave(message.id)} className="text-green-400 shrink-0"><FiCheck size={18} /></button>
            <button onClick={() => setEditingId(null)} className="text-gray-300 shrink-0"><FiX size={18} /></button>
          </div>
        ) : (
          <>
            {message.text && <p className={`text-sm sm:text-base ${message.file_url ? "mb-2" : ""}`}>{message.text}</p>}
            {message.file_url && renderFile(message)}
          </>
        )}

        <p className={`text-[9px] opacity-70 mt-1 ${isMine ? "text-right" : "text-left"}`}>
          {new Date(message.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {isMine && <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold shrink-0 text-sm">{letter}</div>}
    </div>
  );
});

/* ---------------- MAIN COMPONENT ---------------- */
export default function MessageBoard() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [uploadProgress, setUploadProgress] = useState(null);
  const [replyTo, setReplyTo] = useState(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);

  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username") || "User";
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    socketRef.current = io(BACKEND_URL, { auth: { token }, transports: ["websocket"] });
    socketRef.current.on("newMessage", (msg) => { if (msg.author !== username) setMessages((p) => [...p, msg]); });
    socketRef.current.on("updateMessage", (updated) => setMessages((p) => p.map((m) => (m.id === updated.id ? updated : m))));
    socketRef.current.on("deleteMessage", ({ id }) => setMessages((p) => p.filter((m) => m.id !== id)));
    return () => socketRef.current.disconnect();
  }, [token, username]);

  useEffect(() => {
    getMessages().then((data) => setMessages((data || []).sort((a, b) => new Date(a.time) - new Date(b.time))));
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const closePicker = (e) => { if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) setShowEmoji(false); };
    document.addEventListener("mousedown", closePicker);
    return () => document.removeEventListener("mousedown", closePicker);
  }, []);

  const scrollToMessage = useCallback((msgId) => {
    const target = document.getElementById(`msg-${msgId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("message-highlight");
      setTimeout(() => target.classList.remove("message-highlight"), 2000);
    }
  }, []);

  const sendMessage = async () => {
    if (!text.trim() && !replyTo) return;
    const currentReplyData = replyTo;
    const payload = { text: text.trim(), replyTo: currentReplyData ? currentReplyData.id : null };
    try {
      const saved = await addMessage(payload);
      if (saved) {
        setMessages((prev) => [...prev, { ...saved, replyTo: currentReplyData }]);
        setText("");
        setReplyTo(null);
      }
    } catch (err) { console.error(err); }
  };

  const sendFile = useCallback(async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", file.name);
    formData.append("fileType", file.type);
    setUploadProgress({ fileName: file.name, progress: 0 });
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadProgress((p) => ({ ...p, progress: Math.round((e.loaded / e.total) * 100) })); };
    xhr.onload = () => { if (xhr.status === 200) setMessages((p) => [...p, JSON.parse(xhr.responseText)]); setUploadProgress(null); };
    xhr.open("POST", `${BACKEND_URL}/api/messages`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(formData);
  }, [token]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const file = new File([new Blob(audioChunksRef.current)], `audio_${Date.now()}.webm`, { type: "audio/webm" });
        sendFile(file);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setRecording(true);
    } catch (err) { alert("Microphone access denied."); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current?.state !== "inactive") { mediaRecorderRef.current.stop(); setRecording(false); } };

  const saveEdit = useCallback(async (id) => {
    const res = await fetch(`${BACKEND_URL}/api/messages/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: editText }),
    });
    const updated = await res.json();
    setMessages((p) => p.map((m) => (m.id === id ? updated : m)));
    setEditingId(null);
  }, [token, editText]);

  const deleteMsg = useCallback(async (id) => {
    if (!window.confirm("Delete message?")) return;
    await fetch(`${BACKEND_URL}/api/messages/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setMessages((p) => p.filter((m) => m.id !== id));
  }, [token]);

  const renderFileContent = useCallback((m) => {
    const type = getFileType(m.file_type, m.file_name);
    const url = `${BACKEND_URL}${m.file_url}`;
    if (type === "image") return <img src={url} alt="upload" className="mt-2 rounded border max-h-48 sm:max-h-60 w-full object-cover cursor-pointer" onClick={() => window.open(url)} />;
    if (type === "video") return <video controls src={url} className="mt-2 rounded border max-h-48 sm:max-h-60 w-full" />;
    if (type === "audio") return <AudioPlayer src={url} isMine={m.author === username} />;
    return (
      <a href={url} download className="mt-2 flex items-center gap-2 p-2 rounded bg-black/5 border border-black/10">
        <FileIcon type={type} size={16} />
        <span className="text-[10px] sm:text-xs truncate flex-1">{m.file_name}</span>
        <FiDownload size={14} />
      </a>
    );
  }, [username]);

  return (
    <section className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <header className="p-3 bg-white shadow-sm flex items-center z-20 shrink-0">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-purple-600 font-medium text-sm sm:text-base"><FiArrowLeft /> Back</button>
      </header>

      <div className="flex-1 overflow-y-auto p-2 sm:p-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          {messages.map((m) => (
            <MessageItem 
              key={m.id} message={m} isMine={m.author === username} 
              editingId={editingId} setEditingId={setEditingId} 
              setEditText={setEditText} editText={editText} 
              onSave={saveEdit} onDelete={deleteMsg} 
              renderFile={renderFileContent} setReplyTo={setReplyTo} 
              onReplyClick={scrollToMessage}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <footer className="bg-white border-t relative shrink-0" ref={emojiPickerRef}>
        {replyTo && (
          <div className="absolute bottom-full left-0 w-full bg-purple-50 border-l-4 border-purple-500 px-4 py-2 text-xs flex justify-between items-center shadow-inner">
            <div className="min-w-0 pr-4">
              <p className="font-bold text-purple-600 truncate">Replying to {replyTo.author}</p>
              <p className="text-gray-600 truncate">{replyTo.text || replyTo.file_name || "Attachment"}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600 shrink-0"><FiX size={18} /></button>
          </div>
        )}

        {/* RESPONSIVE INPUT CONTAINER */}
        <div className="p-2 sm:p-3 flex items-end gap-1 sm:gap-2 max-w-4xl mx-auto">
          <div className="flex items-center gap-0.5 sm:gap-1 mb-1 shrink-0">
            <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 text-gray-500 hover:text-purple-600 transition-colors"><FiSmile size={20} /></button>
            <input type="file" hidden ref={fileInputRef} onChange={(e) => e.target.files[0] && sendFile(e.target.files[0])} />
            <button onClick={() => fileInputRef.current.click()} className="p-2 text-gray-500 hover:text-purple-600 transition-colors"><FiPaperclip size={20} /></button>
          </div>

          <div className="flex-1 relative flex items-center min-w-0">
            <textarea
              rows="1"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Message..."
              className="w-full bg-gray-100 border-none rounded-2xl px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 resize-none max-h-32"
              style={{ overflow: 'auto' }}
            />
          </div>

          <div className="flex items-center gap-1 mb-1 shrink-0">
            <button onClick={recording ? stopRecording : startRecording} className={`p-2 rounded-full transition-all ${recording ? "bg-red-50 text-red-500 animate-pulse" : "text-gray-500 hover:text-purple-600"}`}><FiMic size={20} /></button>
            <button 
              onClick={sendMessage} 
              disabled={!text.trim() && !replyTo} 
              className={`p-2.5 rounded-full transition-all shrink-0 ${(text.trim() || replyTo) ? "bg-purple-600 text-white shadow-md active:scale-95" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
            >
              <FiSend size={18} />
            </button>
          </div>
        </div>

        {showEmoji && (
          <div className="absolute bottom-full mb-2 left-0 z-50 w-full sm:w-auto">
            <EmojiPicker 
              onEmojiClick={(e) => setText((p) => p + e.emoji)} 
              width="100%" 
              height={350} 
              previewConfig={{ showPreview: false }}
            />
          </div>
        )}
      </footer>
    </section>
  );
}