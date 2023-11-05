// ==UserScript==
// @name        Baixa Páginas - folha.com.br
// @namespace   Violentmonkey Scripts
// @match       https://acervo.folha.com.br/*
// @grant       none
// @version     0.6
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

      <div>
        <select data-download-all-books>
          <option value="">Todos Cadernos</option>
        </select>
      </div>
      <button data-download-all>Baixar (ZIP)</button>
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
  const downloadAllBooksEl = divEl.querySelector('[data-download-all-books]');

  divEl.querySelector('[data-download-left]').addEventListener('click', () => downloadSingle(0));
  divEl.querySelector('[data-download-right]').addEventListener('click', () => downloadSingle(1));
  divEl.querySelector('[data-download-all]').addEventListener('click', downloadAll);
  divEl.querySelector('[data-search]').addEventListener('click', search);

  const issue = getIssue();
  readBookOptions();

  function downloadAll() {
    let pages = Array.from(document.querySelectorAll('[data-zoom]'));
    if( downloadAllBooksEl.value ) {
      pages = pages.filter(page => getBook(page) === downloadAllBooksEl.value);
    }
    downloadMany(pages, downloadAllBooksEl.value);
  }

  function downloadSingle(index) {
    const pages = document.querySelectorAll('.swiper-slide-active [data-zoom]');
    if( !pages[index] ) {
      return alert('Página não encontrada!');
    }
    fetchPage(pages[index])
      .then(({ blob, name }) => saveAs(blob, name));
  }

  function downloadMany(pages, book) {
    const zip = new JSZip();
    let processed = 0;
    updateProgress(processed, pages.length);

    pages.forEach((page, index) => {
      fetchPage(pages[index]).then(({ blob, name, issue }) => {
        zip.file(name, blob, { base64: true });
        processed++;
        updateProgress(processed, pages.length);

        if( processed === pages.length ) {
          zip.generateAsync({type:"blob"}).then(function(content) {
            saveAs(content, `${issue} - ${ book || 'Todos Cadernos' }.zip`);
          });
        }
      });
    });
  }

  function updateProgress(processed, total) {
    statusEl.innerText = `${ processed } de ${ total }`;
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

  function readBookOptions() {
    Array.from(document.querySelectorAll('.books[data-book]'))
      .forEach(book => {
        downloadAllBooksEl.insertAdjacentHTML('beforeend', `
          <option value="${ book.dataset.book }">${ book.dataset.book }</option>
        `);
      });
  }

  function search() {
    const dateFrom = new Date(+searchYearEl.value, searchMonthEl.value - 1, 1);
    const dateTo = new Date(+searchYearEl.value, searchMonthEl.value, 0);
    location.assign(`https://acervo.folha.com.br/busca.do?startDate=${ zeroPad(dateFrom.getDate(), 2) }%2F${ zeroPad(dateFrom.getMonth() + 1, 2) }%2F${ dateFrom.getFullYear() }&endDate=${ zeroPad(dateTo.getDate(), 2) }%2F${ zeroPad(dateTo.getMonth() + 1, 2) }%2F${ dateTo.getFullYear() }&periododesc=${ zeroPad(dateFrom.getDate(), 2) }%2F${ zeroPad(dateFrom.getMonth() + 1, 2) }%2F${ dateFrom.getFullYear() }+-+${ zeroPad(dateTo.getDate(), 2) }%2F${ zeroPad(dateTo.getMonth() + 1, 2) }%2F${ dateTo.getFullYear() }&page=1&por=Por+Per%C3%ADodo&sort=asc`);
  }

});
