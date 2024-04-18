import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'graphql';
import { normalizedExecutor } from '@graphql-tools/executor';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';

describe('Federation Compatibility', () => {
  const fixturesDir = join(__dirname, 'fixtures', 'federation-compatibility');
  readdirSync(fixturesDir).forEach(supergraphName => {
    describe(supergraphName, () => {
      const supergraphFixturesDir = join(fixturesDir, supergraphName);
      const stitchedSchema = getStitchedSchemaFromSupergraphSdl({
        supergraphSdl: readFileSync(join(supergraphFixturesDir, 'supergraph.graphql'), 'utf-8'),
      });
      const tests: { query: string; expectedResult: any }[] = JSON.parse(
        readFileSync(join(supergraphFixturesDir, 'tests.json'), 'utf-8'),
      );
      tests.forEach((test, i) => {
        it(`test-query-${i}`, async () => {
          const result = await normalizedExecutor({
            schema: stitchedSchema,
            document: parse(test.query),
          });
          expect(result).toEqual(test.expectedResult);
        });
      });
    });
  });
});
