mod commands;
mod db;
mod models;

use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<rusqlite::Connection>,
    pub local_user_id: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let conn = rusqlite::Connection::open(data_dir.join("radarrater.db"))?;
            db::initialize(&conn)?;
            let local_user_id = db::ensure_local_user(&conn)?;
            app.manage(AppState {
                db: Mutex::new(conn),
                local_user_id,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_collection,
            commands::list_collections,
            commands::delete_collection,
            commands::create_item,
            commands::list_items,
            commands::delete_item,
            commands::update_item,
            commands::update_collection,
            commands::rank_by_similarity,
            commands::rename_scale,
            commands::delete_scale,
            commands::reorder_scales,
            commands::add_scale,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
