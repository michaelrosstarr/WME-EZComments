// ==UserScript==
// @name         WME EZ Comments
// @namespace    http://tampermonkey.net/
// @version      2.5.4
// @description  Customizable quick comments for Waze Map Editor with placeholder support
// @author       https://github.com/michaelrosstarr
// @homepageURL  https://github.com/michaelrosstarr/WME-EZComments
// @supportURL   https://github.com/michaelrosstarr/WME-EZComments/issues
// @updateURL    https://raw.githubusercontent.com/michaelrosstarr/WME-EZComments/main/user.js
// @downloadURL  https://raw.githubusercontent.com/michaelrosstarr/WME-EZComments/main/user.js
// @match        https://www.waze.com/*/editor*
// @match        https://www.waze.com/editor*
// @match        https://beta.waze.com/*/editor*
// @match        https://beta.waze.com/editor*
// @exclude      https://www.waze.com/user/editor*
// @exclude      https://beta.waze.com/user/editor*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=waze.com
// @require      https://sync.wazetools.com/wme-sync-lib.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @connect      sync.wazetools.com
// @connect      raw.githubusercontent.com
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const SCRIPT_NAME = 'WME EZ Comments';
    // Read from the @version header so there's only one place to bump
    const SCRIPT_VERSION = GM_info.script.version;
    const SCRIPT_ID = 'wme-ez-comments-bushmanza-edition';
    const UPDATE_URL = 'https://raw.githubusercontent.com/michaelrosstarr/WME-EZComments/main/user.js';
    const STORAGE_KEY = 'wme_ez_comments_templates';
    const CUSTOM_USERNAME_KEY = 'wme_ez_comments_custom_username';
    const COMPACT_BUTTONS_KEY = 'wme_ez_comments_compact_buttons';
    const SYNC_ENABLED_KEY = 'wme_ez_comments_sync_enabled';
    const SYNC_KEY = 'settings';

    // Granting GM_* APIs runs the script in the userscript manager's sandbox, so
    // page globals like the WME SDK bootstrap have to be read from unsafeWindow.
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // Variables
    let sdk = null;
    let modalOpen = false;
    let currentIssueId = null;

    // Default message types. Each entry becomes one button in the reply panel.
    // Users can edit, reorder, delete, or add their own from the settings tab -
    // the list below is only the starting point, not a fixed set of "types".
    const DEFAULT_MESSAGE_TYPES = [
        {
            id: 'initial',
            label: 'Initial',
            text: `Hi, Waze volunteers responding to your "{TYPE}" issue that you reported on {FULLDATE}.

Can you please give us some additional information? Waze gives us very little to work off of so it would be greatly appreciated if you could help us out.

Please reply using the Waze app and not emails, the report system does not work with replying to the email.

~ {USERNAME}

*Open to any editor*`
        },
        {
            id: 'followUp',
            label: 'Follow Up',
            text: `Hi, we haven't heard back from you about the "{TYPE}" issue you reported on {FULLDATE}.

Please help us to make Waze better for all users. Please respond using the Waze app, emails don't work with the reporting system.

~ {USERNAME}

*Open to any editor*`
        },
        {
            id: 'final',
            label: 'Final Follow Up',
            text: `Hi, we haven't heard back from you about your "{TYPE}" issue that you reported on {FULLDATE}.

If we don't hear from you soon, we will assume that this is no longer an issue and close the report. Please reply using the Waze app and not emails, the report system does not work with replying to the email.

~ {USERNAME}

*Open to any editor*`
        },
        {
            id: 'close',
            label: 'No Reply',
            text: `Hi, since we haven't heard back from you, we are going to close this issue. If you come across any other issues, please feel free to report it again via the Waze app.

~ {USERNAME}`
        },
        {
            id: 'added',
            label: 'Added',
            text: `Added. Please allow up to 72 hours for it to show/update in your Waze app.

Regards, {USERNAME}`
        }
    ];

    const PLACEHOLDERS = {
        '{TYPE}': 'Issue type/description',
        '{FULLDATE}': 'Full date (Month Day, Year)',
        '{MONTH}': 'Month name',
        '{SHORTMONTH}': 'Short month (Jan, Feb, etc.)',
        '{DAY}': 'Day of month',
        '{YEAR}': 'Year',
        '{WEEKDAY}': 'Full weekday name (Monday, Tuesday, etc.)',
        '{SHORTWEEKDAY}': 'Short weekday (Mon, Tue, etc.)',
        '{USERNAME}': 'Your Waze username',
        '{DATE}': 'Full date string'
    };

    const monthNames = {
        "Jan": "January",
        "Feb": "February",
        "Mar": "March",
        "Apr": "April",
        "May": "May",
        "Jun": "June",
        "Jul": "July",
        "Aug": "August",
        "Sep": "September",
        "Oct": "October",
        "Nov": "November",
        "Dec": "December"
    };

    const weekdayNames = {
        "Mon": "Monday",
        "Tue": "Tuesday",
        "Wed": "Wednesday",
        "Thu": "Thursday",
        "Fri": "Friday",
        "Sat": "Saturday",
        "Sun": "Sunday"
    };

    function generateTypeId() {
        return 'custom_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    // Load message types from localStorage or use defaults.
    // Transparently migrates the old fixed-key object format ({initial: "...", ...})
    // to the new array-of-types format so existing users keep their saved text.
    function loadMessageTypes() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
                if (parsed && typeof parsed === 'object') {
                    return DEFAULT_MESSAGE_TYPES.map(defaultType => ({
                        ...defaultType,
                        text: typeof parsed[defaultType.id] === 'string' ? parsed[defaultType.id] : defaultType.text
                    }));
                }
            } catch (e) {
                console.error('Error loading message types:', e);
            }
        }
        return DEFAULT_MESSAGE_TYPES.map(type => ({ ...type }));
    }

    // Save message types to localStorage
    function saveMessageTypes(types) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
    }

    // Load custom username from localStorage
    function loadCustomUsername() {
        return localStorage.getItem(CUSTOM_USERNAME_KEY) || '';
    }

    // Save custom username to localStorage
    function saveCustomUsername(username) {
        localStorage.setItem(CUSTOM_USERNAME_KEY, username);
    }

    // Load compact buttons preference from localStorage
    function loadCompactButtons() {
        return localStorage.getItem(COMPACT_BUTTONS_KEY) === 'true';
    }

    // Save compact buttons preference to localStorage
    function saveCompactButtons(compact) {
        localStorage.setItem(COMPACT_BUTTONS_KEY, compact ? 'true' : 'false');
    }

    // Load cloud sync opt-in from localStorage. Kept per-browser, never synced.
    function loadSyncEnabled() {
        return localStorage.getItem(SYNC_ENABLED_KEY) === 'true';
    }

    // Save cloud sync opt-in to localStorage
    function saveSyncEnabled(enabled) {
        localStorage.setItem(SYNC_ENABLED_KEY, enabled ? 'true' : 'false');
    }

    let messageTypes = loadMessageTypes();
    let customUsername = loadCustomUsername();
    let compactButtons = loadCompactButtons();

    // WMESync client, set only while cloud sync is enabled and signed in
    let sync = null;

    function getSettingsSnapshot() {
        return { messageTypes, customUsername, compactButtons };
    }

    // Apply settings pulled from the cloud and cache them in localStorage, which
    // stays the offline fallback.
    function applySettings(remote) {
        if (!remote || typeof remote !== 'object') return;

        if (Array.isArray(remote.messageTypes)) {
            messageTypes = remote.messageTypes;
            saveMessageTypes(messageTypes);
        }
        if (typeof remote.customUsername === 'string') {
            customUsername = remote.customUsername;
            saveCustomUsername(customUsername);
        }
        if (typeof remote.compactButtons === 'boolean') {
            compactButtons = remote.compactButtons;
            saveCompactButtons(compactButtons);
        }
    }

    // Sign in to WMESync (showing or asking for the PIN on first use) and pull
    // the remote settings. Remote wins on load; if nothing is stored yet, the
    // local settings seed it. With `pin`, that PIN is used instead of prompting
    // for one (signing in to an existing WME Sync account from the settings tab).
    async function startSync(pin) {
        const options = { scriptId: SCRIPT_ID, sdk };
        if (pin) {
            let pinUsed = false;
            options.promptForPin = (username) => {
                if (pinUsed) {
                    throw new Error(`That PIN didn't work for "${username}".`);
                }
                pinUsed = true;
                return pin;
            };
        }

        try {
            sync = await WMESync.init(options);
            if (pin) {
                // Drop any existing session so the entered PIN is the one used
                await sync.signOut();
            }
            const remote = await sync.get(SYNC_KEY);
            if (remote) {
                applySettings(remote);
            } else {
                await sync.set(SYNC_KEY, getSettingsSnapshot());
            }
        } catch (error) {
            sync = null;
            throw error;
        }
    }

    // Sign this browser out of WMESync: revokes its token and forgets the PIN, so
    // the next sign-in asks for a PIN again. Local settings are left as they are.
    async function signOutSync() {
        const client = sync ?? await WMESync.init({ scriptId: SCRIPT_ID, sdk });
        sync = null;
        await client.signOut();
    }

    // Push the current settings to the cloud. Last write wins.
    async function pushSettings() {
        if (sync) {
            await sync.set(SYNC_KEY, getSettingsSnapshot());
        }
    }

    // Replace placeholders in template
    function replacePlaceholders(template, type, dateStr) {



        let result = template;

        // Parse the date string to extract components
        // Handle formats like:
        // "Mon Jan 15 2026" (day of week, month, day, year)
        // "Jan 15, 2026" (month, day with comma, year)
        // "Mon, Jan 15, 2026" (day of week with comma, month, day with comma, year)

        // Remove commas for easier parsing
        const cleanDateStr = dateStr.replace(/,/g, '');
        const dateParts = cleanDateStr.split(' ').filter(part => part.trim() !== '');

        // Determine the format based on parts count and content
        let shortMonth = '';
        let day = '';
        let year = '';
        let shortWeekday = '';

        // Check if first part is a day of week (3 letters) or month (3 letters)
        // Day of week: Mon, Tue, Wed, Thu, Fri, Sat, Sun
        // Month: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec
        const dayOfWeekPattern = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/;

        if (dateParts.length >= 3) {
            // Check if first part is a day of week
            if (dayOfWeekPattern.test(dateParts[0]) && dateParts.length >= 4) {
                // Format: "Mon Jan 15 2026" or "Mon, Jan 15, 2026"
                shortWeekday = dateParts[0] || '';
                shortMonth = dateParts[1] || '';
                day = dateParts[2] || '';
                year = dateParts[3] || '';
            } else if (!dayOfWeekPattern.test(dateParts[0]) && dateParts.length >= 3) {
                // Format: "Jan 15 2026" or "Jan 15, 2026"
                shortMonth = dateParts[0] || '';
                day = dateParts[1] || '';
                year = dateParts[2] || '';
            }
        }

        // Get username - use custom username if set, otherwise get from SDK
        let username = customUsername || 'Waze Volunteer';
        if (!customUsername) {
            try {
                const userInfo = sdk?.State?.getUserInfo();
                if (userInfo?.userName) {
                    username = userInfo.userName;
                }
            } catch (e) {
                console.error('Error getting username:', e);
            }
        }

        result = result.replace(/{TYPE}/g, type);
        // Only replace FULLDATE if we have all required components
        if (shortMonth && day && year && monthNames[shortMonth]) {
            result = result.replace(/{FULLDATE}/g, `${monthNames[shortMonth]} ${day}, ${year}`);
        } else if (shortMonth && day && year) {
            // Month abbreviation not in monthNames, use as-is
            result = result.replace(/{FULLDATE}/g, `${shortMonth} ${day}, ${year}`);
        } else {
            // Date parsing failed, use raw date string
            result = result.replace(/{FULLDATE}/g, dateStr);
        }
        result = result.replace(/{MONTH}/g, monthNames[shortMonth] || '');
        result = result.replace(/{SHORTMONTH}/g, shortMonth || '');
        result = result.replace(/{DAY}/g, day || '');
        result = result.replace(/{YEAR}/g, year || '');
        result = result.replace(/{WEEKDAY}/g, weekdayNames[shortWeekday] || '');
        result = result.replace(/{SHORTWEEKDAY}/g, shortWeekday || '');
        result = result.replace(/{USERNAME}/g, username);
        result = result.replace(/{DATE}/g, dateStr);

        return result;
    }

    function getCommentText(typeId, type, date) {
        const messageType = messageTypes.find(t => t.id === typeId);
        return replacePlaceholders(messageType ? messageType.text : '', type, date);
    }

    function checkModal() {
        const modal = document.querySelector('.mapUpdateRequest');

        if (modal) {
            const newIssueId = getIssueIdentifier(modal);
            const isNewIssue = (newIssueId !== currentIssueId);

            if (!modalOpen || isNewIssue) {
                modalOpen = true;
                currentIssueId = newIssueId;
                insertButton(modal);
            } else if (!modal.querySelector('.ez-comment-button')) {
                insertButton(modal);
            }
        } else if (modalOpen) {
            modalOpen = false;
            currentIssueId = null;
        }
    }

    function getIssueIdentifier(modal) {
        const idElement = modal.querySelector('.issue-id');
        if (idElement) {
            return idElement.textContent.trim();
        }
        const [title, date] = extractIssueDetails();
        return `${title}__${date}`;
    }

    function extractIssueDetails() {
        const subTitleElement = document.querySelector('.issue-panel-header .sub-title');
        const subTitle = subTitleElement ? subTitleElement.textContent.trim() : 'No sub-title found';

        // Try multiple selectors to find the date
        let reportedDateElement = document.querySelector('.issue-panel-header .reported');
        if (!reportedDateElement) {
            reportedDateElement = document.querySelector('.mapUpdateRequest .reported');
        }
        if (!reportedDateElement) {
            reportedDateElement = document.querySelector('[class*="reported"]');
        }

        let reportedDate = '';

        if (reportedDateElement) {
            const reportedText = reportedDateElement.textContent.trim();
            console.log('WME EZ Comments - Found reported element text:', reportedText);

            // Extract date and strip time if present
            // Format: "Submitted on: Thu Dec 04 2025, 18:55"
            const dateMatch = reportedText.match(/Submitted on[:\s]+(.+)/i) ||
                reportedText.match(/Reported on[:\s]+(.+)/i);

            if (dateMatch && dateMatch[1]) {
                // Remove time portion (anything after comma followed by time like ", 18:55")
                reportedDate = dateMatch[1].replace(/,\s*\d{2}:\d{2}.*$/, '').trim();
                console.log('WME EZ Comments - Extracted date (time stripped):', reportedDate);
            } else {
                // Try to extract just the date portion directly
                const directDateMatch = reportedText.match(/(\w{3}\s+\w{3}\s+\d{1,2}\s+\d{4})/);
                if (directDateMatch) {
                    reportedDate = directDateMatch[1];
                    console.log('WME EZ Comments - Extracted date (direct match):', reportedDate);
                } else {
                    console.log('WME EZ Comments - No date pattern matched, using raw text');
                    reportedDate = reportedText;
                }
            }
        } else {
            console.log('WME EZ Comments - No reported date element found');
            reportedDate = 'No reported date found';
        }

        return [subTitle, reportedDate];
    }

    function insertButton(modal) {
        const commentList = modal.querySelector('.conversation-view .comment-list');
        const newCommentForm = modal.querySelector('.conversation-view .new-comment-form');

        if (!commentList || !newCommentForm) {
            return;
        }

        if (modal.querySelector('.ez-comment-button')) {
            return;
        }

        try {
            const extracted = extractIssueDetails();

            const createButton = (text, templateKey, marginBottom = '5px') => {
                const button = document.createElement('wz-button');
                button.setAttribute('type', 'button');
                button.setAttribute('size', compactButtons ? 'sm' : 'md');
                button.setAttribute('style', `margin-bottom: ${marginBottom}`);
                button.setAttribute('disabled', 'false');
                button.classList.add('send-button', 'ez-comment-button');
                button.textContent = text;

                button.addEventListener('mousedown', () => {
                    const wzTextarea = modal.querySelector('.new-comment-form wz-textarea');
                    if (wzTextarea) {
                        wzTextarea.setAttribute('value', getCommentText(templateKey, extracted[0], extracted[1]));
                        wzTextarea.dispatchEvent(new Event('input'));
                    }
                });

                return button;
            };

            const gap = compactButtons ? '3px' : '5px';
            const lastGap = compactButtons ? '20px' : '30px';
            messageTypes.forEach((messageType, index) => {
                const marginBottom = index === messageTypes.length - 1 ? lastGap : gap;
                commentList.parentNode.insertBefore(createButton(messageType.label, messageType.id, marginBottom), newCommentForm);
            });

        } catch (error) {
            console.error('Error inserting buttons:', error);
        }
    }

    function setupPanelDetection() {
        // Listen for update request panel opened event
        sdk.Events.on({
            eventName: 'wme-update-request-panel-opened',
            eventHandler: () => {
                console.log('Update request panel opened');
                setTimeout(checkModal, 100);
            }
        });

        // Also set up mutation observers as fallback
        const panelObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const addedNode = mutation.addedNodes[i];

                    if (addedNode.nodeType === Node.ELEMENT_NODE) {
                        const mapRequestPanel = addedNode.classList &&
                            addedNode.classList.contains('mapUpdateRequest') ?
                            addedNode :
                            addedNode.querySelector('.mapUpdateRequest');

                        if (mapRequestPanel) {
                            checkModal();
                        }
                    }
                }
            });
        });

        const contentObserver = new MutationObserver(() => {
            const modal = document.querySelector('.mapUpdateRequest');
            if (modal) {
                const newIssueId = getIssueIdentifier(modal);

                if (newIssueId !== currentIssueId) {
                    currentIssueId = newIssueId;
                    insertButton(modal);
                }
            }
        });

        panelObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        const checkAndObserveContent = () => {
            const modal = document.querySelector('.mapUpdateRequest');
            checkModal();

            if (modal) {
                contentObserver.disconnect();
                contentObserver.observe(modal, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
            }
        };

        setInterval(checkAndObserveContent, 1000);
        checkAndObserveContent();
    }

    // Escape text for safe interpolation into innerHTML-built markup
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str ?? '';
        return div.innerHTML;
    }

    // Create settings tab UI
    // Returns a positive number if version a is newer than b
    function compareVersions(a, b) {
        const pa = a.split('.').map(Number);
        const pb = b.split('.').map(Number);
        for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
            const diff = (pa[i] || 0) - (pb[i] || 0);
            if (diff !== 0) return diff;
        }
        return 0;
    }

    // Fetch the published script from GitHub and read its @version
    function fetchLatestVersion() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${UPDATE_URL}?t=${Date.now()}`,
                headers: { 'Cache-Control': 'no-cache' },
                onload: (res) => {
                    const match = res.status === 200 && res.responseText.match(/^\/\/\s*@version\s+(\S+)/m);
                    match ? resolve(match[1]) : reject(new Error(`Unexpected response (HTTP ${res.status})`));
                },
                onerror: () => reject(new Error('Network error')),
                ontimeout: () => reject(new Error('Request timed out')),
                timeout: 15000
            });
        });
    }

    async function createSettingsTab() {
        // Register the tab using SDK - call without parameters
        const { tabLabel, tabPane } = await sdk.Sidebar.registerScriptTab();

        // Set the tab label
        tabLabel.innerText = SCRIPT_NAME;
        tabLabel.title = 'Customize quick comment templates';

        // Create the content
        const tabContent = document.createElement('div');
        tabContent.id = 'ezc-settings';
        tabContent.innerHTML = `
            <style>
                /* Neutralize WME's global button styles so labels sit centered */
                #ezc-settings button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    box-sizing: border-box;
                    height: auto;
                    min-height: 0;
                    min-width: 0;
                    margin: 0;
                    line-height: 1.2;
                    font-family: inherit;
                    text-transform: none;
                    letter-spacing: normal;
                    vertical-align: middle;
                    cursor: pointer;
                }
                #ezc-settings button:disabled {
                    opacity: 0.4;
                    cursor: default;
                }
            </style>
            <div style="padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
                <h3 style="margin-top: 0;">${SCRIPT_NAME} v${SCRIPT_VERSION}</h3>
                <div style="margin-bottom: 15px;">
                    <button id="ezc-update-btn" style="background: white; color: #0066cc; border: 1px solid #0066cc; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">Check for Update</button>
                    <span id="ezc-update-status" style="margin-left: 8px; font-size: 12px; color: #666;"></span>
                </div>
                <p style="color: #666; margin-bottom: 20px;">Customize your quick comment message types. Use placeholders to make templates dynamic.</p>

                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="margin-top: 0;">Available Placeholders:</h4>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; font-size: 12px;">
                        ${Object.entries(PLACEHOLDERS).map(([key, desc]) =>
            `<div style="font-weight: bold; color: #0066cc;">${key}</div><div>${desc}</div>`
        ).join('')}
                    </div>
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display: block; font-weight: bold; margin-bottom: 8px;">Custom Username (Optional):</label>
                    <input type="text" id="ezc-custom-username" placeholder="Leave blank to use your Waze username" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;" />
                    <p style="color: #666; font-size: 12px; margin-top: 5px;">If set, this will be used instead of your Waze username for the {USERNAME} placeholder.</p>
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display: flex; align-items: center; gap: 8px; font-weight: bold; cursor: pointer;">
                        <input type="checkbox" id="ezc-compact-buttons" style="width: 16px; height: 16px; cursor: pointer;" />
                        Compact Buttons
                    </label>
                    <p style="color: #666; font-size: 12px; margin-top: 5px;">Shrinks the message type buttons in the reply panel and tightens the spacing between them.</p>
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display: flex; align-items: center; gap: 8px; font-weight: bold; cursor: pointer;">
                        <input type="checkbox" id="ezc-sync-enabled" style="width: 16px; height: 16px; cursor: pointer;" />
                        Enable Cloud Sync
                    </label>
                    <p style="color: #666; font-size: 12px; margin-top: 5px;">Syncs your message types, custom username and compact setting across browsers via WME Sync. The first time, you'll be shown a PIN for your Waze username &mdash; write it down and use it to sign in on other browsers.</p>
                    <p style="font-size: 12px; margin-top: 5px;">Status: <span id="ezc-sync-status">Off</span>
                        <button id="ezc-sync-logout-btn" title="Sign this browser out of WME Sync. You can sign in again with your PIN." style="margin-left: 8px; background: white; color: #dc3545; border: 1px solid #dc3545; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">Sign out</button>
                    </p>
                    <div id="ezc-sync-login" style="margin-top: 10px;">
                        <label style="display: block; font-size: 12px; margin-bottom: 5px;">Already synced in another browser? Enter the PIN for your Waze username to load your settings:</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="password" id="ezc-sync-pin" inputmode="numeric" autocomplete="off" placeholder="WME Sync PIN" style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;" />
                            <button id="ezc-sync-login-btn" style="background: #0066cc; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Sign in &amp; Sync</button>
                        </div>
                    </div>
                </div>

                <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                    <h4 style="margin-top: 0; margin-bottom: 10px;">Preview Message Types</h4>
                    <p style="color: #666; font-size: 12px; margin-bottom: 10px;">See how your message types will look with sample data</p>
                    <button id="ezc-preview-btn" style="background: #ffc107; color: #000; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">Generate Preview</button>
                    <div id="ezc-preview-container" style="display: none;"></div>
                </div>

                <div style="margin-bottom: 25px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <label style="font-weight: bold;">Message Types (Buttons):</label>
                        <button id="ezc-add-type-btn" style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">+ Add Message Type</button>
                    </div>
                    <p style="color: #666; font-size: 12px; margin-bottom: 10px;">Each message type below adds its own button to the reply panel. Add as many as you like &mdash; for example a "Thanks for letting us know" type &mdash; with your own label, order, and message text.</p>
                    <div id="ezc-type-list"></div>
                </div>

                <div style="display: flex; align-items: center; gap: 10px;">
                    <button id="ezc-save-btn" style="background: #0066cc; color: white; border: none; padding: 10px 20px; border-radius: 4px; font-size: 14px; font-weight: bold;">Save All</button>
                    <button id="ezc-reset-btn" style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 4px; font-size: 14px; font-weight: bold;">Reset to Defaults</button>
                </div>

                <div id="ezc-status" style="margin-top: 15px; padding: 10px; border-radius: 4px; display: none;"></div>
            </div>
        `;

        // Append content to the tabPane
        tabPane.appendChild(tabContent);

        // Working copy of message types edited in this tab. Nothing is persisted
        // until "Save All" is clicked.
        let draftTypes = messageTypes.map(t => ({ ...t }));

        const typeListEl = tabContent.querySelector('#ezc-type-list');

        function renderTypeList() {
            typeListEl.innerHTML = draftTypes.map((mt, index) => `
                <div class="ezc-type-row" data-index="${index}" style="border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 12px; background: #fafafa;">
                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
                        <input type="text" class="ezc-type-label" value="${escapeHtml(mt.label)}" placeholder="Button label" style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-weight: bold;" />
                        <button class="ezc-move-up" title="Move up" ${index === 0 ? 'disabled' : ''} style="padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; background: white; color: #333; font-size: 14px;">&uarr;</button>
                        <button class="ezc-move-down" title="Move down" ${index === draftTypes.length - 1 ? 'disabled' : ''} style="padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; background: white; color: #333; font-size: 14px;">&darr;</button>
                        <button class="ezc-delete-type" title="Delete this message type" style="background: #dc3545; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;">&times;</button>
                    </div>
                    <textarea class="ezc-type-text" placeholder="Message text" style="width: 100%; height: 100px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; font-size: 12px; resize: vertical;">${escapeHtml(mt.text)}</textarea>
                </div>
            `).join('');

            typeListEl.querySelectorAll('.ezc-type-row').forEach(row => {
                const index = Number(row.dataset.index);

                row.querySelector('.ezc-type-label').addEventListener('input', (e) => {
                    draftTypes[index].label = e.target.value;
                });
                row.querySelector('.ezc-type-text').addEventListener('input', (e) => {
                    draftTypes[index].text = e.target.value;
                });
                row.querySelector('.ezc-move-up').addEventListener('click', () => {
                    if (index === 0) return;
                    [draftTypes[index - 1], draftTypes[index]] = [draftTypes[index], draftTypes[index - 1]];
                    renderTypeList();
                });
                row.querySelector('.ezc-move-down').addEventListener('click', () => {
                    if (index === draftTypes.length - 1) return;
                    [draftTypes[index + 1], draftTypes[index]] = [draftTypes[index], draftTypes[index + 1]];
                    renderTypeList();
                });
                row.querySelector('.ezc-delete-type').addEventListener('click', () => {
                    draftTypes.splice(index, 1);
                    renderTypeList();
                });
            });
        }

        const customUsernameInput = tabContent.querySelector('#ezc-custom-username');
        const compactButtonsInput = tabContent.querySelector('#ezc-compact-buttons');
        const syncEnabledInput = tabContent.querySelector('#ezc-sync-enabled');
        const syncStatusEl = tabContent.querySelector('#ezc-sync-status');

        // Reset the form from the saved settings (e.g. after pulling from the cloud)
        function refreshForm() {
            draftTypes = messageTypes.map(t => ({ ...t }));
            renderTypeList();
            customUsernameInput.value = customUsername;
            compactButtonsInput.checked = compactButtons;
        }

        refreshForm();

        const syncLoginEl = tabContent.querySelector('#ezc-sync-login');
        const syncPinInput = tabContent.querySelector('#ezc-sync-pin');
        const syncLoginBtn = tabContent.querySelector('#ezc-sync-login-btn');
        const syncLogoutBtn = tabContent.querySelector('#ezc-sync-logout-btn');

        function setSyncUi(status) {
            syncEnabledInput.checked = !!sync;
            syncLoginEl.style.display = sync ? 'none' : 'block';
            syncLogoutBtn.style.display = sync ? 'inline-block' : 'none';
            syncStatusEl.textContent = status;
        }

        setSyncUi(sync ? 'Synced' : (loadSyncEnabled() ? 'Error - using local settings' : 'Off'));

        // Turn sync on, optionally with a PIN entered in the tab, and load the
        // synced settings into the form.
        async function enableSync(pin) {
            syncEnabledInput.disabled = true;
            syncLoginBtn.disabled = true;
            syncStatusEl.textContent = 'Connecting...';
            try {
                await startSync(pin);
                saveSyncEnabled(true);
                refreshForm();
                syncPinInput.value = '';
                setSyncUi('Synced');
                showStatus('Cloud sync enabled. Your synced settings have been loaded.', 'success');
            } catch (error) {
                console.error(`${SCRIPT_NAME}: Error enabling cloud sync:`, error);
                saveSyncEnabled(false);
                setSyncUi('Off');
                showStatus(`Could not enable cloud sync: ${error.message}`, 'error');
            } finally {
                syncEnabledInput.disabled = false;
                syncLoginBtn.disabled = false;
            }
        }

        syncEnabledInput.addEventListener('change', () => {
            if (syncEnabledInput.checked) {
                enableSync();
            } else {
                // The token is kept, so re-enabling later skips the PIN prompt.
                saveSyncEnabled(false);
                sync = null;
                setSyncUi('Off');
            }
        });

        syncLogoutBtn.addEventListener('click', async () => {
            if (!confirm('Sign this browser out of WME Sync? Your settings stay saved here, and you can sign in again with your PIN.')) {
                return;
            }
            syncLogoutBtn.disabled = true;
            try {
                await signOutSync();
                showStatus('Signed out of cloud sync. Enter a PIN to sign in again.', 'success');
            } catch (error) {
                console.error(`${SCRIPT_NAME}: Error signing out of cloud sync:`, error);
                showStatus(`Sign out failed: ${error.message}`, 'error');
            } finally {
                saveSyncEnabled(false);
                setSyncUi('Off');
                syncLogoutBtn.disabled = false;
            }
        });

        syncLoginBtn.addEventListener('click', () => {
            const pin = syncPinInput.value.trim();
            if (!/^\d{6,12}$/.test(pin)) {
                showStatus('Enter your WME Sync PIN (6-12 digits).', 'error');
                return;
            }
            enableSync(pin);
        });

        // Push to the cloud after a local save; the local save has already succeeded.
        async function pushAndReport(successMessage) {
            try {
                await pushSettings();
                if (sync) syncStatusEl.textContent = 'Synced';
                showStatus(successMessage, 'success');
            } catch (error) {
                console.error(`${SCRIPT_NAME}: Error pushing settings to cloud:`, error);
                syncStatusEl.textContent = `Error: ${error.message}`;
                showStatus(`Saved locally, but cloud sync failed: ${error.message}`, 'error');
            }
        }

        tabContent.querySelector('#ezc-add-type-btn').addEventListener('click', () => {
            draftTypes.push({ id: generateTypeId(), label: 'New Message', text: '' });
            renderTypeList();
        });

        tabContent.querySelector('#ezc-save-btn').addEventListener('click', async () => {
            messageTypes = draftTypes.map(t => ({ ...t }));
            saveMessageTypes(messageTypes);

            customUsername = customUsernameInput.value.trim();
            saveCustomUsername(customUsername);

            compactButtons = compactButtonsInput.checked;
            saveCompactButtons(compactButtons);

            await pushAndReport('Message types and settings saved successfully!');
        });

        tabContent.querySelector('#ezc-reset-btn').addEventListener('click', async () => {
            if (confirm('Are you sure you want to reset all message types to defaults? This removes any custom message types you added.')) {
                messageTypes = DEFAULT_MESSAGE_TYPES.map(t => ({ ...t }));
                saveMessageTypes(messageTypes);
                draftTypes = messageTypes.map(t => ({ ...t }));
                renderTypeList();
                await pushAndReport('Message types reset to defaults!');
            }
        });

        const updateBtn = tabContent.querySelector('#ezc-update-btn');
        const updateStatus = tabContent.querySelector('#ezc-update-status');
        updateBtn.addEventListener('click', async () => {
            updateBtn.disabled = true;
            updateStatus.style.color = '#666';
            updateStatus.textContent = 'Checking...';
            try {
                const latest = await fetchLatestVersion();
                if (compareVersions(latest, SCRIPT_VERSION) > 0) {
                    updateStatus.style.color = '#155724';
                    updateStatus.textContent = `v${latest} is available.`;
                    if (confirm(`${SCRIPT_NAME} v${latest} is available (you have v${SCRIPT_VERSION}).\n\nOpen the update page now? Reload WME after installing.`)) {
                        window.open(UPDATE_URL, '_blank');
                    }
                } else {
                    updateStatus.style.color = '#155724';
                    updateStatus.textContent = `You're up to date (v${SCRIPT_VERSION}).`;
                }
            } catch (error) {
                console.error(`${SCRIPT_NAME}: update check failed`, error);
                updateStatus.style.color = '#721c24';
                updateStatus.textContent = `Update check failed: ${error.message}`;
            } finally {
                updateBtn.disabled = false;
            }
        });

        tabContent.querySelector('#ezc-preview-btn').addEventListener('click', () => {
            const sampleType = 'Map Issue';
            const sampleDate = 'Mon Feb 10 2026';

            // Temporarily use the in-progress username for the preview
            const originalUsername = customUsername;
            customUsername = customUsernameInput.value.trim() || 'Waze Volunteer';

            const previewContainer = tabContent.querySelector('#ezc-preview-container');
            previewContainer.innerHTML = draftTypes.map(mt => `
                <div style="margin-bottom: 15px;">
                    <strong style="display: block; margin-bottom: 5px;">${escapeHtml(mt.label)}:</strong>
                    <div style="background: white; padding: 10px; border: 1px solid #ddd; border-radius: 4px; white-space: pre-wrap; font-size: 12px;">${escapeHtml(replacePlaceholders(mt.text, sampleType, sampleDate))}</div>
                </div>
            `).join('');
            previewContainer.style.display = 'block';

            customUsername = originalUsername;
        });

        function showStatus(message, type) {
            const statusDiv = tabContent.querySelector('#ezc-status');
            if (!statusDiv) return;

            statusDiv.textContent = message;
            statusDiv.style.display = 'block';
            statusDiv.style.background = type === 'success' ? '#d4edda' : '#f8d7da';
            statusDiv.style.color = type === 'success' ? '#155724' : '#721c24';
            statusDiv.style.border = `1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'}`;

            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        }
    }

    // Initialize script with modern SDK
    async function init() {
        console.log(`${SCRIPT_NAME} v${SCRIPT_VERSION} initializing with WME SDK...`);

        try {
            // Get the SDK instance
            sdk = pageWindow.getWmeSdk({
                scriptId: SCRIPT_ID,
                scriptName: SCRIPT_NAME
            });

            console.log(`${SCRIPT_NAME}: SDK initialized`);

            // Wait for WME to be ready
            await sdk.Events.once({ eventName: 'wme-ready' });
            console.log(`${SCRIPT_NAME}: WME ready`);

            // Pull synced settings before building the UI so the tab and buttons use them
            if (loadSyncEnabled()) {
                try {
                    await startSync();
                    console.log(`${SCRIPT_NAME}: Cloud sync loaded`);
                } catch (error) {
                    console.error(`${SCRIPT_NAME}: Cloud sync failed, using local settings:`, error);
                }
            }

            // Create settings tab
            await createSettingsTab();

            // Set up panel detection
            setupPanelDetection();

            console.log(`${SCRIPT_NAME} initialized successfully!`);
        } catch (error) {
            console.error(`${SCRIPT_NAME}: Error during initialization:`, error);
        }
    }

    // Bootstrap script with SDK
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (pageWindow.SDK_INITIALIZED) {
                pageWindow.SDK_INITIALIZED.then(init);
            } else {
                console.error(`${SCRIPT_NAME}: SDK not available`);
            }
        });
    } else {
        if (pageWindow.SDK_INITIALIZED) {
            pageWindow.SDK_INITIALIZED.then(init);
        } else {
            console.error(`${SCRIPT_NAME}: SDK not available`);
        }
    }
})();
