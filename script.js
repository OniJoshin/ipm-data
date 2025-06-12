let items = {};
let alloys = {};
let projects = {};

const baseMaterials = new Set([
  "Copper", "Iron", "Lead", "Silicon", "Aluminum", "Silver", "Gold", "Platinum", "Titanium",
  "Iridium", "Paladium", "Osmium", "Rhodium", "Inerton", "Quadium", "Scrith",
  "Uru", "Vibranium", "Aether", "Viterium", "Xynium", "Qualoium", "Luterium",
  "Wraith", "Aqualite"
]);

const outputDiv = document.getElementById("output");

async function loadData() {
  [items, alloys, projects] = await Promise.all([
    fetch('data/items_data.json').then(r => r.json()),
    fetch('data/alloys_data.json').then(r => r.json()),
    fetch('data/project_data.json').then(r => r.json()),
  ]);
}

function expandTree(item, quantity = 1, indent = 0, lines = [], base = {}, itemsUsed = {}, alloysUsed = {}, path = []) {
  const pad = '  '.repeat(indent);
  lines.push(`${pad}- ${quantity} x ${item}`);

  if (path.includes(item)) {
    lines.push(`${pad}  (skipping self-reference)`);
    return;
  }

  const recipe = items[item] || alloys[item];

  if (!recipe) {
    if (baseMaterials.has(item)) {
      base[item] = (base[item] || 0) + quantity;
    }
    return;
  }

  if (items[item]) {
    itemsUsed[item] = (itemsUsed[item] || 0) + quantity;
  } else if (alloys[item]) {
    alloysUsed[item] = (alloysUsed[item] || 0) + quantity;
  }

  for (const [sub, subQty] of Object.entries(recipe)) {
    expandTree(sub, subQty * quantity, indent + 1, lines, base, itemsUsed, alloysUsed, [...path, item]);
  }
}

function generateBreakdown(projectName) {
  outputDiv.innerHTML = '';
  const entry = projects[projectName];
  if (!entry || !entry.requires) {
    outputDiv.textContent = '❌ No requirements found.';
    return;
  }

  const lines = [`📦 Breakdown for "${projectName}":`];
  const base = {}, itemsUsed = {}, alloysUsed = {};

  for (const [req, qty] of Object.entries(entry.requires)) {
    expandTree(req, qty, 1, lines, base, itemsUsed, alloysUsed);
  }

  const breakdownTree = buildTreeView(lines);
  if (breakdownTree.childElementCount === 0) {
    const fallback = document.createElement('pre');
    fallback.textContent = lines.join('\n');
    fallback.className = 'text-sm bg-gray-100 p-4 rounded overflow-x-auto whitespace-pre-wrap';
    outputDiv.appendChild(fallback);
  } else {
    outputDiv.appendChild(breakdownTree);
  }

  outputDiv.appendChild(breakdownTree);

  const totalsWrapper = document.createElement('div');
  totalsWrapper.className = 'grid grid-cols-1 md:grid-cols-3 gap-4 mt-6';

  totalsWrapper.appendChild(buildTotalsTable('📊 Total Base Materials', base));
  totalsWrapper.appendChild(buildTotalsTable('📦 Total Items Used', itemsUsed));
  totalsWrapper.appendChild(buildTotalsTable('🧪 Total Alloys Used', alloysUsed));

  outputDiv.appendChild(totalsWrapper);
}

function buildTreeView(lines) {
  const container = document.createElement('div');
  container.className = 'text-sm space-y-1';
  const parentStack = [container];

  lines.forEach((line, i) => {
    if (typeof line !== 'string') return;

    const match = line.match(/^  */);
    const depth = match ? match[0].length / 2 : 0;
    const text = line.trim();

    if (!parentStack[depth]) {
      const fallback = document.createElement('div');
      parentStack[depth - 1]?.appendChild(fallback);
      parentStack[depth] = fallback;
    }

    if (text.startsWith('-')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'ml-4 flex flex-col space-y-1';

      const lineEl = document.createElement('div');
      lineEl.className = 'flex items-start';

      // Determine if next line is a deeper level (i.e., has children)
      const nextLine = lines[i + 1];
      const nextDepth = nextLine ? (nextLine.match(/^  */)?.[0].length || 0) / 2 : 0;
      const isExpandable = nextDepth > depth;

      if (isExpandable) {
        const toggle = document.createElement('span');
        toggle.textContent = '▶';
        toggle.className = 'mr-1 cursor-pointer select-none text-gray-500';
        toggle.dataset.expanded = 'false';

        const label = document.createElement('span');
        label.textContent = text.slice(2);

        const childContainer = document.createElement('div');
        childContainer.className = 'ml-2 hidden';
        childContainer.dataset.child = 'true';

        toggle.addEventListener('click', () => {
          const expanded = toggle.dataset.expanded === 'true';
          toggle.textContent = expanded ? '▶' : '▼';
          childContainer.classList.toggle('hidden');
          toggle.dataset.expanded = (!expanded).toString();
        });

        lineEl.appendChild(toggle);
        lineEl.appendChild(label);
        wrapper.appendChild(lineEl);
        wrapper.appendChild(childContainer);

        parentStack[depth].appendChild(wrapper);
        parentStack[depth + 1] = childContainer;
      } else {
        const bullet = document.createElement('span');
        bullet.textContent = '•';
        bullet.className = 'mr-2 text-gray-400';

        const label = document.createElement('span');
        label.textContent = text.slice(2);

        lineEl.appendChild(bullet);
        lineEl.appendChild(label);
        wrapper.appendChild(lineEl);
        parentStack[depth].appendChild(wrapper);
      }
    } else {
      const noteEl = document.createElement('div');
      noteEl.className = 'ml-2 text-gray-500';
      noteEl.textContent = text;
      parentStack[depth]?.appendChild(noteEl);
    }
  });

  return container;
}




function buildTotalsTable(title, data) {
  const box = document.createElement('div');
  box.className = 'bg-white rounded shadow p-4 border';

  const titleEl = document.createElement('h3');
  titleEl.textContent = title;
  titleEl.className = 'font-semibold mb-2';
  box.appendChild(titleEl);

  const list = document.createElement('ul');
  for (const [name, qty] of Object.entries(data).sort()) {
    const li = document.createElement('li');
    li.textContent = `- ${name}: ${qty}`;
    list.appendChild(li);
  }

  box.appendChild(list);
  return box;
}

function setupDropdown() {
  const select = document.getElementById('projectSelect');
  Object.keys(projects).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => generateBreakdown(select.value));
  select.dispatchEvent(new Event('change'));
}

loadData().then(setupDropdown).catch(err => {
  outputDiv.textContent = 'Error loading data: ' + err.message;
});
