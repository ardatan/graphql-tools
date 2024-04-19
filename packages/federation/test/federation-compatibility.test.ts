import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { ExecutionResult, parse, printSchema, validate } from 'graphql';
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
      const tests: { query: string; expected: any }[] = JSON.parse(
        readFileSync(join(supergraphFixturesDir, 'tests.json'), 'utf-8'),
      );
      tests.forEach((test, i) => {
        it(`test-query-${i}`, async () => {
          let result;
          const document = parse(test.query, { noLocation: true });
          const validationErrors = validate(stitchedSchema, document);
          if (validationErrors.length > 0) {
            result = { errors: validationErrors };
          } else {
            result = await normalizedExecutor({
              schema: stitchedSchema,
              document,
            });
          }

          if (test.expected.errors === true) {
            if (test.expected.data) {
              expect(result).toMatchObject({
                data: test.expected.data,
                errors: expect.any(Array),
              });
            } else {
              expect(result).toMatchObject({
                errors: expect.any(Array),
              });
            }
          } else {
            expect(result).toMatchObject({
              data: test.expected.data,
            });
          }
        });
      });
    });
  });
});
