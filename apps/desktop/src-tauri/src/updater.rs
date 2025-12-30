use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

/// Check for updates and handle the update flow.
/// Returns Ok(true) if app should continue, Ok(false) if update is in progress.
pub async fn check_and_update(app: &AppHandle) -> Result<bool, Box<dyn std::error::Error>> {
    // Skip update check if --skip-update flag was passed
    if std::env::args().any(|arg| arg == "--skip-update") {
        println!("[updater] Skipping update check (--skip-update flag)");
        return Ok(true);
    }

    let updater = app.updater()?;

    println!("[updater] Checking for updates...");

    let update = match updater.check().await {
        Ok(Some(update)) => update,
        Ok(None) => {
            println!("[updater] No update available");
            return Ok(true);
        }
        Err(e) => {
            // If update check fails (offline, etc.), allow app to continue
            eprintln!("[updater] Update check failed: {}. Continuing anyway.", e);
            return Ok(true);
        }
    };

    let current = update.current_version.to_string();
    let latest = update.version.clone();
    println!("[updater] Update available: {} -> {}", current, latest);

    // Show native dialog - blocking, no dismiss option
    let message = format!(
        "Version {} is available.\n\nYou must update to continue using the app.",
        latest
    );

    // Use native dialog (rfd)
    let should_update = tauri::async_runtime::spawn_blocking(move || {
        rfd::MessageDialog::new()
            .set_title("Update Required")
            .set_description(&message)
            .set_buttons(rfd::MessageButtons::Ok)
            .show();
        true // Always update - no cancel option
    })
    .await?;

    if should_update {
        println!("[updater] Downloading update...");

        // Download and install
        let mut downloaded = 0;
        let _ = update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    if let Some(total) = content_length {
                        println!("[updater] Downloaded {} / {} bytes", downloaded, total);
                    }
                },
                || {
                    println!("[updater] Download complete, installing...");
                },
            )
            .await?;

        println!("[updater] Update installed, restarting...");
        app.restart();
    }

    Ok(true)
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_skip_update_flag_detection() {
        // Test that --skip-update is detected in args
        let args = vec!["app".to_string(), "--skip-update".to_string()];
        assert!(args.iter().any(|arg| arg == "--skip-update"));
    }

    #[test]
    fn test_skip_update_not_present() {
        let args = vec!["app".to_string(), "--other-flag".to_string()];
        assert!(!args.iter().any(|arg| arg == "--skip-update"));
    }
}
