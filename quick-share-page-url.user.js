// ==UserScript==
// @name         Quick Share Page URL
// @namespace    https://github.com/gil/userscripts
// @version      0.1
// @description  Quick menu item do share the current page URL
// @author       Andre Gil
// @match        *://*/*
// @grant        GM.registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  GM.registerMenuCommand('Share Page URL', () => {
    const shareBtn = document.createElement('button');
    shareBtn.innerText = 'Share Page URL';
    shareBtn.style.cssText =
      'position: fixed; top: 0; left:0; right: 0; height: 200px; font-size: 40px; background: #333; z-index: 9999; cursor: pointer;';
    document.body.appendChild(shareBtn);

    shareBtn.addEventListener('click', async () => {
      shareBtn.parentNode.removeChild(shareBtn);
      if (navigator.share) {
        try {
          await navigator.share({
            title: document.title,
            url: window.location.href,
          });
        } catch (error) {
          alert('-- Error --\n' + error);
        }
      } else {
        alert('Web Share API is not supported in this browser.');
      }
    });
  });
})();

