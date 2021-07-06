const { stitchSchemas } = require('@graphql-tools/stitch');
const { federationToStitchingSDL, stitchingDirectives } = require('@graphql-tools/stitching-directives');
const { stitchingDirectivesTransformer } = stitchingDirectives();
const { buildSchema, execute, print } = require('graphql');

const accounts = require('./services/accounts');
const inventory = require('./services/inventory');
const products = require('./services/products');
const reviews = require('./services/reviews');

const createExecutor = schema => {
  return ({ document, variables }) => execute({
    schema,
    document,
    variableValues: variables
  });
};

async function makeGatewaySchema() {
  return stitchSchemas({
    subschemaConfigTransforms: [stitchingDirectivesTransformer],
    subschemas: [
      fetchFederationSubschema(accounts),
      fetchFederationSubschema(inventory),
      fetchFederationSubschema(products),
      fetchFederationSubschema(reviews),
    ],
  });
}

function fetchFederationSubschema({ schema, typeDefs }) {
  const sdl = federationToStitchingSDL(print(typeDefs));
  return {
    schema: buildSchema(sdl),
    executor: createExecutor(schema),
  };
}

module.exports = makeGatewaySchema;
