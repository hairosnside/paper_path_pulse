'use strict';

function parseJsonish(value) {
  const trimmed = String(value || '').replace(/^\uFEFF/, '').trim();
  if (!trimmed) return null;

  let normalized = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < trimmed.length; i += 1) {
    const char = trimmed[i];
    if (inString) {
      normalized += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
      normalized += char;
      continue;
    }

    if (trimmed.startsWith('<hex:', i)) {
      const end = trimmed.indexOf('>', i + 5);
      if (end !== -1) {
        normalized += JSON.stringify(`0x${trimmed.slice(i + 5, end)}`);
        i = end;
        continue;
      }
    }

    if (char === ',') {
      let next = i + 1;
      while (/\s/.test(trimmed[next] || '')) next += 1;
      if (trimmed[next] === '}' || trimmed[next] === ']') continue;
    }
    normalized += char;
  }

  try {
    return JSON.parse(normalized);
  } catch {
    return trimmed;
  }
}

function parseSections(stdout) {
  const names = ['Settings', 'Status', 'Supplies', 'Destination'];
  const result = {};
  for (let i = 0; i < names.length; i += 1) {
    const name = names[i];
    const marker = `=== ${name} ===`;
    const start = stdout.indexOf(marker);
    const nextMarker = names[i + 1] ? `=== ${names[i + 1]} ===` : null;
    if (start < 0) {
      result[name.toLowerCase()] = null;
      continue;
    }
    const from = start + marker.length;
    const end = nextMarker ? stdout.indexOf(nextMarker, from) : stdout.length;
    result[name.toLowerCase()] = parseJsonish(stdout.slice(from, end < 0 ? stdout.length : end));
  }
  return result;
}

module.exports = { parseJsonish, parseSections };
