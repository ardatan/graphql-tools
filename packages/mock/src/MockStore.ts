import {
  GraphQLSchema,
  isObjectType,
  isScalarType,
  getNullableType,
  isListType,
  GraphQLOutputType,
  isEnumType,
  isAbstractType,
  isCompositeType,
} from 'graphql';
import { assertIsDefined, isDefined } from 'ts-is-defined';
import stringify from 'fast-json-stable-stringify';

import {
  IMockStore,
  GetArgs,
  SetArgs,
  isRef,
  assertIsRef,
  Ref,
  isRecord,
  TypePolicy,
  IMocks,
  KeyTypeConstraints,
  IScalarMock,
  ITypeMock,
} from './types';
import { uuidv4, randomListLength, takeRandom, makeRef } from './utils';
import { isMockList } from './MockList';

export const defaultMocks = {
  Int: () => Math.round(Math.random() * 200) - 100,
  Float: () => Math.random() * 200 - 100,
  String: () => 'Hello World',
  Boolean: () => Math.random() > 0.5,
  ID: () => uuidv4(),
};

type Entity = {
  [key: string]: unknown;
};

export class MockStore implements IMockStore {
  private schema: GraphQLSchema;
  private mocks: IMocks;
  private typePolicies: {
    [typeName: string]: TypePolicy;
  };

  private store: { [typeName: string]: { [key: string]: Entity } } = {};

  constructor({
    schema,
    mocks,
    typePolicies,
  }: {
    schema: GraphQLSchema;
    mocks?: IMocks;
    typePolicies?: {
      [typeName: string]: TypePolicy;
    };
  }) {
    this.schema = schema;
    this.mocks = { ...defaultMocks, ...mocks };
    this.typePolicies = typePolicies || {};
  }

  get<KeyT extends KeyTypeConstraints = string, ReturnKeyT extends KeyTypeConstraints = string>(
    _typeName: string | Ref<KeyT> | GetArgs<KeyT>,
    _key?: KeyT | { [fieldName: string]: any } | string | string[],
    _fieldName?: string | string[] | { [fieldName: string]: any } | string | { [argName: string]: any },
    _fieldArgs?: string | { [argName: string]: any }
  ): unknown | Ref<ReturnKeyT> {
    if (typeof _typeName !== 'string') {
      if (_key === undefined) {
        if (isRef<KeyT>(_typeName)) {
          throw new Error("Can't provide a ref as first arguement and no other argument");
        }
        // get({...})
        return this.getImpl(_typeName);
      } else {
        assertIsRef<KeyT>(_typeName);
        const { $ref } = _typeName;

        // arguments shift
        _fieldArgs = _fieldName;
        _fieldName = _key as string | string[];
        _key = $ref.key;
        _typeName = $ref.typeName;
      }
    }

    const args: GetArgs<KeyT> = {
      typeName: _typeName,
    };

    if (isRecord(_key) || _key === undefined) {
      // get('User', { name: 'Alex'})
      args.defaultValue = _key;
      return this.getImpl(args);
    }

    args.key = _key as KeyT;

    if (Array.isArray(_fieldName) && _fieldName.length === 1) {
      _fieldName = _fieldName[0];
    }

    if (typeof _fieldName !== 'string' && !Array.isArray(_fieldName)) {
      // get('User', 'me', { name: 'Alex'})
      args.defaultValue = _fieldName;
      return this.getImpl(args);
    }

    if (Array.isArray(_fieldName)) {
      // get('User', 'me', ['father', 'name'])
      const ref: unknown = this.get(_typeName, _key, _fieldName[0], _fieldArgs);
      assertIsRef(ref);

      return this.get(ref.$ref.typeName, ref.$ref.key, _fieldName.slice(1, _fieldName.length));
    }

    // get('User', 'me', 'name'...);
    args.fieldName = _fieldName;
    args.fieldArgs = _fieldArgs;

    return this.getImpl(args);
  }

