import { ApolloServer } from 'apollo-server';
import { stitchSchemas } from '@graphql-tools/stitch';
import fetchRemoteSchema from './utils/remoteSchema';
import { CacheControlHeaderPlugin } from './utils/cacheControlHeaderPlugin';

const authorUrl = 'http://localhost:1234/graphql';
const chirpUrl = 'http://localhost:4321/graphql';

const fetchAuthorSchema = fetchRemoteSchema(authorUrl);
const fetchChirpSchema = fetchRemoteSchema(chirpUrl);

Promise.all([fetchAuthorSchema, fetchChirpSchema]).then(([authorSchema, chirpSchema]) => {
  const gatewaySchema = stitchSchemas({
    subschemas: [
      {
        ...authorSchema,
        merge: {
          User: {
            fieldName: 'userById',
            selectionSet: '{ id }',
            args: partialUser => ({ id: partialUser.id }),
          },
        },
      },
      {
        ...chirpSchema,
        merge: {
          User: {
            fieldName: 'userById',
            selectionSet: '{ id }',
            args: partialUser => ({ id: partialUser.id }),
          },
        },
      },
    ],
    mergeTypes: true,
  });

  const server = new ApolloServer({
    schema: gatewaySchema,
    plugins: [CacheControlHeaderPlugin],
  });

  server.listen(4000).then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
  });
});
