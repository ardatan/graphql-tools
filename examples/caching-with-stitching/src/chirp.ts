import { ApolloServer } from 'apollo-server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';
import { RedisCache } from 'apollo-server-cache-redis';
import responseCachePlugin from 'apollo-server-plugin-response-cache';
import { CacheDirectives } from './utils/cacheDirectives';

let chirpSchema = makeExecutableSchema({
  typeDefs: `
        ${CacheDirectives}\n
        type Chirp @cacheControl(maxAge: 120) {
            id: ID!
            text: String @cacheControl(maxAge: 60)
            author: User!
        }

        type User {
            id: ID!
            chirps: [Chirp]
        }

        type Query {
            chirpById(id: ID!): Chirp
            chirpsByAuthorId(authorId: ID!): [Chirp]
            userById(id: ID!): User
        }
    `,
});

chirpSchema = addMocksToSchema({ schema: chirpSchema });

const server = new ApolloServer({
  schema: chirpSchema,
  cache: new RedisCache({
    host: 'localhost',
    // Options are passed through to the Redis client
  }),
  plugins: [responseCachePlugin()],
});

server.listen(4321).then(({ url }) => {
  console.log(`Simple chirp service running at ${url}`);
});
