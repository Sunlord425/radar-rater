# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run tauri dev        # start desktop app (hot-reloads frontend, rebuilds Rust on change)
npm run dev              # Vite frontend only (no Tauri shell)
npm run build            # production build
npm run tauri build      # package desktop binary

cd src-tauri && cargo check          # fast Rust type-check
cd src-tauri && cargo clippy         # Rust linter
```

## Architecture

**Stack**: Tauri 2 (Rust shell) + React/TypeScript (Vite) + SQLite (rusqlite, bundled)

**Key principle**: All database access and business logic lives in Rust. The React frontend only communicates via Tauri's typed IPC commands — it never touches the DB directly.

```
React UI  ←→  Tauri IPC (invoke/commands)  ←→  Rust core  ←→  SQLite
```

### Rust (`src-tauri/src/`)

- `main.rs` — binary entry point, calls `lib.rs::run()`
- `lib.rs` — Tauri builder setup; initialises DB, manages `AppState` (holds `Mutex<Connection>` and `local_user_id`)
- `db.rs` — schema creation (`initialize`) and local user bootstrap (`ensure_local_user`)

`AppState` is registered as Tauri managed state and injected into command handlers via `State<AppState>`.

### Frontend (`src/`)

Standard React/TypeScript app. Communicates with Rust via `invoke()` from `@tauri-apps/api/core`.

### Database

SQLite file lives in the platform app-data directory (macOS: `~/Library/Application Support/com.lorenzomazzeo.radar-rater/radarrater.db`).

Schema tables: `users`, `collections`, `scales`, `items`, `ratings`, `scale_aliases`. Foreign keys are enforced (`PRAGMA foreign_keys=ON`) and WAL mode is enabled. See `SPEC.md` for the full data model.
