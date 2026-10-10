// Order is the whole trick: the stand-in server goes in first, the Kanban engine
// and the Lattice htmx module next so their listeners are registered, and htmx
// itself last. htmx then processes the page and fires htmx:load for the
// server-rendered table, which is what builds the board. No mount call anywhere.
import { installMockServer } from './src/mock-server.js';
import { routes } from './src/server.js';

const GRID = 'https://cdn.jsdelivr.net/npm/@toclocoinc/lattice-grid@1.98.0';
const HTMX = 'https://cdn.jsdelivr.net/npm/htmx.org@2.0.4/dist/htmx.min.js';
const HTMX_SRI = 'sha384-HGfztofotfshcF7+8n44JQL2oJmowVChPTg48S+jvZoztPfvwD79OC/LTtG6dMp+';
// Public, domain-bound key for toclocoinc.github.io; on localhost no key is needed.
const LICENCE = 'LG1.eyJ2IjoxLCJwIjoibGF0dGljZS1ncmlkIiwidCI6IlRPQ0xPQ08gSW5jIC0gcHVibGljIGRlbW9zIiwiZSI6IjIwMzAtMDEtMDEiLCJkIjpbInRvY2xvY29pbmMuZ2l0aHViLmlvIl19.9De42ua3aCGpiMB6EVRP7Tv-upUlDI-0T07rlSPzvCrsqg8t4YJi7SRnStEpAg48uzmcG7il1fR_TfwkUE7iCA';

const loadScript = (src, attrs = {}) => new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = src;
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  s.onload = resolve;
  s.onerror = () => reject(new Error('could not load ' + src));
  document.head.append(s);
});

installMockServer(routes);
await loadScript(GRID + '/modules/kanban.min.js');
const lattice = await import('@toclocoinc/lattice-grid/modules/htmx');
lattice.setLicence(LICENCE);
await loadScript(HTMX, { integrity: HTMX_SRI, crossorigin: 'anonymous' });

// The request log: one line per request the stand-in server answered.
const log = document.getElementById('request-log');
document.body.addEventListener('htmx:afterRequest', (e) => {
  const { requestConfig: c, xhr } = e.detail;
  if (log.firstElementChild?.textContent === 'none yet') log.replaceChildren();
  const li = document.createElement('li');
  li.textContent = c.verb.toUpperCase() + ' ' + c.path + ' → ' + xhr.status;
  log.prepend(li);
  while (log.children.length > 6) log.lastElementChild.remove();
});

