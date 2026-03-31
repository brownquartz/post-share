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
  const [editPolicy, setEditPolicy] = useState("anyone"); // 'anyone' | 'owner' | 'locked'
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
        setLoading(true);
        setError("");
        if (!oldHash) {
          setError("認証情報がありません（一覧から入り直してください）");
          return;
        }
        const qs = new URLSearchParams({ postId, password: oldHash }).toString();
        const res = await fetch(`${API_BASE}/api/posts/${id}?${qs}`, { credentials: "include" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || `Load failed (${res.status})`);
        }
        const post = await res.json();

        setTitle(post.title || "");
        setEditPolicy(post.editPolicy || "anyone");

        // 復号
        const bytes = CryptoJS.AES.decrypt(post.content, oldHash);
        const decoded = bytes.toString(CryptoJS.enc.Utf8);
        if (!decoded) {
          throw new Error("復号に失敗しました（パスワードを確認）");
        }
        setHtml(decoded);
      } catch (e) {
        setError(e.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, aid, postId, oldHash]);

  async function handleSave(e) {
    e.preventDefault?.();
    try {
      setSaving(true);
      setError("");
      if (!title.trim()) throw new Error("Title is required");
      if (!html.trim()) throw new Error("Content is required");

      // 新ハッシュ（未入力なら旧ハッシュを継続）
      const newHash = newViewPassword ? CryptoJS.SHA256(newViewPassword).toString() : oldHash;

      // 本文を暗号化（新ハッシュで再暗号化）
      const encrypted = CryptoJS.AES.encrypt(html, newHash).toString();

      // anyone の認可用にクエリへ（owner の場合はクッキーで判定されるので無視されてもOK）
      const qs = new URLSearchParams();
      if (postId && oldHash) {
        qs.set("postId", postId);
        qs.set("password", oldHash);
      }

      const body = {
        title,
        content: encrypted,
        editPolicy,
      };
      if (newViewPassword) {
        body.newPassword = newHash; // サーバは toSha256Hex で正規化
      }

      const res = await fetch(`${API_BASE}/api/posts/${id}?${qs.toString()}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Save failed (${res.status})`);

      // 新しいパスに変えたら、sessionStorage も更新
      if (newViewPassword) {
        sessionStorage.setItem(`view:${aid}`, newHash);
      }

      router.push(`/posts/${id}?aid=${encodeURIComponent(postId)}`);
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    router.back();
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-start">
        <h1 className="text-2xl font-bold flex-1">Edit Post</h1>
        <div className="flex gap-2 shrink-0 ml-4">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-1 rounded-xl border
                       border-slate-300 bg-white px-3 py-1.5 text-sm font-medium
                       text-slate-700 hover:bg-slate-50 active:scale-[.98]
                       transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-xl border
                       border-blue-600 bg-blue-600 px-3 py-1.5 text-sm font-medium
                       text-white hover:opacity-90 active:scale-[.98]
                       transition disabled:opacity-60 cursor-pointer"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {loading && <p className="mt-6 text-slate-600">Loading...</p>}
      {error && <p className="mt-6 text-red-600">{error}</p>}

      {!loading && !error && (
        <form onSubmit={handleSave} className="mt-6 space-y-5">
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Content</label>
            <div className="border rounded">
              <ReactQuill theme="snow" value={html} onChange={setHtml} />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Edit / Delete Policy</label>
            <div className="flex gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="policy"
                  value="anyone"
                  checked={editPolicy === "anyone"}
                  onChange={() => setEditPolicy("anyone")}
                />
                <span>Anyone (ID+PW required)</span>
              </label>
              <label className={`inline-flex items-center gap-2 ${!user ? "opacity-50" : ""}`}>
                <input
                  type="radio"
                  name="policy"
                  value="owner"
                  disabled={!user}
                  checked={editPolicy === "owner"}
                  onChange={() => setEditPolicy("owner")}
                />
                <span>Owner only</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="policy"
                  value="locked"
                  checked={editPolicy === "locked"}
                  onChange={() => setEditPolicy("locked")}
                />
                <span>Locked (no edits)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Change view password (optional)</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              type="password"
              value={newViewPassword}
              onChange={(e) => setNewViewPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
            />
            <p className="text-xs text-slate-500 mt-1">
              入力した場合は新しいパスワードで再暗号化して保存します。
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-1 rounded-xl border
                         border-slate-300 bg-white px-3 py-1.5 text-sm font-medium
                         text-slate-700 hover:bg-slate-50 active:scale-[.98]
                         transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-xl border
                         border-blue-600 bg-blue-600 px-3 py-1.5 text-sm font-medium
                         text-white hover:opacity-90 active:scale-[.98]
                         transition disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
