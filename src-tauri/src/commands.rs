use rusqlite::params;
use tauri::State;
use uuid::Uuid;

use crate::{models::*, AppState};

type CmdResult<T> = Result<T, String>;

fn query_scales(conn: &rusqlite::Connection, collection_id: &str) -> rusqlite::Result<Vec<Scale>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, order_index FROM scales
         WHERE collection_id = ?1 ORDER BY order_index",
    )?;
    let result: rusqlite::Result<Vec<Scale>> = stmt
        .query_map(params![collection_id], |row| {
            Ok(Scale {
                id: row.get(0)?,
                name: row.get(1)?,
                order_index: row.get(2)?,
            })
        })?
        .collect();
    result
}

fn query_ratings(conn: &rusqlite::Connection, item_id: &str) -> rusqlite::Result<Vec<Rating>> {
    let mut stmt = conn.prepare(
        "SELECT r.scale_id, r.value FROM ratings r
         JOIN scales s ON r.scale_id = s.id
         WHERE r.item_id = ?1 ORDER BY s.order_index",
    )?;
    let result: rusqlite::Result<Vec<Rating>> = stmt
        .query_map(params![item_id], |row| {
            Ok(Rating {
                scale_id: row.get(0)?,
                value: row.get(1)?,
            })
        })?
        .collect();
    result
}

// --- Collections ---

#[tauri::command]
pub fn create_collection(
    state: State<AppState>,
    name: String,
    description: Option<String>,
    scale_names: Vec<String>,
) -> CmdResult<Collection> {
    let mut db = state.db.lock().map_err(|e| e.to_string())?;
    let collection_id = Uuid::new_v4().to_string();
    let tx = db.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO collections (id, owner_id, name, description, created_at)
         VALUES (?1, ?2, ?3, ?4, datetime('now'))",
        params![&collection_id, &state.local_user_id, &name, &description],
    )
    .map_err(|e| e.to_string())?;

    let mut scales = Vec::new();
    for (i, scale_name) in scale_names.iter().enumerate() {
        let scale_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO scales (id, collection_id, name, order_index) VALUES (?1, ?2, ?3, ?4)",
            params![&scale_id, &collection_id, scale_name, i as i64],
        )
        .map_err(|e| e.to_string())?;
        scales.push(Scale {
            id: scale_id,
            name: scale_name.clone(),
            order_index: i as i32,
        });
    }

    let created_at: String = tx
        .query_row(
            "SELECT created_at FROM collections WHERE id = ?1",
            params![&collection_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(Collection {
        id: collection_id,
        name,
        description,
        created_at,
        scales,
    })
}

#[tauri::command]
pub fn list_collections(state: State<AppState>) -> CmdResult<Vec<Collection>> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let rows: Vec<(String, String, Option<String>, String)> = {
        let mut stmt = db
            .prepare(
                "SELECT id, name, description, created_at FROM collections
                 WHERE owner_id = ?1 ORDER BY created_at",
            )
            .map_err(|e| e.to_string())?;

        let result: rusqlite::Result<Vec<_>> = stmt
            .query_map(params![&state.local_user_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, String>(3)?,
                ))
            })
            .map_err(|e| e.to_string())?
            .collect();
        result.map_err(|e| e.to_string())?
    };

    let mut collections = Vec::new();
    for (id, name, description, created_at) in rows {
        let scales = query_scales(&db, &id).map_err(|e| e.to_string())?;
        collections.push(Collection {
            id,
            name,
            description,
            created_at,
            scales,
        });
    }

    Ok(collections)
}

#[tauri::command]
pub fn delete_collection(state: State<AppState>, id: String) -> CmdResult<()> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM collections WHERE id = ?1", params![&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// --- Items ---

#[tauri::command]
pub fn create_item(
    state: State<AppState>,
    collection_id: String,
    name: String,
    description: Option<String>,
    ratings: Vec<Rating>,
) -> CmdResult<Item> {
    let mut db = state.db.lock().map_err(|e| e.to_string())?;

    let scale_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM scales WHERE collection_id = ?1",
            params![&collection_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if scale_count != ratings.len() as i64 {
        return Err(format!(
            "Collection has {} scales but {} ratings provided",
            scale_count,
            ratings.len()
        ));
    }

    let item_id = Uuid::new_v4().to_string();
    let tx = db.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO items (id, collection_id, name, description, created_at)
         VALUES (?1, ?2, ?3, ?4, datetime('now'))",
        params![&item_id, &collection_id, &name, &description],
    )
    .map_err(|e| e.to_string())?;

    for rating in &ratings {
        let rating_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO ratings (id, item_id, scale_id, user_id, value)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                &rating_id,
                &item_id,
                &rating.scale_id,
                &state.local_user_id,
                rating.value
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    let created_at: String = tx
        .query_row(
            "SELECT created_at FROM items WHERE id = ?1",
            params![&item_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(Item {
        id: item_id,
        name,
        description,
        created_at,
        ratings,
    })
}

#[tauri::command]
pub fn list_items(state: State<AppState>, collection_id: String) -> CmdResult<Vec<Item>> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let rows: Vec<(String, String, Option<String>, String)> = {
        let mut stmt = db
            .prepare(
                "SELECT id, name, description, created_at FROM items
                 WHERE collection_id = ?1 ORDER BY created_at",
            )
            .map_err(|e| e.to_string())?;

        let result: rusqlite::Result<Vec<_>> = stmt
            .query_map(params![&collection_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, String>(3)?,
                ))
            })
            .map_err(|e| e.to_string())?
            .collect();
        result.map_err(|e| e.to_string())?
    };

    let mut items = Vec::new();
    for (id, name, description, created_at) in rows {
        let ratings = query_ratings(&db, &id).map_err(|e| e.to_string())?;
        items.push(Item {
            id,
            name,
            description,
            created_at,
            ratings,
        });
    }

    Ok(items)
}

#[tauri::command]
pub fn delete_item(state: State<AppState>, id: String) -> CmdResult<()> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM items WHERE id = ?1", params![&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
