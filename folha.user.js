// ==UserScript==
// @name        Baixa Páginas - folha.com.br
// @namespace   Violentmonkey Scripts
// @match       https://acervo.folha.com.br/*
// @grant       none
// @version     0.9
// @author      -
// @description 01/11/2023, 23:35:19
// @require     https://raw.githubusercontent.com/Stuk/jszip/main/dist/jszip.min.js
// @require     https://raw.githubusercontent.com/eligrey/FileSaver.js/master/dist/FileSaver.min.js
// ==/UserScript==

window.addEventListener('load', () => {

  document.body.insertAdjacentHTML('beforeEnd', `
    <div style="position: absolute; right: 0; top: 60px; z-index: 999; background: #ED1A3A; color: #FFF; padding: 20px;" data-downloader>
      <div data-collapsible-container>
        <h3 style="margin: 10px 0;">Baixar</h3>
        <button data-download-left>(E)squerda</button>
        <button data-download-right>(D)ireita</button>

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

        <div style="margin-top: 10px;">
          <select data-search-issues>
            <option value="">Abrir edição</option>
          </select>
          <div>
            <button data-previous-issue>Anterior (⬆)</button>
            <button data-next-issue>Próxima (⬇)</button>
          </div>
        </div>
      </div>
    </div>
  `);

  const divEl = document.querySelector('[data-downloader]');
  const collapsibleContainerEl = divEl.querySelector('[data-collapsible-container]');
  const statusEl = divEl.querySelector('[data-download-all-status]');
  const searchMonthEl = divEl.querySelector('[data-search-month]');
  const searchYearEl = divEl.querySelector('[data-search-year]');
  const downloadAllBooksEl = divEl.querySelector('[data-download-all-books]');

  divEl.querySelector('[data-download-left]').addEventListener('click', () => downloadSingle(0));
  divEl.querySelector('[data-download-right]').addEventListener('click', () => downloadSingle(1));
  divEl.querySelector('[data-download-all]').addEventListener('click', downloadAll);

  window.addEventListener('keyup', event => {
    if( event.keyCode === 69 ) { // e
      downloadSingle(0);
    } else if( event.keyCode === 68 ) { // d
      downloadSingle(1);
    } else if( event.keyCode === 38 ) { // up arrow
      previousIssue();
    } else if( event.keyCode === 40 ) { // down arrow
      nextIssue();
    }
  });

  function isLargeDisplay() {
    return window.matchMedia('(min-width: 768px)').matches;
  }

  if( !isLargeDisplay() ) {
    divEl.style.top = '0';
    divEl.style.padding = '10px';
    collapsibleContainerEl.style.display = 'none';
  }

  const issue = getIssue();
  renderIssue();

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

  function getIssueDate() {
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const dateEl = document.querySelector('#filter-by-date');
    if( !dateEl ) {
      return null;
    }
    const dateParts = dateEl.value.split('.');
    return new Date(dateParts[2], months.indexOf(dateParts[1]), dateParts[0]);
  }

  function getIssue() {
    const date = getIssueDate();
    if( !date ) {
      return '';
    }
    const weekName = date.toLocaleString('pt-BR', {  weekday: 'long' }).split('-')[0];
    return `${ date.getFullYear() }-${ zeroPad(date.getMonth() + 1, 2) }-${ zeroPad(date.getDate(), 2) } (${ weekName })`;
  }

  function renderIssue() {
    divEl.insertAdjacentHTML('afterBegin', `
      <h2 style="margin: 0; cursor: pointer;">${ isLargeDisplay() ? issue + ' ▴' : '▾' }</h2>
    `);
    const el = divEl.querySelector('h2');
    el.addEventListener('click', () => {
      const isCollapsed = collapsibleContainerEl.style.display === 'none';
      collapsibleContainerEl.style.display = isCollapsed ? 'block' : 'none';
      el.innerHTML = isCollapsed ? issue + ' ▴' : '▾';
    })
  }

  function zeroPad(number, count) {
    return String(number).padStart(count, '0');
  }

  function renderBookOptions() {
    const books = Array.from(document.querySelectorAll('.books[data-book]'));
    books.forEach(book => {
      downloadAllBooksEl.insertAdjacentHTML('beforeEnd', `
        <option value="${ book.dataset.book }">${ book.dataset.book }</option>
      `);
    });
    return books;
  }

  function booksObserverCallback() {
      const bookCount = renderBookOptions().length;
      if( bookCount > 0 ) {
        booksObserver.disconnect();
        return true;
      }
  }

  const booksObserver = new MutationObserver(booksObserverCallback);

  if( !booksObserverCallback() ) {
    const booksWrapperEl = document.querySelector('.pages.navigation-view .swiper-wrapper.wrapper');
    booksWrapperEl && booksObserver.observe(booksWrapperEl, { childList: true });
  }

  ////////////////
  // Issue search and navigation
  ///////////

  const searchIssuesEl = divEl.querySelector('[data-search-issues]');
  const previousIssueEl = divEl.querySelector('[data-previous-issue]');
  const nextIssueEl = divEl.querySelector('[data-next-issue]');

  divEl.querySelector('[data-search]').addEventListener('click', search);
  previousIssueEl.addEventListener('click', previousIssue);
  nextIssueEl.addEventListener('click', nextIssue);

  searchIssuesEl.addEventListener('change', () => {
    if( searchIssuesEl.value ) {
      location.assign(searchIssuesEl.value);
    }
  });

  function setSearchDateFromCurrentIssue() {
    const currentIssueDate = getIssueDate();
    if( currentIssueDate ) {
      searchYearEl.value = currentIssueDate.getFullYear();
      searchMonthEl.value = currentIssueDate.getMonth() + 1;
    }
  }

  function getSearchUrl(year, month, page) {
    const dateFrom = new Date(year, month - 1, 1);
    const dateTo = new Date(year, month, 0);
    return `https://acervo.folha.com.br/busca.do?startDate=${ zeroPad(dateFrom.getDate(), 2) }%2F${ zeroPad(dateFrom.getMonth() + 1, 2) }%2F${ dateFrom.getFullYear() }&endDate=${ zeroPad(dateTo.getDate(), 2) }%2F${ zeroPad(dateTo.getMonth() + 1, 2) }%2F${ dateTo.getFullYear() }&periododesc=${ zeroPad(dateFrom.getDate(), 2) }%2F${ zeroPad(dateFrom.getMonth() + 1, 2) }%2F${ dateFrom.getFullYear() }+-+${ zeroPad(dateTo.getDate(), 2) }%2F${ zeroPad(dateTo.getMonth() + 1, 2) }%2F${ dateTo.getFullYear() }&page=${ page || 1 }&por=Por+Per%C3%ADodo&sort=asc`;
  }

  function search() {
    const url = getSearchUrl(+searchYearEl.value, searchMonthEl.value);
    location.assign(url);
  }

  function getCurrentIssueNumber() {
    const params = new URLSearchParams(window.location.search);
    return params.get('numero');
  }

  function fetchAndRenderIssues() {
    const currentIssueNumber = getCurrentIssueNumber();
    const page1 = getSearchUrl(+searchYearEl.value, searchMonthEl.value, 1);
    const page2 = getSearchUrl(+searchYearEl.value, searchMonthEl.value, 2);
    const page3 = getSearchUrl(+searchYearEl.value, searchMonthEl.value, 3);

    Promise.all([
      fetch(page1),
      fetch(page2),
      fetch(page3)
    ])
      .then(responses => Promise.all(responses.map(response => response.text())))
      .then(htmls => {
        htmls.forEach(html => {
          // Read issues
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const results = Array.from(doc.querySelectorAll('.results .edition'))
            .map(edition => ({
              label: edition.innerText.trim().replace(/\s{2,}|\n/, ' ').replace('�', 'º'),
              link: edition.getAttribute('href') + '&maxTouch=0',
            }));

          // Render issues
          results.forEach(result => {
            const isCurrent = result.link.includes(`?numero=${ currentIssueNumber }&`);
            searchIssuesEl.insertAdjacentHTML('beforeEnd', `
              <option value="${ result.link }" ${ isCurrent ? 'selected' : '' }>${ result.label }</option>
            `);
          });
        });
      })
      .catch(err => {
        alert('Erro ao listar edições :( Tente atualizar a página.');
      });
  }

  function previousIssue() {
    const previousIssueEl = searchIssuesEl.querySelector('option[selected]').previousElementSibling;
    if( previousIssueEl && previousIssueEl.value ) {
      location.assign(previousIssueEl.value);
    }
  }

  function nextIssue() {
    const nextIssueEl = searchIssuesEl.querySelector('option[selected]').nextElementSibling;
    if( nextIssueEl && nextIssueEl.value ) {
      location.assign(nextIssueEl.value);
    }
  }

  setSearchDateFromCurrentIssue();
  fetchAndRenderIssues();

});
