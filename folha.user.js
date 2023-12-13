// ==UserScript==
// @name        Baixa Páginas - folha.com.br
// @namespace   Violentmonkey Scripts
// @match       https://acervo.folha.com.br/*
// @grant       none
// @version     0.18
// @author      -
// @description 01/11/2023, 23:35:19
// @require     https://raw.githubusercontent.com/Stuk/jszip/main/dist/jszip.min.js
// @require     https://raw.githubusercontent.com/eligrey/FileSaver.js/master/dist/FileSaver.min.js
// ==/UserScript==

const VERSION = 0.18;

window.addEventListener('load', () => {

  document.body.insertAdjacentHTML('beforeEnd', `
    <div style="position: absolute; right: 0; top: 60px; z-index: 999; background: #ED1A3A; color: #FFF; padding: 20px;" data-downloader>
      <div data-collapsible-container>
        <h3 style="margin: 10px 0;">Baixar</h3>
        <button data-download-left>(E)squerda</button>
        <button data-download-right>(D)ireita</button>
        <div data-download-status></div>

        <hr/>

        <div>
          <select data-download-all-books>
            <option value="">Todos Cadernos</option>
          </select>
        </div>
        <button data-download-all>Baixar (Z)IP</button>
        <button data-download-auto>Auto</button>
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
        <small>v${ VERSION }</small>
      </div>
    </div>
  `);

  const DOWNLOAD_MANY_TIMEOUT = 1000 * 60 * 1; // 1 min
  const divEl = document.querySelector('[data-downloader]');
  const collapsibleContainerEl = divEl.querySelector('[data-collapsible-container]');
  const statusEl = divEl.querySelector('[data-download-all-status]');
  const singleStatusEl = divEl.querySelector('[data-download-status]');
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
    } else if( event.keyCode === 90 ) { // z
      downloadAll();
    } else if( event.keyCode === 70 ) { // f
      downloadFolhinha();
    } else if( event.keyCode === 76 && !event.shiftKey ) { // l
      showLogs();
    } else if( event.keyCode === 76 && event.shiftKey ) { // shift+l
      removeLogs();
    } else if( event.keyCode === 38 ) { // up arrow
      previousIssue();
    } else if( event.keyCode === 40 ) { // down arrow
      nextIssue();
    }
    console.log(event.keyCode)
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
    let waitInterval = setInterval(() => {
      let pages = Array.from(document.querySelectorAll('[data-zoom]'));
      if( downloadAllBooksEl.value ) {
        pages = pages.filter(page => getBook(page) === downloadAllBooksEl.value);
      }

      if( pages.length ) {
        clearInterval(waitInterval);
        downloadMany(pages, downloadAllBooksEl.value);
        //downloadAria2cLog(pages, downloadAllBooksEl.value);
      }
    }, 500);
  }

  function downloadSingle(index) {
    const pages = document.querySelectorAll('.swiper-slide-active [data-zoom]');
    if( !pages[index] ) {
      return alert('Página não encontrada!');
    }
    singleStatusEl.innerText = 'Aguarde...';
    fetchPage(pages[index])
      .then(({ blob, name }) => saveAs(blob, name))
      .then(() => singleStatusEl.innerText = '');
  }

  function downloadMany(pages, book) {
    const zip = new JSZip();
    const timeout = setTimeout(location.reload.bind(location), DOWNLOAD_MANY_TIMEOUT);
    const errors = [];
    let processed = 0;
    updateProgress(processed, pages.length);

    pages.forEach((page, index) => {
      queuedPromise(() => fetchPage(pages[index]))
        .then(({ blob, name }) => {
          zip.file(name, blob, { base64: true });
        })
        .catch(() => errors.push(page.dataset.zoom))
        .finally(() => {
          processed++;
          updateProgress(processed, pages.length);

          if( processed === pages.length ) {
            clearTimeout(timeout);
            zip.generateAsync({type:'blob'}).then(function(content) {
              const currentIssueEl = getCurrentIssueEl();
              const bookPart = book || ( currentIssueEl ? currentIssueEl.innerText.substr(11) : 'Todos Cadernos' );
              const fullName = `${ issue } - ${ bookPart }`;
              saveAs(content, `${ fullName }.zip`);
              logDownloads(pages, errors, fullName);

              setTimeout(autoPilotNext, 3000);
            });
          }
        });
    });
  }

  function downloadAria2cLog(pages, book) {
    let log = '';
    const currentIssueEl = getCurrentIssueEl();
    const bookPart = book || ( currentIssueEl ? currentIssueEl.innerText.substr(11) : 'Todos Cadernos' );
    const fullName = `${ issue } - ${ bookPart }`;

    pages.forEach((page, index) => {
      const extension = page.dataset.zoom.split('.').at(-1);
      const name = `${ zeroPad(index + 1, 3) } - ${ issue } - ${ getBook(page) } ${ zeroPad(page.dataset.label, 3) } [ID ${ page.dataset.id }].${ extension }`;
      log += `${page.dataset.zoom}\n`;
      log += `  out=${ name }\n`;
      log += `  dir=${ fullName }\n`;
    });

    const logBlob = new Blob([log], {type: 'text/plain;charset=utf-8'});
    saveAs(logBlob, `${ fullName }.a2c.txt`);

    console.log(log);
    setTimeout(autoPilotNext, 1000);
  }

  function downloadFolhinha() {
    downloadAllBooksEl.value = 'Folhinha';
    if( downloadAllBooksEl.value ) {
      downloadAll();
    }
  }

  function updateProgress(processed, total) {
    statusEl.innerText = `${ processed } de ${ total }`;
  }

  function fetchPage(page) {
    const extension = page.dataset.zoom.split('.').at(-1);
    const name = `${ issue } - ${ getBook(page) } ${ zeroPad(page.dataset.label, 3) } [ID ${ page.dataset.id }].${ extension }`;

    return fetch(page.dataset.zoom)
      .then(response => response.blob())
      .then(blob => new Blob([blob], { type : 'application/octet-stream' })) // without this, mobile firefox downloads as HTML
      .then(blob => ({ blob, name }));
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

    return Promise.all([
      fetch(page1),
      fetch(page2),
      fetch(page3)
    ])
      .then(responses => Promise.all(responses.map(response => response.text())))
      .then(htmls => {
        const allIssues = [];

        htmls.forEach(html => {
          // Read issues
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const results = Array.from(doc.querySelectorAll('.results .edition'))
            .map(edition => ({
              label: edition.innerText.trim().replace(/\s{2,}|\n/, ' ').replace('�', 'o.'),
              link: (edition.getAttribute('href') + '&maxTouch=0').replace(/&anchor=\d+/, ''),
            }));

          allIssues.push(...results);
        });

        if( allIssues.length > 0 ) {
          // Render issues
          allIssues
            .filter((edition, index, array) => array.findIndex(e => e.link === edition.link) === index) // remove duplicate links
            .forEach(result => {
              const isCurrent = result.link.includes(`?numero=${ currentIssueNumber }&`);
              searchIssuesEl.insertAdjacentHTML('beforeEnd', `
                <option value="${ result.link }" ${ isCurrent ? 'selected data-current-issue' : '' }>${ result.label }</option>
              `);
            });
        } else {
          throw new Error('No more issues to fetch!');
        }
      })
      .then(autoPilotDownload) // Start auto pilot, if necessary
      .catch(err => {
        alert('Erro ao listar edições :( Tente atualizar a página.');
        throw new Error('Error fetching issues!');
      });
  }

  function getCurrentIssueEl() {
    return searchIssuesEl.querySelector('[data-current-issue]');
  }

  function previousIssue() {
    const previousIssueEl = getCurrentIssueEl().previousElementSibling;
    if( previousIssueEl && previousIssueEl.value ) {
      location.assign(previousIssueEl.value);
    }
  }

  function nextIssue() {
    const nextIssueEl = getCurrentIssueEl().nextElementSibling;
    if( nextIssueEl ) {
      location.assign(nextIssueEl.value);
    } else {
      fetchNextMonthIssues();
    }
  }

  function fetchNextMonthIssues() {
    const currentIssueDate = getIssueDate();

    if( currentIssueDate ) {
      currentIssueDate.setDate(1);
      currentIssueDate.setMonth( currentIssueDate.getMonth() + 1 );

      searchYearEl.value = currentIssueDate.getFullYear();
      searchMonthEl.value = currentIssueDate.getMonth() + 1;

      fetchAndRenderIssues()
        .then(nextIssue);
    }
  }

  setSearchDateFromCurrentIssue();
  fetchAndRenderIssues();

  ////////////////
  // Auto pilot
  ///////////

  const DEFAULT_AUTO_PILOT_STOP_YEAR = 1988;

  divEl.querySelector('[data-download-auto]').addEventListener('click', setAutoPilot);

  function setAutoPilot() {
    if( isAutoPilotRunning() ) {
      localStorage.removeItem('__autoPilot');
      alert('Piloto automático parou!');
    } else {
      let stopYear = +prompt('Até que ano quer rodar o piloto automático?', DEFAULT_AUTO_PILOT_STOP_YEAR);
      if( !stopYear || isNaN(stopYear) ) {
        stopYear = DEFAULT_AUTO_PILOT_STOP_YEAR;
      }
      localStorage.setItem('__autoPilotStopYear', stopYear);

      if( confirm(`Quer iniciar o piloto automático? Ele vai começar a baixar o ZIP dessa edição pra frente e só para em ${ getAutoPilotStopYear() }.`) ) {
        localStorage.setItem('__autoPilot', true);
        autoPilotDownload();
      }
    }
  }

  function isAutoPilotRunning() {
    return localStorage.getItem('__autoPilot') === 'true';
  }

  function getAutoPilotStopYear() {
    return +localStorage.getItem('__autoPilotStopYear') || DEFAULT_AUTO_PILOT_STOP_YEAR;
  }

  function autoPilotDownload() {
    if( isAutoPilotRunning() ) {
      const currentIssueDate = getIssueDate();
      if( currentIssueDate.getFullYear() >= getAutoPilotStopYear() ) {
        setAutoPilot();
      } else {
        downloadAll();
      }
    }
  }

  function autoPilotNext() {
    if( isAutoPilotRunning() ) {
      nextIssue();
    }
  }

  ////////////////
  // Logs
  ///////////

  const MAX_LOG_SIZE = 1024 * 1024 * 5; // 5mb ? max should be 10mb

  function logDownloads(pages, errors, fullName) {
    try {
      let newLog = '[' + new Date().toLocaleString() + '] ' + fullName + '\n' + pages.map(page => page.dataset.zoom).join('\n');
      let lastLog = localStorage.getItem('__lastLog') || 0;
      let log =  localStorage.getItem(`__log${ lastLog }`) || '';

      if( errors && errors.length ) {
         newLog += '\n---ERROS---\n' + errors.join('\n');
      }

      if( log.length + newLog.length > MAX_LOG_SIZE ) {
        lastLog++;
        localStorage.setItem('__lastLog', lastLog);
        log =  localStorage.getItem(`__log${ lastLog }`) || ''
      }

      //localStorage.setItem(`__log${ lastLog }`, log + '\n' + newLog + '\n');

      const logBlob = new Blob([newLog], {type: 'text/plain;charset=utf-8'});
      saveAs(logBlob, `${ fullName }.txt`);

    } catch(e) {}
  }

  function showLogs() {
    try {
      const lastLog = localStorage.getItem('__lastLog') || 0;
      let logs = '';

      for( let i = 0; i <= lastLog; i++ ) {
        logs += localStorage.getItem(`__log${ i }`) || '';
      }

      document.body.innerHTML = `<pre>${ logs }</pre>`;
      document.body.style.overflow = 'auto';

      setTimeout(() => {
        if( confirm('Quer aproveitar e salvar o log todo?') ) {
          const logBlob = new Blob([logs], {type: 'text/plain;charset=utf-8'});
          saveAs(logBlob, `Log Completo - ${ new Date().toLocaleString() }.txt`);
        }
      })

    } catch(e) {
      alert('Deu ruim!');
    }
  }

  function removeLogs() {
    try {
      if( confirm('Quer já apagar todos os logs?') ) {
        const lastLog = localStorage.getItem('__lastLog') || 0;
        for( let i = 0; i <= lastLog; i++ ) {
          localStorage.removeItem(`__log${ i }`);
        }
        localStorage.removeItem('__lastLog');
      }
    } catch(e) {}
  }

  ////////////////
  // Promise Queue
  ///////////

  const QUEUE_LIMIT = 4;
  const promiseQueue = [];
  let runningPromises = 0;

  function queuedPromise(callback) {
    return new Promise((resolve, reject) => {
      promiseQueue.push([callback, resolve, reject]);
      runQueue();
    });
  }

  function runQueue() {
    if( !promiseQueue.length || runningPromises === QUEUE_LIMIT ) {
      return;
    }
    const item = promiseQueue.shift();
    const [callback, resolve, reject] = item;

    runningPromises++;

    callback()
      .then((...args) => resolve.apply(this, args))
      .catch((...args) => reject.apply(this, args))
      .finally(() => {
        runningPromises--;
        runQueue();
      });
  }

  // Pra testar a fila se precisar:
  /*
  function resolveSometime(time) {
    return new Promise((resolve, reject) => {
      setTimeout(reject.bind(this, time), time);
    });
  }

  console.warn('partiu...');

  Promise.all([
    queuedPromise(() => resolveSometime(1003)),
    queuedPromise(() => resolveSometime(1002)),
    queuedPromise(() => resolveSometime(1001))
  ])
    .then(results => console.warn('resolveu tudo!', results))
    .catch(results => console.warn('deu ruim!', results));
  */

});