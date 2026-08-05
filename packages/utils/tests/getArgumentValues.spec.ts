import {
  buildSchema,
  FieldNode,
  GraphQLField,
  GraphQLScalarType,
  OperationDefinitionNode,
  parse,
  valueFromASTUntyped,
  versionInfo,
} from 'graphql';
import { getArgumentValues } from '../src/getArgumentValues.js';

const isGraphQL17 = versionInfo.major >= 17;

describe('getArgumentValues', () => {
  it('resolves a variable nested inside an object literal argument for a custom scalar with coerceInputLiteral', () => {
    const JSONScalar = new GraphQLScalarType({
      name: 'JSON',
      coerceInputValue: (v: any) => v,
      // A real `coerceInputLiteral` parses the AST node itself, same as the
      // legacy `parseLiteral` it supersedes.
      coerceInputLiteral: (node: any) => valueFromASTUntyped(node),
    } as any);

    const field = {
      name: 'foo',
      args: [{ name: 'data', type: JSONScalar }],
    } as unknown as GraphQLField<any, any>;

    const doc = parse('{ foo(data: { key: $v }) }');
    const op = doc.definitions[0] as OperationDefinitionNode;
    const fieldNode = op.selectionSet.selections[0] as FieldNode;

    const result = getArgumentValues(field, fieldNode, { v: 'hello' });

    expect(result).toEqual({ data: { key: 'hello' } });
  });

  it('preserves a Date-valued variable nested inside an object literal argument', () => {
    const JSONScalar = new GraphQLScalarType({
      name: 'JSON',
      coerceInputValue: (v: any) => v,
      coerceInputLiteral: (node: any) => valueFromASTUntyped(node),
    } as any);

    const field = {
      name: 'foo',
      args: [{ name: 'data', type: JSONScalar }],
    } as unknown as GraphQLField<any, any>;

    const doc = parse('{ foo(data: { occurredAt: $when }) }');
    const op = doc.definitions[0] as OperationDefinitionNode;
    const fieldNode = op.selectionSet.selections[0] as FieldNode;

    const when = new Date('2024-01-01T00:00:00.000Z');
    const result = getArgumentValues(field, fieldNode, { when });

    expect(result).toEqual({ data: { occurredAt: isGraphQL17 ? when : when.toJSON() } });
  });

  it('applies a schema-defined default when a non-null argument references a variable with no runtime value', () => {
    // Schemas built from SDL (buildSchema -> extendSchemaImpl) only populate
    // graphql-js@17's `arg.default`, never the legacy `arg.defaultValue`.
    const schema = buildSchema(`
      type Query {
        foo(bar: String! = "fallback"): String
      }
    `);
    const field = schema.getQueryType()!.getFields()['foo'];

    const doc = parse('query ($bar: String) { foo(bar: $bar) }');
    const op = doc.definitions[0] as OperationDefinitionNode;
    const fieldNode = op.selectionSet.selections[0] as FieldNode;

    const result = getArgumentValues(field, fieldNode, {});

    expect(result).toEqual({ bar: 'fallback' });
  });
});
