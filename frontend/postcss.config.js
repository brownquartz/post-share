// postcss.config.js （ルート直下）
module.exports = {
  plugins: {
    // CSS-first 用の Tailwind プラグイン
    "@tailwindcss/postcss": {},
    // 自動プレフィックス付与
    autoprefixer: {},
  },
};
