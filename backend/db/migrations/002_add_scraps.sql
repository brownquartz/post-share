-- 002_add_scraps.sql
CREATE TABLE scraps (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id      INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  post_password TEXT,   -- SHA-256 hex of the view password (null for non-password posts)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX idx_scraps_user_created ON scraps (user_id, created_at DESC);
