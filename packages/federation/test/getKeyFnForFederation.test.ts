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
  it('with repeating fields returning arrays', () => {
    const keys = ['userOrders { id }', 'userOrders { tag }'];
    const data = {
      __typename: 'User',
      id: 1,
      name: 'Test',
      userOrders: [
        {
          __typename: 'UserOrder',
          id: '1',
          total: 100,
          tag: 'Test1',
        },
        {
          __typename: 'UserOrder',
          id: '2',
          total: 400,
          tag: 'Test2',
        },
      ],
    };
    const keyFn = getKeyFnForFederation('User', keys);
    expect(keyFn(data)).toEqual({
      __typename: 'User',
      userOrders: [
        {
          __typename: 'UserOrder',
          id: '1',
          tag: 'Test1',
        },
        {
          __typename: 'UserOrder',
          id: '2',
          tag: 'Test2',
        },
      ],
    });
  });
});
