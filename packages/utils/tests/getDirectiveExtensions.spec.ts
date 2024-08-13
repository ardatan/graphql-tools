import { GraphQLObjectType } from 'graphql';
import { getDirectiveExtensions } from '../src';

describe('getDirectiveExtensions', () => {
  it('should return directive extensions when they are in the directives path', () => {
    const objectType = new GraphQLObjectType({
      name: 'User',
      fields: () => ({}),
      extensions: {
        directives: {
          id: {},
        },
      },
    });

    const directiveExtensions = getDirectiveExtensions(objectType);
    expect(directiveExtensions).toEqual(expect.objectContaining({ id: expect.any(Object) }));
  });

  it('should return directive extensions when they are in the a custom path', () => {
    const objectType = new GraphQLObjectType({
      name: 'TestObject',
      fields: () => ({}),
      extensions: {
        custom: {
          directives: {
            path: {
              id: {},
            },
          },
        },
      },
    });

    const directiveExtensions = getDirectiveExtensions(objectType, undefined, [
      'custom',
      'directives',
      'path',
    ]);
    expect(directiveExtensions).toEqual(expect.objectContaining({ id: expect.any(Object) }));
  });

  it('should return no directive extensions when they are no defined', () => {
    const objectType = new GraphQLObjectType({
      name: 'TestObject',
      fields: () => ({}),
    });
    const directiveExtensions = getDirectiveExtensions(objectType);
    expect(directiveExtensions).toEqual({});
  });

  it('should return no directive extensions when an invalid extension path is given', () => {
    const objectType = new GraphQLObjectType({
      name: 'TestObject',
      fields: () => ({}),
    });
    const directiveExtensions = getDirectiveExtensions(objectType, undefined, [
      'not',
      'a',
      'real',
      'path',
    ]);
    expect(directiveExtensions).toEqual({});
  });
});
