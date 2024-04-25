import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse, validate } from 'graphql';
import { normalizedExecutor } from '@graphql-tools/executor';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';

describe('Federation Compatibility', () => {
  const fixturesDir = join(__dirname, 'fixtures', 'federation-compatibility');
  readdirSync(fixturesDir).forEach(supergraphName => {
    const supergraphFixturesDir = join(fixturesDir, supergraphName);
    const supergraphSdlPath = join(supergraphFixturesDir, 'supergraph.graphql');
    if (!existsSync(supergraphSdlPath)) {
      return;
    }
    describe(supergraphName, () => {
      const stitchedSchema = getStitchedSchemaFromSupergraphSdl({
        supergraphSdl: readFileSync(supergraphSdlPath, 'utf-8'),
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
            if ('errors' in result && result.errors) {
              for (const error of result.errors) {
                console.error({
                  message: error.message,
                  stack: error.stack,
                  extensions: error.extensions,
                });
              }
            }
            expect(result).toMatchObject({
              data: test.expected.data,
            });
          }
        });
      });
    });
  });
});
