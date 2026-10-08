/* DOM helpers, icon set and small utilities. Everything hangs off the single global `CRX`. */
(function (g) {
  'use strict';
  var CRX = g.CRX = g.CRX || {};
  CRX.tabs = []; CRX.ui = {}; CRX.util = {};
  CRX.registerTab = function (def) { CRX.tabs.push(def); };

  /** h('div.a.b', {id:'x', onClick:fn, 'aria-label':'y'}, child, [child...]) */
  function h(tag, props) {
    var parts = String(tag).split('.');
    var el = document.createElement(parts[0] || 'div');
    if (parts.length > 1) el.className = parts.slice(1).join(' ');
    if (props && typeof props === 'object' && !(props instanceof Node) && !Array.isArray(props)) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className += (el.className ? ' ' : '') + v;
        else if (k === 'style') { if (typeof v === 'string') el.style.cssText = v; else Object.assign(el.style, v); }
        else if (k === 'dataset') Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'value' || k === 'checked' || k === 'disabled' && 'disabled' in el || k === 'selected') el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      });
      append(el, Array.prototype.slice.call(arguments, 2));
    } else {
      append(el, Array.prototype.slice.call(arguments, 1));
    }
    return el;
  }
  function append(el, kids) {
    kids.forEach(function (k) {
      if (k == null || k === false || k === true) return;
      if (Array.isArray(k)) append(el, k);
      else el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
    });
  }

  var ICONS = {
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    chevR: '<path d="m9 6 6 6-6 6"/>',
    chevL: '<path d="m15 6-6 6 6 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
    warn: '<path d="M12 3 2 20h20z"/><path d="M12 10v4.5M12 17.5v.01"/>',
    danger: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16v.01"/>',
    ok: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.3 2.4 2.4 4.6-5"/>',
    bolt: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.5 2.7-5.5 6-5.5S15 16.5 15 20"/><path d="M16 5a3 3 0 0 1 0 6M18 14.5c2 .6 3 2.2 3 5.5"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16z"/><path d="m14 6 4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    filter: '<path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/>',
    upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
    more: '<circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M16 7l3 3M14 9l2 2"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    mapPin: '<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    msg: '<path d="M4 5h16v11H9l-5 4z"/>',
    sliders: '<path d="M5 5v14M12 5v14M19 5v14M3 9h4M10 14h4M17 8h4"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    desk: '<rect x="4" y="3" width="16" height="9" rx="2"/><path d="M8 12v3h8v-3M6 21h12M9 15l-1 6M15 15l1 6"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 6.2A9.6 9.6 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.8M6.5 7.7C3.9 9.5 2 12 2 12s4 7 10 7a9 9 0 0 0 4-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    wave: '<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    undo: '<path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3"/>',
    flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
    server: '<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01"/>',
    dollar: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.2c-.4-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.7-2.5 1.8 0 2.5 5 1.2 5 3.7 0 1.1-1.1 1.9-2.5 1.9-1.2 0-2.2-.5-2.6-1.4M12 6.5V8m0 8v1.5"/>',
    dot: '<circle cx="12" cy="12" r="4" fill="currentColor"/>'
  };
  function icon(name, size, cls) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('width', size || 16); s.setAttribute('height', size || 16);
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    s.setAttribute('class', 'ico' + (cls ? ' ' + cls : ''));
    s.innerHTML = ICONS[name] || ICONS.dot;
    return s;
  }

  var uidN = 0;
  function uid(p) { return (p || 'id') + '-' + (++uidN); }
  function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function getPath(o, path) {
    var p = Array.isArray(path) ? path : String(path).split('.');
    for (var i = 0; i < p.length; i++) { if (o == null) return undefined; o = o[p[i]]; }
    return o;
  }
  function setPath(o, path, v) {
    var p = Array.isArray(path) ? path : String(path).split('.');
    for (var i = 0; i < p.length - 1; i++) { if (o[p[i]] == null) o[p[i]] = {}; o = o[p[i]]; }
    o[p[p.length - 1]] = v;
  }
  function merge(def, stored) { // defaults win for missing keys; stored wins for present ones
    if (Array.isArray(def) || def === null || typeof def !== 'object') return stored === undefined ? clone(def) : stored;
    var out = {};
    Object.keys(def).forEach(function (k) { out[k] = stored && typeof stored === 'object' && k in stored ? merge(def[k], stored[k]) : clone(def[k]); });
    return out;
  }
  function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDateTime(d) {
    d = d instanceof Date ? d : new Date(d);
    var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
    return d.getDate() + ' ' + m + ' ' + d.getFullYear() + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fmtDate(iso) { // YYYY-MM-DD -> "26 Jan 2026 (Mon)"
    var p = String(iso).split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]);
    if (isNaN(d)) return iso;
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] + ', ' + d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + d.getFullYear();
  }
  function ago(ts) {
    var s = Math.max(1, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
    if (s < 60) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    return Math.round(s / 86400) + ' d ago';
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function humanSeconds(s) {
    s = Math.round(s);
    if (!isFinite(s) || s < 0) return '';
    var d = Math.floor(s / 86400), hr = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60, out = [];
    if (d) out.push(plural(d, 'day')); if (hr) out.push(plural(hr, 'hour')); if (m) out.push(plural(m, 'minute')); if (sec) out.push(plural(sec, 'second'));
    return out.join(' ') || '0 seconds';
  }
  function initials(name) { return String(name).split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }
  function isInt(v, min, max) { var n = Number(v); return v !== '' && v !== null && Number.isInteger(n) && n >= min && n <= max; }

  /** replaceChildren that ignores null/false children instead of rendering the text "null". */
  CRX.setKids = function (el) { el.textContent = ''; append(el, Array.prototype.slice.call(arguments, 1)); return el; };
  /** Settings that are hidden while their parent switch is off must not count as changes.
      rules: [{ on: function (state) { return bool; }, drop: ['a.b', 'c'] }].
      - switch off in the edited (draft) version: the details are hidden, so they are dropped from both sides and only the switch shows as the change;
      - switch turned on in the draft: the details the user just set are kept, and compared with nothing (the saved side is hidden). */
  CRX.pruneWhen = function (rules) {
    return function (d, other, isDraft) {
      rules.forEach(function (r) {
        if (r.on(d) && (isDraft || r.on(other))) return;
        r.drop.forEach(function (p) {
          var parts = p.split('.'), last = parts.pop(), t = parts.length ? parts.reduce(function (o, k) { return o && o[k]; }, d) : d;
          if (t && typeof t === 'object') delete t[last];
        });
      });
      return d;
    };
  };
  CRX.h = h; CRX.icon = icon; CRX.ICONS = ICONS;
  CRX.util = { uid: uid, clone: clone, same: same, getPath: getPath, setPath: setPath, merge: merge, debounce: debounce, pad: pad, fmtDateTime: fmtDateTime, fmtDate: fmtDate, ago: ago, plural: plural, humanSeconds: humanSeconds, initials: initials, isInt: isInt };
})(window);
