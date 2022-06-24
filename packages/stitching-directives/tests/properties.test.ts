import { addProperty, getProperties } from '../src/properties.js';

describe('addProperty', () => {
  test('can add a key to an object', () => {
    const object = {};
    addProperty(object, ['key'], 'value');
    expect(object).toEqual({
      key: 'value',
    });
  });

  test('can add an extended key to an object', () => {
    const object = {};
    addProperty(object, ['key1', 'key2'], 'value');
    expect(object).toEqual({
      key1: {
        key2: 'value',
      },
    });
  });

  test('can set a key to null', () => {
    const object = { key1: { key2: 'value' } };
    addProperty(object, ['key1'], null);
    expect(object).toEqual({
      key1: null,
    });
  });
});

describe('getProperties', () => {
  test('can getProperties', () => {
    const object = {
      field1: 'value1',
      field2: {
        subfieldA: 'valueA',
        subfieldB: 'valueB',
      },
    };

    const extracted = getProperties(object, {
      field1: null,
      field2: {
        subfieldA: null,
      },
    });

    const expectedExtracted = {
      field1: 'value1',
      field2: {
        subfieldA: 'valueA',
      },
    };

    expect(extracted).toEqual(expectedExtracted);
  });
});
