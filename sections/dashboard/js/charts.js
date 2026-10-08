/* Tiny SVG chart helpers (no libraries). Colours come from the shared CSS tokens so both themes work. */
(function (g) {
  'use strict';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /** Stacked bars: rows = [{label, answered, abandoned}] */
  function bars(rows) {
    var W = 720, H = 240, L = 34, B = 24, T = 8, n = rows.length;
    var max = Math.max.apply(null, rows.map(function (r) { return r.answered + r.abandoned; }));
    var step = max > 1000 ? 500 : max > 300 ? 100 : 50, top = Math.ceil(max / step) * step;
    var bw = (W - L) / n, inner = bw * 0.62, y = function (v) { return T + (H - T - B) * (1 - v / top); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Call volume">';
    for (var v = 0; v <= top; v += step) s += '<line class="gl" x1="' + L + '" x2="' + W + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="ax" x="' + (L - 6) + '" y="' + (y(v) + 3) + '" text-anchor="end">' + v + '</text>';
    rows.forEach(function (r, i) {
      var x = L + i * bw + (bw - inner) / 2, ha = y(0) - y(r.answered), hb = y(0) - y(r.abandoned);
      s += '<g><title>' + esc(r.label) + ': ' + r.answered + ' answered, ' + r.abandoned + ' abandoned</title>' +
        '<rect class="bar" x="' + x + '" y="' + y(r.answered) + '" width="' + inner + '" height="' + ha + '" rx="2" fill="var(--primary)"/>' +
        '<rect class="bar" x="' + x + '" y="' + (y(r.answered) - hb) + '" width="' + inner + '" height="' + hb + '" rx="2" fill="var(--danger)"/></g>';
      if (n <= 7 || i % 3 === 0) s += '<text class="ax" x="' + (x + inner / 2) + '" y="' + (H - 7) + '" text-anchor="middle">' + esc(r.label) + '</text>';
    });
    return s + '</svg>';
  }

  /** Donut: parts = [{label, n, color}] */
  function donut(parts, centerLabel) {
    var total = parts.reduce(function (a, p) { return a + p.n; }, 0), r = 52, c = 2 * Math.PI * r, off = 0;
    var s = '<svg viewBox="0 0 140 140" role="img" aria-label="Agent status"><g transform="rotate(-90 70 70)"><circle cx="70" cy="70" r="' + r + '" fill="none" stroke="var(--panel)" stroke-width="16"/>';
    parts.forEach(function (p) {
      var len = c * p.n / total;
      s += '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="' + p.color + '" stroke-width="16" stroke-dasharray="' + len + ' ' + (c - len) + '" stroke-dashoffset="' + (-off) + '"><title>' + esc(p.label) + ': ' + p.n + '</title></circle>';
      off += len;
    });
    return s + '</g><text class="ctr" x="70" y="72" text-anchor="middle">' + total + '</text><text class="sub" x="70" y="88" text-anchor="middle">' + esc(centerLabel) + '</text></svg>';
  }

  /** Sparkline for an array of numbers */
  function spark(vals, color) {
    var W = 120, H = 30, min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), span = max - min || 1;
    var pts = vals.map(function (v, i) { return (i / (vals.length - 1) * W).toFixed(1) + ',' + (H - 3 - (v - min) / span * (H - 6)).toFixed(1); });
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + pts.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  g.DBCharts = { bars: bars, donut: donut, spark: spark, esc: esc };
})(window);
