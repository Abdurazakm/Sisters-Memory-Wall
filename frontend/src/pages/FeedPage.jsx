import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import socketIo from "socket.io-client"; 
import { 
  getPosts, createPost, addComment, deletePost, deleteComment, updatePost, updateComment, getUserProfile 
} from "../api";
import { 
  FiImage, FiSend, FiTrash2, FiMessageCircle, FiX, FiEdit2, 
  FiMaximize2, FiMoreVertical, FiCornerDownRight, FiChevronDown, FiChevronUp, FiRefreshCw, FiArrowDown
} from "react-icons/fi";
import { FaPrayingHands } from "react-icons/fa";
import { getFileType } from "../components/SharedComponents";
import DuaCard from "../components/DuaCard";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

const BACKEND_URL = import.meta.env.VITE_API_URL;

/* ================== AVATAR HELPER ================== */
function UserAvatar({ username, size = "w-10 h-10", fontSize = "text-base" }) {
  const [photo, setPhoto] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPhoto = async () => {
      try {
        const profile = await getUserProfile(username);
        if (profile?.profile_photo) {
          const url = profile.profile_photo.startsWith('http') 
            ? profile.profile_photo 
            : `${BACKEND_URL}${profile.profile_photo}`;
          setPhoto(url);
        }
      } catch (err) { console.error("Avatar error", err); }
    };
    if (username) fetchPhoto();
  }, [username]);

  return (
    <div 
      onClick={(e) => { e.stopPropagation(); navigate(`/profile/${username}`); }}
      className={`${size} rounded-full overflow-hidden cursor-pointer bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm hover:ring-2 ring-purple-300 transition-all flex-shrink-0`}
    >
      {photo ? <img src={photo} alt={username} className="w-full h-full object-cover" /> : <span className={fontSize}>{username ? username[0].toUpperCase() : "?"}</span>}
    </div>
  );
}

