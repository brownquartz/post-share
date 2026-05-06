// src/pages/posts/new.js
import Head from "next/head";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
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

  const [viewPolicy, setViewPolicy] = useState("public_open");
  const [editPolicy, setEditPolicy] = useState(user ? "owner" : "none");
  const [deletePolicy, setDeletePolicy] = useState(editPolicy);
  const [commentCreatePolicy, setCommentCreatePolicy] = useState("anyone");
  const [commentModeratePolicy, setCommentModeratePolicy] = useState("owner");

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

      const body = {
        title, postId, content: postContent,
        viewPolicy, editPolicy, deletePolicy,
        commentCreatePolicy, commentModeratePolicy,
      };

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
    <>
    <Head><title>投稿を作成 | Post Share</title></Head>
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
            <label className="radio-label"><input type="radio" name="viewPolicy" value="public_open" checked={viewPolicy === "public_open"} onChange={() => setViewPolicy("public_open")} /><span>全員に公開</span></label>
            <label className={user ? "radio-label" : "radio-dim"}><input type="radio" name="viewPolicy" value="owner" disabled={!user} checked={viewPolicy === "owner"} onChange={() => setViewPolicy("owner")} /><span>オーナーのみ</span></label>
            <label className="radio-label"><input type="radio" name="viewPolicy" value="locked" checked={viewPolicy === "locked"} onChange={() => setViewPolicy("locked")} /><span>ロック</span></label>
          </div>
        </div>

        <div>
          <label className="label">内容</label>
          <div className="quill-wrap rich-quill">
            <ReactQuill theme="snow" value={postContent} onChange={setPostContent} />
          </div>
        </div>

        {viewPolicy === "public_open" && (
          <div className="surface p-4 space-y-4">
            <div>
              <label className="label">編集権限</label>
              <div className="flex flex-wrap gap-4">
                <label className="radio-label"><input type="radio" name="editPolicy" value="none" checked={editPolicy === "none"} onChange={() => setEditPolicy("none")} /><span>なし</span></label>
                <label className={user ? "radio-label" : "radio-dim"}><input type="radio" name="editPolicy" value="owner" disabled={!user} checked={editPolicy === "owner"} onChange={() => setEditPolicy("owner")} /><span>オーナー</span></label>
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
    </>
  );
}
