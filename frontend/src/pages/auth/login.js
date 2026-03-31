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
      setUser(data.user);            // ← これがないと、遷移直後は user=null のまま
      // TODO: AuthContext があるならここで setUser / setToken など
      await router.push("/"); // ログイン後トップへ
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">Login</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm mb-1">Username</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={username}
            onChange={(e)=>setUsername(e.target.value)} 
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            className="w-full rounded border px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {errorMsg && (
          <p className="text-sm text-red-600">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 text-white py-2 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {/* ここで Sign Up を見せる */}
      <div className="mt-4 text-center">
        <span className="text-sm text-slate-600">No account?</span>{" "}
        <Link href="/auth/signup" className="text-sm font-semibold text-blue-600">
          Create one
        </Link>
      </div>
    </main>
  );
}
