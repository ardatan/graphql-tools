import {
  getArgumentValues,
  GraphQLError,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  parse,
  versionInfo,
} from 'graphql';
import {
  asGetArgumentValuesVariables,
  coerceGetVariableValuesResult,
} from '../src/variableValues.js';

describe('asGetArgumentValuesVariables', () => {
  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        echo: {
          type: GraphQLString,
          args: {
            message: { type: GraphQLString },
          },
        },
      },
    }),
  });

  it('returns undefined for nullish input', () => {
    expect(asGetArgumentValuesVariables(undefined)).toBeUndefined();
    expect(asGetArgumentValuesVariables(null)).toBeUndefined();
  });

  it('lets getArgumentValues read flat execution variables on the current GraphQL major', () => {
    const document = parse('{ echo(message: $message) }');
    const fieldNode = (document.definitions[0] as any).selectionSet.selections[0];
    const field = schema.getQueryType()!.getFields()['echo'];

    const args = getArgumentValues(
      field,
      fieldNode,
      asGetArgumentValuesVariables({ message: 'hi' }),
    );
    expect(args).toEqual({ message: 'hi' });
  });

  it('passes through already-wrapped VariableValues on GraphQL 17+', () => {
    if (versionInfo.major < 17) {
      return;
    }
    const wrapped = {
      coerced: { message: 'hi' },
      sources: Object.create(null),
    };
    expect(asGetArgumentValuesVariables(wrapped as any)).toBe(wrapped);
  });
});

describe('coerceGetVariableValuesResult', () => {
  it('preserves errors', () => {
    const error = new GraphQLError('bad');
    expect(coerceGetVariableValuesResult({ errors: [error] })).toEqual({ errors: [error] });
  });

  it('preserves GraphQL 17 variableValues shape', () => {
    const variableValues = {
      coerced: { id: '1' },
      sources: Object.create(null),
    };
    expect(coerceGetVariableValuesResult({ variableValues })).toEqual({ variableValues });
  });

  it('wraps GraphQL 16 coerced map', () => {
    expect(coerceGetVariableValuesResult({ coerced: { id: '1' } })).toEqual({
      variableValues: {
        coerced: { id: '1' },
        sources: expect.any(Object),
      },
    });
  });

  it('returns empty coerced map when result has neither shape', () => {
    const result = coerceGetVariableValuesResult({});
    expect('variableValues' in result && result.variableValues.coerced).toEqual({});
  });
});
