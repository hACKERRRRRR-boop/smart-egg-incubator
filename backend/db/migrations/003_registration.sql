ALTER TABLE app_users DROP CONSTRAINT app_users_role_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check CHECK(role IN ('admin','viewer'));
ALTER TABLE app_users ADD COLUMN approval_status text NOT NULL DEFAULT 'approved'
  CHECK(approval_status IN ('pending','approved'));
ALTER TABLE app_users ADD COLUMN approved_by integer REFERENCES app_users(id);
ALTER TABLE app_users ADD COLUMN approved_at timestamptz;