/* ================== MAIN FEED PAGE ================== */
export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [postText, setPostText] = useState("");
  const [postType, setPostType] = useState("post"); 
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null); 
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); 

  // Pull to Refresh State
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pullThreshold = 80;

  const username = localStorage.getItem("username");
  const fileInputRef = useRef();

  useEffect(() => { loadPosts(); }, []);

  useEffect(() => {
    const socket = socketIo(BACKEND_URL, {
      auth: { token: localStorage.getItem("token") }
    });
    socket.on("newPost", () => { loadPosts(); });
    socket.on("duaUpdate", () => { loadPosts(); });
    return () => socket.disconnect();
  }, []);

  const loadPosts = async () => {
    const data = await getPosts();
    setPosts(data || []);
  };

  /* --- Pull to Refresh Logic --- */
  const handleTouchStart = (e) => {
    if (window.scrollY === 0) startY.current = e.touches[0].pageY;
  };

  const handleTouchMove = (e) => {
    if (startY.current === 0 || isRefreshing) return;
    const currentY = e.touches[0].pageY;
    const distance = currentY - startY.current;
    if (distance > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(distance * 0.4, pullThreshold + 20));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= pullThreshold) {
      setIsRefreshing(true);
      setPullDistance(pullThreshold);
      await loadPosts();
      setIsRefreshing(false);
      setPullDistance(0);
    } else {
      setPullDistance(0);
    }
    startY.current = 0;
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.text?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.author?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || post.type === "dua";
    return matchesSearch && matchesFilter;
  });

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postText.trim() && selectedFiles.length === 0) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("text", postText);
    formData.append("type", postType); 
    selectedFiles.forEach((file) => formData.append("files", file));

    try {
      await createPost(formData);
      setPostText("");
      setSelectedFiles([]);
      setPostType("post"); 
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div 
      className="min-h-screen bg-gray-50 pb-32 overflow-x-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Header showControls={true} searchQuery={searchQuery} setSearchQuery={setSearchQuery} filterType={filterType} setFilterType={setFilterType} />

      {/* Pull to Refresh Indicator */}
      <div 
        style={{ height: `${pullDistance}px`, opacity: pullDistance / pullThreshold }}
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
      >
        <div className={`p-2 bg-white rounded-full shadow-lg border border-purple-100 ${isRefreshing ? 'animate-spin text-purple-600' : 'text-purple-400'}`}>
          {isRefreshing ? <FiRefreshCw size={20}/> : <FiArrowDown size={20} style={{ transform: `rotate(${Math.min(pullDistance * 2, 180)}deg)` }}/>}
        </div>
      </div>

      {previewMedia && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setPreviewMedia(null)}>
          <button className="absolute top-6 right-6 text-white hover:text-purple-400"><FiX size={35} /></button>
          <div className="max-w-5xl w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {previewMedia.type === "image" ? (
              <img src={previewMedia.url} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
            ) : (
              <video src={previewMedia.url} controls autoPlay className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
            )}
          </div>
        </div>
      )}

      <div 
        className="max-w-2xl mx-auto p-4 transition-transform duration-200"
        style={{ transform: `translateY(${pullDistance}px)` }}
      >
        {/* Create Post Section */}
        <div className={`bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border p-6 mb-8 transition-all ${postType === 'dua' ? 'ring-2 ring-emerald-400 border-emerald-100' : 'border-gray-100'}`}>
          <div className="flex gap-4 mb-4 bg-gray-50 p-1.5 rounded-2xl w-fit">
            <button onClick={() => setPostType("post")} className={`text-[10px] font-black px-6 py-2 rounded-xl transition-all tracking-widest ${postType === 'post' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400'}`}>POST</button>
            <button onClick={() => setPostType("dua")} className={`text-[10px] font-black px-6 py-2 rounded-xl flex items-center gap-2 transition-all tracking-widest ${postType === 'dua' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}><FaPrayingHands size={12}/> DUA</button>
          </div>

          <textarea value={postText} onChange={(e) => setPostText(e.target.value)} placeholder={postType === 'dua' ? "What can the family pray for?" : "What's on your mind?"} className="w-full border-none focus:ring-0 text-base md:text-lg resize-none outline-none font-medium mb-2 placeholder:text-gray-300" rows="3" />

          {selectedFiles.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
              {selectedFiles.map((f, i) => (
                <div key={i} className="relative h-16 w-16 bg-gray-100 rounded-xl flex-shrink-0">
                  <span className="text-[8px] absolute bottom-1 left-1 text-gray-500 font-bold truncate w-14">{f.name}</span>
                  <button onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><FiX size={10}/></button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center mt-2 border-t border-gray-50 pt-4">
            <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-purple-600 hover:bg-purple-50 transition-colors">
              <FiImage size={22} /> <span className="text-[10px] font-black uppercase tracking-widest">Media</span>
            </button>
            <input type="file" hidden multiple ref={fileInputRef} onChange={(e) => setSelectedFiles(Array.from(e.target.files))} />
            <button onClick={handleCreatePost} disabled={loading} className={`${postType === 'dua' ? 'bg-emerald-500' : 'bg-purple-600'} text-white px-8 py-3 rounded-[1.5rem] text-xs font-black shadow-lg shadow-purple-200 active:scale-95 disabled:opacity-50 transition-all`}>
              {loading ? "..." : "SHARE"}
            </button>
          </div>
        </div>

        {/* Posts List */}
        <div className="space-y-6">
          {filteredPosts.map((post) => (
            post.type === 'dua' ? (
              <DuaCard key={post.id} post={post} currentUser={username} onRefresh={loadPosts} isMine={post.author === username} />
            ) : (
              <PostCard key={post.id} post={post} isMine={post.author === username} onRefresh={loadPosts} onOpenMedia={(url, type) => setPreviewMedia({ url, type })} username={username} />
            )
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

/* ================== POST CARD ================== */
function PostCard({ post, isMine, onRefresh, onOpenMedia, username }) {
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-[2.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6">
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center gap-3">
            <UserAvatar username={post.author} size="w-11 h-11" />
            <div onClick={() => navigate(`/profile/${post.author}`)} className="cursor-pointer">
              <p className="font-black text-gray-900 leading-none mb-1 hover:text-purple-600 uppercase text-[11px] tracking-widest">{post.author}</p>
              <p className="text-[10px] text-gray-400 font-bold">{new Date(post.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
            </div>
          </div>
          {isMine && (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-50 rounded-full text-gray-300"><FiMoreVertical size={20} /></button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-44 bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl z-20 overflow-hidden p-1">
                  <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-[10px] font-black text-gray-600 hover:bg-purple-50 rounded-xl flex items-center gap-3 tracking-widest uppercase"><FiEdit2 size={16} /> EDIT</button>
                  <button onClick={() => { if(window.confirm("Delete?")) deletePost(post.id).then(onRefresh); }} className="w-full text-left px-4 py-3 text-[10px] font-black text-red-500 hover:bg-red-50 rounded-xl flex items-center gap-3 tracking-widest uppercase"><FiTrash2 size={16} /> DELETE</button>
                </div>
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="mb-4">
            <textarea className="w-full border-2 border-purple-100 rounded-2xl p-4 text-sm outline-none font-medium" value={editText} onChange={e => setEditText(e.target.value)} rows="3" />
            <div className="flex gap-2 mt-2">
              <button onClick={async () => { await updatePost(post.id, editText); setIsEditing(false); onRefresh(); }} className="bg-purple-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">SAVE</button>
              <button onClick={() => setIsEditing(false)} className="bg-gray-100 text-gray-500 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">CANCEL</button>
            </div>
          </div>
        ) : (
          <TextWithReadMore text={post.text} />
        )}
        
        {post.post_files?.length > 0 && (
          <div className={`grid gap-2 rounded-3xl overflow-hidden mb-6 ${post.post_files.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {post.post_files.map((file, idx) => (
              <div key={idx} className="relative aspect-square bg-gray-50 flex items-center justify-center cursor-pointer group overflow-hidden" onClick={() => onOpenMedia(`${file.file_url}`, getFileType(file.file_type))}>
                {getFileType(file.file_type) === "image" ? (
                  <img src={`${file.file_url}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <div className="relative w-full h-full">
                    <video src={`${file.file_url}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><FiMaximize2 className="text-white" size={30} /></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <button 
          onClick={() => setShowComments(!showComments)} 
          className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] px-5 py-3 rounded-2xl transition-all ${showComments ? 'text-purple-600 bg-purple-50' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'}`}
        >
          <FiMessageCircle size={18} strokeWidth={3} /> {post.comments?.length || 0} Comments
        </button>
      </div>
      {showComments && <CommentSection postId={post.id} comments={post.comments} onRefresh={onRefresh} username={username} />}
    </div>
  );
}

/* ================== TREE COMMENT SECTION ================== */
function CommentSection({ postId, comments = [], onRefresh, username }) {
  const [activeReply, setActiveReply] = useState(null); 
  const [activeEditId, setActiveEditId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [expandedThreads, setExpandedThreads] = useState({});
  const commentRefs = useRef({});

  const toggleThread = (id) => setExpandedThreads(prev => ({ ...prev, [id]: !prev[id] }));

  const rootComments = comments.filter(c => !c.reply_to);

  return (
    <div className="bg-gray-50/50 p-6 border-t border-gray-100 animate-in fade-in duration-300">
      {rootComments.map((parent) => {
        const replies = comments.filter(c => c.reply_to === parent.id);
        const isExpanded = expandedThreads[parent.id];

        return (
          <div key={parent.id} className="mb-6 last:mb-2">
            <CommentBubble 
              comment={parent} 
              isReply={false}
              activeEditId={activeEditId}
              setActiveEditId={setActiveEditId}
              activeMenuId={activeMenuId}
              setActiveMenuId={setActiveMenuId}
              onReply={() => setActiveReply({ threadId: parent.id, targetAuthor: parent.author, replyToId: parent.id })}
              onRefresh={onRefresh}
              username={username}
            />

            {replies.length > 0 && (
              <button 
                onClick={() => toggleThread(parent.id)} 
                className="ml-11 mt-2 text-[10px] font-black text-purple-600 flex items-center gap-1 uppercase tracking-tighter"
              >
                <div className="w-4 h-[1px] bg-purple-200"></div>
                {isExpanded ? 'Hide' : `View ${replies.length} Replies`}
              </button>
            )}

            {isExpanded && (
              <div className="ml-10 mt-3 space-y-4 border-l-2 border-purple-100 pl-4">
                {replies.map((reply) => (
                  <CommentBubble 
                    key={reply.id}
                    comment={reply} 
                    isReply={true}
                    targetAuthorName={reply.reply_to_name || parent.author}
                    activeEditId={activeEditId}
                    setActiveEditId={setActiveEditId}
                    activeMenuId={activeMenuId}
                    setActiveMenuId={setActiveMenuId}
                    onReply={() => setActiveReply({ threadId: parent.id, targetAuthor: reply.author, replyToId: reply.id })}
                    onRefresh={onRefresh}
                    username={username}
                  />
                ))}
              </div>
            )}

            {activeReply?.threadId === parent.id && (
              <div className="ml-10 mt-4">
                <div className="flex items-center justify-between mb-1.5 px-2">
                   <div className="flex items-center gap-2">
                    <FiCornerDownRight className="text-purple-400" size={12} />
                    <span className="text-[9px] font-black text-purple-500 uppercase">Replying to @{activeReply.targetAuthor}</span>
                   </div>
                   <button onClick={() => setActiveReply(null)} className="text-[9px] font-bold text-gray-400 uppercase">Cancel</button>
                </div>
                <CommentInput 
                  placeholder="Write a reply..." 
                  autoFocus={true}
                  onSubmit={async (val) => {
                    await addComment(postId, val, parent.id, activeReply.replyToId);
                    setExpandedThreads(prev => ({...prev, [parent.id]: true}));
                    setActiveReply(null);
                    onRefresh();
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
      {!activeReply && <div className="pt-4"><CommentInput onSubmit={async (val) => { await addComment(postId, val); onRefresh(); }} /></div>}
    </div>
  );
}

/* ================== HELPER COMPONENTS ================== */

function TextWithReadMore({ text, limit = 150 }) {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!text) return null;
  if (text.length <= limit) return <p className="text-gray-800 mb-6 whitespace-pre-wrap leading-[1.8] font-medium text-[15px]">{text}</p>;

  return (
    <div className="mb-6">
      <p className="text-gray-800 whitespace-pre-wrap leading-[1.8] font-medium text-[15px] inline">
        {isExpanded ? text : `${text.substring(0, limit)}... `}
      </p>
      <button onClick={() => setIsExpanded(!isExpanded)} className="text-purple-600 font-black text-[10px] uppercase ml-1 hover:underline tracking-widest">
        {isExpanded ? "Less" : "Read More"}
      </button>
    </div>
  );
}

function CommentBubble({ comment, isReply, targetAuthorName, onParentClick, activeEditId, setActiveEditId, activeMenuId, setActiveMenuId, onReply, onRefresh, username }) {
  const navigate = useNavigate();
  return (
    <div className="group flex gap-3">
      <UserAvatar username={comment.author} size={isReply ? "w-8 h-8" : "w-9 h-9"} fontSize="text-[10px]" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="bg-white p-3.5 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm inline-block max-w-[95%]">
            <div className="flex items-center gap-2 mb-1">
              <p onClick={() => navigate(`/profile/${comment.author}`)} className="text-[9px] font-black text-purple-600 uppercase cursor-pointer tracking-wider">{comment.author}</p>
              {isReply && (
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">@{targetAuthorName}</span>
              )}
            </div>
            {activeEditId === comment.id ? (
              <CommentInput initialValue={comment.text} onCancel={() => setActiveEditId(null)} onSubmit={async (val) => { await updateComment(comment.id, val); setActiveEditId(null); onRefresh(); }} />
            ) : (
              <p className="text-[13px] text-gray-700 font-medium break-words leading-relaxed">{comment.text}</p>
            )}
          </div>
          {comment.author === username && activeEditId !== comment.id && (
            <div className="relative">
              <button onClick={() => setActiveMenuId(activeMenuId === comment.id ? null : comment.id)} className="p-1 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-gray-600 transition-opacity"><FiMoreVertical size={16}/></button>
              {activeMenuId === comment.id && (
                <div className="absolute right-0 w-32 bg-white/90 backdrop-blur-md shadow-2xl border border-gray-100 rounded-xl z-50 py-1">
                  <button onClick={() => { setActiveEditId(comment.id); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-[9px] font-black text-gray-600 uppercase flex items-center gap-2 tracking-widest"><FiEdit2 size={12}/> Edit</button>
                  <button onClick={() => { if(window.confirm("Delete?")) deleteComment(comment.id).then(onRefresh); }} className="w-full text-left px-3 py-2 text-[9px] font-black text-red-500 uppercase flex items-center gap-2 tracking-widest"><FiTrash2 size={12}/> Delete</button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mt-1 flex items-center gap-4 ml-1">
          <button onClick={onReply} className="text-[9px] font-black uppercase text-gray-400 hover:text-purple-600">Reply</button>
          <span className="text-[9px] text-gray-300 font-bold">{new Date(comment.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
      </div>
    </div>
  );
}

function CommentInput({ onSubmit, onCancel, initialValue = "", placeholder = "Write a comment...", autoFocus = false }) {
  const [val, setVal] = useState(initialValue);
  const handleSubmit = (e) => { e.preventDefault(); if (!val.trim()) return; onSubmit(val); setVal(""); };
  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100 focus-within:bg-white focus-within:ring-2 ring-purple-100 transition-all">
      <input 
        autoFocus={autoFocus} 
        value={val} 
        onChange={(e) => setVal(e.target.value)} 
        placeholder={placeholder} 
        className="flex-1 bg-transparent px-3 py-1.5 text-[13px] outline-none font-medium text-gray-700" 
      />
      {onCancel && <button type="button" onClick={onCancel} className="text-gray-400 hover:text-red-500 p-1"><FiX size={18}/></button>}
      <button 
        type="submit" 
        disabled={!val.trim()} 
        className="bg-purple-600 text-white p-2.5 rounded-xl hover:bg-purple-700 active:scale-90 shadow-md shadow-purple-50 disabled:bg-gray-200 transition-all flex-shrink-0"
      >
        <FiSend size={14} />
      </button>
    </form>
  );
}