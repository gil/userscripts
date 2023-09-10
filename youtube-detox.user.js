// ==UserScript==
// @name         YouTube Detox
// @namespace    https://github.com/gil/userscripts
// @version      0.0.2
// @description  Remove a bunch of stuff to make YouTube less addictive and distracting
// @author       Andre Gil
// @match        https://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?domain=youtube.com
// @grant        GM.addStyle
// ==/UserScript==

GM.addStyle(`
  /* Cards */
  .ytp-ce-element,

  /* Endscreen */
  .html5-endscreen:not(.mweb-endscreen),

  /* Feed */
  ytd-browse[page-subtype="home"] .ytd-rich-grid-renderer,
  ytd-browse[role="main"]:not([page-subtype]) .ytd-rich-grid-renderer,

  /* Recommended */
  #items.ytd-watch-next-secondary-results-renderer,
  .ytp-pause-overlay,

  /* Chat */
  ytd-live-chat-frame#chat,

  /* Search */
  #primary>.ytd-two-column-search-results-renderer ytd-shelf-renderer, /* people also watched, for you, previously watched, etc */

  /* Sidebar */
  .yt-simple-endpoint[title="Home"],
  .yt-simple-endpoint[title="Shorts"],
  .yt-simple-endpoint[href^="/feed/explore"],
  .yt-simple-endpoint[href^="/feed/trending"],
  #sections>ytd-guide-section-renderer:nth-child(3), /* explore */
  #sections>ytd-guide-section-renderer:nth-child(4), /* more from youtube */
  ytd-browse[page-subtype="trending"],

  /* Other */
  #masthead-ad.ytd-rich-grid-renderer.style-scope,
  div#home-page-skeleton {
    display: none !important;
    /* Debug -> background-color: rgba(255,0,0,.3) !important; */
  }

  /* Fade out shorts */
  a.ytd-thumbnail[href*="/shorts/"] {
    opacity: 0.2;
  }
`);

const debounce = (callback, wait) => {
  let timeoutId = null;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, wait);
  };
}

function goToSubscriptionsIfNeeded() {
  if (window.location.pathname === '/') {
    window.location.replace('/feed/subscriptions');
  }
}

const pageManager = document.getElementById('page-manager');
if( pageManager ) {
  const observer = new MutationObserver(debounce(goToSubscriptionsIfNeeded, 500));
  observer.observe(pageManager, { childList: true });
}

goToSubscriptionsIfNeeded();
