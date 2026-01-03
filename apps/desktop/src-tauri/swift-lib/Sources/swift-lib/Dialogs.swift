import AppKit
import SwiftRs

// MARK: - Helpers

/// Apply macOS-style rounded rect mask to an icon
private func applyIconMask(to image: NSImage, size: CGFloat = 128) -> NSImage {
    let targetSize = NSSize(width: size, height: size)
    let cornerRadius = size * 0.225 // macOS icon corner radius ratio

    let result = NSImage(size: targetSize)
    result.lockFocus()

    let rect = NSRect(origin: .zero, size: targetSize)
    let path = NSBezierPath(roundedRect: rect, xRadius: cornerRadius, yRadius: cornerRadius)
    path.addClip()

    image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1.0)

    result.unlockFocus()
    return result
}

/// Get the app icon with macOS rounded mask applied
private func getAppIcon() -> NSImage {
    let bundlePath = Bundle.main.bundlePath

    // In production (.app bundle), NSWorkspace gives us the properly masked icon
    if bundlePath.hasSuffix(".app") {
        return NSWorkspace.shared.icon(forFile: bundlePath)
    } else {
        // Dev mode - apply rounded mask manually
        if let rawIcon = NSApp.applicationIconImage {
            return applyIconMask(to: rawIcon)
        }
        return NSImage()
    }
}

// MARK: - Window Blocking

/// Disable interaction with all app windows
private func disableAppWindows() {
    for window in NSApp.windows {
        window.ignoresMouseEvents = true
    }
}

/// Re-enable interaction with all app windows
private func enableAppWindows() {
    for window in NSApp.windows {
        window.ignoresMouseEvents = false
    }
}

// MARK: - Update Panel

private var updatePanel: NSPanel?
private var progressBar: NSProgressIndicator?
private var statusLabel: NSTextField?
private var activationObserver: NSObjectProtocol?

/// Observe app activation to bring panel to front (fixes Mission Control click-through)
private func startObservingActivation() {
    guard activationObserver == nil else { return }
    activationObserver = NotificationCenter.default.addObserver(
        forName: NSApplication.didBecomeActiveNotification,
        object: nil,
        queue: .main
    ) { _ in
        if let panel = updatePanel {
            panel.makeKeyAndOrderFront(nil)
        }
    }
}

private func stopObservingActivation() {
    if let observer = activationObserver {
        NotificationCenter.default.removeObserver(observer)
        activationObserver = nil
    }
}

/// Create a modal-style panel
private func createUpdatePanel(title: String, width: CGFloat = 320, height: CGFloat = 80) -> (NSPanel, NSTextField, NSProgressIndicator) {
    let panel = NSPanel(
        contentRect: NSRect(x: 0, y: 0, width: width, height: height),
        styleMask: [.borderless],
        backing: .buffered,
        defer: false
    )
    panel.backgroundColor = .clear
    panel.isOpaque = false
    panel.hasShadow = true
    panel.isMovableByWindowBackground = true
    panel.level = .modalPanel
    panel.hidesOnDeactivate = false  // Keep visible when switching apps
    panel.center()

    // Rounded background
    let contentView = NSVisualEffectView(frame: NSRect(origin: .zero, size: NSSize(width: width, height: height)))
    contentView.material = .popover
    contentView.state = .active
    contentView.wantsLayer = true
    contentView.layer?.cornerRadius = 12
    contentView.layer?.masksToBounds = true

    // Icon (vertically centered in 80px: (80-40)/2 = 20)
    let iconView = NSImageView(frame: NSRect(x: 20, y: 20, width: 40, height: 40))
    iconView.image = getAppIcon()
    contentView.addSubview(iconView)

    // Label
    let label = NSTextField(labelWithString: "")
    label.frame = NSRect(x: 70, y: 38, width: width - 90, height: 20)
    label.font = NSFont.systemFont(ofSize: 13, weight: .medium)
    contentView.addSubview(label)

    // Progress bar
    let progress = NSProgressIndicator(frame: NSRect(x: 70, y: 20, width: width - 90, height: 12))
    progress.style = .bar
    contentView.addSubview(progress)

    panel.contentView = contentView
    return (panel, label, progress)
}

