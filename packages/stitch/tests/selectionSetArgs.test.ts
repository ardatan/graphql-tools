import { parseSelectionSet } from '@graphql-tools/utils';
import { forwardArgsToSelectionSet } from '../src';

describe('forwardArgsToSelectionSet', () => {

  const GATEWAY_FIELD = parseSelectionSet('{ posts(pageNumber: 1, perPage: 7) }').selections[0];

  test('passes all arguments to a hint selection set', () => {
    const buildSelectionSet = forwardArgsToSelectionSet('{ postIds }');
    const result = buildSelectionSet(GATEWAY_FIELD).selections[0];

    expect(result.name.value).toEqual('postIds');
    expect(result.arguments.length).toEqual(2);
    expect(result.arguments[0].name.value).toEqual('pageNumber');
    expect(result.arguments[0].value.value).toEqual('1');
    expect(result.arguments[1].name.value).toEqual('perPage');
    expect(result.arguments[1].value.value).toEqual('7');
  });

  test('passes mapped arguments to a hint selection set', () => {
    const buildSelectionSet = forwardArgsToSelectionSet('{ id postIds }', { postIds: ['pageNumber'] });
    const result = buildSelectionSet(GATEWAY_FIELD);

    expect(result.selections.length).toEqual(2);
    expect(result.selections[0].name.value).toEqual('id');
    expect(result.selections[0].arguments.length).toEqual(0);

    expect(result.selections[1].name.value).toEqual('postIds');
    expect(result.selections[1].arguments.length).toEqual(1);
    expect(result.selections[1].arguments[0].name.value).toEqual('pageNumber');
    expect(result.selections[1].arguments[0].value.value).toEqual('1');
  });
});
