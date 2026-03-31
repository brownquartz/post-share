// backend/db.js
require("dotenv").config();
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
// ローカル判定（URLに localhost/127.0.0.1 を含むならローカル）
const isLocalUrl = /(^|@)(localhost|127\.0\.0\.1)(:|\/)/i.test(connectionString);

// 環境変数で最終決定（DB_SSL=true/false）。未指定なら「ローカルURLならfalse、そうでなければtrue」
const useSSL =
  process.env.DB_SSL
    ? process.env.DB_SSL.toLowerCase() === "true"
    : !isLocalUrl;

const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