/// Show "Checking for updates..." panel
@_cdecl("show_checking_dialog")
public func showCheckingDialog() {
    DispatchQueue.main.sync {
        disableAppWindows()
        startObservingActivation()

        let (panel, label, progress) = createUpdatePanel(title: "")
        label.stringValue = "Checking for updates..."
        progress.isIndeterminate = true
        progress.startAnimation(nil)

        NSApp.activate(ignoringOtherApps: true)
        panel.makeKeyAndOrderFront(nil)

        updatePanel = panel
        statusLabel = label
        progressBar = progress
    }
}

/// Dismiss the update panel
@_cdecl("dismiss_update_panel")
public func dismissUpdatePanel() {
    DispatchQueue.main.sync {
        stopObservingActivation()
        progressBar?.stopAnimation(nil)
        updatePanel?.close()
        updatePanel = nil
        progressBar = nil
        statusLabel = nil

        enableAppWindows()
    }
}

/// Show download progress panel
@_cdecl("show_download_dialog")
public func showDownloadDialog() {
    DispatchQueue.main.sync {
        disableAppWindows()
        startObservingActivation()

        let (panel, label, progress) = createUpdatePanel(title: "")
        label.stringValue = "Downloading update..."
        progress.isIndeterminate = false
        progress.minValue = 0
        progress.maxValue = 100
        progress.doubleValue = 0

        NSApp.activate(ignoringOtherApps: true)
        panel.makeKeyAndOrderFront(nil)

        updatePanel = panel
        statusLabel = label
        progressBar = progress
    }
}

/// Update download progress (0-100, or -1 for indeterminate)
@_cdecl("update_download_progress")
public func updateDownloadProgress(percent: Int32, downloadedMB: Float, totalMB: Float) {
    DispatchQueue.main.async {
        if percent < 0 {
            // Indeterminate - no content length
            progressBar?.isIndeterminate = true
            progressBar?.startAnimation(nil)
            statusLabel?.stringValue = String(format: "Downloading... %.1f MB", downloadedMB)
        } else {
            progressBar?.isIndeterminate = false
            progressBar?.doubleValue = Double(percent)
            statusLabel?.stringValue = String(format: "Downloading... %.1f / %.1f MB (%d%%)", downloadedMB, totalMB, percent)
        }
    }
}

/// Show installing state
@_cdecl("show_installing_state")
public func showInstallingState() {
    DispatchQueue.main.async {
        statusLabel?.stringValue = "Installing update..."
        progressBar?.isIndeterminate = true
        progressBar?.startAnimation(nil)
    }
}

// MARK: - Result Dialogs

/// Show "You're up to date" dialog
@_cdecl("show_up_to_date_dialog")
public func showUpToDateDialog(version: SRString) {
    let versionStr = version.toString()

    DispatchQueue.main.sync {
        let alert = NSAlert()
        alert.messageText = "You're up to date!"
        alert.informativeText = "Nebula \(versionStr) is the latest version."
        alert.alertStyle = .informational
        alert.icon = getAppIcon()
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }
}

/// Show "Update required" dialog - no cancel option
@_cdecl("show_update_required_dialog")
public func showUpdateRequiredDialog(currentVersion: SRString, newVersion: SRString) {
    let current = currentVersion.toString()
    let new = newVersion.toString()

    DispatchQueue.main.sync {
        let alert = NSAlert()
        alert.messageText = "Update Required"
        alert.informativeText = "Please install the latest version of Nebula to continue.\n\n\(current) → \(new)"
        alert.alertStyle = .informational
        alert.icon = getAppIcon()
        alert.addButton(withTitle: "Update Now")
        alert.runModal()
    }
}

/// Show error dialog
@_cdecl("show_update_error_dialog")
public func showUpdateErrorDialog(errorMessage: SRString) {
    let error = errorMessage.toString()

    DispatchQueue.main.sync {
        let alert = NSAlert()
        alert.messageText = "Update Check Failed"
        alert.informativeText = error
        alert.alertStyle = .warning
        alert.icon = getAppIcon()
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }
}
