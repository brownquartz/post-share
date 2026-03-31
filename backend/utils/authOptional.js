// backend/utils/authOptional.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function getBearerToken(req) {
  const h = req.headers?.authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}

// Attach req.user if a valid token exists (cookie or Authorization header)
// Does not block when missing/invalid.
function attachAuthOptional(req, _res, next) {
  const token = req.cookies?.token;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // auth.js は { uid, username } で署名しているので uid を id に統一
    req.user = { id: payload.uid ?? payload.id, username: payload.username };
  } catch {
    // 無効トークンは何もしない
  }
  next();
}

// Block when no valid user is present.
function attachAuthRequired(req, res, next) {
  attachAuthOptional(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ status: "error", message: "Login required" });
    }
    next();
  });
}

module.exports = { attachAuthOptional, attachAuthRequired };
