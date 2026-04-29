# radarRater — Project Specification

## Overview

radarRater is a desktop application for rating arbitrary items across user-defined scales, visualizing those ratings as radar charts, and surfacing similarity between items. Eventually, users will be able to share collections and compare their ratings with others.

---

## Core Concepts

### Data Model

**User**
Owns collections and ratings. Designed in from the start to avoid refactoring when sharing is introduced.

**Collection**
A named group of items that all share the same set of scales. Defined and owned by a user. Example: a "Films" collection with scales `Cinematography`, `Writing`, `Score`, `Pacing`, `Rewatchability`.

**Scale**
A named rating dimension belonging to a Collection. Continuous range from 1.0 to 10.0. Ordered (the order matters for radar chart shape consistency).

**Item**
A named entry within a Collection. Must be fully rated across all of the collection's Scales before it is saved — partial ratings are not permitted.

**Rating**
A (User, Item, Scale) → float value. One rating per user per scale per item. This structure naturally supports multi-user comparison later.

**ScaleAlias**
Maps a Scale in one user's Collection to a Scale in another's, enabling cross-user comparison even when scale names differ. Users declare these manually (e.g. `my "Sound Design" = your "Production"`). Aliases are unidirectional — each user declares their own mappings independently.

---

## Features

### MVP

- Create and manage Collections, each with a custom ordered list of Scales
- Add Items to a Collection and rate them on each Scale (continuous 1–10 slider)
- **Radar chart** per Item, showing its ratings across all Scales
- **Overlay view**: plot multiple Items on the same radar chart for direct comparison
- **Similarity ranking**: given a selected Item, rank all other Items in the collection by cosine similarity of their rating vectors (most similar → most different)

### Future (post-MVP)

- Cloud account + sync (local-first: app works fully offline; sync happens on demand)
- Share a Collection with another user
- **Cross-user comparison**: view another user's ratings for the same Items on an overlay radar chart
- Scale equivalency via ScaleAlias: allow comparison across Collections with differently named but manually linked Scales
- Fuzzy/NLP-assisted alias suggestions (stretch goal)

---

## Architecture

### Principles

- **Local-first**: all data lives in a local SQLite database; the app is fully functional offline
- **Multi-user aware from day one**: the data model includes user ownership on every relevant entity so sharing is additive, not a rewrite

### Stack

| Layer | Choice |
|---|---|
| Desktop shell | Tauri (Rust) |
| Frontend | React + TypeScript |
| Local database | SQLite (via `rusqlite` or `sqlx` in Rust) |
| Charts | TBD — options: D3.js, Recharts, Chart.js (all support radar) |
| Future sync/sharing backend | TBD — likely a Rust HTTP service or lightweight Node.js API |

### Data Flow

```
React UI  ←→  Tauri commands (IPC)  ←→  Rust core  ←→  SQLite
                                                ↕ (future)
                                         Cloud sync API
```

The Rust core owns all database access and business logic. The React frontend communicates exclusively via Tauri's typed command/event IPC layer — no direct DB access from the frontend.

---

## Design Decisions

| Question | Decision |
|---|---|
| Rating completeness | All scales must be rated before an Item can be saved. No partial ratings. |
| Scale deletion | Deleting a Scale cascades — all Ratings on that Scale are removed. Items remain but their vectors shrink accordingly. |
| Collection versioning | No history tracking. Collections are mutable; renaming or reordering scales takes effect immediately. |
| Alias directionality | Each user declares aliases independently. A maps to B does not imply B maps to A. |
