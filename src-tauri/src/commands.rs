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
        item_count: 0,
    })
}

#[tauri::command]
pub fn list_collections(state: State<AppState>) -> CmdResult<Vec<Collection>> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let rows: Vec<(String, String, Option<String>, String, i64)> = {
        let mut stmt = db
            .prepare(
                "SELECT c.id, c.name, c.description, c.created_at,
                        COUNT(i.id) as item_count
                 FROM collections c
                 LEFT JOIN items i ON i.collection_id = c.id
                 WHERE c.owner_id = ?1
                 GROUP BY c.id
                 ORDER BY c.created_at",
            )
            .map_err(|e| e.to_string())?;

        let result: rusqlite::Result<Vec<_>> = stmt
            .query_map(params![&state.local_user_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, i64>(4)?,
                ))
            })
            .map_err(|e| e.to_string())?
            .collect();
        result.map_err(|e| e.to_string())?
    };

    let mut collections = Vec::new();
    for (id, name, description, created_at, item_count) in rows {
        let scales = query_scales(&db, &id).map_err(|e| e.to_string())?;
        collections.push(Collection {
            id,
            name,
            description,
            created_at,
            scales,
            item_count,
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

#[tauri::command]
pub fn update_item(
    state: State<AppState>,
    id: String,
    name: String,
    description: Option<String>,
    ratings: Vec<Rating>,
) -> CmdResult<Item> {
    let mut db = state.db.lock().map_err(|e| e.to_string())?;

    let collection_id: String = db
        .query_row("SELECT collection_id FROM items WHERE id = ?1", params![&id], |row| {
            row.get(0)
        })
        .map_err(|e| e.to_string())?;

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

    let tx = db.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE items SET name = ?1, description = ?2 WHERE id = ?3",
        params![&name, &description, &id],
    )
    .map_err(|e| e.to_string())?;

    tx.execute("DELETE FROM ratings WHERE item_id = ?1", params![&id])
        .map_err(|e| e.to_string())?;

    for rating in &ratings {
        let rating_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO ratings (id, item_id, scale_id, user_id, value)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                &rating_id,
                &id,
                &rating.scale_id,
                &state.local_user_id,
                rating.value
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    let created_at: String = tx
        .query_row("SELECT created_at FROM items WHERE id = ?1", params![&id], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(Item { id, name, description, created_at, ratings })
}

#[tauri::command]
pub fn update_collection(
    state: State<AppState>,
    id: String,
    name: String,
    description: Option<String>,
) -> CmdResult<()> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE collections SET name = ?1, description = ?2 WHERE id = ?3",
        params![&name, &description, &id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// --- Similarity ---

fn cosine_similarity(a: &[f64], b: &[f64]) -> f64 {
    let dot: f64 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f64 = a.iter().map(|x| x * x).sum::<f64>().sqrt();
    let norm_b: f64 = b.iter().map(|x| x * x).sum::<f64>().sqrt();
    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }
    dot / (norm_a * norm_b)
}

#[tauri::command]
pub fn rank_by_similarity(
    state: State<AppState>,
    collection_id: String,
    anchor_item_id: String,
) -> CmdResult<Vec<SimilarityResult>> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let scales = query_scales(&db, &collection_id).map_err(|e| e.to_string())?;
    let scale_ids: Vec<String> = scales.iter().map(|s| s.id.clone()).collect();

    let item_rows: Vec<(String, String)> = {
        let mut stmt = db
            .prepare("SELECT id, name FROM items WHERE collection_id = ?1")
            .map_err(|e| e.to_string())?;
        let result: rusqlite::Result<Vec<_>> = stmt
            .query_map(params![&collection_id], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?
            .collect();
        result.map_err(|e| e.to_string())?
    };

    let mut item_vectors: Vec<(String, String, Vec<f64>)> = Vec::new();
    for (item_id, item_name) in item_rows {
        let ratings = query_ratings(&db, &item_id).map_err(|e| e.to_string())?;
        let vector: Vec<f64> = scale_ids
            .iter()
            .map(|sid| {
                ratings
                    .iter()
                    .find(|r| &r.scale_id == sid)
                    .map(|r| r.value)
                    .unwrap_or(0.0)
            })
            .collect();
        item_vectors.push((item_id, item_name, vector));
    }

    let anchor_vector = item_vectors
        .iter()
        .find(|(id, _, _)| id == &anchor_item_id)
        .map(|(_, _, v)| v.clone())
        .ok_or_else(|| "Anchor item not found".to_string())?;

    let mut results: Vec<SimilarityResult> = item_vectors
        .iter()
        .filter(|(id, _, _)| id != &anchor_item_id)
        .map(|(id, name, vector)| SimilarityResult {
            item_id: id.clone(),
            item_name: name.clone(),
            similarity: cosine_similarity(&anchor_vector, vector),
        })
        .collect();

    results.sort_by(|a, b| {
        b.similarity
            .partial_cmp(&a.similarity)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    Ok(results)
}

// --- Scale management ---

#[tauri::command]
pub fn rename_scale(state: State<AppState>, scale_id: String, name: String) -> CmdResult<()> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("UPDATE scales SET name = ?1 WHERE id = ?2", params![&name, &scale_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_scale(state: State<AppState>, scale_id: String) -> CmdResult<()> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM scales WHERE id = ?1", params![&scale_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reorder_scales(
    state: State<AppState>,
    scale_ids: Vec<String>,
) -> CmdResult<()> {
    let mut db = state.db.lock().map_err(|e| e.to_string())?;
    let tx = db.transaction().map_err(|e| e.to_string())?;
    for (i, id) in scale_ids.iter().enumerate() {
        tx.execute(
            "UPDATE scales SET order_index = ?1 WHERE id = ?2",
            params![i as i64, id],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn add_scale(
    state: State<AppState>,
    collection_id: String,
    name: String,
) -> CmdResult<Scale> {
    let mut db = state.db.lock().map_err(|e| e.to_string())?;

    let next_index: i64 = db
        .query_row(
            "SELECT COALESCE(MAX(order_index) + 1, 0) FROM scales WHERE collection_id = ?1",
            params![&collection_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let item_ids: Vec<String> = {
        let mut stmt = db
            .prepare("SELECT id FROM items WHERE collection_id = ?1")
            .map_err(|e| e.to_string())?;
        let result: rusqlite::Result<Vec<String>> = stmt
            .query_map(params![&collection_id], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .collect();
        result.map_err(|e| e.to_string())?
    };

    let scale_id = Uuid::new_v4().to_string();
    let tx = db.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO scales (id, collection_id, name, order_index) VALUES (?1, ?2, ?3, ?4)",
        params![&scale_id, &collection_id, &name, next_index],
    )
    .map_err(|e| e.to_string())?;

    for item_id in &item_ids {
        let rating_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO ratings (id, item_id, scale_id, user_id, value)
             VALUES (?1, ?2, ?3, ?4, 5.0)",
            params![&rating_id, item_id, &scale_id, &state.local_user_id],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    Ok(Scale {
        id: scale_id,
        name,
        order_index: next_index as i32,
    })
}
