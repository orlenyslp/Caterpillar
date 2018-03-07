
import * as assert from 'assert';
import * as mocha from 'mocha';

import { parseBpmn } from '../src/models/models.parsers';
import * as fs from 'fs';

const example = fs.readFileSync('example.bpmn', 'utf-8');

describe('bpmn compilers', () => {
  it('', () => {
    let definitions = parseBpmn(example);

    assert.notEqual(definitions, null);
  });
});