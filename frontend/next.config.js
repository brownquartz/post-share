// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // 開発時のみバックエンドにプロキシ（本番は NEXT_PUBLIC_API_BASE で直接通信）
    if (process.env.NODE_ENV === "production") return [];
    return [
      { source: "/api/:path*", destination: "http://localhost:4000/api/:path*" },
    ];
  },
};

module.exports = nextConfig;