  set<KeyT extends KeyTypeConstraints>(
    _typeName: string | Ref<KeyT> | SetArgs<KeyT>,
    _key?: KeyT | string | { [fieldName: string]: any },
    _fieldName?: string | { [fieldName: string]: any } | unknown,
    _value?: unknown
  ): void {
    if (typeof _typeName !== 'string') {
      if (_key === undefined) {
        if (isRef<KeyT>(_typeName)) {
          throw new Error("Can't provide a ref as first arguement and no other argument");
        }
        // set({...})
        return this.setImpl(_typeName);
      } else {
        assertIsRef<KeyT>(_typeName);
        const { $ref } = _typeName;

        // arguments shift
        _value = _fieldName;
        _fieldName = _key;
        _key = $ref.key;
        _typeName = $ref.typeName;
      }
    }

    assertIsDefined(_key, 'key was not provided');

    const args: SetArgs<KeyT> = {
      typeName: _typeName,
      key: _key as KeyT,
    };

    if (typeof _fieldName !== 'string') {
      // set('User', 1, { name: 'Foo' })
      if (!isRecord(_fieldName)) throw new Error('Expected value to be a record');

      args.value = _fieldName;
      return this.setImpl(args);
    }

    args.fieldName = _fieldName;
    args.value = _value;

    return this.setImpl(args);
  }

  private getImpl<KeyT extends KeyTypeConstraints>(args: GetArgs<KeyT>) {
    const { typeName, key, fieldName, fieldArgs, defaultValue } = args;

    if (!fieldName) {
      if (defaultValue !== undefined && !isRecord(defaultValue)) {
        throw new Error('`defaultValue` should be an object');
      }
      let valuesToInsert = defaultValue || {};

      if (key) {
        valuesToInsert = { ...valuesToInsert, ...makeRef(typeName, key) };
      }

      return this.insert(typeName, valuesToInsert, true);
    }

    assertIsDefined(key, 'key argument should be given when fieldName is given');

    const fieldNameInStore: string = getFieldNameInStore(fieldName, fieldArgs);

    if (
      this.store[typeName] === undefined ||
      this.store[typeName][key] === undefined ||
      this.store[typeName][key][fieldNameInStore] === undefined
    ) {
      let value;
      if (defaultValue !== undefined) {
        value = defaultValue;
      } else if (this.isKeyField(typeName, fieldName)) {
        value = key;
      } else {
        value = this.generateFieldValue(typeName, fieldName, (otherFieldName, otherValue) => {
          // if we get a key field in the mix we don't care
          if (this.isKeyField(typeName, otherFieldName)) return;

          this.set({ typeName, key, fieldName: otherFieldName, value: otherValue, noOverride: true });
        });
      }

      this.set({ typeName, key, fieldName, fieldArgs, value, noOverride: true });
    }

    return this.store[typeName][key][fieldNameInStore];
  }

