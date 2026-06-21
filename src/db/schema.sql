PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  root_path TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS servers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  host TEXT NOT NULL,
  port INTEGER NOT NULL CHECK (port > 0 AND port < 65536),
  username TEXT NOT NULL,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('password', 'key')),
  protocol TEXT NOT NULL CHECK (protocol IN ('ftp', 'sftp')) DEFAULT 'sftp',
  credential_ref TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(host, port, username, auth_type, protocol)
);

CREATE INDEX IF NOT EXISTS idx_servers_host_port
  ON servers(host, port);

CREATE TABLE IF NOT EXISTS environments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, name)
);

CREATE TABLE IF NOT EXISTS environment_bindings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  environment_id INTEGER NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  binding_type TEXT NOT NULL CHECK (binding_type IN ('local', 'remote')),
  local_path TEXT,
  server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
  remote_path TEXT,
  environment_name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (binding_type = 'local' AND local_path IS NOT NULL AND server_id IS NULL AND remote_path IS NULL AND environment_name IS NULL)
    OR
    (binding_type = 'remote' AND local_path IS NULL AND server_id IS NOT NULL AND remote_path IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_environment_bindings_environment_id
  ON environment_bindings(environment_id);

CREATE INDEX IF NOT EXISTS idx_environment_bindings_server_id
  ON environment_bindings(server_id);

CREATE TABLE IF NOT EXISTS file_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  relative_path TEXT NOT NULL,
  absolute_path TEXT,
  content_hash TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  modified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, relative_path)
);

CREATE INDEX IF NOT EXISTS idx_file_records_project_id
  ON file_records(project_id);

CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  environment_id INTEGER NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  label TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  file_count INTEGER NOT NULL DEFAULT 0 CHECK (file_count >= 0),
  total_bytes INTEGER NOT NULL DEFAULT 0 CHECK (total_bytes >= 0)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_project_created_at
  ON snapshots(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS snapshot_files (
  snapshot_id INTEGER NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  file_record_id INTEGER NOT NULL REFERENCES file_records(id) ON DELETE CASCADE,
  relative_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  PRIMARY KEY (snapshot_id, file_record_id)
);

CREATE INDEX IF NOT EXISTS idx_snapshot_files_file_record_id
  ON snapshot_files(file_record_id);

CREATE TABLE IF NOT EXISTS backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  environment_id INTEGER REFERENCES environments(id) ON DELETE SET NULL,
  snapshot_id INTEGER REFERENCES snapshots(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  storage_path TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  bytes_stored INTEGER,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_backups_project_started_at
  ON backups(project_id, started_at DESC);

CREATE TABLE IF NOT EXISTS ignore_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, pattern)
);

CREATE INDEX IF NOT EXISTS idx_ignore_patterns_project_id
  ON ignore_patterns(project_id);
