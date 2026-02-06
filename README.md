# WME EZ Comments

Quick comment templates for Waze Map Editor with automatic placeholders.

**Built with the official [Waze Map Editor JavaScript SDK](https://www.waze.com/editor/sdk/)**

## Features

- 4 customizable comment templates
- Auto-fill placeholders (date, issue type, username)
- Settings saved automatically
- One-click comment buttons
- Custom username option

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
