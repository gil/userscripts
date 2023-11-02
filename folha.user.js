// ==UserScript==
// @name        Baixa como ZIP - folha.com.br
// @namespace   Violentmonkey Scripts
// @match       https://acervo.folha.com.br/digital/leitor.do
// @grant       none
// @version     0.1
// @author      -
// @description 01/11/2023, 23:35:19
// @require     https://raw.githubusercontent.com/Stuk/jszip/main/dist/jszip.min.js
// @require     https://raw.githubusercontent.com/eligrey/FileSaver.js/master/dist/FileSaver.min.js
// ==/UserScript==

window.addEventListener('load', () => {

  document.body.insertAdjacentHTML('beforeend', `
    <div style="position: absolute; right: 0; top: 60px; z-index: 999; background: #ED1A3A; color: #FFF; padding: 20px;" data-downloader>
      <button>Baixar!</button>
    </div>
  `);

  const div = document.querySelector('[data-downloader]');
  div.querySelector('button').addEventListener('click', () => {
    updateProgress();
    start();
  })

  let processed = 0;
  let pages = [];

  function start() {
    const zip = new JSZip();
    const issue = document.querySelector('#filter-by-date').value;
    pages = Array.from(document.querySelectorAll('[data-zoom]')).map(img => img.dataset.zoom);

    pages.forEach((page, index) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', page, true);
      xhr.responseType = 'blob';
      xhr.onload = function () {
        const blob = new Blob([xhr.response]);//, { type : 'application/octet-stream' });
        const extension = page.split('.').at(-1);
        zip.file(`${ issue } - Pagina ${ String(index + 1).padStart(3, '0') }.${ extension }`, blob, { base64: true });
        processed++;
        updateProgress();

        if( processed === pages.length ) {
          zip.generateAsync({type:"blob"}).then(function(content) {
            saveAs(content, `${issue}.zip`);
          });
        }
      };
      xhr.send();
    });
  }

  function updateProgress() {
    div.innerHTML = `${ processed } de ${ pages.length }`;
  }

});
