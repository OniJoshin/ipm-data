// scrapeItems.js
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';

const URL = 'https://idle-planet-miner.fandom.com/wiki/Item';

async function fetchHTML(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return await res.text();
}

function parseCraftedFrom(text) {
  const recipe = {};

  // Remove "Crafted from" if it exists
  text = text.replace(/^Crafted from\s*/i, '');

  // Strip HTML tags if any accidentally made it in (extra safety)
  text = text.replace(/<[^>]+>/g, '');

  const parts = text.split(/,| and /i);
  for (const part of parts) {
    const match = part.trim().match(/^(\d+[kM]?)\s+(.*)$/);
    if (match) {
      let qtyText = match[1];
      let quantity = parseInt(qtyText.replace(/[kM]/, ''), 10) || 1;
      if (qtyText.includes('k')) quantity *= 1000;
      if (qtyText.includes('M')) quantity *= 1000000;
      const material = match[2]
      .replace(/File:.+$/, '')           // Remove leftover file/image info
      .replace(/[\t\n]+/g, '')           // Remove tabs/newlines
      .replace(/\s{2,}/g, ' ')           // Collapse extra spaces
      .trim();
      recipe[material] = quantity;
    }
  }

  return recipe;
}


async function scrapeFromMainTable() {
  const html = await fetchHTML(URL);
  const $ = cheerio.load(html);
  const items = {};

  $('table > tbody > tr').each((i, row) => {
    const tds = $(row).find('td');
    if (tds.length < 6) return; // Skip non-data rows

    const itemName = tds.eq(2).text().trim();
    const craftedFromText = tds.eq(5).text().trim();

    if (!itemName || !craftedFromText) return;

    const recipe = parseCraftedFrom(craftedFromText);
    if (Object.keys(recipe).length > 0) {
      items[itemName] = recipe;
    }
  });

  await fs.writeFile('./data/items_data.json', JSON.stringify(items, null, 2));
  console.log(`✅ Parsed ${Object.keys(items).length} items from table.`);
}

scrapeFromMainTable().catch(console.error);
