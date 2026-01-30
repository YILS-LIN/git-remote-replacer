pub mod commands;

use commands::{scan_repositories, replace_remote_url, select_directory};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![scan_repositories, replace_remote_url, select_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
