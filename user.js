// ==UserScript==
// @name         WME EZ Comments
// @namespace    http://tampermonkey.net/
// @version      2.1.1
// @description  Customizable quick comments for Waze Map Editor with placeholder support
// @author       https://github.com/michaelrosstarr
// @match        https://www.waze.com/*/editor*
// @match        https://www.waze.com/editor*
// @exclude      https://www.waze.com/user/editor*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=waze.com
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const SCRIPT_NAME = 'WME EZ Comments';
    const SCRIPT_VERSION = '2.1.1';
    const SCRIPT_ID = 'wme-ez-comments-bushmanza-edition';
    const STORAGE_KEY = 'wme_ez_comments_templates';
    const CUSTOM_USERNAME_KEY = 'wme_ez_comments_custom_username';

    let sdk = null;
    let modalOpen = false;
    let currentIssueId = null;

    // Default comment templates with placeholders
    const DEFAULT_TEMPLATES = {
        initial: `Hi, Waze volunteers responding to your "{TYPE}" issue that you reported on {FULLDATE}.

Can you please give us some additional information? Waze gives us very little to work off of so it would be greatly appreciated if you could help us out.

Please reply using the Waze app and not emails, the report system does not work with replying to the email.

~ {USERNAME}

*Open to any editor*`,
        followUp: `Hi, we haven't heard back from you about the "{TYPE}" issue you reported on {FULLDATE}.

Please help us to make Waze better for all users. Please respond using the Waze app, emails don't work with the reporting system.

~ {USERNAME}

*Open to any editor*`,
        final: `Hi, we haven't heard back from you about your "{TYPE}" issue that you reported on {FULLDATE}.

If we don't hear from you soon, we will assume that this is no longer an issue and close the report. Please reply using the Waze app and not emails, the report system does not work with replying to the email.

~ {USERNAME}

*Open to any editor*`,
        close: `Hi, since we haven't heard back from you, we are going to close this issue. If you come across any other issues, please feel free to report it again via the Waze app.

~ {USERNAME}`
    };

    const PLACEHOLDERS = {
        '{TYPE}': 'Issue type/description',
        '{FULLDATE}': 'Full date (Month Day, Year)',
        '{MONTH}': 'Month name',
        '{SHORTMONTH}': 'Short month (Jan, Feb, etc.)',
        '{DAY}': 'Day of month',
        '{YEAR}': 'Year',
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

    // Load templates from localStorage or use defaults
    function loadTemplates() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Error loading templates:', e);
            }
        }
        return { ...DEFAULT_TEMPLATES };
    }

    // Save templates to localStorage
    function saveTemplates(templates) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    }

    // Load custom username from localStorage
    function loadCustomUsername() {
        return localStorage.getItem(CUSTOM_USERNAME_KEY) || '';
    }

    // Save custom username to localStorage
    function saveCustomUsername(username) {
        localStorage.setItem(CUSTOM_USERNAME_KEY, username);
    }

    let templates = loadTemplates();
    let customUsername = loadCustomUsername();

    // Replace placeholders in template
    function replacePlaceholders(template, type, dateStr) {
        let result = template;
        const dateParts = dateStr.split(' ');

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
        result = result.replace(/{FULLDATE}/g, `${monthNames[dateParts[1]]} ${dateParts[2]}, ${dateParts[3]}`);
        result = result.replace(/{MONTH}/g, monthNames[dateParts[1]] || '');
        result = result.replace(/{SHORTMONTH}/g, dateParts[1] || '');
        result = result.replace(/{DAY}/g, dateParts[2] || '');
        result = result.replace(/{YEAR}/g, dateParts[3] || '');
        result = result.replace(/{USERNAME}/g, username);
        result = result.replace(/{DATE}/g, dateStr);

        return result;
    }

    function getCommentText(templateKey, type, date) {
        const template = templates[templateKey] || DEFAULT_TEMPLATES[templateKey];
        return replacePlaceholders(template, type, date);
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

        const reportedDateElement = document.querySelector('.issue-panel-header .reported');
        let reportedDate = '';

        if (reportedDateElement) {
            const reportedText = reportedDateElement.textContent.trim();
            const dateRegex = /Submitted on: (\w+ \w+ \d+ \d+)/;
            const match = reportedText.match(dateRegex);

            if (match && match[1]) {
                reportedDate = match[1];
            } else {
                reportedDate = 'No valid date found';
            }
        } else {
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

            commentList.parentNode.insertBefore(createButton('Initial', 'initial'), newCommentForm);
            commentList.parentNode.insertBefore(createButton('Follow Up', 'followUp'), newCommentForm);
            commentList.parentNode.insertBefore(createButton('Final Follow Up', 'final'), newCommentForm);
            commentList.parentNode.insertBefore(createButton('No Reply', 'close', '30px'), newCommentForm);

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

    // Create settings tab UI
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
            <div style="padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
                <h3 style="margin-top: 0;">${SCRIPT_NAME} v${SCRIPT_VERSION}</h3>
                <p style="color: #666; margin-bottom: 20px;">Customize your quick comment templates. Use placeholders to make templates dynamic.</p>
                
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
                    <label style="display: block; font-weight: bold; margin-bottom: 8px;">Initial Comment Template:</label>
                    <textarea id="ezc-template-initial" style="width: 100%; height: 120px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; font-size: 12px; resize: vertical;"></textarea>
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display: block; font-weight: bold; margin-bottom: 8px;">Follow Up Comment Template:</label>
                    <textarea id="ezc-template-followUp" style="width: 100%; height: 120px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; font-size: 12px; resize: vertical;"></textarea>
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display: block; font-weight: bold; margin-bottom: 8px;">Final Follow Up Template:</label>
                    <textarea id="ezc-template-final" style="width: 100%; height: 120px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; font-size: 12px; resize: vertical;"></textarea>
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display: block; font-weight: bold; margin-bottom: 8px;">Close Comment Template:</label>
                    <textarea id="ezc-template-close" style="width: 100%; height: 100px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; font-size: 12px; resize: vertical;"></textarea>
                </div>

                <div style="display: flex; gap: 10px;">
                    <button id="ezc-save-btn" style="background: #0066cc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">Save Templates</button>
                    <button id="ezc-reset-btn" style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Reset to Defaults</button>
                </div>
                
                <div id="ezc-status" style="margin-top: 15px; padding: 10px; border-radius: 4px; display: none;"></div>
            </div>
        `;

        // Append content to the tabPane
        tabPane.appendChild(tabContent);

        // Load current templates into textareas after tab is created
        setTimeout(() => {
            const initialTextarea = document.getElementById('ezc-template-initial');
            const followUpTextarea = document.getElementById('ezc-template-followUp');
            const finalTextarea = document.getElementById('ezc-template-final');
            const closeTextarea = document.getElementById('ezc-template-close');
            const customUsernameInput = document.getElementById('ezc-custom-username');

            if (initialTextarea) initialTextarea.value = templates.initial;
            if (followUpTextarea) followUpTextarea.value = templates.followUp;
            if (finalTextarea) finalTextarea.value = templates.final;
            if (closeTextarea) closeTextarea.value = templates.close;
            if (customUsernameInput) customUsernameInput.value = customUsername;

            // Save button handler
            const saveBtn = document.getElementById('ezc-save-btn');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    templates = {
                        initial: initialTextarea.value,
                        followUp: followUpTextarea.value,
                        final: finalTextarea.value,
                        close: closeTextarea.value
                    };
                    saveTemplates(templates);

                    customUsername = customUsernameInput.value.trim();
                    saveCustomUsername(customUsername);

                    showStatus('Templates and settings saved successfully!', 'success');
                });
            }

            // Reset button handler
            const resetBtn = document.getElementById('ezc-reset-btn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    if (confirm('Are you sure you want to reset all templates to defaults?')) {
                        templates = { ...DEFAULT_TEMPLATES };
                        saveTemplates(templates);
                        initialTextarea.value = templates.initial;
                        followUpTextarea.value = templates.followUp;
                        finalTextarea.value = templates.final;
                        closeTextarea.value = templates.close;
                        showStatus('Templates reset to defaults!', 'success');
                    }
                });
            }
        }, 100);

        function showStatus(message, type) {
            const statusDiv = document.getElementById('ezc-status');
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
            sdk = getWmeSdk({
                scriptId: SCRIPT_ID,
                scriptName: SCRIPT_NAME
            });

            console.log(`${SCRIPT_NAME}: SDK initialized`);

            // Wait for WME to be ready
            await sdk.Events.once({ eventName: 'wme-ready' });
            console.log(`${SCRIPT_NAME}: WME ready`);

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
            if (window.SDK_INITIALIZED) {
                window.SDK_INITIALIZED.then(init);
            } else {
                console.error(`${SCRIPT_NAME}: SDK not available`);
            }
        });
    } else {
        if (window.SDK_INITIALIZED) {
            window.SDK_INITIALIZED.then(init);
        } else {
            console.error(`${SCRIPT_NAME}: SDK not available`);
        }
    }
})();
