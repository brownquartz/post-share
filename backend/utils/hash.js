// backend/utils/hash.js
const crypto = require("crypto");

function isSha256Hex(s) {
  return typeof s === "string" && /^[0-9a-f]{64}$/i.test(s);
}

/** Normalize to lowercase SHA-256 hex (accepts plaintext or hex) */
function toSha256Hex(input) {
  const s = (input ?? "").toString();
  return isSha256Hex(s) ? s.toLowerCase() : crypto.createHash("sha256").update(s).digest("hex");
}

module.exports = { isSha256Hex, toSha256Hex };