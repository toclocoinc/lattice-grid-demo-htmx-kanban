// Real-Chrome check of the five steps: built on load, a card move posted, a refused
// drop, an out-of-band update, a team swap, Back, and no console errors or warnings.
//   npm run serve                    (in another terminal)
//   CHROME=/usr/bin/google-chrome node tools/verify.mjs [http://localhost:8000/]   (WIDTH and HEIGHT set the window)
import puppeteer from 'puppeteer-core';

const url = process.argv[2] || 'http://localhost:8000/';
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
let failed = 0;
const check = (ok, what) => { if (!ok) failed += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); };
const columnOf = (t) => document.querySelector(`#kanban-view .lat-kanban__card[aria-label^="${t},"]`)?.dataset.column;
const count = () => document.querySelectorAll('#kanban-view .lat-kanban__card').length;

// Drag a card onto a column's card list with real mouse events.
async function drag(page, title, column) {
  const card = await page.$(`#kanban-view .lat-kanban__card[aria-label^="${title},"]`);
  await card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const from = await card.boundingBox();
  const to = await (await page.$(`#kanban-view .lat-kanban__cards[data-column="${column}"]`)).boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + 60, { steps: 12 });
  await page.mouse.up();
  await sleep(1200);
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: Number(process.env.WIDTH || 1440), height: Number(process.env.HEIGHT || 900) });
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error' || /\[lattice\]/i.test(m.text())) problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => document.querySelectorAll('#kanban-view .lat-kanban__card').length > 3, { timeout: 30000 });
  await sleep(1000);
  check(await page.evaluate(columnOf, 'Set up the A/B test') === 'todo' && await page.evaluate(count) === 39, 'built on load from the server card table');

  await drag(page, 'Set up the A/B test', 'doing');
  check(await page.evaluate(columnOf, 'Set up the A/B test') === 'doing', 'move: the card is in the next column');
  check((await page.$eval('#save-status', (e) => e.textContent)).includes('Server saved Set up the A/B test: todo to doing'), 'move: the server confirmed the post');

  await drag(page, 'Landing page for the webinar', 'done');
  check(await page.evaluate(columnOf, 'Landing page for the webinar') === 'todo', 'refused drop: the card stays in Todo');
  check(!(await page.$eval('#save-status', (e) => e.textContent)).includes('Landing page'), 'refused drop: nothing was posted');

  const before = await page.evaluate(() => [...document.querySelectorAll('#kanban-view .lat-kanban__card-subtitle')].map((e) => e.textContent).join('|'));
  await page.click('button[hx-post="/htmx-demo/kanban/reassign"]');
  await sleep(1200);
  const after = await page.evaluate(() => [...document.querySelectorAll('#kanban-view .lat-kanban__card-subtitle')].map((e) => e.textContent).join('|'));
  check(after !== before && await page.evaluate(count) === 39, 'out of band: one card changed owner in place');

  await page.click('button[hx-get*="team=Support"]');
  await sleep(1500);
  check(await page.evaluate(count) === 13 && await page.evaluate(columnOf, 'Triage the refund backlog') === 'doing', 'swap: the Support board is built');
  await page.goBack();
  await sleep(2000);
  check(await page.evaluate(count) === 39 && (await page.$eval('#kanban-view button[aria-pressed=true]', (e) => e.textContent)) === 'All teams', 'Back: all teams return, with the board rebuilt');
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal scroll');
  const fit = await page.evaluate(() => {
    const host = document.querySelector('#kanban-view .lat-kanban').parentElement;
    const board = document.querySelector('#kanban-view .lat-kanban');
    const cols = [...board.querySelectorAll('.lat-kanban__column')].map((c) => c.getBoundingClientRect());
    return { host: { left: host.getBoundingClientRect().left, right: host.getBoundingClientRect().right }, sw: board.scrollWidth, cw: board.clientWidth, left: Math.min(...cols.map((r) => r.left)), right: Math.max(...cols.map((r) => r.right)), n: cols.length };
  });
  console.log(`board scrollWidth ${fit.sw} clientWidth ${fit.cw}; ${fit.n} columns span ${Math.round(fit.left)}-${Math.round(fit.right)} in host ${Math.round(fit.host.left)}-${Math.round(fit.host.right)}`);
  check(fit.sw === fit.cw, 'board: no horizontal scrollbar');
  check(fit.n > 0 && fit.host.right - fit.right < 40 && fit.left - fit.host.left < 40, 'board: columns fill the host');
  // A pushed URL is answered with its own view: fresh opens, and cached reloads after a click.
  const TEAMS = { '': 39, Growth: 13, Platform: 13, Support: 13 };
  const shows = (team) => page2.evaluate(() => ({ n: document.querySelectorAll('#kanban-view .lat-kanban__card').length,
    on: [...document.querySelectorAll('#kanban-view button[aria-pressed=true]')].map((b) => b.textContent).join() }))
    .then((v) => v.n === TEAMS[team] && v.on === (team || 'All teams'));
  const built = (n) => page2.waitForFunction((k) => document.querySelectorAll('#kanban-view .lat-kanban__card').length === k, { timeout: 15000 }, n).then(() => true, () => false);
  const page2 = await browser.newPage();
  await page2.setViewport({ width: Number(process.env.WIDTH || 1440), height: Number(process.env.HEIGHT || 900) });
  const problems2 = [];
  page2.on('console', (m) => { if (m.type() === 'error' || /\[lattice\]/i.test(m.text())) problems2.push(m.text()); });
  page2.on('pageerror', (e) => problems2.push(e.message));
  const base = url.split('?')[0];
  for (const team of Object.keys(TEAMS)) {
    await page2.goto(team ? `${base}?team=${team}` : base);
    check(await built(TEAMS[team]) && await shows(team), `fresh open ${team ? '?team=' + team : 'bare URL'}: the URL's view is built`);
  }
  for (const team of ['Growth', 'Platform', 'Support']) {
    await page2.goto(base);
    await built(39);
    await page2.click(`button[hx-get*="team=${team}"]`);
    await built(13);
    let ok = true;
    for (let i = 0; i < 10; i += 1) {
      await page2.reload();
      ok = await built(13) && await shows(team) && ok;
    }
    check(ok, `click ${team}, then 10 reloads: each builds the ${team} view`);
    await page2.goBack();
    await sleep(2000);
    check(await built(39) && await shows(''), `click ${team}, reload, Back: all teams return, built`);
  }
  check(problems2.length === 0, `reload checks: no console errors or [lattice] warnings ${problems2.join(' / ')}`);
  await page.screenshot({ path: process.env.SHOT || '/dev/null' });
  check(problems.length === 0, `no console errors or [lattice] warnings ${problems.join(' / ')}`);
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
