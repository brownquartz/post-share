// backend/server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { attachAuthOptional } = require("./utils/authOptional");

const pool = require("./db.js");              // ← 使ってる前提（未使用でもOK）
const authRouter = require("./routes/auth.js");
const postsRouter = require("./routes/posts.js");
const favoritesRouter = require('./routes/favorites');
const feedbackRouter = require('./routes/feedback');


const app = express();



// --- Port ---
const port = process.env.PORT || 4000;
console.log("▶ ENV PORT =", port);
console.log("▶ ENV DATABASE_URL =", process.env.DATABASE_URL);

// --- CORS (credentials 対応) ---
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://192.168.0.24:3000",       // Next の Network アドレス（必要なら削除/変更）
  process.env.FRONTEND_ORIGIN,      // 本番のフロントURLがあればここに
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // same-origin / curl 等は許可
    if (!origin) return callback(null, true);
    // ホワイトリスト or 192.168.x.x:3000 を許可
    const isWhitelisted =
      allowedOrigins.includes(origin) ||
      /^http:\/\/192\.168\.\d+\.\d+:3000$/.test(origin);
    if (isWhitelisted) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // preflight

app.use(cookieParser());

// --- Body parsers ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// cookieParser の後に呼ぶことで Cookie が正しく読める
app.use(attachAuthOptional);

// --- Health / Test ---
app.get("/__health", (_req, res) => res.json({ status: "ok" }));
app.get("/test", (_req, res) => res.status(200).send("OK"));

// DB quick check
app.get("/__db", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (err) {
    console.error("[__db] error:", err);
    res.status(500).json({
      ok: false,
      code: err.code,
      message: err.message,
      detail: err.detail,
      hint: err.hint,
    });
  }
});

// server.js（cookieParser の後 / ルーターの前）
app.use((req, _res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log('[api]', req.method, req.originalUrl,
      'cookie=', !!req.cookies?.token, 'origin=', req.get('origin'));
  }
  next();
});

// --- API Routes ---
app.use("/api/auth", authRouter);
app.use("/api/posts", postsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/feedback', feedbackRouter);

// --- 404 for API ---
app.use("/api/*", (_req, res) =>
  res.status(404).json({ status: "error", message: "Not found" })
);

// --- Error handler (CORS など最後に) ---
app.use((err, _req, res, _next) => {
  console.error("✖ Unhandled error:", err && err.stack ? err.stack : err);
  if (err && err.message === "Not allowed by CORS") {
    return res
      .status(403)
      .json({ status: "error", message: "CORS blocked (origin not allowed)" });
  }
  res.status(500).json({ status: "error", message: "Server error" });
});

// --- Listen ---
app.listen(port, () => {
  console.log(`🚀 Server is running on ${port}`);
});
