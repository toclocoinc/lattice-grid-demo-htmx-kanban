/**
 * The "server": a board of cards across three teams, the HTML template and the
 * route handlers. The page prints the part between the SERVER TEMPLATE markers beside the demo.
 */
const cards = [
  ['K-101', 'Audit the checkout funnel', 'Ana Lopez', 'Growth', 'done', 5],
  ['K-102', 'Redesign the pricing table', 'Dev Patel', 'Growth', 'doing', 8],
  ['K-103', 'Write the launch email', 'Chloe Marsh', 'Growth', 'doing', 3],
  ['K-104', 'Set up the A/B test', 'Ben Okafor', 'Growth', 'todo', 5],
  ['K-105', 'Landing page for the webinar', 'Eva Lindqvist', 'Growth', 'todo', 8],
  ['K-106', 'Segment the trial users', 'Ana Lopez', 'Growth', 'done', 3],
  ['K-107', 'Refresh the case studies', 'Chloe Marsh', 'Growth', 'done', 5],
  ['K-108', 'Referral programme brief', 'Gus Romero', 'Growth', 'todo', 5],
  ['K-109', 'Fix the sign-up form tracking', 'Dev Patel', 'Growth', 'doing', 2],
  ['K-110', 'Partner co-marketing plan', 'Hana Sato', 'Growth', 'todo', 8],
  ['K-111', 'Update the onboarding checklist', 'Eva Lindqvist', 'Growth', 'done', 2],
  ['K-112', 'Quarterly funnel report', 'Ben Okafor', 'Growth', 'doing', 5],
  ['K-113', 'Review the paid search budget', 'Gus Romero', 'Growth', 'todo', 3],
  ['K-201', 'Move billing to the new ledger', 'Ben Okafor', 'Platform', 'doing', 13],
  ['K-202', 'Rotate the API keys', 'Eva Lindqvist', 'Platform', 'done', 2],
  ['K-203', 'Cache the pricing lookups', 'Femi Adeyemi', 'Platform', 'doing', 5],
  ['K-204', 'Retire the v1 webhooks', 'Chloe Marsh', 'Platform', 'todo', 8],
  ['K-205', 'Database failover drill', 'Dev Patel', 'Platform', 'todo', 2],
  ['K-206', 'Upgrade the job queue', 'Femi Adeyemi', 'Platform', 'done', 8],
  ['K-207', 'Add rate limits to the public API', 'Hana Sato', 'Platform', 'doing', 5],
  ['K-208', 'Split the reporting database', 'Ben Okafor', 'Platform', 'todo', 13],
  ['K-209', 'Trace slow requests end to end', 'Gus Romero', 'Platform', 'doing', 3],
  ['K-210', 'Patch the image build pipeline', 'Ana Lopez', 'Platform', 'done', 3],
  ['K-211', 'Document the on-call runbook', 'Eva Lindqvist', 'Platform', 'todo', 2],
  ['K-212', 'Move logs to cold storage', 'Femi Adeyemi', 'Platform', 'todo', 5],
  ['K-213', 'Load test the checkout service', 'Dev Patel', 'Platform', 'done', 5],
  ['K-301', 'Triage the refund backlog', 'Hana Sato', 'Support', 'doing', 5],
  ['K-302', 'Rewrite the password reset article', 'Chloe Marsh', 'Support', 'done', 2],
  ['K-303', 'Set up the weekend rota', 'Gus Romero', 'Support', 'done', 3],
  ['K-304', 'Add an order status macro', 'Ana Lopez', 'Support', 'todo', 2],
  ['K-305', 'Survey customers after a closed ticket', 'Eva Lindqvist', 'Support', 'doing', 5],
  ['K-306', 'Train the new starters on billing', 'Femi Adeyemi', 'Support', 'doing', 8],
  ['K-307', 'Merge the duplicate help articles', 'Chloe Marsh', 'Support', 'todo', 3],
  ['K-308', 'Escalation guide for enterprise accounts', 'Ben Okafor', 'Support', 'todo', 5],
  ['K-309', 'Review the first-response targets', 'Hana Sato', 'Support', 'done', 2],
  ['K-310', 'Tag tickets by product area', 'Gus Romero', 'Support', 'doing', 3],
  ['K-311', 'Translate the top ten articles', 'Dev Patel', 'Support', 'todo', 8],
  ['K-312', 'Chat hours for the holiday week', 'Ana Lopez', 'Support', 'todo', 2],
  ['K-313', 'Customer health score pilot', 'Ben Okafor', 'Support', 'doing', 8],
].map(([id, title, owner, team, status, points]) => ({ id, title, owner, team, status, points }));

