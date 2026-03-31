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

  // basics
  const [title, setTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postId, setpostId] = useState("");
  const [useMyId, setUseMyId] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // policies (5本柱の一部を先行導入)
  const [viewPolicy, setViewPolicy] = useState("public_password"); // 今は暗号化運用を既定
  const [editPolicy, setEditPolicy] = useState(user ? "owner" : "password");
  const [deletePolicy, setDeletePolicy] = useState(editPolicy); // 初期は同一に
  const [commentCreatePolicy, setCommentCreatePolicy] = useState("anyone");
  const [commentModeratePolicy, setCommentModeratePolicy] = useState("owner");

  // password for public_password
  const [viewPassword, setViewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // state はそのまま
  useEffect(() => {
    if (viewPolicy === "owner") {
      setEditPolicy("owner");
      setDeletePolicy("owner");
      setCommentCreatePolicy("owner");
      setCommentModeratePolicy("owner");
    } else if (viewPolicy === "locked") {
      setEditPolicy("none");
      setDeletePolicy("owner");      // ここは運用に合わせて none/owner どちらでも
      setCommentCreatePolicy("none");
      setCommentModeratePolicy("owner");
    }
  }, [viewPolicy]);

  // keep deletePolicy in sync unless user changes it later（今はUI省略）
  useEffect(() => {
    setDeletePolicy(editPolicy);
  }, [editPolicy]);

  // auto fill my id
  useEffect(() => {
    if (useMyId && user) {
      const myId = user?.username ?? String(user?.postId ?? "");
      setpostId(myId);
    }
  }, [useMyId, user]);

  // allow manual input when not using my id
  useEffect(() => {
    if (!useMyId) setpostId("");
  }, [useMyId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      if (!postId.trim()) throw new Error("Post ID is required");
      if (!title.trim()) throw new Error("Title is required");
      if (!postContent || postContent.replace(/<[^>]*>/g, '').trim() === '') throw new Error("Content is required");

      const body = {
        title,
        postId,
        viewPolicy,
        editPolicy,
        deletePolicy,
        commentCreatePolicy,
        commentModeratePolicy,
      };

      if (viewPolicy === "public_password") {
        if (!viewPassword) throw new Error("Password is required");
        const keyHex = CryptoJS.SHA256(viewPassword).toString(); // 64 hex
        body.content = CryptoJS.AES.encrypt(postContent, keyHex).toString();
        body.postPassword = keyHex;

        // remember for auto-auth on this device
        if (typeof window !== "undefined") {
          sessionStorage.setItem(`view:post:${postId}`, keyHex);
        }
      } else {
        // 平文（今は server 側で受理可。詳細ページは順次対応予定）
        body.content = postContent;
      }

      const res = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Save failed (${res.status})`);

      // redirect
      window.location.href = "/posts/view";
    } catch (err) {
      setErrorMsg(err.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  if (!authReady) return <div className="p-4 text-sm text-gray-600">Checking session…</div>;
  if (!user) return null;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Create a Post</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Post ID */}
        <div>
          <label className="block text-sm mb-1">Post ID</label>
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={postId}
            onChange={(e) => setpostId(e.target.value)}
            placeholder={
              useMyId ? (authReady && !user ? "Login required" : "Using your ID") : "Enter Post ID"
            }
            readOnly={useMyId && !!user}
            aria-readonly={useMyId && !!user}
            required
          />
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useMyId}
              onChange={(e) => setUseMyId(e.target.checked)}
              disabled={authReady && !user}
            />
            <span>Use my ID</span>
            {authReady && !user && <span className="text-slate-500">(Login to enable)</span>}
          </label>
        </div>

        {/* Visibility (viewPolicy) — まずは2択+Locked。public_open/friendsは後段で有効化 */}
        <div>
          <label className="block text-sm mb-1">Visibility</label>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="viewPolicy"
                value="public_password"
                checked={viewPolicy === "public_password"}
                onChange={() => setViewPolicy("public_password")}
              />
              <span>Password required (recommended)</span>
            </label>
            <label className={`inline-flex items-center gap-2 ${!user ? "opacity-50" : ""}`}>
              <input
                type="radio"
                name="viewPolicy"
                value="owner"
                disabled={!user}
                checked={viewPolicy === "owner"}
                onChange={() => setViewPolicy("owner")}
              />
              <span>Owner only</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="viewPolicy"
                value="locked"
                checked={viewPolicy === "locked"}
                onChange={() => setViewPolicy("locked")}
              />
              <span>Locked (no view)</span>
            </label>
          </div>
          {viewPolicy === "public_password" && (
            <div className="mt-2">
              <label className="block text-sm mb-1">Password</label>
              <div className="flex items-center gap-2">
                <input
                  className="w-full rounded-lg border px-3 py-2"
                  type={showPw ? "text" : "password"}
                  value={viewPassword}
                  onChange={(e) => setViewPassword(e.target.value)}
                  required={viewPolicy === "public_password"}
                />
                <label className="text-sm flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={showPw}
                    onChange={(e) => setShowPw(e.target.checked)}
                  />
                  Show
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm mb-1">Content</label>
          <div className="border rounded">
            <ReactQuill theme="snow" value={postContent} onChange={setPostContent} />
          </div>
        </div>

        {/* Edit / Delete Policy（新セット） */}
        {viewPolicy === "public_password" && (
          <>
            <div>
              <label className="block text-sm mb-1">Edit Policy</label>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="editPolicy"
                    value="none"
                    checked={editPolicy === "none"}
                    onChange={() => setEditPolicy("none")}
                  />
                  <span>None</span>
                </label>
                <label className={`inline-flex items-center gap-2 ${!user ? "opacity-50" : ""}`}>
                  <input
                    type="radio"
                    name="editPolicy"
                    value="owner"
                    disabled={!user}
                    checked={editPolicy === "owner"}
                    onChange={() => setEditPolicy("owner")}
                  />
                  <span>Owner</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="editPolicy"
                    value="friends"
                    checked={editPolicy === "friends"}
                    onChange={() => setEditPolicy("friends")}
                  />
                  <span>Friends</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="editPolicy"
                    value="password"
                    checked={editPolicy === "password"}
                    onChange={() => setEditPolicy("password")}
                  />
                  <span>Password holders</span>
                </label>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Delete policy is same as Edit for now.
              </p>
            </div>

            {/* Comments Policy（作成/モデレート） */}
            <div>
              <label className="block text-sm mb-1">Comments</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="font-medium mb-1">Who can comment?</div>
                  <div className="flex flex-wrap gap-4">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="commentCreatePolicy"
                        value="none"
                        checked={commentCreatePolicy === "none"}
                        onChange={() => setCommentCreatePolicy("none")}
                      />
                      <span>None</span>
                    </label>
                    <label className={`inline-flex items-center gap-2 ${!user ? "opacity-50" : ""}`}>
                      <input
                        type="radio"
                        name="commentCreatePolicy"
                        value="owner"
                        disabled={!user}
                        checked={commentCreatePolicy === "owner"}
                        onChange={() => setCommentCreatePolicy("owner")}
                      />
                      <span>Owner</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="commentCreatePolicy"
                        value="friends"
                        checked={commentCreatePolicy === "friends"}
                        onChange={() => setCommentCreatePolicy("friends")}
                      />
                      <span>Friends</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="commentCreatePolicy"
                        value="anyone"
                        checked={commentCreatePolicy === "anyone"}
                        onChange={() => setCommentCreatePolicy("anyone")}
                      />
                      <span>Anyone</span>
                    </label>
                  </div>
                </div>

                <div>
                  <div className="font-medium mb-1">Who can moderate comments?</div>
                  <div className="flex flex-wrap gap-4">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="commentModeratePolicy"
                        value="none"
                        checked={commentModeratePolicy === "none"}
                        onChange={() => setCommentModeratePolicy("none")}
                      />
                      <span>None</span>
                    </label>
                    <label className={`inline-flex items-center gap-2 ${!user ? "opacity-50" : ""}`}>
                      <input
                        type="radio"
                        name="commentModeratePolicy"
                        value="owner"
                        disabled={!user}
                        checked={commentModeratePolicy === "owner"}
                        onChange={() => setCommentModeratePolicy("owner")}
                      />
                      <span>Owner</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="commentModeratePolicy"
                        value="friends"
                        checked={commentModeratePolicy === "friends"}
                        onChange={() => setCommentModeratePolicy("friends")}
                      />
                      <span>Friends</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="commentModeratePolicy"
                        value="anyone"
                        checked={commentModeratePolicy === "anyone"}
                        onChange={() => setCommentModeratePolicy("anyone")}
                      />
                      <span>Anyone</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-xl border
                     border-blue-600 bg-blue-600 px-3 py-1.5 text-sm font-medium
                     text-white hover:opacity-90 active:scale-[.98]
                     transition disabled:opacity-60 cursor-pointer"
        >
          {loading ? "Creating..." : "Save"}
        </button>
      </form>
    </main>
  );
}
