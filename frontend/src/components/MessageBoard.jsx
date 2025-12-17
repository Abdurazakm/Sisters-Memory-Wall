import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import { io } from "socket.io-client";
import EmojiPicker from "emoji-picker-react";
import { FiMoreVertical } from "react-icons/fi";
import {
  FiSmile, FiPaperclip, FiMic, FiSend, FiEdit2, FiTrash2, FiCheck, FiX,
  FiArrowLeft, FiImage, FiVideo, FiFileText, FiHeadphones, FiDownload,
  FiPlay, FiPause, FiFile
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
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return "image";
  if (['mp4', 'mov', 'webm'].includes(ext)) return "video";
  if (['mp3', 'wav', 'm4a'].includes(ext)) return "audio";
  return "file";
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
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
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} w-full`}>
      <audio ref={audioRef} src={src} preload="metadata" onEnded={() => setIsPlaying(false)} />
      <div className={`flex items-center gap-3 p-3 rounded-lg ${isMine ? 'bg-purple-100' : 'bg-gray-100'} w-full max-w-md`}>
        <button onClick={togglePlay} className={`w-10 h-10 rounded-full flex items-center justify-center ${isMine ? 'bg-purple-500' : 'bg-gray-700'} text-white`}>
          {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} />}
        </button>
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium">Voice Note</span>
            <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>
          <div className="h-1 bg-gray-300 rounded-full relative">
            <div className={`absolute h-full rounded-full ${isMine ? 'bg-purple-500' : 'bg-gray-600'}`} style={{ width: `${(currentTime / duration) * 100 || 0}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
});

