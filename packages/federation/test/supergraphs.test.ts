import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { buildSchema, lexicographicSortSchema, printSchema, versionInfo } from 'graphql';
import { filterSchema, getDirective, pruneSchema } from '@graphql-tools/utils';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';

describe('Supergraphs', () => {
  if (versionInfo.major === 15) {
    it('skipping tests for graphql v15', () => {
      expect(true).toBe(true);
    });
    return;
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
        expect(printSchema(pruneSchema(sortedSchema)).trim()).toBe(
          printSchema(filteredInputSchema).trim(),
        );
      });
    });
  });
});
