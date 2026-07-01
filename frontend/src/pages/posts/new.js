// src/pages/posts/new.js
import Head from "next/head";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import CryptoJS from "crypto-js";
import { API_BASE } from "../../lib/apiBase";
import { useAuth } from "../../context/AuthContext";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

function sha256Hex(str) {
  return CryptoJS.SHA256(str).toString();
}

export default function NewPostPage() {
  const { user, authReady } = useAuth();

  const [title, setTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postId, setpostId] = useState("");
  const [useMyId, setUseMyId] = useState(!!user);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [viewPolicy, setViewPolicy] = useState("public_open");
  const [viewPassword, setViewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [editPolicy, setEditPolicy] = useState("none");
  const [commentCreatePolicy, setCommentCreatePolicy] = useState("anyone");
  const [commentModeratePolicy, setCommentModeratePolicy] = useState("none");

  // ログイン状態が確定したらデフォルト値を更新
  useEffect(() => {
    if (!authReady) return;
    if (user) {
      setEditPolicy("owner");
      setCommentModeratePolicy("owner");
    } else {
      setEditPolicy("none");
      setCommentModeratePolicy("none");
    }
  }, [authReady, user]);

  useEffect(() => {
    if (viewPolicy === "owner") {
      setEditPolicy("owner");
      setCommentCreatePolicy("owner"); setCommentModeratePolicy("owner");
    }
  }, [viewPolicy]);

  useEffect(() => {
    if (useMyId && user) setpostId(user?.username ?? "");
  }, [useMyId, user]);

  useEffect(() => { if (!useMyId) setpostId(""); }, [useMyId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg(""); setLoading(true);
    try {
      if (!postId.trim()) throw new Error("ポストIDを入力してください");
      if (!title.trim()) throw new Error("タイトルを入力してください");
      if (!postContent || postContent.replace(/<[^>]*>/g, '').trim() === '') throw new Error("内容を入力してください");
      if (viewPolicy === "public_password" && !viewPassword.trim()) throw new Error("パスワードを入力してください");

      const body = {
        title, postId, viewPolicy, editPolicy,
        deletePolicy: editPolicy,
        commentCreatePolicy, commentModeratePolicy,
      };

      if (viewPolicy === "public_password") {
        const hash = sha256Hex(viewPassword);
        body.content = CryptoJS.AES.encrypt(postContent, hash).toString();
        body.postPassword = hash;
        sessionStorage.setItem(`view:post:${postId}`, hash);
        sessionStorage.setItem(`view:${postId}`, hash);
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
          <div className="flex flex-wrap gap-3">
            <label className="radio-label">
              <input type="radio" name="viewPolicy" value="public_open" checked={viewPolicy === "public_open"} onChange={() => setViewPolicy("public_open")} />
              <span>全員に公開</span>
            </label>
            <label className="radio-label">
              <input type="radio" name="viewPolicy" value="public_password" checked={viewPolicy === "public_password"} onChange={() => setViewPolicy("public_password")} />
              <span>パスワード保護</span>
            </label>
            <label className={user ? "radio-label" : "radio-dim"}>
              <input type="radio" name="viewPolicy" value="owner" disabled={!user} checked={viewPolicy === "owner"} onChange={() => setViewPolicy("owner")} />
              <span>作成者のみ</span>
            </label>
          </div>

          {viewPolicy === "public_password" && (
            <div className="mt-3">
              <label className="label">パスワード</label>
              <div className="flex items-center gap-2">
                <input
                  className="input"
                  type={showPw ? "text" : "password"}
                  value={viewPassword}
                  onChange={(e) => setViewPassword(e.target.value)}
                  placeholder="閲覧に必要なパスワード"
                  required
                />
                <label className="text-xs text-secondary flex items-center gap-1 whitespace-nowrap cursor-pointer">
                  <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} /> 表示
                </label>
              </div>
              <p className="text-xs text-muted mt-1">このパスワードを相手に共有してください</p>
            </div>
          )}
        </div>

        <div>
          <label className="label">内容</label>
          <div className="quill-wrap rich-quill">
            <ReactQuill theme="snow" value={postContent} onChange={setPostContent} />
          </div>
        </div>

        {(viewPolicy === "public_open" || viewPolicy === "public_password") && (
          <div className="surface p-4 space-y-4">
            <div>
              <label className="label">編集権限</label>
              <div className="flex flex-wrap gap-3">
                <label className="radio-label">
                  <input type="radio" name="editPolicy" value="none" checked={editPolicy === "none"} onChange={() => setEditPolicy("none")} />
                  <span>なし</span>
                </label>
                <label className={user ? "radio-label" : "radio-dim"}>
                  <input type="radio" name="editPolicy" value="owner" disabled={!user} checked={editPolicy === "owner"} onChange={() => setEditPolicy("owner")} />
                  <span>作成者</span>
                </label>
              </div>
              <p className="text-xs text-muted mt-1">削除権限は編集権限と同じです</p>
            </div>
            <div>
              <label className="label">コメント可能なユーザー</label>
              <div className="flex flex-wrap gap-3">
                <label className="radio-label">
                  <input type="radio" name="commentCreatePolicy" value="none" checked={commentCreatePolicy === "none"} onChange={() => setCommentCreatePolicy("none")} />
                  <span>なし</span>
                </label>
                <label className="radio-label">
                  <input type="radio" name="commentCreatePolicy" value="anyone" checked={commentCreatePolicy === "anyone"} onChange={() => setCommentCreatePolicy("anyone")} />
                  <span>誰でも</span>
                </label>
                <label className={user ? "radio-label" : "radio-dim"}>
                  <input type="radio" name="commentCreatePolicy" value="owner" disabled={!user} checked={commentCreatePolicy === "owner"} onChange={() => setCommentCreatePolicy("owner")} />
                  <span>作成者</span>
                </label>
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
