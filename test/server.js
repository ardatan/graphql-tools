import { readFile } from 'fs';
import { generateSchema } from '../src/schemaGenerator.js';
import graphqlHTTP from 'express-graphql';
import express from 'express';
import resolveFunctions from './discourse-api/schema.js';

const app = express();

app.get('/', (req, res) => {
  res.redirect('/graphql');
});
// read discourse schema file
readFile('./test/discourse-api/schema.gql', 'utf8', (err, data) => {
  if (err) throw err;
  const Schema = generateSchema(data, resolveFunctions);
  makeGraphQLRoute(Schema);
});

function makeGraphQLRoute(Schema){
  const handler = graphqlHTTP((req) => {
    // Assuming this is synchronous
    const res = currentResponse;

    return {
      schema: Schema,
      graphiql: true,
      rootValue: {
        field: 'value',
        setHeader(key, value) {
          console.log('trying to set header');
          res.set(key, value);
        },
      },
      formatError: (error) => ({
        message: error.message,
        details: error.stack,
      }),
    };
  });

  let currentResponse;
  app.use('/graphql', (req, res, next) => {
    currentResponse = res;
    handler(req, res);
  });

  app.listen(3000);

  console.log('Server at http://localhost:3000/graphql ready for queries!');
}
