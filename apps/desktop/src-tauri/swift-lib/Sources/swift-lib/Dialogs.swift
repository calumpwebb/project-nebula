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

// MARK: - Update Sheet

private var updateSheet: NSWindow?
private var sheetParent: NSWindow?
private var progressBar: NSProgressIndicator?
private var statusLabel: NSTextField?

/// Create the sheet content view
private func createSheetContentView(width: CGFloat, height: CGFloat) -> (NSView, NSTextField, NSProgressIndicator) {
    let contentView = NSView(frame: NSRect(x: 0, y: 0, width: width, height: height))

    // Icon
    let iconView = NSImageView(frame: NSRect(x: 20, y: height - 55, width: 40, height: 40))
    iconView.image = getAppIcon()
    contentView.addSubview(iconView)

    // Label
    let label = NSTextField(labelWithString: "")
    label.frame = NSRect(x: 70, y: height - 42, width: width - 90, height: 20)
    label.font = NSFont.systemFont(ofSize: 13, weight: .medium)
    contentView.addSubview(label)

    // Progress bar
    let progress = NSProgressIndicator(frame: NSRect(x: 70, y: height - 60, width: width - 90, height: 12))
    progress.style = .bar
    contentView.addSubview(progress)

    return (contentView, label, progress)
}

/// Show "Checking for updates..." as a sheet
@_cdecl("show_checking_dialog")
public func showCheckingDialog() {
    DispatchQueue.main.sync {
        guard let mainWindow = NSApp.mainWindow ?? NSApp.windows.first else { return }

        let sheet = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 320, height: 80),
            styleMask: [.titled],
            backing: .buffered,
            defer: false
        )
        sheet.title = "Checking for Updates"

        let (contentView, label, progress) = createSheetContentView(width: 320, height: 80)
        label.stringValue = "Checking for updates..."
        progress.isIndeterminate = true
        progress.startAnimation(nil)

        sheet.contentView = contentView
        statusLabel = label
        progressBar = progress
        updateSheet = sheet
        sheetParent = mainWindow

        mainWindow.beginSheet(sheet) { _ in }
    }
}

/// Dismiss the update sheet
@_cdecl("dismiss_update_panel")
public func dismissUpdatePanel() {
    DispatchQueue.main.sync {
        guard let sheet = updateSheet, let parent = sheetParent else { return }

        progressBar?.stopAnimation(nil)
        parent.endSheet(sheet)
        sheet.close()

        updateSheet = nil
        sheetParent = nil
        progressBar = nil
        statusLabel = nil
    }
}

/// Show download progress as a sheet
@_cdecl("show_download_dialog")
public func showDownloadDialog() {
    DispatchQueue.main.sync {
        guard let mainWindow = NSApp.mainWindow ?? NSApp.windows.first else { return }

        let sheet = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 320, height: 80),
            styleMask: [.titled],
            backing: .buffered,
            defer: false
        )
        sheet.title = "Downloading Update"

        let (contentView, label, progress) = createSheetContentView(width: 320, height: 80)
        label.stringValue = "Downloading update..."
        progress.isIndeterminate = false
        progress.minValue = 0
        progress.maxValue = 100
        progress.doubleValue = 0

        sheet.contentView = contentView
        statusLabel = label
        progressBar = progress
        updateSheet = sheet
        sheetParent = mainWindow

        mainWindow.beginSheet(sheet) { _ in }
    }
}

/// Update download progress (0-100)
@_cdecl("update_download_progress")
public func updateDownloadProgress(percent: Int32, downloadedMB: Float, totalMB: Float) {
    DispatchQueue.main.async {
        progressBar?.doubleValue = Double(percent)
        statusLabel?.stringValue = String(format: "Downloading... %.1f / %.1f MB (%d%%)", downloadedMB, totalMB, percent)
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

// MARK: - Result Dialogs (use sheets too)

/// Show "You're up to date" dialog as sheet
@_cdecl("show_up_to_date_dialog")
public func showUpToDateDialog(version: SRString) {
    let versionStr = version.toString()

    DispatchQueue.main.sync {
        guard let mainWindow = NSApp.mainWindow ?? NSApp.windows.first else { return }

        let alert = NSAlert()
        alert.messageText = "You're up to date!"
        alert.informativeText = "Nebula \(versionStr) is the latest version."
        alert.alertStyle = .informational
        alert.icon = getAppIcon()
        alert.addButton(withTitle: "OK")
        alert.beginSheetModal(for: mainWindow) { _ in }
    }
}

/// Show "Update required" dialog as sheet
@_cdecl("show_update_required_dialog")
public func showUpdateRequiredDialog(currentVersion: SRString, newVersion: SRString) {
    let current = currentVersion.toString()
    let new = newVersion.toString()

    DispatchQueue.main.sync {
        guard let mainWindow = NSApp.mainWindow ?? NSApp.windows.first else { return }

        let alert = NSAlert()
        alert.messageText = "Update Required"
        alert.informativeText = "Please install the latest version of Nebula to continue.\n\n\(current) → \(new)"
        alert.alertStyle = .informational
        alert.icon = getAppIcon()
        alert.addButton(withTitle: "Update Now")
        alert.beginSheetModal(for: mainWindow) { _ in }
    }
}

/// Show error dialog as sheet
@_cdecl("show_update_error_dialog")
public func showUpdateErrorDialog(errorMessage: SRString) {
    let error = errorMessage.toString()

    DispatchQueue.main.sync {
        guard let mainWindow = NSApp.mainWindow ?? NSApp.windows.first else { return }

        let alert = NSAlert()
        alert.messageText = "Update Check Failed"
        alert.informativeText = error
        alert.alertStyle = .warning
        alert.icon = getAppIcon()
        alert.addButton(withTitle: "OK")
        alert.beginSheetModal(for: mainWindow) { _ in }
    }
}
