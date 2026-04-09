// src/pages/posts/new.js
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import CryptoJS from "crypto-js";
import { API_BASE } from "../../lib/apiBase";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from 'next/router';

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

export default function NewPostPage() {
  const { user, authReady } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postId, setpostId] = useState("");
  const [useMyId, setUseMyId] = useState(!!user);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [viewPolicy, setViewPolicy] = useState("public_password");
  const [editPolicy, setEditPolicy] = useState(user ? "owner" : "password");
  const [deletePolicy, setDeletePolicy] = useState(editPolicy);
  const [commentCreatePolicy, setCommentCreatePolicy] = useState("anyone");
  const [commentModeratePolicy, setCommentModeratePolicy] = useState("owner");
  const [viewPassword, setViewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (viewPolicy === "owner") {
      setEditPolicy("owner"); setDeletePolicy("owner");
      setCommentCreatePolicy("owner"); setCommentModeratePolicy("owner");
    } else if (viewPolicy === "locked") {
      setEditPolicy("none"); setDeletePolicy("owner");
      setCommentCreatePolicy("none"); setCommentModeratePolicy("owner");
    }
  }, [viewPolicy]);

  useEffect(() => { setDeletePolicy(editPolicy); }, [editPolicy]);

  useEffect(() => {
    if (useMyId && user) {
      setpostId(user?.username ?? String(user?.postId ?? ""));
    }
  }, [useMyId, user]);

  useEffect(() => { if (!useMyId) setpostId(""); }, [useMyId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg(""); setLoading(true);
    try {
      if (!postId.trim()) throw new Error("ポストIDを入力してください");
      if (!title.trim()) throw new Error("タイトルを入力してください");
      if (!postContent || postContent.replace(/<[^>]*>/g, '').trim() === '') throw new Error("内容を入力してください");

      const body = { title, postId, viewPolicy, editPolicy, deletePolicy, commentCreatePolicy, commentModeratePolicy };

      if (viewPolicy === "public_password") {
        if (!viewPassword) throw new Error("パスワードを入力してください");
        const keyHex = CryptoJS.SHA256(viewPassword).toString();
        body.content = CryptoJS.AES.encrypt(postContent, keyHex).toString();
        body.postPassword = keyHex;
        if (typeof window !== "undefined") sessionStorage.setItem(`view:post:${postId}`, keyHex);
      } else {
        body.content = postContent;
      }

      const res = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `保存に失敗しました (${res.status})`);
      window.location.href = "/posts/view";
    } catch (err) {
      setErrorMsg(err.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  if (!authReady) return <div className="p-6 text-secondary text-sm">セッション確認中…</div>;

  return (
    <main className="page-wrap-md">
      <h1 className="page-title mb-8">投稿を作成</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="label">タイトル</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div>
          <label className="label">ポストID</label>
          <input
            className="input"
            value={postId}
            onChange={(e) => setpostId(e.target.value)}
            placeholder={useMyId ? "自分のIDを使用" : "ポストIDを入力"}
            readOnly={useMyId && !!user}
            required
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-secondary cursor-pointer">
            <input type="checkbox" checked={useMyId} onChange={(e) => setUseMyId(e.target.checked)} disabled={authReady && !user} />
            <span>自分のIDを使う</span>
          </label>
        </div>

        <div>
          <label className="label">公開設定</label>
          <div className="flex flex-wrap gap-4">
            <label className="radio-label"><input type="radio" name="viewPolicy" value="public_password" checked={viewPolicy === "public_password"} onChange={() => setViewPolicy("public_password")} /><span>パスワード必須</span></label>
            <label className={user ? "radio-label" : "radio-dim"}><input type="radio" name="viewPolicy" value="owner" disabled={!user} checked={viewPolicy === "owner"} onChange={() => setViewPolicy("owner")} /><span>オーナーのみ</span></label>
            <label className="radio-label"><input type="radio" name="viewPolicy" value="locked" checked={viewPolicy === "locked"} onChange={() => setViewPolicy("locked")} /><span>ロック</span></label>
          </div>
          {viewPolicy === "public_password" && (
            <div className="mt-3">
              <label className="label">パスワード</label>
              <div className="flex items-center gap-2">
                <input className="input" type={showPw ? "text" : "password"} value={viewPassword} onChange={(e) => setViewPassword(e.target.value)} required={viewPolicy === "public_password"} />
                <label className="text-sm text-secondary flex items-center gap-1 whitespace-nowrap cursor-pointer">
                  <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} /> 表示
                </label>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="label">内容</label>
          <div className="quill-wrap rich-quill">
            <ReactQuill theme="snow" value={postContent} onChange={setPostContent} />
          </div>
        </div>

        {viewPolicy === "public_password" && (
          <div className="surface p-4 space-y-4">
            <div>
              <label className="label">編集権限</label>
              <div className="flex flex-wrap gap-4">
                <label className="radio-label"><input type="radio" name="editPolicy" value="none" checked={editPolicy === "none"} onChange={() => setEditPolicy("none")} /><span>なし</span></label>
                <label className={user ? "radio-label" : "radio-dim"}><input type="radio" name="editPolicy" value="owner" disabled={!user} checked={editPolicy === "owner"} onChange={() => setEditPolicy("owner")} /><span>オーナー</span></label>
                <label className="radio-label"><input type="radio" name="editPolicy" value="password" checked={editPolicy === "password"} onChange={() => setEditPolicy("password")} /><span>パスワード保持者</span></label>
              </div>
              <p className="text-xs text-muted mt-1">削除権限は編集権限と同じです</p>
            </div>
            <div>
              <label className="label">コメント可能なユーザー</label>
              <div className="flex flex-wrap gap-4">
                <label className="radio-label"><input type="radio" name="commentCreatePolicy" value="none" checked={commentCreatePolicy === "none"} onChange={() => setCommentCreatePolicy("none")} /><span>なし</span></label>
                <label className="radio-label"><input type="radio" name="commentCreatePolicy" value="anyone" checked={commentCreatePolicy === "anyone"} onChange={() => setCommentCreatePolicy("anyone")} /><span>誰でも</span></label>
                <label className={user ? "radio-label" : "radio-dim"}><input type="radio" name="commentCreatePolicy" value="owner" disabled={!user} checked={commentCreatePolicy === "owner"} onChange={() => setCommentCreatePolicy("owner")} /><span>オーナー</span></label>
              </div>
            </div>
          </div>
        )}

        {errorMsg && <p className="text-error">{errorMsg}</p>}

        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
          {loading ? "投稿中…" : "投稿する"}
        </button>
      </form>
    </main>
  );
}
