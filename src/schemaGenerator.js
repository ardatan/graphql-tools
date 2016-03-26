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

/*
 * These constructor functions call the graphql-js type with the right arguments
 */
const objectConstructor = (typeDef, myTypeMap, myResolveFunctions = {}) => {
  // console.log(`Making fields for ${typeDef.name} ----`);
  // console.log('Resolves', JSON.stringify(Object.keys(myResolveFunctions)));
  // console.log('Fields', JSON.stringify(Object.keys(typeDef.fields)));
  return new GraphQLObjectType({
    name: typeDef.name,
    description: typeDef.description,
    // TODO interfaces ...
    fields: () => makeFields(typeDef.fields, myTypeMap, myResolveFunctions),
  });
};

const interfaceConstructor = (typeDef, myTypeMap) => {
  // TODO
  throw Error('Interface types not implemented!');
};

const enumConstructor = (typeDef) => {
  const makeEnumValues = (valuesArray) => {
    const valuesObj = {};
    valuesArray.forEach((v) => {
      valuesObj[v] = { value: v };
    });
    return valuesObj;
  };

  return new GraphQLEnumType({
    name: typeDef.name,
    description: typeDef.description,
    values: makeEnumValues(typeDef.values),
  });
};

const kindMap = new Map([
  ['INTERFACE', interfaceConstructor],
  ['ENUM', enumConstructor],
  ['TYPE', objectConstructor],
]);

// @schema: A GraphQL type schema in shorthand
// @resolvers: Definitions for resolvers to be merged with schema
// TODO add resolvers to arguments
// TODO still missing ENUM and INTERFACE support. Also missing input types
const generateSchema = (schema, resolveFunctions = {}) => {
  const typeArray = parse(schema);

  const typeMap = new Map([
    ['Int', GraphQLInt],
    ['String', GraphQLString],
    ['ID', GraphQLID],
    ['Float', GraphQLFloat],
    ['Boolean', GraphQLBoolean],
  ]);

  // TODO should probably clone typeMap here to make generator reusable
  for (const typeDef of typeArray) {
    typeMap.set(
      typeDef.name,
      makeGraphQLType(typeDef, typeMap, resolveFunctions[typeDef.name])
    );
  }
  // find a RootQuery and RootMutation if they exist.
  const query = typeMap.get('RootQuery');
  const mutation = typeMap.get('RootMutation');
  if (typeof query === 'undefined' && typeof mutation === 'undefined') {
    throw new Error('Either RootQuery or RootMutation must be defined');
  }
  return new GraphQLSchema({
    query,
    mutation,
  });
};

// TODO test this function individually
const makeFields = (myFields, myTypeMap, myResolveFunctions = {}) => {
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
    if (typeof myResolveFunctions[fieldName] !== 'undefined') {
      if (typeof myResolveFunctions[fieldName] !== 'function') {
        throw new Error(`Resolve for ${fieldName} is not a function`);
      }
      console.log('Resolve:', `${fieldName} has resolve function!`);
      ret[fieldName].resolve = myResolveFunctions[fieldName];
    }
  }
  return ret;
};

// turns definition into a type for a GraphQL-js schema
const makeGraphQLType = (typeDef, myTypeMap, myResolveFunctions) => {
  if (myTypeMap.has(typeDef.name)) {
    throw new Error(`Type '${typeDef.name}' is already defined.`);
  }

  const typeConstructor = kindMap.get(typeDef.type);
  if (typeof typeConstructor === 'undefined') {
    throw new Error(`Unrecognized shorthand class: ${typeDef.type}`);
  }

  // TODO At some point you should check that all fields refer to existing types
  return typeConstructor(typeDef, myTypeMap, myResolveFunctions);
};

export { generateSchema };
