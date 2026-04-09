// pages/auth/signup.js
import { useState } from "react";
import { useRouter } from "next/router";
import { signupUser } from "../../lib/auth";

export default function SignUp() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    if (password !== confirm) { setErrorMsg("パスワードが一致しません"); return; }
    setLoading(true);
    try {
      await signupUser({ username, password, passwordConfirm: confirm });
      router.push("/auth/login");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-wrap-sm">
      <h1 className="page-title mb-8">新規登録</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">ユーザー名</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </div>
        <div>
          <label className="label">パスワード</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={6} />
        </div>
        <div>
          <label className="label">パスワード確認</label>
          <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required minLength={6} />
        </div>
        {errorMsg && <p className="text-error">{errorMsg}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
          {loading ? "登録中…" : "登録する"}
        </button>
      </form>
    </main>
  );
}
