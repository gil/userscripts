// ==UserScript==
// @name        Estadão em Massa
// @namespace   Violentmonkey Scripts
// @match       https://acervo.estadao.com.br/pagina/*
// @grant       none
// @version     0.1
// @author      -
// @description ???
// @require     https://raw.githubusercontent.com/Stuk/jszip/main/dist/jszip.min.js
// @require     https://raw.githubusercontent.com/eligrey/FileSaver.js/master/dist/FileSaver.min.js
// ==/UserScript==

const VERSION = 0.1;
const WEEKS = [
  'domingo',
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
];

document.body.insertAdjacentHTML('beforeEnd', `
  <div style="position: absolute; right: 0; top: 60px; z-index: 999; background: #ED1A3A; color: #FFF; padding: 20px;" data-downloader>
    <button data-download-start>Começar!</button>
    <div>
      <small>v${ VERSION }</small>
    </div>
  </div>
`);

const divEl = document.querySelector('[data-downloader]');

const pad = (value, count = 2) => value.toString().padStart(count, '0');

const logger = {
  start: () => {
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';
    document.body.innerHTML = `<textarea style="width: 100%; height: 100%; min-height: 500px;"></textarea>`;
  },
  log: (msg) => document.body.children[0].value += `${msg}\n`,
};

async function start() {
  const from = prompt('Começa quando?', '2025-01-01');
  const to = prompt('Vai até quando?', '2025-12-30');
  const dateFrom = new Date(from.substr(0, 4), from.substr(5, 2) - 1, from.substr(8, 2), 12, 0, 0);
  const dateTo = new Date(to.substr(0, 4), to.substr(5, 2) - 1, to.substr(8, 2), 12, 0, 0);

  console.clear();

  logger.start();
  logger.log(`Bora!\n`);
  logger.log(`De: ${dateFrom.toDateString()}`);
  logger.log(`Até: ${dateTo.toDateString()}`);

  while(dateFrom <= dateTo) {
    const zip = new JSZip();
    const thumbs = await fetchThumbs(dateFrom);

    for(let i = 0; i < thumbs.paginas.length; i++) {
      const page = await fetchPage(thumbs.paginas[i]);
      console.log(page);
      const pageImageBlob = await downloadPage(page.pagina_impressao);
      const weekDay = WEEKS[ dateFrom.getDay() ];
      const pageFileName = page.pagina_impressao.split('/').at(-1).replace('-', `-${ weekDay }-`);
      zip.file(pageFileName, pageImageBlob, { base64: true });
    }

    await saveZip(dateFrom, zip);

    dateFrom.setDate(dateFrom.getDate() + 1);
  }
}

async function fetchThumbs(date) {
  logger.log(`--------\nPegando thumbs de: ${date.toDateString()}`);
  const url = `https://acervo.estadao.com.br/servicos/timeLinePaginas.php?dia=${ pad(date.getDate()) }&mes=${ pad(date.getMonth() + 1) }&ano=${ date.getFullYear() }`;

  const response = await fetch(url);
  return await response.json();
  /*return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      responseType: 'json', // blob
      onerror: reject,
      onload: function(response) {
        if (response.status === 200) {
          resolve(response.response);
        } else {
          reject(response);
        }
      },
    });
  });*/
}

async function fetchPage(thumb) {
  logger.log(`Pegando dados da página: ${thumb.legenda}`);
  const fileName = thumb.imagem.split('/').at(-1).split('.')[0];
  const url = `https://acervo.estadao.com.br/servicos/montaPagina.php?nome_arquivo=${ fileName }`;

  const response = await fetch(url);
  return await response.json();
}

async function downloadPage(url) {
  logger.log(`Baixando página: ${url}`);

  const response = await fetch(url);
  return await response.blob();
}

async function saveZip(date, zip) {
  const weekDay = WEEKS[ date.getDay() ];
  const editionDate = `${ date.getFullYear() }-${ pad(date.getMonth() + 1) }-${ pad(date.getDate()) }`;
  const zipName = `${ editionDate }-${ weekDay }.zip`;
  logger.log(`Gerando Zip: ${ zipName }`);

  return new Promise((resolve) => {
    zip.generateAsync({type: 'blob'})
      .then(function(content) {
        logger.log(`Baixando Zip: ${ zipName }`);
        saveAs(content, zipName);
        resolve();
      });
  });
}

divEl.querySelector('[data-download-start]').addEventListener('click', start);
