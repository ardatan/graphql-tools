// Generates a schema for graphql-js given a shorthand schema

import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLEnumType,
  GraphQLInterfaceType,
  GraphQLString,
  GraphQLInt,
  GraphQLID,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
} from 'graphql';

import { parse } from './shorthandParser.js';

const typeMap = new Map([
  ['Int', GraphQLInt],
  ['String', GraphQLString],
  ['ID', GraphQLID],
  ['Float', GraphQLFloat],
  ['Boolean', GraphQLBoolean],
]);

const kindMap = new Map([
  ['INTERFACE', GraphQLInterfaceType],
  ['ENUM', GraphQLEnumType],
  ['TYPE', GraphQLObjectType],
]);

// @schema: A GraphQL type schema in shorthand
// @resolvers: Definitions for resolvers to be merged with schema
// TODO add resolvers to arguments
const generateSchema = (schema) => {
  const typeArray = parse(schema);

  // TODO should probably clone typeMap here to make generator reusable
  for (const typeDef of typeArray) {
    typeMap.set(typeDef.name, makeGraphQLType(typeDef, typeMap));
  }
  // find a RootQuery and RootMutation if they exist.
  const query = typeMap.get('RootQuery');
  const mutation = typeMap.get('RootQueryMutation');
  if (typeof query === 'undefined' && typeof mutation === 'undefined') {
    throw new Error('Either RootQuery or RootMutation must be defined');
  }
  return new GraphQLSchema({
    query,
    mutation,
  });
};

// TODO test this function individually
const makeFields = (myFields, myTypeMap) => {
  const ret = {};
  for (const fieldName of Object.keys(myFields)) {
    const field = myFields[fieldName];
    ret[fieldName] = { type: myTypeMap.get(field.type) }; // is this ok?
    if (field.list) {
      ret[fieldName].type = new GraphQLList(ret[fieldName].type);
    }
    if (field.required) {
      ret[fieldName].type = new GraphQLNonNull(ret[fieldName].type);
    }
    // TODO should know if list is nonNull or wrapped type is nonNull
    if (field.args) {
      // arguments are just like nested fields
      ret[fieldName].args = makeFields(field.args, myTypeMap);
    }
  }
  return ret;
};

// turns definition into a type for a GraphQL-js schema
const makeGraphQLType = (typeDef, myTypeMap) => {
  if (typeMap.has(typeDef.name)) {
    throw new Error(`Type '${typeDef.name}' is already defined.`);
  }

  const typeConstructor = kindMap.get(typeDef.type);
  if (typeof typeConstructor === 'undefined') {
    throw new Error(`Unrecognized shorthand class: ${typeDef.type}`);
  }

  // TODO At some point you should check that all fields refer to existing types
  return new typeConstructor({
    name: typeDef.name,
    description: typeDef.description,
    // TODO interfaces ...
    fields: makeFields.bind(null, typeDef.fields, myTypeMap),
  });
};

export { generateSchema };
