import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { getMessages, addMessage } from "../api";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export default function MessageBoard() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const socketRef = useRef(null);
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username") || "sister";

  /* ---------------- SOCKET ---------------- */
  useEffect(() => {
    if (!token || socketRef.current) return;

    const socket = io(BACKEND_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("newMessage", (msg) => {
  if (!msg?.id) return;

  // ✅ ignore messages sent by yourself
  if (msg.author === username) return;

  setMessages((prev) => {
    if (prev.some((m) => m.id === msg.id)) return prev;
    return [msg, ...prev];
  });
});


    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  /* ---------------- LOAD ---------------- */
  useEffect(() => {
    getMessages()
      .then((data) => {
        const unique = new Map();
        (data || []).forEach((m) => unique.set(m.id, m));
        setMessages(
          [...unique.values()].sort(
            (a, b) => new Date(b.time) - new Date(a.time)
          )
        );
      })
      .catch(console.error);
  }, []);

  /* ---------------- SEND ---------------- */
  const sendMessage = async () => {
    const value = text.trim();
    if (!value) return;

    const tempId = `temp-${Date.now()}`;

    const optimistic = {
      id: tempId,
      text: value,
      author: username,
      time: new Date().toISOString(),
    };

    setMessages((prev) => [optimistic, ...prev]);
    setText("");

    try {
      const saved = await addMessage({ text: value });

      setMessages((prev) =>
        prev
          .filter((m) => m.id !== tempId) // remove temp
          .some((m) => m.id === saved.id)
          ? prev
          : [saved, ...prev.filter((m) => m.id !== tempId)]
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert("Failed to send message");
    }
  };

  return (
    <section className="mt-12 px-2">


      {/* Input */}
      <div className="flex justify-center mb-6 gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && !e.shiftKey && sendMessage()
          }
          className="px-4 py-3 w-96 rounded-l-full border shadow"
          placeholder={`Write something kind, ${username}...`}
        />
        <button
          onClick={sendMessage}
          className="bg-purple-500 text-white px-6 py-3 rounded-r-full shadow"
        >
          Send
        </button>
      </div>

      {/* Messages */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
        {messages.map((m) => (
          <div
            key={m.id} // ✅ always unique now
            className="bg-white rounded-xl p-5 shadow"
          >
            <p className="mb-2">{m.text}</p>
            <small className="text-gray-500">
              — <strong>{m.author}</strong> ·{" "}
              {new Date(m.time).toLocaleDateString()}
            </small>
          </div>
        ))}
      </div>
    </section>
  );
}
