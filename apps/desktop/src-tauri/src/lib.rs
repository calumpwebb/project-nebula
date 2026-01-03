mod updater;

use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri_plugin_log::{Target, TargetKind};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // When user tries to open a second instance, focus the existing window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                log::info!("Focused existing window (blocked second instance)");
            }
        }))
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .level_for("nebula_desktop", log::LevelFilter::Debug)
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Webview),
                ])
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let version = &app.package_info().version;
            log::info!("Nebula v{} starting...", version);

            // Build the app menu with "Check for Updates"
            let check_updates =
                MenuItemBuilder::with_id("check_updates", "Check for Updates...").build(app)?;

            let app_submenu = SubmenuBuilder::new(app, "Nebula")
                .about(None)
                .separator()
                .item(&check_updates)
                .separator()
                .services()
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .quit()
                .build()?;

            let edit_submenu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            let window_submenu = SubmenuBuilder::new(app, "Window")
                .minimize()
                .maximize()
                .close_window()
                .separator()
                .fullscreen()
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&app_submenu)
                .item(&edit_submenu)
                .item(&window_submenu)
                .build()?;

            app.set_menu(menu)?;

            // Handle menu events
            let handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                if event.id().as_ref() == "check_updates" {
                    let handle = handle.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Err(e) = updater::check_for_updates(&handle).await {
                            log::error!("[updater] Manual check failed: {}", e);
                        }
                    });
                }
            });

            // Run update check on startup
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = updater::check_on_startup(&handle).await {
                    log::error!("[updater] Error: {}", e);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
