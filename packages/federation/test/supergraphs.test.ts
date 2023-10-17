import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';

describe('Supergraphs', () => {
  readdirSync(join(__dirname, 'fixtures', 'supergraphs')).forEach(fixture => {
    it(fixture, () => {
      const fixturePath = join(__dirname, 'fixtures', 'supergraphs', fixture);
      const supergraphSdl = readFileSync(fixturePath, 'utf8');
      const schema = getStitchedSchemaFromSupergraphSdl({ supergraphSdl });
      expect(printSchemaWithDirectives(schema).trim()).toMatchSnapshot(fixture);
    });
  });
});
