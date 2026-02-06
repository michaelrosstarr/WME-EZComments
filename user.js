// ==UserScript==
// @name         EZ Comments
// @namespace    http://tampermonkey.net/
// @version      2025-03-27
// @description  try to take over the world!
// @author       https://github.com/michaelrosstarr
// @match        https://www.waze.com/en-US/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=waze.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let modalOpen = false;
    let currentIssueId = null; // Track current issue ID
    const dates = {
        "Jan": "January",
        "Feb": "Feburary",
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
    }

    function firstMessage(type, date) {
        date = date.split(' ');
        return `Hi, Waze volunteers responding to your "${type}" issue that you reported on ${dates[date[1]]} ${date[2]}, ${date[3]}.

Can you please give us some additional information? Waze gives us very little to work off of so it would be greatly appreciated if you could help us out.

Please reply using the Waze app and not emails, the report system does not work with replying to the email.

~ BushmanZA

*Open to any editor*`
    }

    function secondMessage(type, date) {
        date = date.split(' ');
        return `Hi, we haven't heard back from you about the "${type}" issue you reported on ${dates[date[1]]} ${date[2]}, ${date[3]}.

Please help us to make the Waze better for all users. Please respond using the Waze app, emails don't work with the reporting system.

~ BushmanZA

*Open to any editor*`
    }

    function thirdMessage(type, date) {
        date = date.split(' ');
        return `Hi, we haven't heard back from you about your "${type}" issue that you reported on ${dates[date[1]]} ${date[2]}, ${date[3]}.

If we don't hear from you soon, we will assume that this is no longer and issue and close the report. Please reply using the Waze app and not emails, the report system does not work with replying to the email.

~ BushmanZA

*Open to any editor*`
    }

    function closeMessage(type, date) {
        return `Hi, since we haven't heard back from you, we are going to close this issue. If you come across across any other issues, please feel free to report it again via the Waze app.

 ~BushmanZA`
    }

    function checkModal() {
        // Update selector to focus ONLY on mapUpdateRequest class
        const modal = document.querySelector('.mapUpdateRequest');

        if (modal) {
            console.log('Update Request modal is open');

            // Get a unique identifier for the current issue
            const newIssueId = getIssueIdentifier(modal);

            // Check if this is a new issue or first time seeing panel
            const isNewIssue = (newIssueId !== currentIssueId);

            if (!modalOpen || isNewIssue) {
                console.log(isNewIssue ? 'Content changed to new issue' : 'Panel newly opened');
                modalOpen = true;
                currentIssueId = newIssueId;

                // For new issues or first-time opens, we should insert buttons
                insertButton(modal);
            } else if (!modal.querySelector('.ez-comment-button')) {
                // If buttons aren't there (regardless of issue ID), try to insert them
                console.log('Buttons not found, adding them...');
                insertButton(modal);
            }
        } else if (modalOpen) {
            console.log('Update Request modal is closed');
            modalOpen = false;
            currentIssueId = null;
        }
    }

    // Get a unique identifier for the current issue
    function getIssueIdentifier(modal) {
        // Try to find an ID or other unique identifier in the panel
        const idElement = modal.querySelector('.issue-id');
        if (idElement) {
            return idElement.textContent.trim();
        }

        // Fallback: use a combination of title and date
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
        console.log('Attempting to insert buttons to modal:', modal);

        const commentList = modal.querySelector('.conversation-view .comment-list');
        const newCommentForm = modal.querySelector('.conversation-view .new-comment-form');

        if (!commentList || !newCommentForm) {
            console.log('Required elements not found, will retry on next check');
            return;
        }

        if (modal.querySelector('.ez-comment-button')) {
            console.log('Buttons already exist in the modal');
            return;
        }

        try {
            const extracted = extractIssueDetails();
            console.log('Extracted issue details:', extracted);

            // Create buttons with a consistent approach
            const createButton = (text, messageFunction, marginBottom = '5px') => {
                const button = document.createElement('wz-button');
                button.setAttribute('type', 'button');
                button.setAttribute('style', `margin-bottom: ${marginBottom}`);
                button.setAttribute('disabled', 'false');
                button.setAttribute('data-ez-comment-type', text.toLowerCase().replace(/\s+/g, '-'));
                button.classList.add('send-button', 'ez-comment-button');
                button.textContent = text;
                button.id = 'ez-comment-' + text.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(); // Unique ID

                button.addEventListener('mousedown', () => {
                    const wzTextarea = modal.querySelector('.new-comment-form wz-textarea');
                    if (wzTextarea) {
                        wzTextarea.setAttribute('value', messageFunction(extracted[0], extracted[1]));
                        wzTextarea.dispatchEvent(new Event('input'));
                    }
                });

                return button;
            };

            // First Button
            const initialButton = createButton('Initial', firstMessage);
            commentList.parentNode.insertBefore(initialButton, newCommentForm);

            // Second Button
            const followUpButton = createButton('Follow Up', secondMessage);
            commentList.parentNode.insertBefore(followUpButton, newCommentForm);

            // Third Button
            const finalButton = createButton('Final Follow Up', thirdMessage);
            commentList.parentNode.insertBefore(finalButton, newCommentForm);

            // Close Button
            const closeButton = createButton('No Reply', closeMessage, '30px');
            commentList.parentNode.insertBefore(closeButton, newCommentForm);

            console.log('Successfully inserted all buttons');
        } catch (error) {
            console.error('Error inserting buttons:', error);
        }
    }

    // Direct panel detection that also watches for content changes
    function setupDirectPanelDetection() {
        console.log('Setting up panel detection for mapUpdateRequest panels');

        // First observer - watch for panel additions to the DOM
        const panelObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const addedNode = mutation.addedNodes[i];

                    if (addedNode.nodeType === Node.ELEMENT_NODE) {
                        // Check if this is the mapUpdateRequest element or contains it
                        // Updated to check ONLY for the mapUpdateRequest class
                        const mapRequestPanel = addedNode.classList &&
                            addedNode.classList.contains('mapUpdateRequest') ?
                            addedNode :
                            addedNode.querySelector('.mapUpdateRequest');

                        if (mapRequestPanel) {
                            console.log('mapUpdateRequest panel found in DOM changes');
                            checkModal(); // Use checkModal to handle all the logic
                        }
                    }
                }
            });
        });

        // Second observer - watch for content changes inside an already open panel
        const contentObserver = new MutationObserver(() => {
            const modal = document.querySelector('.mapUpdateRequest');
            if (modal) {
                const newIssueId = getIssueIdentifier(modal);

                // If the issue ID changed, we have a new request in the panel
                if (newIssueId !== currentIssueId) {
                    console.log('Issue content changed in panel:', newIssueId);
                    currentIssueId = newIssueId;
                    insertButton(modal);
                }
            }
        });

        // Observe the entire document for panel additions
        panelObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Set up a timer to regularly check for the panel and also watch for content changes
        const checkAndObserveContent = () => {
            const modal = document.querySelector('.mapUpdateRequest');

            // Always do the basic check
            checkModal();

            // If panel exists, make sure we're observing its content for changes
            if (modal) {
                // Disconnect and reconnect to ensure we're watching the current panel
                contentObserver.disconnect();
                contentObserver.observe(modal, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
            }
        };

        // Run the check/observe cycle every second
        setInterval(checkAndObserveContent, 1000);

        // Initial check
        checkAndObserveContent();
    }

    // Set up script when the page is ready
    if (document.readyState === 'complete') {
        setupDirectPanelDetection();
    } else {
        window.addEventListener('load', setupDirectPanelDetection);
    }
})();