// Memoized individual message item to prevent re-renders when typing
const MessageItem = memo(({
  message,
  isMine,
  username,
  editingId,
  setEditingId,
  setEditText,
  editText,
  onSave,
  onDelete,
  renderFile
}) => {
  const letter = message.author?.[0]?.toUpperCase();
  const isEditing = editingId === message.id;
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className={`flex gap-2 w-full ${isMine ? "justify-end" : "justify-start"}`}>
      {!isMine && (
        <div className="w-8 h-8 rounded-full bg-purple-400 text-white flex items-center justify-center font-bold shrink-0">
          {letter}
        </div>
      )}

      <div className={`relative max-w-[85%] sm:max-w-[70%] p-3 rounded-2xl shadow break-words
        ${isMine ? "bg-purple-500 text-white rounded-br-none" : "bg-white text-gray-900 rounded-bl-none"}`}>

        {/* 3 DOT MENU (ONLY FOR MY MESSAGE & NOT EDITING) */}
        {isMine && !isEditing && (
          <div className="absolute top-1 right-1" ref={menuRef}>
            <button
              onClick={() => setOpenMenu(p => !p)}
              className="p-1 rounded-full hover:bg-black/10"
            >
              <FiMoreVertical size={16} />
            </button>

            {openMenu && (
              <div className="absolute right-0 mt-1 w-28 bg-white text-gray-800 rounded-lg shadow-lg z-20 overflow-hidden">
                <button
                  onClick={() => {
                    setEditingId(message.id);
                    setEditText(message.text || "");
                    setOpenMenu(false);
                  }}
                  className="w-full px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <FiEdit2 size={14} /> Edit
                </button>

                <button
                  onClick={() => {
                    setOpenMenu(false);
                    onDelete(message.id);
                  }}
                  className="w-full px-3 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                >
                  <FiTrash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        )}

        {/* AUTHOR NAME */}
        {!isMine && (
          <p className="text-xs font-semibold opacity-80 mb-1">
            {message.author}
          </p>
        )}

        {/* EDIT MODE */}
        {isEditing ? (
          <div className="flex gap-1 items-center">
            <input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="flex-1 px-2 py-1 rounded border text-gray-900 text-sm"
              autoFocus
            />
            <button onClick={() => onSave(message.id)} className="text-green-400">
              <FiCheck size={18} />
            </button>
            <button onClick={() => setEditingId(null)} className="text-gray-300">
              <FiX size={18} />
            </button>
          </div>
        ) : (
          <>
            {message.text && (
              <p className={message.file_url ? "mb-2" : ""}>
                {message.text}
              </p>
            )}
            {message.file_url && renderFile(message)}
          </>
        )}

        {/* TIME */}
        <p className={`text-[10px] opacity-70 mt-1 ${isMine ? "text-right" : "text-left"}`}>
          {new Date(message.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })}
        </p>
      </div>

      {isMine && (
        <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
          {letter}
        </div>
      )}
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

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);

  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username") || "User";
  const navigate = useNavigate();

  // Socket setup
  useEffect(() => {
    if (!token) return;
    socketRef.current = io(BACKEND_URL, { auth: { token }, transports: ["websocket"] });

    socketRef.current.on("newMessage", (msg) => {
      if (msg.author !== username) setMessages(prev => [...prev, msg]);
    });
    socketRef.current.on("updateMessage", (updated) => {
      setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
    });
    socketRef.current.on("deleteMessage", ({ id }) => {
      setMessages(prev => prev.filter(m => m.id !== id));
    });

    return () => socketRef.current.disconnect();
  }, [token, username]);

  // Load messages
  useEffect(() => {
    getMessages().then(data => setMessages((data || []).sort((a, b) => new Date(a.time) - new Date(b.time))));
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close emoji picker on click outside
  useEffect(() => {
    const closePicker = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) setShowEmoji(false);
    };
    document.addEventListener("mousedown", closePicker);
    return () => document.removeEventListener("mousedown", closePicker);
  }, []);

  const sendMessage = async () => {
    if (!text.trim()) return;
    const saved = await addMessage({ text });
    setMessages(prev => [...prev, saved]);
    setText("");
  };

  const sendFile = useCallback(async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", file.name);
    formData.append("fileType", file.type);

    setUploadProgress({ fileName: file.name, progress: 0 });
    const xhr = new XMLHttpRequest();
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setUploadProgress(p => ({ ...p, progress: Math.round((e.loaded / e.total) * 100) }));
    };

    xhr.onload = () => {
      if (xhr.status === 200) setMessages(prev => [...prev, JSON.parse(xhr.responseText)]);
      setUploadProgress(null);
    };
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
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setRecording(true);
    } catch (err) { alert("Microphone access denied."); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const saveEdit = useCallback(async (id) => {
    const res = await fetch(`${BACKEND_URL}/api/messages/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: editText }),
    });
    const updated = await res.json();
    setMessages(prev => prev.map(m => m.id === id ? updated : m));
    setEditingId(null);
  }, [token, editText]);

  const deleteMsg = useCallback(async (id) => {
    if (!window.confirm("Delete message?")) return;
    await fetch(`${BACKEND_URL}/api/messages/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setMessages(prev => prev.filter(m => m.id !== id));
  }, [token]);

  const renderFileContent = useCallback((m) => {
    const type = getFileType(m.file_type, m.file_name);
    const url = `${BACKEND_URL}${m.file_url}`;
    
    if (type === "image") return <img src={url} className="mt-2 rounded border max-h-60 object-cover cursor-pointer" onClick={() => window.open(url)} />;
    if (type === "video") return <video controls src={url} className="mt-2 rounded border max-h-60" />;
    if (type === "audio") return <AudioPlayer src={url} isMine={m.author === username} />;
    
    return (
      <a href={url} download className="mt-2 flex items-center gap-2 p-2 rounded bg-black/5 border border-black/10">
        <FileIcon type={type} />
        <span className="text-xs truncate flex-1">{m.file_name}</span>
        <FiDownload size={14} />
      </a>
    );
  }, [username]);

  return (
    <section className="h-screen flex flex-col bg-gray-50">
      <header className="p-3 bg-white shadow-sm flex items-center z-10">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-purple-600 font-medium">
          <FiArrowLeft /> Back
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          {messages.map((m) => (
            <MessageItem 
              key={m.id} 
              message={m} 
              isMine={m.author === username} 
              username={username}
              editingId={editingId}
              setEditingId={setEditingId}
              setEditText={setEditText}
              editText={editText}
              onSave={saveEdit}
              onDelete={deleteMsg}
              renderFile={renderFileContent}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {uploadProgress && (
        <div className="px-4 py-2 max-w-3xl mx-auto w-full">
          <div className="bg-white p-2 rounded shadow-sm border flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 transition-all" style={{ width: `${uploadProgress.progress}%` }} />
            </div>
            <span className="text-[10px] text-gray-500">{uploadProgress.progress}%</span>
          </div>
        </div>
      )}

      <footer className="p-3 bg-white border-t flex items-center gap-2 relative" ref={emojiPickerRef}>
        <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 text-gray-500 hover:text-purple-600"><FiSmile size={22} /></button>
        <input type="file" hidden ref={fileInputRef} onChange={(e) => e.target.files[0] && sendFile(e.target.files[0])} />
        <button onClick={() => fileInputRef.current.click()} className="p-2 text-gray-500 hover:text-purple-600"><FiPaperclip size={22} /></button>
        <button onClick={recording ? stopRecording : startRecording} className={`p-2 rounded-full ${recording ? 'bg-red-50 text-red-500 animate-pulse' : 'text-gray-500'}`}><FiMic size={22} /></button>
        
        <input 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..." 
          className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500"
        />
        
        <button onClick={sendMessage} disabled={!text.trim()} className={`p-2.5 rounded-full ${text.trim() ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-400'}`}><FiSend size={20} /></button>
        
        {showEmoji && (
          <div className="absolute bottom-full mb-2 left-0 z-50">
            <EmojiPicker onEmojiClick={(e) => setText(p => p + e.emoji)} width={300} height={400} />
          </div>
        )}
      </footer>
    </section>
  );
}