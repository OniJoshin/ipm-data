
let projectData = {};
let cumulativeRequirements = {};

async function loadData() {
  const res = await fetch('./data/project_data.json');
  projectData = await res.json();
  const select = document.getElementById('projectSelect');

  Object.keys(projectData).sort().forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    const selected = select.value;
    const chain = getDependencyChain(selected);
    const totals = calculateRequirements(chain);
    displayOutput(selected, chain, totals);
  });
}

function getDependencyChain(project, visited = new Set()) {
  if (!projectData[project] || visited.has(project)) return [];
  visited.add(project);
  const chain = [];

  if (projectData[project].prerequisites) {
    for (const prereq of projectData[project].prerequisites) {
      chain.push(...getDependencyChain(prereq, visited));
    }
  }

  chain.push(project);
  return [...new Set(chain)];
}

function calculateRequirements(chain) {
  const totals = {};
  for (const project of chain) {
    const reqs = projectData[project].requires || {};
    for (const [item, qty] of Object.entries(reqs)) {
      totals[item] = (totals[item] || 0) + qty;
    }
  }
  return totals;
}

function displayOutput(project, chain, totals) {
  const out = document.getElementById('output');
  out.innerHTML = '';

  const heading = document.createElement('h2');
  heading.className = 'text-xl font-semibold mb-2';
  heading.textContent = `Requirements for "${project}"`;
  out.appendChild(heading);

  const prereqList = document.createElement('ul');
  prereqList.className = 'mb-4 list-disc pl-5';
  chain.forEach(p => {
    const li = document.createElement('li');
    li.textContent = p;
    prereqList.appendChild(li);
  });

  out.appendChild(document.createElement('h3')).textContent = 'Project Chain:';
  out.appendChild(prereqList);

  const reqTable = document.createElement('table');
  reqTable.className = 'table-auto border border-gray-300';

  for (const [item, qty] of Object.entries(totals)) {
    const row = document.createElement('tr');
    row.innerHTML = `<td class="border px-2 py-1">${item}</td><td class="border px-2 py-1">${qty}</td>`;
    reqTable.appendChild(row);
  }

  out.appendChild(document.createElement('h3')).textContent = 'Total Requirements:';
  out.appendChild(reqTable);
}

loadData();
