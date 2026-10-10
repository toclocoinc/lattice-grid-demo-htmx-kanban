# htmx Kanban board over a server card table

**Live demo:** https://toclocoinc.github.io/lattice-grid-demo-htmx-kanban/

The server renders a plain `<table>` of cards inside a `data-lattice-kanban` element. [Lattice Grid](https://www.latticegrid.dev/htmx/) turns it into a Kanban board with no mount code on the page: only markup, [htmx](https://htmx.org/) and the Lattice htmx module.

The board holds 39 cards across three teams (Growth, Platform and Support), in Todo, Doing and Done columns. The page shows five things:

1. **Built on load.** The server-rendered card table becomes the board. With JavaScript off it is still a readable table.
2. **Move a card.** Dragging a card raises a bubbling `lattice:kanban-change` event with the card id and the columns it left and reached; `hx-trigger="lattice:kanban-change"` posts it with `hx-post`, and the server's reply appears under the board.
3. **A refused drop.** The `transitions` option lists the columns each column may reach, so dragging a Todo card straight to Done is refused before anything is posted.
4. **Out of band.** "Server reassigns one card" returns one `<tr data-lattice-row>` with `hx-swap-oob`, and only that card changes owner.
5. **Back.** Picking a team runs an `hx-get`; the old board is torn down and a new one is built from the new table. Pressing Back returns the previous cards with the board rebuilt.

## The stand-in server

GitHub Pages is static, so `src/mock-server.js` answers htmx's requests to `/htmx-demo/` in the browser, from the route handlers in `src/server.js`, after a short delay so each swap is visible. Nothing leaves the page. Those handlers are exactly what a real server would do: return a team's HTML for `GET /htmx-demo/kanban/cards`, store the move and reply with a line of text for `POST /htmx-demo/kanban/move`, and return one card row out of band for `POST /htmx-demo/kanban/reassign`. Port them to your own backend (Django, Rails, Laravel, Go, anything that renders HTML) and delete the stand-in.

## Run it

```
npm ci
npm run serve        # http://localhost:8000/
npm run verify       # headless Chrome check of the steps (needs Chrome)
```

The grid and the Kanban board load from the published `@toclocoinc/lattice-grid` package on jsDelivr; change the version in `index.html` and `main.js` to move to a newer release. On `localhost` no licence key is needed; the key in `main.js` is the public one for `toclocoinc.github.io`.

## Files

- `index.html`: the page, with the server-rendered cards already in it.
- `main.js`: installs the stand-in server, loads the Kanban engine, the Lattice htmx module and htmx.
- `src/server.js`: the demo data, the HTML template and the route handlers.
- `src/mock-server.js`: the in-browser stand-in for a backend.

Licence: MIT for this demo's code. Lattice Grid itself is commercially licensed; see [latticegrid.dev/pricing](https://www.latticegrid.dev/pricing/).
