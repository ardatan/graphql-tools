import { DirectiveLocation } from '../../language/directiveLocation.js';

import { GraphQLDirective } from '../directives.js';
import { GraphQLInt, GraphQLString } from '../scalars.js';

describe('Type System: Directive', () => {
  it('defines a directive with no args', () => {
    const directive = new GraphQLDirective({
      name: 'Foo',
      locations: [DirectiveLocation.QUERY],
    });

    expect(directive).toMatchObject({
      name: 'Foo',
      args: [],
      isRepeatable: false,
      locations: ['QUERY'],
    });
  });

  it('defines a directive with multiple args', () => {
    const directive = new GraphQLDirective({
      name: 'Foo',
      args: {
        foo: { type: GraphQLString },
        bar: { type: GraphQLInt },
      },
      locations: [DirectiveLocation.QUERY],
    });

    expect(directive).toMatchObject({
      name: 'Foo',
      args: [
        {
          name: 'foo',
          description: undefined,
          type: GraphQLString,
          defaultValue: undefined,
          deprecationReason: undefined,
          extensions: {},
          astNode: undefined,
        },
        {
          name: 'bar',
          description: undefined,
          type: GraphQLInt,
          defaultValue: undefined,
          deprecationReason: undefined,
          extensions: {},
          astNode: undefined,
        },
      ],
      isRepeatable: false,
      locations: ['QUERY'],
    });
  });

  it('defines a repeatable directive', () => {
    const directive = new GraphQLDirective({
      name: 'Foo',
      isRepeatable: true,
      locations: [DirectiveLocation.QUERY],
    });

    expect(directive).toMatchObject({
      name: 'Foo',
      args: [],
      isRepeatable: true,
      locations: ['QUERY'],
    });
  });

  it('can be stringified, JSON.stringified and Object.toStringified', () => {
    const directive = new GraphQLDirective({
      name: 'Foo',
      locations: [DirectiveLocation.QUERY],
    });

    expect(String(directive)).toEqual('@Foo');
    expect(JSON.stringify(directive)).toEqual('"@Foo"');
    expect(Object.prototype.toString.call(directive)).toEqual('[object GraphQLDirective]');
  });

  it('rejects a directive with invalid name', () => {
    expect(
      () =>
        new GraphQLDirective({
          name: 'bad-name',
          locations: [DirectiveLocation.QUERY],
        })
    ).toThrow('Names must only contain [_a-zA-Z0-9] but "bad-name" does not.');
  });

  it('rejects a directive with incorrectly named arg', () => {
    expect(
      () =>
        new GraphQLDirective({
          name: 'Foo',
          locations: [DirectiveLocation.QUERY],
          args: {
            'bad-name': { type: GraphQLString },
          },
        })
    ).toThrow('Names must only contain [_a-zA-Z0-9] but "bad-name" does not.');
  });
});
