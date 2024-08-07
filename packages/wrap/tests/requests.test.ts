import { OperationTypeNode, print } from 'graphql';
import { createRequest } from '@graphql-tools/delegate';
import { parseSelectionSet } from '@graphql-tools/utils';
import '../../testing/to-be-similar-gql-doc';

function removeLocations(value: any): any {
  if (value == null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(v => removeLocations(v));
  } else if (typeof value === 'object') {
    const newValue = {};
    for (const key in value) {
      if (key !== 'loc') {
        newValue[key] = removeLocations(value[key]);
      }
    }
    return newValue;
  }

  return value;
}

describe('requests', () => {
  test('should create requests', () => {
    const request = removeLocations(
      createRequest({
        targetOperation: 'query' as OperationTypeNode,
        targetFieldName: 'version',
        selectionSet: parseSelectionSet(`{
          major
          minor
          patch
        }`),
        targetOperationName: 'test',
      }),
    );

    expect(request).toMatchObject({
      rootValue: undefined,
      variables: {},
      operationName: 'test',
      operationType: 'query',
      context: undefined,
      info: undefined,
    });

    expect(print(request.document)).toBeSimilarGqlDoc(/* GraphQL */ `
      query test {
        version {
          major
          minor
          patch
        }
      }
    `);
  });
});
