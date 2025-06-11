
// scrapeProjectsExtended.js
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';

const PROJECTS_URL = 'https://idle-planet-miner.fandom.com/wiki/Project';

async function fetchHTML(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return await res.text();
}

function parseRequirements(text) {
  const requirements = {};
  const regex = /(?:(\d+[kM]?)x?\s+)?([A-Z][\w\s\-]+?)(?=,|\.|$)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    let qtyText = match[1] || '1';
    let quantity = parseInt(qtyText.replace(/[kM]/, '')) || 1;

    if (qtyText.includes('k')) quantity *= 1000;
    else if (qtyText.includes('M')) quantity *= 1000000;

    const item = match[2].trim();
    if (item.toLowerCase() !== 'none') {
      requirements[item] = (requirements[item] || 0) + quantity;
    }
  }
  return requirements;
}

function parseList(text) {
  return text
    .split(/,| and /i)
    .map(s => s.trim())
    .filter(Boolean);
}

async function scrapeProjects() {
  const html = await fetchHTML(PROJECTS_URL);
  const $ = cheerio.load(html);

  const projects = {};

  $('table.article-table tbody tr').each((i, row) => {
    const cols = $(row).find('td');
    if (cols.length < 4) return;

    const name = $(cols[0]).text().trim();
    const costText = $(cols[1]).text().trim();
    const description = $(cols[2]).text().trim();

    const hasPrerequisites = cols.length >= 5;
    const prerequisitesText = hasPrerequisites ? $(cols[3]).text().trim() : '';
    const notesText = hasPrerequisites ? $(cols[4]).text().trim() : $(cols[3]).text().trim();

    if (!name) return;

    const entry = {
      requires: parseRequirements(costText),
      description
    };

    if (prerequisitesText) entry.prerequisites = parseList(prerequisitesText);
    if (notesText) entry.notes = notesText;

    projects[name] = entry;
  });

  await fs.writeFile('./project_data.json', JSON.stringify(projects, null, 2));
  console.log(`✅ Extracted ${Object.keys(projects).length} projects to project_data.json`);
}

scrapeProjects().catch(console.error);
