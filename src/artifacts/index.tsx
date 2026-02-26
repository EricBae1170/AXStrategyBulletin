/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from "react";

const ADMIN_NAME = "AX전략실장";
const ADMIN_PASSWORD = "ax1234";
const CATEGORIES = ["전체", "건의", "질문", "자유"];
const REACTIONS = ["👍", "❤️", "🔥", "💡", "😢"];

function timeAgo(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return "방금 전";
  if (d < 3600) return `${Math.floor(d / 60)}분 전`;
  if (d < 86400) return `${Math.floor(d / 3600)}시간 전`;
  return `${Math.floor(d / 86400)}일 전`;
}

let nextId = 100;
function genId() { return String(++nextId); }

// ── IP 가져오기 ───────────────────────────────────────────
async function fetchIP() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip || "unknown";
  } catch {
    return "unknown";
  }
}

const initialPosts = [
  { id: "1", category: "건의", title: "사내 카페 운영 시간 연장 건의", content: "오후 6시 이후에도 카페가 운영되면 야근할 때 많은 도움이 될 것 같아요!", reactions: { "👍": 5, "❤️": 2 }, comments: [], hidden: false, ts: Date.now() - 3600000 * 2, adminReply: "좋은 의견 감사해요! 운영팀과 협의해 보겠습니다 😊", ip: "203.0.113.1" },
  { id: "2", category: "질문", title: "올해 하반기 조직 개편 계획이 있나요?", content: "소문이 돌고 있어서 궁금합니다.", reactions: { "💡": 3 }, comments: [], hidden: false, ts: Date.now() - 3600000 * 5, adminReply: null, ip: "203.0.113.2" },
  { id: "3", category: "자유", title: "팀 점심 메뉴 추천해요!", content: "요즘 근처에 새로 생긴 파스타 집이 맛있더라고요 🍝", reactions: { "🔥": 8, "👍": 4 }, comments: [{ id: "c1", text: "저도 가봤는데 강추!", ts: Date.now() - 1000000, isAdmin: false, hidden: false, adminReply: null, ip: "203.0.113.3" }], hidden: false, ts: Date.now() - 3600000 * 24, adminReply: null, ip: "203.0.113.4" },
];

// ── localStorage ──────────────────────────────────────────
const DB_KEY = "ax_board_posts";
const PW_KEY  = "ax_admin_pw";

function loadPosts() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) { localStorage.setItem(DB_KEY, JSON.stringify(initialPosts)); return initialPosts; }
    return JSON.parse(raw);
  } catch { return initialPosts; }
}
function savePosts(posts) { try { localStorage.setItem(DB_KEY, JSON.stringify(posts)); } catch {} }
function getAdminPw() { return localStorage.getItem(PW_KEY) || ADMIN_PASSWORD; }
function setAdminPw(pw) { localStorage.setItem(PW_KEY, pw); }

function updatePost(posts, id, fn) { return posts.map(p => p.id === id ? fn(p) : p); }
function updateComment(posts, pid, cid, fn) {
  return updatePost(posts, pid, p => ({ ...p, comments: p.comments.map(c => c.id === cid ? fn(c) : c) }));
}

