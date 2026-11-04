CREATE TABLE app_users (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username text NOT NULL UNIQUE CHECK(username ~ '^[a-z0-9_]{3,32}$'),
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK(role='admin'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app_sessions (
  token_hash text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX session_expiry ON app_sessions(expires_at);
