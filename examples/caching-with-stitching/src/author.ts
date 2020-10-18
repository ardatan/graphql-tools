import { ApolloServer } from 'apollo-server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';
import { RedisCache } from 'apollo-server-cache-redis';
import responseCachePlugin from 'apollo-server-plugin-response-cache';
import { CacheDirectives } from './utils/cacheDirectives';

let authorSchema = makeExecutableSchema({
  typeDefs: `
        ${CacheDirectives}\n
        type User @cacheControl(maxAge: 180) {
            id: ID!
            email: String @cacheControl(maxAge: 120)
        }
    
        type Query {
            userById(id: ID!): User
        }
    `,
});

authorSchema = addMocksToSchema({ schema: authorSchema });

const server = new ApolloServer({
  schema: authorSchema,
  cache: new RedisCache({
    host: 'localhost',
    // Options are passed through to the Redis client
  }),
  plugins: [responseCachePlugin()],
});

server.listen(1234).then(({ url }) => {
  console.log(`Simple author service running at ${url}`);
});
