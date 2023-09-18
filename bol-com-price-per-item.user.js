// ==UserScript==
// @name         bol.com: Price per item
// @namespace    https://github.com/gil/userscripts
// @version      0.0.1
// @description  Try to estimate the price per item, based on numbers on the item title.
// @author       Andre Gil
// @match        https://www.bol.com/*/s/*
// @icon         https://www.google.com/s2/favicons?domain=bol.com
// @grant        none
// ==/UserScript==

/////////
// Warning: Very hacky and ugly, I should probably improve this someday.
/////////

const ranking = [];

document.querySelectorAll('.js_item_root').forEach(item => {

    const title = item.querySelector('.product-title').innerText.trim();
    const priceField = item.querySelector('.price-block__price');
    if( !priceField ) {
        return;
    }
    const price = Number(item.querySelector('.price-block__price').innerText.trim().replace('\n', '.').replace('-', 0));
    const numbers = (title.match(/(\d+\s*x\s*\d+)|\d+/g) || [])
        .map(number => {
            const parts = number.match(/\d+/g);
            parts[1] ??= 1;
            return Number(parts[0]) * Number(parts[1]);
        })
        .sort((a, b) => b - a);
    const html = '<hr/>' + numbers
        .map(number => `${ number } = € ${ (price / number).toFixed(2) }`)
        .join('<br/>');

    item.querySelector('[data-test="product-description"]').insertAdjacentHTML('beforeEnd', html);

    ranking.push({
        ppi: (price / numbers[0]).toFixed(2),
        item,
    });

    //console.log({title, price, numbers});
});

ranking
    .sort((r1, r2) => r1.ppi - r2.ppi)
    .forEach((r, index) => {
        r.item.style.border = index < 3 ? '1px solid red' : '';
    });
