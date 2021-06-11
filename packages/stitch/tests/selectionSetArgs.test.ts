import { makeExecutableSchema } from '@graphql-tools/schema';
import { parseSelectionSet } from '@graphql-tools/utils';
import { FieldNode, GraphQLObjectType } from 'graphql';
import { forwardArgsToSelectionSet } from '../src';

describe('forwardArgsToSelectionSet', () => {
  const schema = makeExecutableSchema({
    typeDefs: `
      type Query {
        users: [User]
      }

      type User {
        id: ID
        posts(pageNumber: Int, perPage: Int): [Post]
        postIds(pageNumber: Int, perPage: Int): [ID]
      }

      type Post {
        id: ID
      }
    `,
  });

  const type = schema.getType('User') as GraphQLObjectType;

  const field = type.getFields()['posts'];

  const fieldNode = parseSelectionSet('{ posts(pageNumber: 1, perPage: 7) { id } }').selections[0] as FieldNode;

  test('passes all arguments to a hint selection set', () => {
    const buildFieldNodeFn = forwardArgsToSelectionSet('{ postIds }');
    const fieldNodeFn = buildFieldNodeFn(schema, type, field);
    const result = fieldNodeFn(fieldNode)[0];

    expect(result.name.value).toEqual('postIds');
    expect(result.arguments.length).toEqual(2);
    expect(result.arguments[0].name.value).toEqual('pageNumber');
    expect(result.arguments[0].value.value).toEqual('1');
    expect(result.arguments[1].name.value).toEqual('perPage');
    expect(result.arguments[1].value.value).toEqual('7');
  });

  test('passes mapped arguments to a hint selection set', () => {
    const buildFieldNodeFn = forwardArgsToSelectionSet('{ id postIds }', { postIds: ['pageNumber'] });
    const fieldNodeFn = buildFieldNodeFn(schema, type, field);
    const result = fieldNodeFn(fieldNode);

    expect(result.length).toEqual(2);
    expect(result[0].name.value).toEqual('id');
    expect(result[0].arguments.length).toEqual(0);

    expect(result[1].name.value).toEqual('postIds');
    expect(result[1].arguments.length).toEqual(1);
    expect(result[1].arguments[0].name.value).toEqual('pageNumber');
    expect(result[1].arguments[0].value.value).toEqual('1');
  });
});
