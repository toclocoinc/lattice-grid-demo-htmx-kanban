/**
 * The stand-in server.
 *
 * GitHub Pages is static, so there is no server to answer an hx-get. This
 * replaces window.XMLHttpRequest (the transport htmx uses) with one that
 * answers any request under /htmx-demo/ from route handlers running in the
 * page, after a short delay so each swap is visible. Every other URL goes to
 * the real XMLHttpRequest, and nothing here touches the network.
 *
 * A route handler has the shape a server's would: it takes the request
 * (method, path, and the query or form fields as one params object) and
 * returns an HTML fragment, or { html, status }.
 */
export const MOCK_PREFIX = '/htmx-demo/';

export function installMockServer(routes, delay = [150, 300]) {
  const RealXHR = window.XMLHttpRequest;

  class MockXHR extends EventTarget {
    readyState = 0; status = 0; statusText = ''; response = ''; responseText = '';
    responseURL = ''; responseType = ''; timeout = 0; withCredentials = false;
    upload = new EventTarget();
    onload = null; onerror = null; onabort = null; ontimeout = null; onloadend = null; onreadystatechange = null;
    #method = 'GET'; #url = ''; #resHeaders = {}; #timer;

    open(method, url) {
      this.#method = method.toUpperCase();
      this.#url = url;
      this.responseURL = new URL(url, location.href).href;
      this.readyState = 1;
    }
    setRequestHeader() {}
    overrideMimeType() {}
    getAllResponseHeaders() {
      return Object.entries(this.#resHeaders).map(([k, v]) => `${k}: ${v}\r\n`).join('');
    }
    getResponseHeader(k) { return this.#resHeaders[k.toLowerCase()] ?? null; }
    abort() { clearTimeout(this.#timer); this.#fire('abort'); }
    send(body) {
      const u = new URL(this.#url, location.href);
      const params = Object.fromEntries(u.searchParams);
      if (typeof body === 'string' && body) Object.assign(params, Object.fromEntries(new URLSearchParams(body)));
      else if (body instanceof FormData) body.forEach((v, k) => { params[k] = String(v); });
      const path = u.pathname.slice(u.pathname.indexOf(MOCK_PREFIX));
      const ms = delay[0] + Math.random() * (delay[1] - delay[0]);
      this.#timer = setTimeout(() => {
        const handler = routes[`${this.#method} ${path}`];
        const out = handler ? handler({ method: this.#method, path, params }) : { html: 'No such route', status: 404 };
        const res = typeof out === 'string' ? { html: out } : out;
        this.status = res.status ?? 200;
        this.statusText = this.status === 200 ? 'OK' : 'Error';
        this.#resHeaders = { 'content-type': 'text/html; charset=utf-8' };
        this.response = this.responseText = res.html;
        this.readyState = 4;
        this.#fire('readystatechange');
        this.#fire('load');
        this.#fire('loadend');
      }, ms);
    }
    #fire(type) {
      const e = new Event(type);
      this['on' + type]?.(e);
      this.dispatchEvent(e);
    }
  }

  // htmx calls `new XMLHttpRequest()` before it knows the URL, so hand back an
  // object that decides on open(): the stand-in for /htmx-demo/ paths, the
  // real one for everything else.
  function Switch() {
    const real = new RealXHR();
    const mock = new MockXHR();
    let target = real;
    return new Proxy({}, {
      get(_t, k) {
        if (k === 'open') {
          return (m, url, ...rest) => {
            const p = new URL(url, location.href);
            target = p.origin === location.origin && p.pathname.includes(MOCK_PREFIX) ? mock : real;
            return target.open(m, url, ...rest);
          };
        }
        const v = target[k];
        return typeof v === 'function' ? v.bind(target) : v;
      },
      set(_t, k, v) {
        // Handlers set before open() must reach whichever object answers.
        real[k] = v;
        mock[k] = v;
        return true;
      },
    });
  }
  window.XMLHttpRequest = Switch;
}
