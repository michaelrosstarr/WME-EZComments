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

## Installation

1. Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
2. Install the script from the `user.js` file
3. Navigate to Waze Map Editor
4. Look for the "WME EZ Comments" tab in the sidebar

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
3. Edit your templates:
   - **Initial** - First response
   - **Follow Up** - Second reminder
   - **Final Follow Up** - Last warning
   - **Close** - Closing message
4. Click **Save**

### Using the Buttons

1. Open any map update request
2. Click a template button (Initial, Follow Up, Final, or No Reply)
3. Review the auto-filled comment
4. Send!

## Cloud Sync

Cloud sync is off by default. When you turn it on, your message types, custom username and compact button setting are kept in sync across browsers and machines through [WME Sync](https://sync.wazetools.com).

1. Open the **WME EZ Comments** tab and tick **Enable Cloud Sync**
2. The first time, a PIN is shown. Write it down.
3. In another browser, tick **Enable Cloud Sync** there and enter the same PIN when asked
4. Click **Save All** after making changes to push them to the cloud

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
