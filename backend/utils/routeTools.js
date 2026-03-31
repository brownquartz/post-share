// backend/utils/routeTools.js
// CommonJS

// 400 を返しつつ、req.params[name] に整数をセット
function parseIntParam(name = "id") {
  return (req, res, next) => {
    const raw = req.params?.[name];
    const val = parseInt(raw, 10);
    if (Number.isNaN(val)) {
      return res
        .status(400)
        .json({ status: "error", message: `Invalid ${name}` });
    }
    req.params[name] = val; // 以降は数値として使える
    next();
  };
}

// 必須クエリチェック
function requireQueryFields(fields = []) {
  return (req, res, next) => {
    for (const f of fields) {
      if (req.query?.[f] == null || req.query?.[f] === "") {
        return res
          .status(400)
          .json({ status: "error", message: `Missing query: ${f}` });
      }
    }
    next();
  };
}

// 必須ボディチェック
function requireBodyFields(fields = []) {
  return (req, res, next) => {
    for (const f of fields) {
      if (req.body?.[f] == null || req.body?.[f] === "") {
        return res
          .status(400)
          .json({ status: "error", message: `Missing body: ${f}` });
      }
    }
    next();
  };
}

/**
 * ルート用ラッパー（try/catch共通化）
 * 使い方: router.get("/", queryCatch("GET /api/posts", async (req,res)=>{...}))
 */
function queryCatch(tag, handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      console.error(`[${tag}]`, err);
      return res
        .status(500)
        .json({ status: "error", message: "Server error" });
    }
  };
}

/**
 * ミドルウェア列を分かりやすく束ねるだけ（命名用）
 * 使い方: router.get("/:id", beforeProcess(parseIntParam("id")), queryCatch(...))
 */
function beforeProcess(...middlewares) {
  return middlewares; // Express は配列を受け取れる
}

module.exports = {
  parseIntParam,
  requireQueryFields,
  requireBodyFields,
  queryCatch,
  beforeProcess,
};
