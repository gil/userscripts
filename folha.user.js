// ==UserScript==
// @name        Baixa Páginas - folha.com.br
// @namespace   Violentmonkey Scripts
// @match       https://acervo.folha.com.br/*
// @grant       none
// @version     0.5
// @author      -
// @description 01/11/2023, 23:35:19
// @require     https://raw.githubusercontent.com/Stuk/jszip/main/dist/jszip.min.js
// @require     https://raw.githubusercontent.com/eligrey/FileSaver.js/master/dist/FileSaver.min.js
// ==/UserScript==

window.addEventListener('load', () => {

  document.body.insertAdjacentHTML('beforeend', `
    <div style="position: absolute; right: 0; top: 60px; z-index: 999; background: #ED1A3A; color: #FFF; padding: 20px;" data-downloader>
      <h3 style="margin: 10px 0;">Baixar</h3>
      <button data-download-left>Esquerda</button>
      <button data-download-right>Direita</button>
      <hr/>
      <button data-download-all>Baixar tudo (ZIP)</button>
      <div data-download-all-status></div>

      <h3 style="margin: 10px 0;">Buscar</h3>
      <input data-search-month type="number" style="width: 40px; font-size: 13px;" value="12" />
      <input data-search-year type="number" style="width: 60px; font-size: 13px;" value="1959" />
      <button data-search>Busca</button>
    </div>
  `);

  const divEl = document.querySelector('[data-downloader]');
  const statusEl = divEl.querySelector('[data-download-all-status]');
  const searchMonthEl = divEl.querySelector('[data-search-month]');
  const searchYearEl = divEl.querySelector('[data-search-year]');

  divEl.querySelector('[data-download-left]').addEventListener('click', () => downloadSingle(0));
  divEl.querySelector('[data-download-right]').addEventListener('click', () => downloadSingle(1));
  divEl.querySelector('[data-download-all]').addEventListener('click', () => {
    updateProgress();
    downloadAll();
  });
  divEl.querySelector('[data-search]').addEventListener('click', search);

  function downloadSingle(index) {
    const pages = document.querySelectorAll('.swiper-slide-active [data-zoom]');
    if( !pages[index] ) {
      return alert('Página não encontrada!');
    }
    fetchPage(pages[index])
      .then(({ blob, name }) => saveAs(blob, name));
  }

  const issue = getIssue();
  let processed = 0;
  let pages = [];

  function downloadAll() {
    const zip = new JSZip();
    pages = document.querySelectorAll('[data-zoom]');

    pages.forEach((page, index) => {
      fetchPage(pages[index]).then(({ blob, name, issue }) => {
        zip.file(name, blob, { base64: true });
        processed++;
        updateProgress();

        if( processed === pages.length ) {
          zip.generateAsync({type:"blob"}).then(function(content) {
            saveAs(content, `${issue}.zip`);
          });
        }
      });
    });
  }

  function updateProgress() {
    statusEl.innerText = `${ processed } de ${ pages.length }`;
  }

  function fetchPage(page) {
    return new Promise(resolve => {
      const xhr = new XMLHttpRequest();

      const extension = page.dataset.zoom.split('.').at(-1);
      const name = `${ issue } - ${ getBook(page) } ${ zeroPad(page.dataset.label, 3) } [ID ${ page.dataset.id }].${ extension }`;

      xhr.open('GET', page.dataset.zoom, true);
      xhr.responseType = 'blob';
      xhr.onload = function () {
        const blob = new Blob([xhr.response], { type : 'application/octet-stream' });
        resolve({ blob, name, issue });
      };
      xhr.send();
    });
  }

  function getBook(page) {
    const booksEl = page.closest('[data-book]');
    const books = booksEl.dataset.book.split(', ');
    const pages = Array.from(booksEl.querySelectorAll('[data-zoom]'));
    const index = pages.indexOf(page);
    return books[index];
  }

  function getIssue() {
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const dateEl = document.querySelector('#filter-by-date');
    if( !dateEl ) {
      return '';
    }
    const date = dateEl.value.split('.');
    return `${ date[2] }-${ zeroPad(months.indexOf(date[1]) + 1, 2) }-${ zeroPad(date[0], 2) }`;
  }

  function zeroPad(number, count) {
    return String(number).padStart(count, '0');
  }

  function search() {
    const dateFrom = new Date(+searchYearEl.value, searchMonthEl.value - 1, 1);
    const dateTo = new Date(+searchYearEl.value, searchMonthEl.value, 0);
    location.assign(`https://acervo.folha.com.br/busca.do?startDate=${ zeroPad(dateFrom.getDate(), 2) }%2F${ zeroPad(dateFrom.getMonth() + 1, 2) }%2F${ dateFrom.getFullYear() }&endDate=${ zeroPad(dateTo.getDate(), 2) }%2F${ zeroPad(dateTo.getMonth() + 1, 2) }%2F${ dateTo.getFullYear() }&periododesc=${ zeroPad(dateFrom.getDate(), 2) }%2F${ zeroPad(dateFrom.getMonth() + 1, 2) }%2F${ dateFrom.getFullYear() }+-+${ zeroPad(dateTo.getDate(), 2) }%2F${ zeroPad(dateTo.getMonth() + 1, 2) }%2F${ dateTo.getFullYear() }&page=1&por=Por+Per%C3%ADodo&sort=asc`);
  }

});
