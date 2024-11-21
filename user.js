// ==UserScript==
// @name         EZ Comments
// @namespace    http://tampermonkey.net/
// @version      2024-09-16
// @description  try to take over the world!
// @author       https://github.com/michaelrosstarr
// @match        https://www.waze.com/en-US/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=waze.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let modalOpen = false;
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
        "Dev": "December"
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
        const modal = document.querySelector('.mapUpdateRequest.panel.show');
        if (modal && !modalOpen) {
            console.log('Update Request modal is open');
            modalOpen = true;
            insertButton(modal);
        } else if (!modal && modalOpen) {
            console.log('Update Request modal is closed');
            modalOpen = false;
        }
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
        setTimeout(() => {
            const commentList = modal.querySelector('.conversation-view .comment-list');
            const newCommentForm = modal.querySelector('.conversation-view .new-comment-form');
            console.log(modal, commentList, newCommentForm);

            if (commentList && newCommentForm) {
                if (!modal.querySelector('.ez-comment-button')) {

                    const extracted = extractIssueDetails();

                    // First Button
                    const wzButton = document.createElement('wz-button');
                    wzButton.setAttribute('type', 'button');
                    wzButton.setAttribute('style', 'margin-bottom: 5px');
                    wzButton.setAttribute('disabled', 'false');
                    wzButton.classList.add('send-button', 'ez-comment-button');
                    wzButton.textContent = 'Initial';

                    commentList.parentNode.insertBefore(wzButton, newCommentForm);

                    wzButton.addEventListener('click', () => {
                        const wzTextarea = modal.querySelector('.new-comment-form wz-textarea');
                        if (wzTextarea) {
                            wzTextarea.setAttribute('value', firstMessage(extracted[0], extracted[1]));
                            wzTextarea.dispatchEvent(new Event('input'));
                        }
                    });

                    // Second Button
                    const followUp = document.createElement('wz-button');
                    followUp.setAttribute('type', 'button');
                    followUp.setAttribute('style', 'margin-bottom: 5px');
                    followUp.setAttribute('disabled', 'false');
                    followUp.classList.add('send-button', 'ez-comment-button');
                    followUp.textContent = 'Follow Up';
                    commentList.parentNode.insertBefore(followUp, newCommentForm);

                    followUp.addEventListener('click', () => {
                        const wzTextarea = modal.querySelector('.new-comment-form wz-textarea');
                        if (wzTextarea) {
                            wzTextarea.setAttribute('value', secondMessage(extracted[0], extracted[1]));
                            wzTextarea.dispatchEvent(new Event('input'));
                        }
                    });

                    // Third Button
                    const lastButton = document.createElement('wz-button');
                    lastButton.setAttribute('type', 'button');
                    lastButton.setAttribute('style', 'margin-bottom: 5px');
                    lastButton.setAttribute('disabled', 'false');
                    lastButton.classList.add('send-button', 'ez-comment-button');
                    lastButton.textContent = 'Final Follow UP';
                    commentList.parentNode.insertBefore(lastButton, newCommentForm);

                    lastButton.addEventListener('click', () => {
                        const wzTextarea = modal.querySelector('.new-comment-form wz-textarea');
                        if (wzTextarea) {
                            wzTextarea.setAttribute('value', thirdMessage(extracted[0], extracted[1]));
                            wzTextarea.dispatchEvent(new Event('input'));
                        }
                    });

                    // Close Button
                    const closeButton = document.createElement('wz-button');
                    closeButton.setAttribute('type', 'button');
                    closeButton.setAttribute('style', 'margin-bottom: 30px');
                    closeButton.setAttribute('disabled', 'false');
                    closeButton.classList.add('send-button', 'ez-comment-button');
                    closeButton.textContent = 'No Reply';
                    commentList.parentNode.insertBefore(closeButton, newCommentForm);

                    closeButton.addEventListener('click', () => {
                        const wzTextarea = modal.querySelector('.new-comment-form wz-textarea');
                        if (wzTextarea) {
                            wzTextarea.setAttribute('value', closeMessage(extracted[0], extracted[1]));
                            wzTextarea.dispatchEvent(new Event('input'));
                        }
                    });
                }
            } else {
                console.log('commentList or newCommentForm not found yet.');
            }
        }, 1000);

    }

    // Create a mutation observer to detect DOM changes
    const observer = new MutationObserver(() => {
        checkModal();
    });

    // Start observing the body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });


})();
