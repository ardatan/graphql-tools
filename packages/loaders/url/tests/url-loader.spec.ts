import { makeExecutableSchema } from '@graphql-tools/schema';
import { UrlLoader } from '../src';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import nock from 'nock';
import { mockGraphQLServer } from '../../../testing/utils';
import { cwd } from 'process';

const SHOULD_NOT_GET_HERE_ERROR = 'SHOULD_NOT_GET_HERE';

describe('Schema URL Loader', () => {
  const loader = new UrlLoader();

  const testTypeDefs = /* GraphQL */`
schema { query: CustomQuery }
"""Test type comment"""
type CustomQuery {
  """Test field comment"""
  a: String
}
`.trim();

  const testSchema = makeExecutableSchema({ typeDefs: testTypeDefs });

  const testHost = `http://localhost:3000`;
  const testPath = `/graphql`;
  const testUrl = `${testHost}${testPath}`;

  describe('handle', () => {
    it('Should throw an error when introspection is not valid', async () => {
      const brokenData = {data: {}};
      const scope = nock(testHost).post(testPath).reply(200, brokenData);

      try {
        await loader.load(testUrl, {});
        throw new Error(SHOULD_NOT_GET_HERE_ERROR);
      } catch (e) {
        expect(e.message).not.toBe(SHOULD_NOT_GET_HERE_ERROR);
        expect(e.message).toBe('Could not obtain introspection result, received: ' + JSON.stringify(brokenData));
      }

      scope.done();
    });

    it('Should return a valid schema when request is valid', async () => {
      const server = mockGraphQLServer({schema: testSchema, host: testHost, path: testPath});

      const schema = await loader.load(testUrl, {});

      server.done();

      expect(schema.schema).toBeDefined();
      expect(printSchemaWithDirectives(schema.schema)).toBe(testTypeDefs);
    });

    it('Should pass default headers', async () => {
      let headers: Record<string, string> = {}

      const server = mockGraphQLServer({schema: testSchema, host: testHost, path: testPath, intercept(ctx) {
        headers = ctx.req.headers
      }});

      const schema = await loader.load(testUrl, {});

      server.done();

      expect(schema).toBeDefined();
      expect(schema.schema).toBeDefined();
      expect(printSchemaWithDirectives(schema.schema)).toBe(testTypeDefs);

      expect(headers.accept).toContain(`application/json`);
      expect(headers['content-type']).toContain(`application/json`);
    });

    it('Should pass extra headers when they are specified as object', async () => {
      let headers: Record<string, string> = {}
      const server = mockGraphQLServer({schema: testSchema, host: testHost, path: testPath, intercept(ctx) {
        headers = ctx.req.headers
      }});

      const schema = await loader.load(testUrl, { headers: { Auth: '1' } });

      server.done();

      expect(schema).toBeDefined();
      expect(schema.schema).toBeDefined();
      expect(printSchemaWithDirectives(schema.schema)).toBe(testTypeDefs);

      expect(headers.accept).toContain(`application/json`);
      expect(headers['content-type']).toContain(`application/json`);
      expect(headers.auth).toContain(`1`);
    });

    it('Should pass extra headers when they are specified as array', async () => {
      let headers: Record<string, string> = {}
      const server = mockGraphQLServer({schema: testSchema, host: testHost, path: testPath, intercept(ctx) {
        headers = ctx.req.headers
      }});
      const schema = await loader.load(testUrl, { headers: [{ A: '1' }, { B: '2', C: '3' }] });

      server.done();

      expect(schema).toBeDefined();
      expect(schema.schema).toBeDefined();
      expect(printSchemaWithDirectives(schema.schema)).toBe(testTypeDefs);

      expect(headers.accept).toContain(`application/json`);
      expect(headers['content-type']).toContain(`application/json`);
      expect(headers.a).toContain(`1`);
      expect(headers.b).toContain(`2`);
      expect(headers.c).toContain(`3`);
    });

    it('Absolute file path should not be accepted as URL', async () => {
      expect(await loader.canLoad(cwd(), {})).toBeFalsy();
    });
  });
});
