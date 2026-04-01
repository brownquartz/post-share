// pages/auth/login.js
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { loginUser } from "../../lib/auth";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const data = await loginUser({ username, password });
      setUser(data.user);
      await router.push("/");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-wrap-sm">
      <h1 className="page-title mb-8">Login</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Username</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        {errorMsg && <p className="text-error">{errorMsg}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-secondary">
        No account?{" "}
        <Link href="/auth/signup" className="text-brand font-medium hover:underline">Create one</Link>
      </p>
    </main>
  );
}
