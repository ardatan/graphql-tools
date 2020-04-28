import { parse } from 'graphql';

import { parseSelectionSet } from '@graphql-tools/utils';

import { createRequest } from '../src/delegate';

function removeLocations(value: any): any {
  if (value == null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((v) => removeLocations(v));
  } else if (typeof value === 'object') {
    const newValue = {};
    Object.keys(value).forEach((key) => {
      if (key !== 'loc') {
        newValue[key] = removeLocations(value[key]);
      }
    });
    return newValue;
  }

  return value;
}

describe('requests', () => {
  test('should create requests', () => {
    const request = removeLocations(
      createRequest({
        targetOperation: 'query',
        targetFieldName: 'version',
        selectionSet: parseSelectionSet(`{
          major
          minor
          patch
        }`),
      }),
    );

    const expectedRequest = removeLocations({
      document: parse(`
        query {
          version {
            major
            minor
            patch
          }
        }
      `),
      variables: {},
    });

    expect(expectedRequest).toMatchObject(request);
  });
});
