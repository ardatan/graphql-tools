import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { buildSchema, lexicographicSortSchema, printSchema, version } from 'graphql';
import {
  filterSchema,
  getDirective,
  printSchemaWithDirectives,
  pruneSchema,
} from '@graphql-tools/utils';
import {
  getStitchedSchemaFromSupergraphSdl,
  getSubschemasFromSupergraphSdl,
} from '../src/supergraph';

describe('Supergraphs', () => {
  if (version.startsWith('15')) {
    it('skipping tests for graphql v15', () => {
      expect(true).toBe(true);
    });
  }
  readdirSync(join(__dirname, 'fixtures', 'supergraphs')).forEach(fixture => {
    describe(fixture, () => {
      const fixturePath = join(__dirname, 'fixtures', 'supergraphs', fixture);
      const supergraphSdl = readFileSync(fixturePath, 'utf8');
      it('matches', () => {
        const schema = getStitchedSchemaFromSupergraphSdl({ supergraphSdl });
        const sortedSchema = lexicographicSortSchema(schema);
        const sortedInputSchema = lexicographicSortSchema(
          buildSchema(supergraphSdl, { noLocation: true, assumeValid: true, assumeValidSDL: true }),
        );
        const filteredInputSchema = pruneSchema(
          filterSchema({
            schema: sortedInputSchema,
            typeFilter: typeName =>
              !typeName.startsWith('link__') &&
              !typeName.startsWith('join__') &&
              !typeName.startsWith('core__'),
            fieldFilter: (_, __, fieldConfig) =>
              !getDirective(sortedInputSchema, fieldConfig, 'inaccessible')?.length,
            directiveFilter: () => false,
            enumValueFilter: (_, __, enumValueConfig) =>
              !getDirective(sortedInputSchema, enumValueConfig, 'inaccessible')?.length,
          }),
        );
        expect(printSchema(sortedSchema).trim()).toBe(printSchema(filteredInputSchema).trim());
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
