const { stitchSchemas } = require('@graphql-tools/stitch');
const { federationToStitchingSDL, stitchingDirectives } = require('@graphql-tools/stitching-directives');
const { stitchingDirectivesTransformer } = stitchingDirectives();
const { buildSchema, execute, print } = require('graphql');

const services = [
  require('./services/accounts'),
  require('./services/inventory'),
  require('./services/products'),
  require('./services/reviews'),
];

const createExecutor =
  schema =>
  ({ document, variables }) =>
    execute({
      schema,
      document,
      variableValues: variables
    });

async function makeGatewaySchema() {
  return stitchSchemas({
    subschemaConfigTransforms: [stitchingDirectivesTransformer],
    subschemas: services.map(service => fetchFederationSubschema(service)),
  });
}

function fetchFederationSubschema({ schema, typeDefs }) {
  const sdl = federationToStitchingSDL(print(typeDefs));
  return {
    schema: buildSchema(sdl),
    executor: createExecutor(schema),
    batch: true
  };
}

module.exports = makeGatewaySchema;
