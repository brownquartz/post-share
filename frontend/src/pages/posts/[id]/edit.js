// pages/posts/[id]/edit.js
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import CryptoJS from "crypto-js";
import { API_BASE } from "../../../lib/apiBase";
import { useAuth } from "../../../context/AuthContext";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

export default function EditPostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { id, aid } = router.query;

  const [title, setTitle] = useState("");
  const [html, setHtml] = useState("");
  const [editPolicy, setEditPolicy] = useState("anyone");
  const [newViewPassword, setNewViewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const oldHash = useMemo(() => {
    if (typeof window === "undefined") return "";
    return aid ? sessionStorage.getItem(`view:${aid}`) || "" : "";
  }, [aid]);

  const postId = useMemo(() => (aid ? String(aid).trim() : ""), [aid]);

  useEffect(() => {
    if (!id || !aid) return;
    (async () => {
      try {
        setLoading(true); setError("");
        if (!oldHash) { setError("認証情報がありません（一覧から入り直してください）"); return; }
        const qs = new URLSearchParams({ postId, password: oldHash }).toString();
        const res = await fetch(`${API_BASE}/api/posts/${id}?${qs}`, { credentials: "include" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || `Load failed (${res.status})`);
        }
        const post = await res.json();
        setTitle(post.title || ""); setEditPolicy(post.editPolicy || "anyone");
        const bytes = CryptoJS.AES.decrypt(post.content, oldHash);
        const decoded = bytes.toString(CryptoJS.enc.Utf8);
        if (!decoded) throw new Error("復号に失敗しました（パスワードを確認）");
        setHtml(decoded);
      } catch (e) { setError(e.message || "Error"); }
      finally { setLoading(false); }
    })();
  }, [id, aid, postId, oldHash]);

  async function handleSave(e) {
    e.preventDefault?.();
    try {
      setSaving(true); setError("");
      if (!title.trim()) throw new Error("Title is required");
      if (!html.trim()) throw new Error("Content is required");
      const newHash = newViewPassword ? CryptoJS.SHA256(newViewPassword).toString() : oldHash;
      const encrypted = CryptoJS.AES.encrypt(html, newHash).toString();
      const qs = new URLSearchParams();
      if (postId && oldHash) { qs.set("postId", postId); qs.set("password", oldHash); }
      const body = { title, content: encrypted, editPolicy };
      if (newViewPassword) body.newPassword = newHash;
      const res = await fetch(`${API_BASE}/api/posts/${id}?${qs.toString()}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Save failed (${res.status})`);
      if (newViewPassword) sessionStorage.setItem(`view:${aid}`, newHash);
      router.push(`/posts/${id}?aid=${encodeURIComponent(postId)}`);
    } catch (e) { setError(e.message || "Error"); }
    finally { setSaving(false); }
  }

  return (
    <main className="page-wrap">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="page-title mb-0">投稿を編集</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => router.back()} className="btn-ghost btn-sm">キャンセル</button>
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary btn-sm disabled:opacity-60">
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>

      {loading && <p className="text-secondary text-sm">読み込み中…</p>}
      {error   && <p className="text-error">{error}</p>}

      {!loading && !error && (
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="label">タイトル</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div>
            <label className="label">内容</label>
            <div className="quill-wrap rich-quill">
              <ReactQuill theme="snow" value={html} onChange={setHtml} />
            </div>
          </div>

          <div>
            <label className="label">編集・削除権限</label>
            <div className="flex flex-wrap gap-4">
              <label className="radio-label"><input type="radio" name="policy" value="anyone" checked={editPolicy === "anyone"} onChange={() => setEditPolicy("anyone")} /><span>誰でも (ID+PW)</span></label>
              <label className={user ? "radio-label" : "radio-dim"}><input type="radio" name="policy" value="owner" disabled={!user} checked={editPolicy === "owner"} onChange={() => setEditPolicy("owner")} /><span>オーナーのみ</span></label>
              <label className="radio-label"><input type="radio" name="policy" value="locked" checked={editPolicy === "locked"} onChange={() => setEditPolicy("locked")} /><span>ロック</span></label>
            </div>
          </div>

          <div>
            <label className="label">閲覧パスワードを変更 <span className="text-muted font-normal">(任意)</span></label>
            <input className="input" type="password" value={newViewPassword} onChange={(e) => setNewViewPassword(e.target.value)} placeholder="空白の場合は現在のパスワードを維持" />
            <p className="text-xs text-muted mt-1">入力した場合は新しいパスワードで再暗号化します</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => router.back()} className="btn-ghost">キャンセル</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
