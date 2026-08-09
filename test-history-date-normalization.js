const assert = require('assert');
const { serializeHistoryData } = require('./utils/historyUtils');

const input = {
  dob: new Date('2024-01-02T00:00:00.000Z'),
  createdAt: new Date('2024-01-02T10:30:00.000Z'),
  nested: {
    dob: new Date('2024-01-03T00:00:00.000Z')
  }
};

const output = serializeHistoryData(input);

assert.strictEqual(output.dob, '2024-01-02');
assert.strictEqual(output.createdAt, '2024-01-02T10:30:00.000Z');
assert.strictEqual(output.nested.dob, '2024-01-03');

console.log('history date normalization test passed');
