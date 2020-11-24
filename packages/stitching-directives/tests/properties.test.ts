import { addKey, getKeys } from "../src/properties";

describe('addKey', () => {
  test('can add a key to an object', () => {
    const object = {};
    addKey(object, ['key'], 'value')
    expect(object).toEqual({
      key: 'value',
    });
  });

  test('can add an extended key to an object', () => {
    const object = {};
    addKey(object, ['key1', 'key2'], 'value')
    expect(object).toEqual({
      key1: {
        key2: 'value',
      },
    });
  });

  test('can set a key to null', () => {
    const object = { key1: { key2: 'value' } };
    addKey(object, ['key1'], null)
    expect(object).toEqual({
      key1: null,
    });
  });
});

describe('getKeys', () => {
  test('can getKeys', () => {
    const object = {
      field1: 'value1',
      field2: {
        subfieldA: 'valueA',
        subfieldB: 'valueB',
      },
    }

    const extracted = getKeys(object, {
      field1: null,
      field2: {
        subfieldA: null,
      }
    })

    const expectedExtracted = {
      field1: 'value1',
      field2: {
        subfieldA: 'valueA',
      }
    }

    expect(extracted).toEqual(expectedExtracted);
  });
});
