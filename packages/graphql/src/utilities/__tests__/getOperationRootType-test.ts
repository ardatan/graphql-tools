import { invariant } from '../../jsutils/invariant.js';

import type { DocumentNode, OperationDefinitionNode } from '../../language/ast.js';
import { Kind } from '../../language/kinds.js';
import { parse } from '../../language/parser.js';

import { GraphQLObjectType } from '../../type/definition.js';
import { GraphQLString } from '../../type/scalars.js';
import { GraphQLSchema } from '../../type/schema.js';

import { getOperationRootType } from '../getOperationRootType.js';

const queryType = new GraphQLObjectType({
  name: 'FooQuery',
  fields: () => ({
    field: { type: GraphQLString },
  }),
});

const mutationType = new GraphQLObjectType({
  name: 'FooMutation',
  fields: () => ({
    field: { type: GraphQLString },
  }),
});

const subscriptionType = new GraphQLObjectType({
  name: 'FooSubscription',
  fields: () => ({
    field: { type: GraphQLString },
  }),
});

function getOperationNode(doc: DocumentNode): OperationDefinitionNode {
  const operationNode = doc.definitions[0];
  invariant(operationNode.kind === Kind.OPERATION_DEFINITION);
  return operationNode;
}

describe('Deprecated - getOperationRootType', () => {
  it('Gets a Query type for an unnamed OperationDefinitionNode', () => {
    const testSchema = new GraphQLSchema({
      query: queryType,
    });
    const doc = parse('{ field }');
    const operationNode = getOperationNode(doc);
    expect(getOperationRootType(testSchema, operationNode)).toEqual(queryType);
  });

  it('Gets a Query type for an named OperationDefinitionNode', () => {
    const testSchema = new GraphQLSchema({
      query: queryType,
    });

    const doc = parse('query Q { field }');
    const operationNode = getOperationNode(doc);
    expect(getOperationRootType(testSchema, operationNode)).toEqual(queryType);
  });

  it('Gets a type for OperationTypeDefinitionNodes', () => {
    const testSchema = new GraphQLSchema({
      query: queryType,
      mutation: mutationType,
      subscription: subscriptionType,
    });

    const doc = parse(`
      schema {
        query: FooQuery
        mutation: FooMutation
        subscription: FooSubscription
      }
    `);

    const schemaNode = doc.definitions[0];
    invariant(schemaNode.kind === Kind.SCHEMA_DEFINITION);
    const [queryNode, mutationNode, subscriptionNode] = schemaNode.operationTypes;

    expect(getOperationRootType(testSchema, queryNode)).toEqual(queryType);
    expect(getOperationRootType(testSchema, mutationNode)).toEqual(mutationType);
    expect(getOperationRootType(testSchema, subscriptionNode)).toEqual(subscriptionType);
  });

  it('Gets a Mutation type for an OperationDefinitionNode', () => {
    const testSchema = new GraphQLSchema({
      mutation: mutationType,
    });

    const doc = parse('mutation { field }');
    const operationNode = getOperationNode(doc);
    expect(getOperationRootType(testSchema, operationNode)).toEqual(mutationType);
  });

  it('Gets a Subscription type for an OperationDefinitionNode', () => {
    const testSchema = new GraphQLSchema({
      subscription: subscriptionType,
    });

    const doc = parse('subscription { field }');
    const operationNode = getOperationNode(doc);
    expect(getOperationRootType(testSchema, operationNode)).toEqual(subscriptionType);
  });

  it('Throws when query type not defined in schema', () => {
    const testSchema = new GraphQLSchema({});

    const doc = parse('query { field }');
    const operationNode = getOperationNode(doc);
    expect(() => getOperationRootType(testSchema, operationNode)).toThrow(
      'Schema does not define the required query root type.'
    );
  });

  it('Throws when mutation type not defined in schema', () => {
    const testSchema = new GraphQLSchema({});

    const doc = parse('mutation { field }');
    const operationNode = getOperationNode(doc);
    expect(() => getOperationRootType(testSchema, operationNode)).toThrow('Schema is not configured for mutations.');
  });

  it('Throws when subscription type not defined in schema', () => {
    const testSchema = new GraphQLSchema({});

    const doc = parse('subscription { field }');
    const operationNode = getOperationNode(doc);
    expect(() => getOperationRootType(testSchema, operationNode)).toThrow(
      'Schema is not configured for subscriptions.'
    );
  });

  it('Throws when operation not a valid operation kind', () => {
    const testSchema = new GraphQLSchema({});
    const doc = parse('{ field }');
    const operationNode: OperationDefinitionNode = {
      ...getOperationNode(doc),
      // @ts-expect-error
      operation: 'non_existent_operation',
    };

    expect(() => getOperationRootType(testSchema, operationNode)).toThrow(
      'Can only have query, mutation and subscription operations.'
    );
  });
});
