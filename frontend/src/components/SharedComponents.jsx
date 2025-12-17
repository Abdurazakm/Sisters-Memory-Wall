import React, { memo, useState, useEffect, useRef } from "react";
import { 
  FiPlay, FiPause, FiImage, FiVideo, FiHeadphones, FiFileText, 
  FiMoreVertical, FiCornerUpLeft, FiEdit2, FiTrash2, FiCheck, FiX, FiDownload 
} from "react-icons/fi";

/* --- HELPERS --- */
export const getFileType = (fileType, fileName) => {
  if (fileType) {
    if (fileType.startsWith("image/")) return "image";
    if (fileType.startsWith("video/")) return "video";
    if (fileType.startsWith("audio/")) return "audio";
  }
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "image";
  if (["mp4", "mov", "webm"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a"].includes(ext)) return "audio";
  return "file";
};

export const FileIcon = ({ type, size = 20 }) => {
  switch (type) {
    case "image": return <FiImage size={size} />;
    case "video": return <FiVideo size={size} />;
    case "audio": return <FiHeadphones size={size} />;
    default: return <FiFileText size={size} />;
  }
};

/* --- SHARED AUDIO PLAYER --- */
export const AudioPlayer = memo(({ src, isMine }) => {
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
      <div className={`flex items-center gap-2 p-2 rounded-lg ${isMine ? "bg-purple-100" : "bg-gray-100"} w-full`}>
        <button onClick={togglePlay} className={`w-8 h-8 rounded-full flex items-center justify-center ${isMine ? "bg-purple-500" : "bg-gray-700"} text-white shrink-0`}>
          {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-[10px] mb-1">
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