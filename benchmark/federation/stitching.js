const { stitchSchemas } = require('@graphql-tools/stitch');
const { federationToStitchingSDL, stitchingDirectives } = require('@graphql-tools/stitching-directives');
const { stitchingDirectivesTransformer } = stitchingDirectives();
const { buildSchema, execute, print } = require('graphql');
const { inspect } = require('util');

const serviceMap = {
  accounts: require('./services/accounts'),
  inventory: require('./services/inventory'),
  products: require('./services/products'),
  reviews: require('./services/reviews'),
};

function createExecutor(schema, serviceName) {
  return function serviceExecutor({ document, variables, context }) {
    // console.log(
    //   serviceName,
    //   print(document),
    //   variables
    // );
    return execute({
      schema,
      document,
      variableValues: variables,
      contextValue: context,
    });
  };
}

async function makeGatewaySchema() {
  return stitchSchemas({
    subschemaConfigTransforms: [stitchingDirectivesTransformer],
    subschemas: Object.entries(serviceMap).map(([serviceName, service]) =>
      fetchFederationSubschema(service, serviceName)
    ),
  });
}

function fetchFederationSubschema({ schema, typeDefs }, serviceName) {
  const sdl = federationToStitchingSDL(print(typeDefs));
  return {
    schema: buildSchema(sdl),
    executor: createExecutor(schema, serviceName),
    batch: true,
  };
}

module.exports = makeGatewaySchema;
