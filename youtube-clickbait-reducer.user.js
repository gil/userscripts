// ==UserScript==
// @name         YouTube Clickbait Reducer
// @namespace    https://github.com/gil/userscripts
// @version      0.0.2
// @description  Replace thumbnails with a video frame and titles not all caps.
// @author       Andre Gil
// @match        https://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?domain=youtube.com
// @grant        GM.addStyle
// ==/UserScript==

//
// Inspired by and some parts borrowed from:
// https://github.com/pietervanheijningen/clickbait-remover-for-youtube
//
// This will probably never work as well as this extension. So if you can, use it instead :]
//

const PREFERRED_THUMB = 'hq2';
const URL_MATCH = 'https://i.ytimg.com/(vi|vi_webp)/.*/(hq1|hq2|hq3|hqdefault|mqdefault|hq720|maxresdefault)(_custom_[0-9]+)?.(jpg|webp)?.*';
const REPLACE_REGEX = /(hq1|hq2|hq3|hqdefault|mqdefault|hq720|maxresdefault)(_custom_[0-9]+)?.(jpg|webp)/;
const REPLACE_WITH = `${ PREFERRED_THUMB }.$3`;

GM.addStyle(`
  /* Don't truncate titles */
  #video-title {
    max-height: none !important;
  }

  /* Fix title case */
  #video-title,
  .ytp-videowall-still-info-title,
  .large-media-item-metadata > a > h3 > span,
  .media-item-metadata > a > h3 > span,
  .compact-media-item-headline > span {
    text-transform: lowercase;
    display: block !important;
  }

  #video-title::first-line,
  .ytp-videowall-still-info-title::first-line,
  .large-media-item-metadata > a > h3 > span::first-line,
  .media-item-metadata > a > h3 > span::first-line,
  .compact-media-item-headline > span::first-line {
    text-transform: capitalize;
  }
`);

function updateThumbnails() {
  [...document.querySelectorAll(`img[src^="https://i.ytimg.com"]:not([src*="/${ PREFERRED_THUMB }."])`)]
    .filter(img => img.src.match(URL_MATCH))
    .forEach(img => img.src = img.src.replace(REPLACE_REGEX, REPLACE_WITH));

  [...document.querySelectorAll(`:is(.ytp-videowall-still-image, .iv-card-image, .ytp-cued-thumbnail-overlay-image)[style*="https://i.ytimg.com"]:not([style*="/${ PREFERRED_THUMB }."])`)]
    .filter(el => el.getAttribute('style').match(`.*${ URL_MATCH }`))
    .forEach(el => el.style = el.getAttribute('style').replace(REPLACE_REGEX, REPLACE_WITH));
}

const callAndWait = (callback, wait) => {
  let waiting = false;
  return (...args) => {
    if( !waiting ) {
      callback(...args);
      waiting = true;
      setTimeout(() => waiting = false, wait);
    }
  };
};

const observer = new MutationObserver(
  callAndWait(() => {
    updateThumbnails();
    observe();
  }, 500),
);

function observe() {
  observer.disconnect();
  const pageManager = document.getElementById('page-manager');
  if (pageManager) {
    observer.observe(pageManager, { childList: true, subtree: true, attributeFilter: ['src'] });
  }
}

window.addEventListener('load', () => {
  updateThumbnails();
  observe();
});

