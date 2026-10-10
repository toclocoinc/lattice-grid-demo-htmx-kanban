/**
 * A small static file server for looking at the demo locally.
 *   node tools/serve.mjs [port]
 * Development only: `--local <dist>` serves a local build of the grid in place of the
 * published package, by swapping the package address in the page as it is served. The
 * files in the repository are never changed.
 */
import { createServer } from 'node:http';
import { createReadStream, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.map': 'application/json; charset=utf-8' };
const PACKAGE = /https:\/\/cdn\.jsdelivr\.net\/npm\/@toclocoinc\/lattice-grid@[\d.]+\//g;

export function startServer({ port = 0, localDist = '' } = {}) {
  const server = createServer(async (request, response) => {
    const path = decodeURIComponent((request.url || '/').split('?')[0]);
    if (localDist && path.startsWith('/__grid/')) {
      return createReadStream(join(localDist, normalize(path.slice(7)))).on('error', () => response.writeHead(404).end('Not found'))
        .once('open', () => response.writeHead(200, { 'content-type': TYPES[extname(path)] || 'text/javascript; charset=utf-8', 'cache-control': 'no-store' }))
        .pipe(response);
    }
    let file = join(root, normalize(path).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(root)) return response.writeHead(403).end('Forbidden');
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const body = readFileSync(file);
      const text = localDist && file.endsWith('.html') ? Buffer.from(body.toString().replace(PACKAGE, '/__grid/')) : body;
      response.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(text);
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
    }
  });
  return new Promise((done) => server.listen(port, '127.0.0.1', () => done({ server, port: server.address().port })));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--local');
  const localDist = at >= 0 ? resolve(args.splice(at, 2)[1]) : '';
  const { port } = await startServer({ port: Number(args[0] || 0), localDist });
  console.log(`Serving the demo at http://localhost:${port}/` + (localDist ? ` (grid from ${localDist})` : ''));
}
