const express = require('express');
const runStitchingGateway = require('./stitching');
const runApolloGateway = require('./federation');
const makeMonolithSchema = require('./monolith');
const { parse, execute } = require('graphql');

function memoize1(fn) {
  const memoize1cache = new Map();
  return function memoized(a1) {
    const cachedValue = memoize1cache.get(a1);
    if (cachedValue === undefined) {
      const newValue = fn(a1);
      memoize1cache.set(a1, newValue);
      return newValue;
    }

    return cachedValue;
  };
}

function memoize1(fn) {
  const memoize1cache = new Map();
  return function memoized(a1) {
    const cachedValue = memoize1cache.get(a1);
    if (cachedValue === undefined) {
      const newValue = fn(a1);
      memoize1cache.set(a1, newValue);
      return newValue;
    }

    return cachedValue;
  };
}

async function main() {
  const scenarios = await Promise.all([runStitchingGateway(), runApolloGateway(), makeMonolithSchema()]);

  const [stitching, federation, monolith] = scenarios;
  const [stitchingParse, federationParse, monolithParse] = scenarios.map(() => memoize1(parse));

  const app = express();

  app.use(express.json());

  app.post('/federation', (req, res) => {
    federation
      .executor({
        document: federationParse(req.body.query),
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
      document: stitchingParse(req.body.query),
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
        document: monolithParse(req.body.query),
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