// SERVER TEMPLATE START
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
export const teams = ['Growth', 'Platform', 'Support'];
const columns = ['todo', 'doing', 'done'];

/** The workflow: a card moves one step forward or back; nothing jumps from Todo straight to Done. */
const transitions = { todo: ['doing'], doing: ['todo', 'done'], done: ['doing'] };

const cardRow = (r, attrs = '') =>
  `<tr data-lattice-row="${r.id}" ${attrs}><td>${r.id}</td><td>${esc(r.title)}</td><td>${esc(r.owner)}</td><td>${r.status}</td><td>${r.points}</td></tr>`;

/** The whole view for one team: the picker, and the board built from the card table inside data-lattice-kanban. */
export function kanbanFragment(team = '', page = (typeof location !== 'undefined' ? location.pathname : '/lattice-grid-demo-htmx-kanban/')) {
  const list = team ? cards.filter((r) => r.team === team) : cards;
  const picker = ['', ...teams]
    .map((t) => `<button hx-get="/htmx-demo/kanban/cards?team=${t}" hx-target="#kanban-view"
      hx-push-url="${page}?team=${t}" aria-pressed="${t === team}">${t || 'All teams'}</button>`)
    .join('\n  ');
  const action = `<button class="action" hx-post="/htmx-demo/kanban/reassign" hx-vals='{"team": "${team}"}' hx-swap="none">Server reassigns one card</button>`;
  const config = JSON.stringify({
    columnProperty: 'status', transitions,
    columns: columns.map((id) => ({ id, title: id[0].toUpperCase() + id.slice(1) })),
    card: { title: 'title', subtitle: 'owner' },
  });
  return `<div class="view"><div class="filters">${picker}${action}</div>
<div data-lattice-kanban hx-post="/htmx-demo/kanban/move" hx-trigger="lattice:kanban-change"
  hx-vals='js:{id: event.detail.id, from: event.detail.from, to: event.detail.to}'
  hx-target="#save-status" hx-swap="innerHTML" style="height:calc(100vh - 300px); min-height:480px">
  <table>
    <thead><tr><th data-field="id">Ref</th><th data-field="title">Card</th><th data-field="owner">Owner</th>
      <th data-field="status">Status</th><th data-field="points" data-type="number">Points</th></tr></thead>
    <tbody>
  ${list.map((r) => cardRow(r)).join('\n  ')}
    </tbody>
  </table>
  ${list.map((r) => `<i id="card-${r.id}" data-lattice-row="${r.id}"></i>`).join('')}
</div>
<script type="application/json" data-lattice-config>${config}</script></div>`;
}

export const routes = {
  // hx-get: another team's cards; the old board is torn down and a new one built.
  'GET /htmx-demo/kanban/cards': ({ params }) => kanbanFragment(teams.includes(params.team) ? params.team : ''),

  // hx-post from lattice:kanban-change: the card id and the column it left and reached.
  'POST /htmx-demo/kanban/move': ({ params }) => {
    const card = cards.find((r) => r.id === params.id);
    if (!card || !columns.includes(params.to)) return { html: 'Unknown card', status: 404 };
    card.status = params.to;
    return `Server saved ${esc(card.title)}: ${esc(params.from)} to ${esc(params.to)}`;
  },

  // hx-post with hx-swap="none": one card comes back out of band and the board patches it in place.
  'POST /htmx-demo/kanban/reassign': ({ params }) => {
    const list = params.team ? cards.filter((r) => r.team === params.team) : cards;
    const owners = ['Ana Lopez', 'Ben Okafor', 'Chloe Marsh', 'Dev Patel', 'Eva Lindqvist'];
    const card = list[Math.floor(Math.random() * list.length)];
    card.owner = owners[(owners.indexOf(card.owner) + 1) % owners.length];
    return cardRow(card, `id="card-${card.id}" hx-swap-oob="true"`);
  },
};
// SERVER TEMPLATE END
