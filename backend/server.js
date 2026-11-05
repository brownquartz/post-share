// backend/server.js
require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { attachAuthOptional } = require("./utils/authOptional");

const pool = require("./db.js");              // ← 使ってる前提（未使用でもOK）
const authRouter = require("./routes/auth.js");
const postsRouter = require("./routes/posts.js");
const favoritesRouter = require('./routes/favorites');
const feedbackRouter = require('./routes/feedback');
const friendsRouter = require('./routes/friends');
const notificationsRouter = require('./routes/notifications');
const scrapsRouter = require('./routes/scraps');


const app = express();

// Railway 等のリバースプロキシ経由なので、X-Forwarded-For を信頼して
// rate limit が実クライアントIPごとに正しく効くようにする
app.set("trust proxy", 1);

// --- Security headers ---
// フロントは別オリジン(GitHub Pages等)から fetch する構成なので、
// Cross-Origin-Resource-Policy はデフォルトの same-origin のままにすると
// レスポンスがブロックされる。cross-origin を明示しておく。
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// --- Rate limiting ---
// エラー時も詳細を出さず、常に同じ汎用メッセージだけを返す
const rateLimitHandler = (_req, res) => {
  res.status(429).json({ status: "error", message: "Too many requests. Please try again later." });
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// ログイン・サインアップは総当たり対策で特に厳しめに
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

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
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// cookieParser の後に呼ぶことで Cookie が正しく読める
app.use(attachAuthOptional);

// --- Health / Test ---
app.get("/__health", (_req, res) => res.json({ status: "ok" }));
app.get("/test", (_req, res) => res.status(200).send("OK"));
app.get("/__cookie", (req, res) => res.json({
  hasCookie: !!req.cookies?.token,
  cookieKeys: Object.keys(req.cookies || {}),
  nodeEnv: process.env.NODE_ENV || "(not set)",
  hasFrontendOrigin: !!process.env.FRONTEND_ORIGIN,
  origin: req.get("origin") || "(none)",
}));

// DB quick check
app.get("/__db", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (err) {
    // DBエラーの中身はサーバーログにのみ出し、クライアントには汎用メッセージのみ返す
    console.error("[__db] error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
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
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/posts", postsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/scraps', scrapsRouter);

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