// ── IP 뱃지 컴포넌트 ──────────────────────────────────────
function IPBadge({ ip }) {
  const [copied, setCopied] = useState(false);
  if (!ip || ip === "unknown") return <span style={{ fontSize: 10, color: "#a0aec0", background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "1px 7px", fontFamily: "monospace" }}>IP 불명</span>;
  function copy() {
    navigator.clipboard?.writeText(ip).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }
  return (
    <span onClick={e => { e.stopPropagation(); copy(); }} title="클릭하여 복사" style={{ fontSize: 10, color: "#5a67d8", background: "#ebf4ff", border: "1px solid #c3dafe", borderRadius: 6, padding: "1px 7px", fontFamily: "monospace", cursor: "pointer", userSelect: "none" }}>
      🌐 {ip}{copied ? " ✅" : ""}
    </span>
  );
}

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const [posts, setPosts]         = useState([]);
  const [category, setCategory]   = useState("전체");
  const [showWrite, setShowWrite] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [expanded, setExpanded]   = useState(null);
  const [myIP, setMyIP]           = useState(null);

  useEffect(() => { setPosts(loadPosts()); }, []);
  // 페이지 로드 시 IP 미리 fetch
  useEffect(() => { fetchIP().then(setMyIP); }, []);

  const set = fn => setPosts(prev => { const next = fn(prev); savePosts(next); return next; });
  const filtered = posts.filter(p => category === "전체" || p.category === category);

  async function handleAddPost(data) {
    const ip = myIP || await fetchIP();
    set(prev => [{ ...data, id: genId(), ts: Date.now(), reactions: {}, comments: [], hidden: false, adminReply: null, ip }, ...prev]);
    setShowWrite(false);
  }
  function handleReaction(pid, emoji) {
    set(prev => updatePost(prev, pid, p => ({ ...p, reactions: { ...p.reactions, [emoji]: (p.reactions[emoji] || 0) + 1 } })));
  }
  function handleToggleHide(pid) { set(prev => updatePost(prev, pid, p => ({ ...p, hidden: !p.hidden }))); }
  function handleDeletePost(pid) {
    if (!confirm("정말 삭제할까요?")) return;
    set(prev => prev.filter(p => p.id !== pid));
    if (expanded === pid) setExpanded(null);
  }
  function handleAdminReply(pid, text) { set(prev => updatePost(prev, pid, p => ({ ...p, adminReply: text }))); }

  async function handleAddComment(pid, text, isAdminComment) {
    const ip = myIP || await fetchIP();
    set(prev => updatePost(prev, pid, p => ({
      ...p,
      comments: [...p.comments, { id: genId(), text, ts: Date.now(), isAdmin: isAdminComment, hidden: false, adminReply: null, ip }]
    })));
  }
  function handleToggleCommentHide(pid, cid) { set(prev => updateComment(prev, pid, cid, c => ({ ...c, hidden: !c.hidden }))); }
  function handleDeleteComment(pid, cid) {
    if (!confirm("댓글을 삭제할까요?")) return;
    set(prev => updatePost(prev, pid, p => ({ ...p, comments: p.comments.filter(c => c.id !== cid) })));
  }
  function handleCommentAdminReply(pid, cid, text) { set(prev => updateComment(prev, pid, cid, c => ({ ...c, adminReply: text }))); }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#fff9f0 0%,#f0f4ff 100%)", fontFamily: "'Apple SD Gothic Neo',sans-serif" }}>
      {/* Header */}
      <div style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", padding: "0 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>💬</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#2d3748" }}>AX전략실 소통 게시판</div>
              <div style={{ fontSize: 11, color: "#a0aec0" }}>자유롭게 건의하고 질문하세요</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {isAdmin ? (
              <>
                <span style={{ background: "#667eea", color: "white", borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 700 }}>🛡 {ADMIN_NAME}</span>
                <button onClick={() => setIsAdmin(false)} style={{ background: "#fed7d7", border: "none", borderRadius: 20, padding: "6px 12px", fontSize: 12, cursor: "pointer", color: "#c53030" }}>로그아웃</button>
              </>
            ) : (
              <button onClick={() => setShowAdmin(true)} style={{ background: "#f7fafc", border: "1.5px solid #e2e8f0", borderRadius: 20, padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#4a5568" }}>🔑 관리자</button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{ padding: "7px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: category === c ? "#667eea" : "white", color: category === c ? "white" : "#4a5568", boxShadow: category === c ? "0 2px 8px rgba(102,126,234,0.4)" : "0 1px 4px rgba(0,0,0,0.08)", transition: "all 0.2s" }}>{c}</button>
            ))}
          </div>
          <button onClick={() => setShowWrite(true)} style={{ background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", border: "none", borderRadius: 20, padding: "9px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 12px rgba(102,126,234,0.4)" }}>✏️ 글쓰기</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.length === 0 && <div style={{ textAlign: "center", color: "#a0aec0", padding: 48 }}>아직 게시글이 없어요 🌱</div>}
          {filtered.map(post => (
            <PostCard
              key={post.id} post={post} isAdmin={isAdmin}
              expanded={expanded === post.id}
              onToggle={() => setExpanded(expanded === post.id ? null : post.id)}
              onReaction={e => handleReaction(post.id, e)}
              onToggleHide={() => handleToggleHide(post.id)}
              onDelete={() => handleDeletePost(post.id)}
              onAdminReply={t => handleAdminReply(post.id, t)}
              onAddComment={(t, adm) => handleAddComment(post.id, t, adm)}
              onToggleCommentHide={cid => handleToggleCommentHide(post.id, cid)}
              onDeleteComment={cid => handleDeleteComment(post.id, cid)}
              onCommentAdminReply={(cid, t) => handleCommentAdminReply(post.id, cid, t)}
            />
          ))}
        </div>
      </div>

      {showWrite && <WriteModal onClose={() => setShowWrite(false)} onSubmit={handleAddPost} />}
      {showAdmin && <AdminModal onClose={() => setShowAdmin(false)} onLogin={() => { setIsAdmin(true); setShowAdmin(false); }} />}
    </div>
  );
}

// ── PostCard ──────────────────────────────────────────────
function PostCard({ post, isAdmin, expanded, onToggle, onReaction, onToggleHide, onDelete, onAdminReply, onAddComment, onToggleCommentHide, onDeleteComment, onCommentAdminReply }) {
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText]     = useState("");
  const [openReply, setOpenReply]     = useState({});
  const [replyTexts, setReplyTexts]   = useState({});

  const catColor = { 건의: { bg: "#fef3c7", color: "#d97706" }, 질문: { bg: "#dbeafe", color: "#2563eb" }, 자유: { bg: "#dcfce7", color: "#16a34a" } };
  const cc = catColor[post.category] || { bg: "#f0f4ff", color: "#667eea" };

  function submitCommentReply(cid) {
    const t = (replyTexts[cid] || "").trim();
    if (!t) return;
    onCommentAdminReply(cid, t);
    setReplyTexts(p => ({ ...p, [cid]: "" }));
    setOpenReply(p => ({ ...p, [cid]: false }));
  }

  return (
    <div style={{ background: "white", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden" }}>
      <div style={{ position: "relative" }}>
        {post.hidden && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 110, backdropFilter: "blur(6px)", background: "rgba(255,255,255,0.4)", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "16px 16px 0 0", pointerEvents: "none" }}>
            <span style={{ background: "#e2e8f0", borderRadius: 12, padding: "6px 16px", fontSize: 13, color: "#718096", fontWeight: 600 }}>🙈 숨김 처리된 게시글</span>
          </div>
        )}

        <div style={{ padding: "18px 20px", cursor: "pointer" }} onClick={onToggle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ background: cc.bg, color: cc.color, fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 10 }}>{post.category}</span>
                {post.adminReply && <span style={{ background: "#ede9fe", color: "#7c3aed", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 10 }}>✅ 답변완료</span>}
                {/* 관리자에게만 IP 표시 */}
                {isAdmin && <IPBadge ip={post.ip} />}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#2d3748", marginBottom: 6 }}>{post.title}</div>
              <div style={{ fontSize: 13, color: "#718096", lineHeight: 1.5 }}>{post.content}</div>
            </div>
            {isAdmin && (
              <div style={{ display: "flex", gap: 6, marginLeft: 12, zIndex: 3, position: "relative" }} onClick={e => e.stopPropagation()}>
                <button onClick={onToggleHide} style={{ background: post.hidden ? "#fef3c7" : "#f0fff4", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer", color: post.hidden ? "#d97706" : "#38a169", fontWeight: 600 }}>{post.hidden ? "공개" : "숨김"}</button>
                <button onClick={onDelete} style={{ background: "#fff5f5", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer", color: "#e53e3e", fontWeight: 600 }}>삭제</button>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
            {REACTIONS.map(emoji => (
              <button key={emoji} onClick={() => onReaction(emoji)} style={{ background: "#f7fafc", border: "1.5px solid #e2e8f0", borderRadius: 20, padding: "4px 10px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                {emoji}{post.reactions[emoji] ? <span style={{ fontSize: 11, color: "#4a5568", fontWeight: 700 }}>{post.reactions[emoji]}</span> : null}
              </button>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#a0aec0", alignSelf: "center" }}>{timeAgo(post.ts)} · 💬 {post.comments.length}</span>
          </div>
        </div>

        {expanded && (
          <div style={{ borderTop: "1px solid #f0f4ff", padding: "16px 20px", background: "#fafbff" }}>
            {/* 게시글 공식 답변 */}
            {post.adminReply && (
              <div style={{ background: "linear-gradient(135deg,#ede9fe,#dbeafe)", borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#7c3aed", marginBottom: 4 }}>🛡 {ADMIN_NAME} 공식 답변</div>
                <div style={{ fontSize: 13, color: "#4a5568", lineHeight: 1.6 }}>{post.adminReply}</div>
              </div>
            )}
            {isAdmin && !post.adminReply && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", marginBottom: 6 }}>🛡 게시글 공식 답변 달기</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && replyText.trim()) { onAdminReply(replyText.trim()); setReplyText(""); }}} placeholder="답변을 입력하세요..." style={{ flex: 1, border: "1.5px solid #c4b5fd", borderRadius: 10, padding: "8px 12px", fontSize: 13, outline: "none" }} />
                  <button onClick={() => { if (replyText.trim()) { onAdminReply(replyText.trim()); setReplyText(""); }}} style={{ background: "#7c3aed", color: "white", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>등록</button>
                </div>
              </div>
            )}

            {/* 댓글 목록 */}
            <div style={{ fontSize: 12, fontWeight: 700, color: "#4a5568", marginBottom: 10 }}>💬 댓글 {post.comments.length}개</div>
            {post.comments.map(c => (
              <div key={c.id} style={{ marginBottom: 10 }}>
                <div style={{ position: "relative" }}>
                  {c.hidden && !isAdmin && (
                    <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(5px)", background: "rgba(255,255,255,0.45)", zIndex: 2, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                      <span style={{ fontSize: 12, color: "#718096", fontWeight: 600 }}>🙈 숨김 댓글</span>
                    </div>
                  )}
                  <div style={{ background: c.isAdmin ? "linear-gradient(135deg,#ede9fe,#dbeafe)" : c.hidden && isAdmin ? "#fff8f0" : "white", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#4a5568", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: c.isAdmin ? 700 : 400, color: c.isAdmin ? "#7c3aed" : "#a0aec0" }}>
                          {c.isAdmin ? `🛡 ${ADMIN_NAME}` : "익명"}
                        </span>
                        {/* 댓글 IP — 관리자 + 익명 댓글에만 표시 */}
                        {isAdmin && !c.isAdmin && <IPBadge ip={c.ip} />}
                        {isAdmin && c.hidden && <span style={{ fontSize: 10, background: "#fef3c7", color: "#d97706", borderRadius: 6, padding: "1px 6px", fontWeight: 700 }}>숨김중</span>}
                      </div>
                      {isAdmin && (
                        <div style={{ display: "flex", gap: 4, flexShrink: 0, zIndex: 3, position: "relative" }}>
                          {!c.isAdmin && !c.adminReply && (
                            <button onClick={e => { e.stopPropagation(); setOpenReply(p => ({ ...p, [c.id]: !p[c.id] })); }} style={{ background: "#f0f4ff", border: "none", borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer", color: "#667eea", fontWeight: 600 }}>답변</button>
                          )}
                          <button onClick={e => { e.stopPropagation(); onToggleCommentHide(c.id); }} style={{ background: c.hidden ? "#fef3c7" : "#f0fff4", border: "none", borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer", color: c.hidden ? "#d97706" : "#38a169", fontWeight: 600 }}>{c.hidden ? "공개" : "숨김"}</button>
                          <button onClick={e => { e.stopPropagation(); onDeleteComment(c.id); }} style={{ background: "#fff5f5", border: "none", borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer", color: "#e53e3e", fontWeight: 600 }}>삭제</button>
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: 4, lineHeight: 1.5 }}>
                      {c.text}
                      <span style={{ fontSize: 11, color: "#cbd5e0", marginLeft: 8 }}>{timeAgo(c.ts)}</span>
                    </div>
                  </div>
                </div>

                {/* 댓글 Admin 답변 */}
                {c.adminReply && (
                  <div style={{ marginLeft: 20, marginTop: 4, background: "linear-gradient(135deg,#ede9fe,#dbeafe)", borderRadius: 10, padding: "8px 14px", fontSize: 12, color: "#4a5568" }}>
                    <span style={{ fontWeight: 700, color: "#7c3aed", marginRight: 8 }}>🛡 {ADMIN_NAME}</span>{c.adminReply}
                  </div>
                )}

                {isAdmin && openReply[c.id] && !c.adminReply && (
                  <div style={{ marginLeft: 20, marginTop: 6, display: "flex", gap: 8 }}>
                    <input value={replyTexts[c.id] || ""} onChange={e => setReplyTexts(p => ({ ...p, [c.id]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") submitCommentReply(c.id); }} placeholder="댓글에 답변하기..." style={{ flex: 1, border: "1.5px solid #c4b5fd", borderRadius: 10, padding: "7px 12px", fontSize: 12, outline: "none" }} />
                    <button onClick={() => submitCommentReply(c.id)} style={{ background: "#7c3aed", color: "white", border: "none", borderRadius: 10, padding: "7px 12px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>등록</button>
                    <button onClick={() => setOpenReply(p => ({ ...p, [c.id]: false }))} style={{ background: "#f7fafc", border: "none", borderRadius: 10, padding: "7px 10px", fontSize: 12, cursor: "pointer", color: "#718096" }}>취소</button>
                  </div>
                )}
              </div>
            ))}

            {/* 댓글 입력 */}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && commentText.trim()) { onAddComment(commentText.trim(), isAdmin); setCommentText(""); }}} placeholder={isAdmin ? `${ADMIN_NAME}으로 댓글 달기...` : "익명 댓글 달기..."} style={{ flex: 1, border: `1.5px solid ${isAdmin ? "#c4b5fd" : "#e2e8f0"}`, borderRadius: 10, padding: "8px 12px", fontSize: 13, outline: "none" }} />
              <button onClick={() => { if (commentText.trim()) { onAddComment(commentText.trim(), isAdmin); setCommentText(""); }}} style={{ background: isAdmin ? "#7c3aed" : "#667eea", color: "white", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>등록</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── WriteModal ────────────────────────────────────────────
function WriteModal({ onClose, onSubmit }) {
  const [category, setCategory] = useState("건의");
  const [title, setTitle]       = useState("");
  const [content, setContent]   = useState("");
  const [error, setError]       = useState("");

  function submit() {
    if (!title.trim() || !content.trim()) { setError("내용을 입력하세요^^"); return; }
    onSubmit({ category, title: title.trim(), content: content.trim() });
  }

  return (
    <>
      {error && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setError("")}>
          <div style={{ background: "white", borderRadius: 20, padding: "32px 36px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", minWidth: 280 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✋</div>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#2d3748", marginBottom: 6 }}>앗!</div>
            <div style={{ fontSize: 15, color: "#4a5568", marginBottom: 24 }}>{error}</div>
            <button onClick={() => setError("")} style={{ background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", border: "none", borderRadius: 12, padding: "10px 32px", fontSize: 14, cursor: "pointer", fontWeight: 700 }}>확인</button>
          </div>
        </div>
      )}
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={onClose}>
        <div style={{ background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 20, color: "#2d3748" }}>✏️ 익명으로 글쓰기</div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#4a5568", marginBottom: 6 }}>카테고리</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["건의","질문","자유"].map(c => (
                <button key={c} onClick={() => setCategory(c)} style={{ padding: "7px 16px", borderRadius: 16, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: category === c ? "#667eea" : "#f7fafc", color: category === c ? "white" : "#4a5568" }}>{c}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#4a5568", marginBottom: 6 }}>제목</div>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="제목을 입력하세요" style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#4a5568", marginBottom: 6 }}>내용</div>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="자유롭게 작성해 주세요. 익명으로 전달됩니다." rows={4} style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, background: "#f7fafc", border: "none", borderRadius: 12, padding: 12, fontSize: 14, cursor: "pointer", color: "#4a5568", fontWeight: 600 }}>취소</button>
            <button onClick={submit} style={{ flex: 2, background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", border: "none", borderRadius: 12, padding: 12, fontSize: 14, cursor: "pointer", fontWeight: 700 }}>익명으로 등록</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── AdminModal ────────────────────────────────────────────
function AdminModal({ onClose, onLogin }) {
  const [view, setView]         = useState("login");
  const [pw, setPw]             = useState("");
  const [newPw, setNewPw]       = useState("");
  const [confirmPw, setConfirm] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [msg, setMsg]           = useState("");

  function login() {
    if (pw === getAdminPw()) { onLogin(); }
    else { setLoginErr("비밀번호가 틀렸습니다."); }
  }
  function changePassword() {
    if (pw !== getAdminPw()) { setMsg("현재 비밀번호가 틀렸어요."); return; }
    if (!newPw.trim() || newPw.length < 4) { setMsg("비밀번호는 4자 이상이어야 해요."); return; }
    if (newPw !== confirmPw) { setMsg("비밀번호가 일치하지 않아요."); return; }
    setAdminPw(newPw);
    setMsg("✅ 비밀번호가 변경되었어요!");
    setTimeout(() => { setMsg(""); setView("login"); setPw(""); setNewPw(""); setConfirm(""); }, 1500);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: 20, padding: 28, width: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
        {view === "login" ? (
          <>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6, color: "#2d3748" }}>🔑 관리자 로그인</div>
            <div style={{ fontSize: 13, color: "#a0aec0", marginBottom: 20 }}>AX전략실장 전용 페이지입니다</div>
            <input type="password" value={pw} onChange={e => { setPw(e.target.value); setLoginErr(""); }} onKeyDown={e => e.key === "Enter" && login()} placeholder="비밀번호 입력" style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
            {loginErr && <div style={{ color: "#e53e3e", fontSize: 12, marginBottom: 8 }}>{loginErr}</div>}
            <button onClick={login} style={{ width: "100%", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", border: "none", borderRadius: 12, padding: 12, fontSize: 14, cursor: "pointer", fontWeight: 700, marginBottom: 10 }}>로그인</button>
            <div style={{ textAlign: "center" }}>
              <button onClick={() => { setView("changePassword"); setLoginErr(""); setPw(""); }} style={{ background: "none", border: "none", color: "#667eea", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>비밀번호 변경</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6, color: "#2d3748" }}>🔒 비밀번호 변경</div>
            <div style={{ fontSize: 13, color: "#a0aec0", marginBottom: 20 }}>현재 비밀번호를 먼저 확인합니다</div>
            {[["현재 비밀번호", pw, v => { setPw(v); setMsg(""); }, "현재 비밀번호"], ["새 비밀번호", newPw, v => { setNewPw(v); setMsg(""); }, "새 비밀번호 (4자 이상)"], ["새 비밀번호 확인", confirmPw, v => { setConfirm(v); setMsg(""); }, "새 비밀번호 재입력"]].map(([label, val, setter, ph]) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#4a5568", marginBottom: 4 }}>{label}</div>
                <input type="password" value={val} onChange={e => setter(e.target.value)} onKeyDown={e => e.key === "Enter" && changePassword()} placeholder={ph} style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            {msg && <div style={{ fontSize: 12, marginBottom: 8, color: msg.startsWith("✅") ? "#38a169" : "#e53e3e", fontWeight: 600 }}>{msg}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setView("login"); setMsg(""); setNewPw(""); setConfirm(""); setPw(""); }} style={{ flex: 1, background: "#f7fafc", border: "none", borderRadius: 12, padding: 11, fontSize: 14, cursor: "pointer", color: "#4a5568", fontWeight: 600 }}>← 뒤로</button>
              <button onClick={changePassword} style={{ flex: 2, background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", border: "none", borderRadius: 12, padding: 11, fontSize: 14, cursor: "pointer", fontWeight: 700 }}>변경하기</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}