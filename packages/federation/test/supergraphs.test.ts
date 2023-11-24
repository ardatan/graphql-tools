import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import {
  getStitchedSchemaFromSupergraphSdl,
  getSubschemasFromSupergraphSdl,
} from '../src/supergraph';

describe('Supergraphs', () => {
  readdirSync(join(__dirname, 'fixtures', 'supergraphs')).forEach(fixture => {
    describe(fixture, () => {
      const fixturePath = join(__dirname, 'fixtures', 'supergraphs', fixture);
      const supergraphSdl = readFileSync(fixturePath, 'utf8');
      it('matches', () => {
        const schema = getStitchedSchemaFromSupergraphSdl({ supergraphSdl });
        expect(printSchemaWithDirectives(schema).trim()).toMatchSnapshot(
          `${fixture} - stitchedSchema`,
        );
      });
      it('subgraphs', () => {
        const subschemas = getSubschemasFromSupergraphSdl({ supergraphSdl });
        for (const [subgraphName, subschema] of subschemas) {
          expect(printSchemaWithDirectives(subschema.schema).trim()).toMatchSnapshot(
            `${fixture} - ${subgraphName}`,
          );
        }
      });
    });
  });
});
