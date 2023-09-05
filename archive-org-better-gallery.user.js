// ==UserScript==
// @name         Archive.org better gallery
// @namespace    https://github.com/gil/userscripts
// @version      0.1
// @description  Kill that ugly carousel and turn it into a simple side-by-side image gallery.
// @author       Andre Gil
// @match        https://archive.org/details/*
// @icon         https://www.google.com/s2/favicons?domain=archive.org
// @grant        none
// ==/UserScript==

const theatreWrapper = document.querySelector('#theatre-ia-wrap');
const wrapper = document.querySelector('.details-carousel-wrapper');
const imgs = document.querySelectorAll('.carousel-image');

if( theatreWrapper && wrapper && imgs ) {
  theatreWrapper.style.height = '80vh';
  wrapper.innerHTML = '';

  imgs.forEach(i => {
    wrapper.appendChild(i);

    if( !i.src ) {
      i.src = i.dataset.lazySrc;
    }

    i.style.cssText = `
      max-width: 48%;
      max-height: 48%;
      margin: 1%;
      object-fit: contain;
    `;
  });

  wrapper.style.cssText = `
    overflow: auto;
    justify-content: center;
    flex-direction: initial;
    flex-wrap: wrap;
  `;
}