  private setImpl<KeyT extends KeyTypeConstraints>(args: SetArgs<KeyT>) {
    const { typeName, key, fieldName, fieldArgs, noOverride } = args;
    let { value } = args;
    if (isMockList(value)) {
      value = value.mock();
    }

    if (!fieldName) {
      if (!isRecord(value)) {
        throw new Error('When no `fieldName` is provided, `value` should be a record.');
      }
      for (const fieldName of Object.keys(value)) {
        this.setImpl({
          typeName,
          key,
          fieldName,
          value: value[fieldName],
          noOverride,
        });
      }
      return;
    }

    const fieldNameInStore: string = getFieldNameInStore(fieldName, fieldArgs);

    if (this.isKeyField(typeName, fieldName) && value !== key) {
      throw new Error(
        `Field ${fieldName} is a key field of ${typeName} and you are trying to set it to ${value} while the key is ${key}`
      );
    }

    if (this.store[typeName] === undefined) {
      this.store[typeName] = {};
    }

    if (this.store[typeName][key] === undefined) {
      this.store[typeName][key] = {};
    }

    // if already set and we don't ovveride
    if (this.store[typeName][key][fieldNameInStore] !== undefined && noOverride) {
      return;
    }

    let valueToStore: unknown;
    const fieldType = getNullableType(this.getFieldType(typeName, fieldName));

    // deal with nesting
    if (isCompositeType(fieldType) && isDefined(value)) {
      if (!isRecord(value))
        throw new Error(`Value to set for ${typeName}.${fieldName} should be an object or null or undefined`);
      assertIsDefined(value, 'Should not be null at this point');
      let joinedTypeName;
      if (isAbstractType(fieldType)) {
        if (isRef(value)) {
          joinedTypeName = value.$ref.typeName;
        } else {
          if (typeof value['__typename'] !== 'string') {
            throw new Error(
              `Value to set for ${typeName}.${fieldName} should contain a '__typename' because the return type ${fieldType.name} is abstract`
            );
          }
          joinedTypeName = value['__typename'];
        }
      } else {
        joinedTypeName = fieldType.name;
      }

      const currentValue = this.store[typeName][key][fieldNameInStore];
      valueToStore = this.insert(
        joinedTypeName,
        isRef(currentValue) ? { ...currentValue, ...value } : value,
        noOverride
      );
    } else if (isListType(fieldType) && isCompositeType(getNullableType(fieldType.ofType)) && isDefined(value)) {
      if (!Array.isArray(value))
        throw new Error(`Value to set for ${typeName}.${fieldName} should be an array or null or undefined`);

      const nonNullableItemType = getNullableType(fieldType.ofType);

      valueToStore = value.map((v, index) => {
        if (v === null) return null;
        if (v !== undefined && !isRecord(v))
          throw new Error(
            `Value to set for ${typeName}.${fieldName}[${index}] should be an object or null or undefined but got ${v}`
          );

        // if v is undefined (empty array slot) it means we just want to generate something
        let joinedTypeName;
        if (isAbstractType(nonNullableItemType)) {
          if (!v) {
            // no value so no typename => take one randomly
            joinedTypeName = takeRandom(this.schema.getPossibleTypes(nonNullableItemType).map(t => t.name));
          } else {
            if (isRef(v)) {
              joinedTypeName = v.$ref.typeName;
            } else {
              if (typeof v['__typename'] !== 'string') {
                throw new Error(
                  `Value to set for ${typeName}.${fieldName}[${index}] should contain a '__typename' because the return type ${nonNullableItemType.name} is abstract`
                );
              }
              joinedTypeName = v['__typename'];
            }
          }
        } else {
          joinedTypeName = getNullableType(fieldType.ofType).name;
        }

        return this.insert(joinedTypeName, v || {}, noOverride);
      });
    } else {
      valueToStore = value;
    }

    this.store[typeName][key] = {
      ...this.store[typeName][key],
      [fieldNameInStore]: valueToStore,
    };
  }

  private insert<KeyT extends KeyTypeConstraints>(
    typeName: string,
    values: { [fieldName: string]: unknown },
    noOverride?: boolean
  ): Ref<KeyT> {
    const keyFieldName = this.getKeyFieldName(typeName);

    let key: KeyT;

    // when we generate a key for the type, we might produce
    // other associated values with it
    // We keep track of them and we'll insert them, with propririty
    // for the ones that we areasked to insert
    const otherValues: { [fieldName: string]: unknown } = {};

    if (isRef<KeyT>(values)) {
      key = values.$ref.key;
    } else if (keyFieldName && keyFieldName in values) {
      key = values[keyFieldName] as KeyT;
    } else {
      key = this.generateKeyForType<KeyT>(typeName, (otherFieldName, otherFieldValue) => {
        otherValues[otherFieldName] = otherFieldValue;
      });
    }

    const toInsert = { ...otherValues, ...values };
    for (const fieldName of Object.keys(toInsert)) {
      if (fieldName === '$ref') continue;
      if (fieldName === '__typename') continue;
      this.set({
        typeName,
        key,
        fieldName,
        value: toInsert[fieldName],
        noOverride,
      });
    }

    return makeRef(typeName, key);
  }

  private generateFieldValue(
    typeName: string,
    fieldName: string,
    onOtherFieldsGenerated?: (fieldName: string, value: unknown) => void
  ): unknown | undefined {
    let value;

    const mock: IScalarMock | ITypeMock | undefined = this.mocks ? this.mocks[typeName] : undefined;

    if (mock) {
      if (typeof mock === 'function') {
        const values = mock();
        if (typeof values !== 'object' || values == null) {
          throw new Error(`Value returned by the mock for ${typeName} is not an object`);
        }

        for (const otherFieldName of Object.keys(values)) {
          if (otherFieldName === fieldName) continue;
          if (typeof (values as any)[otherFieldName] === 'function') continue;
          onOtherFieldsGenerated && onOtherFieldsGenerated(otherFieldName, (values as any)[otherFieldName]);
        }

        value = (values as any)[fieldName];
        if (typeof value === 'function') value = value();
      } else if (typeof mock[fieldName] === 'function') {
        value = mock[fieldName]();
      }
    }

    if (value) return value;

    const fieldType = this.getFieldType(typeName, fieldName);
    return this.generateValueFromType(fieldType);
  }

