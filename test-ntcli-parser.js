'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseJsonish, parseSections } = require('./ntcli-parser');

const docs = path.join(__dirname, 'Docs');
const sample = name => fs.readFileSync(path.join(docs, `${name}.json`), 'utf8');

const settings = parseJsonish(sample('settings'));
const status = parseJsonish(sample('status'));
const supplies = parseJsonish(sample('supplies'));
const destination = parseJsonish(sample('destination'));

assert.strictEqual(settings.modelType, 'H');
assert.strictEqual(status.printReady, false);
assert.strictEqual(status.Errors['2'].PaperJam.pageID, 1);
assert.strictEqual(supplies.YBottle.Status.percentRemaining, 100);
assert.match(supplies.YBottle.Attributes.uniqueId, /^0x[0-9a-f]+$/i);
assert.strictEqual(destination['Bin 1'].capacity, 2000);

const sections = parseSections([
  '=== Settings ===', sample('settings'),
  '=== Status ===', sample('status'),
  '=== Supplies ===', sample('supplies'),
  '=== Destination ===', sample('destination')
].join('\n'));
assert.strictEqual(sections.settings.modelType, 'H');
assert.strictEqual(sections.status.printReady, false);
assert.strictEqual(sections.supplies.YBottle.Status.percentRemaining, 100);
assert.strictEqual(sections.destination['Bin 1'].capacity, 2000);

assert.deepStrictEqual(parseJsonish('{"value":"comma,} and <hex:literal>",}'), {
  value: 'comma,} and <hex:literal>'
});

console.log('NTCLI parser examples passed.');
