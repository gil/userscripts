// ==UserScript==
// @name         Gemini: Always Pro
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Automatically switches Pro model on new chats, courtesy of Gemini itself :D
// @author       Gemini
// @match        https://gemini.google.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gemini.google.com
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  // --- CONFIGURATION ---
  // Change this to exactly what the Pro tier is called in your dropdown menu right now.
  // (e.g., "Gemini Advanced", "Gemini Pro", "1.5 Pro")
  const TARGET_MODEL_NAME = "Pro";

  let lastUrl = location.href;

  function clickProModel() {
    // Only trigger on completely new chats (usually ends with /app)
    // Existing chats have an ID appended, e.g., /app/a1b2c3d4
    if (!location.href.endsWith('/app')) return;

    // Step 1: Find the main dropdown button.
    // We look for a button that has a dropdown state but does NOT already show our target model.
    const allButtons = Array.from(document.querySelectorAll('button'));

    const dropdownBtn = allButtons.find(btn =>
      btn.hasAttribute('aria-expanded') &&
      !btn.textContent.includes(TARGET_MODEL_NAME) &&
      (btn.textContent.includes("Fast") || btn.textContent.includes("Thinking"))
    );

    if (dropdownBtn) {
      dropdownBtn.click(); // Open the menu

      // Step 2: Wait a tiny bit for the menu to render, then click the Pro option
      setTimeout(() => {
        // Look through all menu items for the target text
        const menuItems = Array.from(document.querySelectorAll('[role="menuitem"]'));
        const proOption = menuItems.find(item => item.textContent.includes(TARGET_MODEL_NAME));

        if (proOption) {
          proOption.click();
        } else {
          // Close the menu if we couldn't find the option to avoid messing up the UI
          document.body.click();
        }

        document.querySelector('rich-textarea .textarea').focus();
      }, 300); // 300ms delay to allow the menu animation to finish
    }
  }

  // Run on initial page load after a short delay to let the UI render
  setTimeout(clickProModel, 2000);

  // Watch for URL changes (since Gemini doesn't fully reload when clicking "New chat")
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      // If we navigated back to a blank new chat, try to switch the model
      if (url.endsWith('/app')) {
        setTimeout(clickProModel, 1000);
      }
    }
  }).observe(document, {subtree: true, childList: true});

})();
