import { getKeyFnForFederation } from '../src/utils';

describe('getKeyFnForFederation', () => {
  it('with arguments', () => {
    const keys = ['name', 'address { city }', 'price(currency: "USD")'];
    const data = {
      __typename: 'Test',
      name: 'Test',
      address: {
        __typename: 'Address',
        city: 'Test City',
        street: 'Test Street',
      },
      price: 100,
      extra: 'Extra',
    };
    const keyFn = getKeyFnForFederation('Test', keys);
    expect(keyFn(data)).toEqual({
      __typename: 'Test',
      name: 'Test',
      address: {
        __typename: 'Address',
        city: 'Test City',
      },
      price: 100,
    });
  });
});