  private generateKeyForType<KeyT extends KeyTypeConstraints>(
    typeName: string,
    onOtherFieldsGenerated?: (fieldName: string, value: unknown) => void
  ) {
    const keyFieldName = this.getKeyFieldName(typeName);

    if (!keyFieldName) return uuidv4() as KeyT;

    return this.generateFieldValue(typeName, keyFieldName, onOtherFieldsGenerated) as KeyT;
  }

  private generateValueFromType(fieldType: GraphQLOutputType): unknown {
    const nullableType = getNullableType(fieldType);

    if (isScalarType(nullableType)) {
      const mockFn = this.mocks[nullableType.name];
      if (typeof mockFn !== 'function') throw new Error(`No mock defined for type "${nullableType.name}"`);
      return mockFn();
    } else if (isEnumType(nullableType)) {
      const mockFn = this.mocks[nullableType.name];
      if (typeof mockFn === 'function') return mockFn();

      const values = nullableType.getValues().map(v => v.value);
      return takeRandom(values);
    } else if (isObjectType(nullableType)) {
      // this will create a new random ref
      return this.insert(nullableType.name, {});
    } else if (isListType(nullableType)) {
      return [...new Array(randomListLength())].map(() => this.generateValueFromType(nullableType.ofType));
    } else if (isAbstractType(nullableType)) {
      const mock = this.mocks[nullableType.name];

      let typeName: string;
      let values: { [key: string]: unknown } = {};
      if (!mock) {
        typeName = takeRandom(this.schema.getPossibleTypes(nullableType).map(t => t.name));
      } else if (typeof mock === 'function') {
        const mockRes = mock();
        if (mockRes === null) return null;

        if (!isRecord(mockRes)) {
          throw new Error(`Value returned by the mock for ${nullableType.name} is not an object or null`);
        }

        values = mockRes;
        if (typeof values['__typename'] !== 'string') {
          throw new Error(`Please return a __typename in "${nullableType.name}"`);
        }
        typeName = values['__typename'];
      } else if (typeof mock['__typename'] === 'function') {
        const mockRes = mock['__typename']();
        if (typeof mockRes !== 'string')
          throw new Error(`'__typename' returned by the mock for abstract type ${nullableType.name} is not a string`);
        typeName = mockRes;
      } else {
        throw new Error(`Please return a __typename in "${nullableType.name}"`);
      }

      const ref = this.generateValueFromType(this.getType(typeName)) as Ref;

      for (const fieldName of Object.keys(values)) {
        if (fieldName === '__typename') continue;
        const fieldValue = (values as any)[fieldName];
        this.set(ref, fieldName, typeof fieldValue === 'function' ? fieldValue() : fieldValue);
      }

      return ref;
    } else {
      throw new Error(`${nullableType} not implemented`);
    }
  }

  private getFieldType(typeName: string, fieldName: string) {
    const type = this.getType(typeName);

    const field = type.getFields()[fieldName];

    if (!field) {
      throw new Error(`${fieldName} does not exist on type ${typeName}`);
    }

    return field.type;
  }

  private getType(typeName: string) {
    const type = this.schema.getType(typeName);

    if (!type || !isObjectType(type)) {
      throw new Error(`${typeName} does not exist on schema or is not an object`);
    }

    return type;
  }

  private isKeyField(typeName: string, fieldName: string) {
    return this.getKeyFieldName(typeName) === fieldName;
  }

  private getKeyFieldName(typeName: string): string | null {
    const typePolicyKeyField = this.typePolicies[typeName]?.keyFieldName;
    if (typePolicyKeyField !== undefined) {
      if (typePolicyKeyField === false) return null;
      return typePolicyKeyField;
    }

    const gqlType = this.getType(typeName);
    const fieldNames = Object.keys(gqlType.getFields());

    if (fieldNames.includes('id')) return 'id';
    if (fieldNames.includes('_id')) return '+id';

    return null;
  }
}

const getFieldNameInStore = (fieldName: string, fieldArgs?: string | { [argName: string]: any }) => {
  if (!fieldArgs) return fieldName;

  if (typeof fieldArgs === 'string') {
    return `${fieldName}:${fieldArgs}`;
  }

  // empty args
  if (Object.keys(fieldArgs).length === 0) {
    return fieldName;
  }

  return `${fieldName}:${stringify(fieldArgs)}`;
};
