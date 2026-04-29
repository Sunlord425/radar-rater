use rusqlite::{Connection, OptionalExtension, Result};

pub fn initialize(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA foreign_keys=ON;",
    )?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS users (
            id          TEXT PRIMARY KEY,
            username    TEXT NOT NULL,
            created_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS collections (
            id          TEXT PRIMARY KEY,
            owner_id    TEXT NOT NULL REFERENCES users(id),
            name        TEXT NOT NULL,
            description TEXT,
            created_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS scales (
            id              TEXT PRIMARY KEY,
            collection_id   TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
            name            TEXT NOT NULL,
            order_index     INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS items (
            id              TEXT PRIMARY KEY,
            collection_id   TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
            name            TEXT NOT NULL,
            description     TEXT,
            created_at      TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ratings (
            id          TEXT PRIMARY KEY,
            item_id     TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
            scale_id    TEXT NOT NULL REFERENCES scales(id) ON DELETE CASCADE,
            user_id     TEXT NOT NULL REFERENCES users(id),
            value       REAL NOT NULL CHECK(value >= 1.0 AND value <= 10.0),
            UNIQUE(item_id, scale_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS scale_aliases (
            id                  TEXT PRIMARY KEY,
            source_scale_id     TEXT NOT NULL REFERENCES scales(id) ON DELETE CASCADE,
            target_scale_id     TEXT NOT NULL REFERENCES scales(id) ON DELETE CASCADE,
            owner_id            TEXT NOT NULL REFERENCES users(id),
            UNIQUE(source_scale_id, target_scale_id, owner_id)
        );",
    )?;

    Ok(())
}

pub fn ensure_local_user(conn: &Connection) -> Result<String> {
    let existing: Option<String> = conn
        .query_row("SELECT id FROM users LIMIT 1", [], |row| row.get(0))
        .optional()?;

    if let Some(id) = existing {
        return Ok(id);
    }

    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO users (id, username, created_at) VALUES (?1, 'local', datetime('now'))",
        rusqlite::params![id],
    )?;

    Ok(id)
}
