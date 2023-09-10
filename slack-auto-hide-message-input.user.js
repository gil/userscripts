// ==UserScript==
// @name         Slack: Auto hide message input
// @namespace    https://github.com/gil/userscripts
// @version      0.0.2
// @description  Message input only visible on hover to prevent accidental message
// @author       Andre Gil
// @match        https://app.slack.com/*
// @icon         https://www.google.com/s2/favicons?domain=slack.com
// @grant        GM.addStyle
// ==/UserScript==

GM.addStyle(`
  body:not(:hover) div[data-message-input="true"] {
    display: none;
  }
`);
