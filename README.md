# WME EZ Comments

Quick comment templates for Waze Map Editor with automatic placeholders.

**Built with the official [Waze Map Editor JavaScript SDK](https://www.waze.com/editor/sdk/)**

## Features

- 4 customizable comment templates
- Auto-fill placeholders (date, issue type, username)
- Settings saved automatically
- One-click comment buttons
- Custom username option
- Optional cloud sync of your settings across browsers
- Settings tab in the [WME Kit](https://wmekit.com) style that follows WME's dark mode

## Installation

1. Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
2. [Click here to install the script](https://raw.githubusercontent.com/michaelrosstarr/WME-EZComments/main/wme-ez-comments.user.js) — your userscript manager will prompt you to confirm
3. Navigate to Waze Map Editor
4. Look for the "WME EZ Comments" tab in the sidebar

### Updates

The script updates automatically through your userscript manager, which periodically checks GitHub for a newer version. You can also trigger a check manually from the manager's dashboard ("Check for updates").

> **Already installed an older copy?** The script file was renamed to `wme-ez-comments.user.js` in v2.5.4, so copies older than that won't find updates. Remove the old copy from your userscript manager and reinstall once using the link above. After that, updates are automatic.

**Maintainers:** on every release pushed to `main`, bump `@version` in the header (the script reads its version from there). Userscript managers only install an update when `@version` increases. The "Check for update" button sees a new release immediately, but the userscript manager's own background check reads a GitHub address that is cached for up to 5 minutes.

## Placeholders

Add these to your templates and they'll auto-fill:

| Placeholder | What it does | Example |
|------------|-------------|---------|
| `{TYPE}` | Issue type | "Wrong driving direction" |
| `{FULLDATE}` | Full date | "January 15, 2026" |
| `{MONTH}` | Month name | "January" |
| `{SHORTMONTH}` | Short month | "Jan" |
| `{DAY}` | Day | "15" |
| `{YEAR}` | Year | "2026" |
| `{USERNAME}` | Your username (custom or Waze name) | "YourName" |
| `{DATE}` | Raw date | "Mon Jan 15 2026" |

## How to Use

### Setup

1. Open the **WME EZ Comments** tab in the sidebar
2. (Optional) Set a custom username
3. Edit your message types under **Message types**. Use the ↑ ↓ buttons to reorder, × to delete, and **+ Add message type** to add more. Click a placeholder pill (e.g. `{FULLDATE}`) to insert it at the cursor in the template you're editing.
4. Click **Save all**

### Using the Buttons

1. Open any map update request
2. Click a template button (Initial, Follow Up, Final, or No Reply)
3. Review the auto-filled comment
4. Send!

## Cloud Sync

Cloud sync is off by default. When you turn it on, your message types, custom username and compact button setting are kept in sync across browsers and machines through [WME Sync](https://sync.wazetools.com).

1. Open the **WME EZ Comments** tab and turn on **Enable cloud sync**
2. The first time, a PIN is shown. Write it down.
3. In another browser, type that PIN into the **WME Sync PIN** box and click **Sign in & sync**. Your settings are loaded straight away. You can also turn on **Enable cloud sync** and enter the PIN when asked.
4. Click **Save all** after making changes to push them to the cloud

Each Waze username has one PIN, and every browser signs in with that same PIN. To sign a browser out, for example after entering a mistyped PIN, click **Sign out** next to the sync status. This browser forgets its sign-in and PIN, but your settings stay saved locally. You can then enter your PIN again and click **Sign in & sync**.

Synced settings are loaded when WME starts and override the local copy. If the sync server can't be reached, the script keeps using your locally saved settings.

## Example

**Template:**
```
Hi! Responding to your "{TYPE}" issue from {FULLDATE}.

Can you provide more details?

~ {USERNAME}
```

**Result:**
```
Hi! Responding to your "Wrong turn" issue from January 15, 2026.

Can you provide more details?

~ YourName
```

## Changelog

### v2.6.0
- Redesigned the settings tab with [wmekit-wme-ui](https://github.com/wmekit/wmekit-wme-ui): it now matches other WME Kit scripts and follows WME's dark mode
- Placeholders are shown as clickable pills that insert into the template you're editing
- "Check for update" shows a notice with an install link instead of a confirm dialog

### v2.5.4
- Script version is now read from the `@version` header, fixing the update check reporting the wrong version
- Renamed the script to `wme-ez-comments.user.js` so "Check for Update" opens your userscript manager's update screen (existing installs must reinstall once)

### v2.5.1
- Added auto-update from GitHub (`@updateURL` / `@downloadURL`)
- Added a "Check for Update" button to the settings tab

### v2.5.0
- Added optional cloud sync of settings via WME Sync
- Added support for the WME beta editor

### v2.1.1 (2026-02-06)
- Added custom username field in settings
- Fixed username detection using `sdk.State.getUserInfo()`
- Username now uses custom name if set, falls back to Waze username
- Custom username saved to localStorage

### v2.1.0 (2026)
- Migrated to official WME SDK
- Removed WazeWrap dependency
- Uses modern `sdk.Sidebar.registerScriptTab()` API
- Implements `wme-update-request-panel-opened` event
- Better error handling

### v2.0.0
- Complete rewrite with customizable templates
- localStorage support for persistence
- Dynamic placeholder system
- WME sidebar tab interface
- Reset to defaults button

### v1.0.0
- Initial release

## Author

[michaelrosstarr](https://github.com/michaelrosstarr)

## License

See [LICENSE](LICENSE) file.
