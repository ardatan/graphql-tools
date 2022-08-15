import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { GraphQLSchema, graphqlSync } from 'graphql';
import { UrlLoader } from '../src';

describe('sync', () => {
  const loader = new UrlLoader();
  it('should handle introspection', () => {
    const [{ schema }] = loader.loadSync(`https://swapi-graphql.netlify.app/.netlify/functions/index`, {});
    expect(schema).toBeInstanceOf(GraphQLSchema);
    expect(printSchemaWithDirectives(schema!).trim()).toMatchSnapshot();
  });
  it('should handle queries', () => {
    const [{ schema }] = loader.loadSync(`https://swapi-graphql.netlify.app/.netlify/functions/index`, {});
    const result = graphqlSync({
      // @ts-expect-error Uses graphql-js so it doesn't like us
      schema: schema!,
      source: /* GraphQL */ `
        {
          allFilms {
            totalCount
          }
        }
      `,
    });
    expect(result).toMatchSnapshot();
  });
});
