const express = require('express');
const runStitchingGateway = require('./stitching');
const runApolloGateway = require('./federation');
const makeMonolithSchema = require('./monolith');
const { parse, execute } = require('graphql');

async function main() {
  const [stitching, federation, monolith] = await Promise.all([
    runStitchingGateway(),
    runApolloGateway(),
    makeMonolithSchema(),
  ]);

  const app = express();

  app.use(express.json());

  app.post('/federation', (req, res) => {
    federation
      .executor({
        document: parse(req.body.query),
        request: {
          query: req.body.query,
        },
        cache: {
          get: async () => undefined,
          set: async () => {},
          delete: async () => true,
        },
        schema: federation.schema,
        context: {},
      })
      .then(result => res.json(result))
      .catch(error => res.status(500).send(error));
  });

  app.post('/stitching', (req, res) => {
    execute({
      schema: stitching,
      document: parse(req.body.query),
      contextValue: {},
    })
      .then(result => {
        res.json(result);
      })
      .catch(error => res.status(500).send(error));
  });

  app.post('/monolith', (req, res) => {
    try {
      const result = execute({
        schema: monolith,
        document: parse(req.body.query),
        contextValue: {},
      });
      res.json(result);
    } catch (error) {
      res.status(500).send(error);
    }
  });

  app.listen(3000, () => {
    console.log('listening on 0.0.0.0:3000');
  });
}

main();
