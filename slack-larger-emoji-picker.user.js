// ==UserScript==
// @name         Slack: Larger emoji picker
// @namespace    https://github.com/gil/userscripts
// @version      0.0.1
// @description  How am I supposed to pick such small emojis?
// @author       Andre Gil
// @match        https://app.slack.com/*
// @icon         https://www.google.com/s2/favicons?domain=slack.com
// @grant        GM.addStyle
// ==/UserScript==

GM.addStyle(`
  div[aria-label="Emoji picker"] {
    zoom: 1.5;
  }
`);
