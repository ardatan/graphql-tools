import {
  FieldNode,
  GraphQLField,
  GraphQLScalarType,
  OperationDefinitionNode,
  parse,
  valueFromASTUntyped,
  versionInfo,
} from 'graphql';
import { getArgumentValues } from '../src/getArgumentValues.js';

// These tests exercise graphql-js@17's `coerceInputLiteral` mechanism
// specifically (a custom scalar implementing it, with a variable nested
// inside an object literal argument) — on older versions, argument coercion
// takes an entirely different (legacy `valueFromAST`) code path that isn't
// what's under test here, so skip rather than assert on that unrelated path.
(versionInfo.major >= 17 ? describe : describe.skip)('getArgumentValues', () => {
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

    expect(result).toEqual({ data: { occurredAt: when.toJSON() } });
  });
});
