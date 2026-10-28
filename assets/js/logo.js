/* ShiftReady — logo: a clock with a restart arrow, and the "ShiftReady" wordmark,
   on a white rounded tile. Drawn inline (SVG) so it is sharp at any size and needs
   no image download. Loaded first, because the welcome screen uses it. */
window.SR = window.SR || {};
(function () {
  'use strict';

  // The mark on a 64 × 64 grid: an open circle ending in an arrowhead (clockwise),
  // with the clock hands at twelve and half past four.
  const MARK =
    '<path d="M53.67 35.83A22 22 0 1 1 46.14 15.15" fill="none" stroke="currentColor" stroke-width="4.6" stroke-linecap="round"/>' +
    '<path d="M51.9 20.2 39.6 19.4 49 7.6Z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M32 19.5V32l7.6 6.4" fill="none" stroke="currentColor" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>';

  const svg = (size, view, body, label, cls) =>
    '<svg xmlns="http://www.w3.org/2000/svg" class="sr-logo' + (cls ? ' ' + cls : '') + '" width="' + size + '" height="' + size + '" viewBox="' + view + '"' +
    (label ? ' role="img" aria-label="' + label + '"' : ' aria-hidden="true" focusable="false"') + '>' + body + '</svg>';

  // Just the mark, in the current text colour
  function mark(size, opts) { opts = opts || {}; return svg(size, '0 0 64 64', MARK, opts.label, opts.cls); }

  // The tile: white rounded square with a thin dark edge. With the wordmark when there is room.
  // opts: { word: false, label: 'ShiftReady', cls: 'extra classes' }
  function tile(size, opts) {
    opts = opts || {};
    const word = opts.word !== false && size >= 72;
    const edge = size >= 72 ? 3 : 5;
    let body = '<rect x="4" y="4" width="192" height="192" rx="46" fill="#fff" stroke="#2a2a2a" stroke-width="' + edge + '"/>';
    if (word) {
      body += '<g transform="translate(64.8 30) scale(1.1)">' + MARK.replace(/currentColor/g, '#0b0b0b') + '</g>' +
        '<text x="100" y="150" text-anchor="middle" fill="#0b0b0b" font-family="Inter, system-ui, -apple-system, \'Segoe UI\', sans-serif" font-size="33" letter-spacing="-0.7">' +
        '<tspan font-weight="700">Shift</tspan><tspan font-weight="500">Ready</tspan></text>';
    } else {
      body += '<g transform="translate(36 36) scale(2)">' + MARK.replace(/currentColor/g, '#0b0b0b') + '</g>';
    }
    return svg(size, '0 0 200 200', body, opts.label, opts.cls);
  }

  window.SR.logo = { mark, tile, MARK };
})();
