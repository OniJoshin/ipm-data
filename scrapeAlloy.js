// scrapeAlloys.js
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';

const URL = 'https://idle-planet-miner.fandom.com/wiki/Alloy';

async function fetchHTML(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return await res.text();
}

function parseMaterialCost(text) {
  const recipe = {};
  const parts = text.split(/,| and /i);

  for (const part of parts) {
    const match = part.trim().match(/(\d+[kM]?)\s+(.*)/i);
    if (match) {
      let qtyText = match[1];
      let quantity = parseInt(qtyText.replace(/[kM]/i, '')) || 1;
      if (qtyText.toLowerCase().includes('k')) quantity *= 1000;
      if (qtyText.toLowerCase().includes('m')) quantity *= 1000000;

      let rawMaterial = match[2].trim();

      // Normalize material name
      let material;
      if (/bar$/i.test(rawMaterial)) {
        // Ends with "Bar" already, use as-is
        material = rawMaterial;
      } else if (/Alloy/i.test(rawMaterial)) {
        // Leave special alloy names like "Uru Alloy" as-is
        material = rawMaterial;
      } else {
        // Likely an ore, do not append "Bar"
        material = rawMaterial;
      }

      recipe[material] = quantity;
    }
  }

  return recipe;
}


async function scrapeAlloys() {
  const html = await fetchHTML(URL);
  const $ = cheerio.load(html);
  const alloys = {};

  $('table.article-table > tbody > tr').each((i, row) => {
    const cols = $(row).find('td');
    if (cols.length < 9) return;

    const name = $(cols[2]).text().trim();
    const costText = $(cols[4]).text().trim(); // "Material Cost"
    const craftedText = $(cols[7]).text().trim(); // "Crafting uses" — optional

    if (!name || !costText) return;

    const recipe = parseMaterialCost(costText);

    if (Object.keys(recipe).length > 0) {
      alloys[name] = recipe;
    }
  });

  await fs.writeFile('./data/alloys_data.json', JSON.stringify(alloys, null, 2));
  console.log(`✅ Saved ${Object.keys(alloys).length} alloys to alloys_data.json`);
}

scrapeAlloys().catch(console.error);
