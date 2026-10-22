import stringify from 'fast-json-stable-stringify';
import {
  getNullableType,
  GraphQLSchema,
  GraphQLString,
  GraphQLType,
  isAbstractType,
  isCompositeType,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
} from 'graphql';
import { getRootTypeNames, isDangerousObjectKey } from '@graphql-tools/utils';
import { deepResolveMockList, isMockList } from './MockList.js';
import {
  assertIsRef,
  GetArgs,
  IMocks,
  IMockStore,
  IScalarMock,
  isRecord,
  isRef,
  ITypeMock,
  KeyTypeConstraints,
  MockGenerationBehavior,
  Ref,
  SetArgs,
  TypePolicy,
} from './types.js';
import { makeRef, takeOneOf, uuidv4 } from './utils.js';

const defaultRandomMocks = {
  Int: () => Math.round(Math.random() * 200) - 100,
  Float: () => Math.random() * 200 - 100,
  Boolean: () => Math.random() > 0.5,
};

const defaultDeterministicMocks = {
  Int: () => 1,
  Float: () => 1.5,
  Boolean: () => true,
};

const defaultCommonMocks = {
  String: () => 'Hello World',
  ID: () => uuidv4(),
};

const defaultKeyFieldNames = ['id', '_id'];

type Entity = {
  [key: string]: unknown;
};

export class MockStore implements IMockStore {
  public schema: GraphQLSchema;
  private mocks: IMocks;
  private mockGenerationBehavior: MockGenerationBehavior;
  private defaultListLength: number;
  private typePolicies: {
    [typeName: string]: TypePolicy;
  };

  private store: { [typeName: string]: { [key: string]: Entity } } = {};
  private implicitBareFields = new Set<string>();

  constructor({
    schema,
    mocks,
    mockGenerationBehavior = 'random',
    defaultListLength = 2,
    typePolicies,
  }: {
    schema: GraphQLSchema;
    mocks?: IMocks;
    mockGenerationBehavior?: MockGenerationBehavior;
    defaultListLength?: number;
    typePolicies?: {
      [typeName: string]: TypePolicy;
    };
  }) {
    this.schema = schema;
    this.mockGenerationBehavior = mockGenerationBehavior;
    this.defaultListLength = defaultListLength;
    this.mocks = {
      ...defaultCommonMocks,
      ...(mockGenerationBehavior === 'random' ? defaultRandomMocks : defaultDeterministicMocks),
      ...mocks,
    };
    this.typePolicies = typePolicies || {};
  }

  has<KeyT extends KeyTypeConstraints = string>(typeName: string, key: KeyT): boolean {
    return !!this.store[typeName] && !!this.store[typeName][key];
  }

  get<KeyT extends KeyTypeConstraints = string, ReturnKeyT extends KeyTypeConstraints = string>(
    _typeName: string | Ref<KeyT> | GetArgs<KeyT>,
    _key?: KeyT | { [fieldName: string]: any } | string | string[],
    _fieldName?:
      string | string[] | { [fieldName: string]: any } | string | { [argName: string]: any },
    _fieldArgs?: string | { [argName: string]: any },
  ): unknown | Ref<ReturnKeyT> {
    if (typeof _typeName !== 'string') {
      if (_key === undefined) {
        if (isRef<KeyT>(_typeName)) {
          throw new Error("Can't provide a ref as first argument and no other argument");
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
    _value?: unknown,
  ): void {
    if (typeof _typeName !== 'string') {
      if (_key === undefined) {
        if (isRef<KeyT>(_typeName)) {
          throw new Error("Can't provide a ref as first argument and no other argument");
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

  reset() {
    this.store = {};
    this.implicitBareFields.clear();
  }

  filter(key: string, predicate: (val: Entity) => boolean) {
    const entity = this.store[key];
    return entity ? Object.values(entity).filter(predicate) : [];
  }

  find(key: string, predicate: (val: Entity) => boolean) {
    const entity = this.store[key];
    return entity ? Object.values(entity).find(predicate) : undefined;
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
    const entity = this.store[typeName]?.[key];
    const hasExactValue = entity !== undefined && entity[fieldNameInStore] !== undefined;
    const hasExplicitUnarguedValue =
      fieldNameInStore !== fieldName &&
      entity !== undefined &&
      entity[fieldName] !== undefined &&
      !this.implicitBareFields.has(bareFieldId(typeName, key, fieldName));

    if (!hasExactValue && !hasExplicitUnarguedValue) {
      let value;
      if (defaultValue !== undefined) {
        value = defaultValue;
      } else if (this.isKeyField(typeName, fieldName)) {
        value = key;
      } else {
        value = this.generateFieldValue(
          typeName,
          fieldName,
          fieldArgs,
          (otherFieldName, otherValue) => {
            // if we get a key field in the mix we don't care
            if (this.isKeyField(typeName, otherFieldName)) return;

            this.set({
              typeName,
              key,
              fieldName: otherFieldName,
              value: otherValue,
              noOverride: true,
            });
          },
        );
      }

      this.set({ typeName, key, fieldName, fieldArgs, value, noOverride: true });
      if (
        fieldNameInStore === fieldName &&
        defaultValue === undefined &&
        !this.isKeyField(typeName, fieldName)
      ) {
        this.implicitBareFields.add(bareFieldId(typeName, key, fieldName));
      }
    }

    const stored = this.store[typeName][key];
    return stored[fieldNameInStore] !== undefined ? stored[fieldNameInStore] : stored[fieldName];
  }

  private setImpl<KeyT extends KeyTypeConstraints>(args: SetArgs<KeyT>) {
    const { typeName, key, fieldName, fieldArgs, noOverride } = args;
    let { value } = args;
    if (isMockList(value)) {
      value = deepResolveMockList(value);
    }

    if (isDangerousObjectKey(typeName)) {
      throw new Error(`Invalid typeName: ${typeName}`);
    }

    if (this.store[typeName] === undefined) {
      this.store[typeName] = {};
    }

    if (isDangerousObjectKey(key)) {
      throw new Error(`Invalid key: ${key}`);
    }

    if (this.store[typeName][key] === undefined) {
      this.store[typeName][key] = {};
    }

    if (!fieldName) {
      if (!isRecord(value)) {
        throw new Error('When no `fieldName` is provided, `value` should be a record.');
      }
      for (const fieldName in value) {
        if (fieldName === '$ref') {
          continue;
        }
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
        `Field ${fieldName} is a key field of ${typeName} and you are trying to set it to ${value} while the key is ${key}`,
      );
    }

    // if already set and we don't override
    if (this.store[typeName][key][fieldNameInStore] !== undefined && noOverride) {
      return;
    }

    const fieldType = this.getFieldType(typeName, fieldName);
    const currentValue = this.store[typeName][key][fieldNameInStore];

    let valueToStore;
    try {
      valueToStore = this.normalizeValueToStore(
        fieldType,
        value,
        currentValue,
        (typeName, values) => this.insert(typeName, values, noOverride),
      );
    } catch (e: any) {
      throw new Error(`Value to set in ${typeName}.${fieldName} in not normalizable: ${e.message}`);
    }

    this.store[typeName][key] = {
      ...this.store[typeName][key],
      [fieldNameInStore]: valueToStore,
    };

    if (fieldNameInStore === fieldName) {
      this.implicitBareFields.delete(bareFieldId(typeName, key, fieldName));
    }
  }

  private normalizeValueToStore(
    fieldType: GraphQLType,
    value: unknown,
    currentValue: unknown,
    onInsertType: (typeName: string, values: { [fieldName: string]: unknown }) => Ref,
  ): unknown {
    if (value === null) {
      if (isNonNullType(fieldType)) {
        throw new Error(`should not be null because ${fieldType} is not nullable. Received null.`);
      }
      return null;
    }

    const nullableFieldType = getNullableType(fieldType);
    if (value === undefined) return this.generateValueFromType(nullableFieldType);

    // deal with nesting insert
    if (isCompositeType(nullableFieldType) || isInputObjectType(nullableFieldType)) {
      if (!isRecord(value))
        throw new Error(`should be an object or null or undefined. Received ${value}`);

      let joinedTypeName;
      if (isAbstractType(nullableFieldType)) {
        if (isRef(value)) {
          joinedTypeName = value.$ref.typeName;
        } else {
          if (typeof value['__typename'] !== 'string') {
            throw new Error(
              `should contain a '__typename' because ${nullableFieldType.name} an abstract type`,
            );
          }
          joinedTypeName = value['__typename'];
        }
      } else {
        joinedTypeName = nullableFieldType.name;
      }

      return onInsertType(
        joinedTypeName,
        isRef(currentValue) ? { ...currentValue, ...value } : value,
      );
    }

    if (isListType(nullableFieldType)) {
      if (!Array.isArray(value))
        throw new Error(`should be an array or null or undefined. Received ${value}`);

      return value.map((v, index) => {
        return this.normalizeValueToStore(
          nullableFieldType.ofType,
          v,
          typeof currentValue === 'object' && currentValue != null && currentValue[index]
            ? currentValue
            : undefined,
          onInsertType,
        );
      });
    }

    return value;
  }

  private insert<KeyT extends KeyTypeConstraints>(
    typeName: string,
    values: { [fieldName: string]: unknown },
    noOverride?: boolean,
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
    for (const fieldName in toInsert) {
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

    if (isDangerousObjectKey(typeName)) {
      throw new Error(`Invalid typeName: ${typeName}`);
    }

    if (this.store[typeName] === undefined) {
      this.store[typeName] = {};
    }

    if (isDangerousObjectKey(key)) {
      throw new Error(`Invalid key: ${key}`);
    }

    if (this.store[typeName][key] === undefined) {
      this.store[typeName][key] = {};
    }

    return makeRef(typeName, key);
  }

  private generateFieldValue(
    typeName: string,
    fieldName: string,
    fieldArgs: string | { [argName: string]: any } | undefined,
    onOtherFieldsGenerated?: (fieldName: string, value: unknown) => void,
  ): unknown | undefined {
    const mockedValue = this.generateFieldValueFromMocks(
      typeName,
      fieldName,
      fieldArgs,
      onOtherFieldsGenerated,
    );
    if (mockedValue !== undefined) return mockedValue;

    const fieldType = this.getFieldType(typeName, fieldName);
    return this.generateValueFromType(fieldType);
  }

  private generateFieldValueFromMocks(
    typeName: string,
    fieldName: string,
    fieldArgs: string | { [argName: string]: any } | undefined,
    onOtherFieldsGenerated?: (fieldName: string, value: unknown) => void,
  ): unknown | undefined {
    let value;

    const mock: IScalarMock | ITypeMock | undefined = this.mocks ? this.mocks[typeName] : undefined;
    const isOperationType = this.isRootTypeName(typeName);
    if (mock) {
      if (typeof mock === 'function') {
        const values = isOperationType ? mock(fieldArgs) : mock();
        if (typeof values !== 'object' || values == null) {
          throw new Error(`Value returned by the mock for ${typeName} is not an object`);
        }

        // Operation mocks are called with the current field's args. Sibling
        // values can depend on those args and must not be stored under a bare
        // field name for a later, differently-argumented read.
        if (!isOperationType) {
          for (const otherFieldName in values) {
            if (otherFieldName === fieldName) continue;
            if (typeof (values as any)[otherFieldName] === 'function') continue;
            onOtherFieldsGenerated?.(otherFieldName, (values as any)[otherFieldName]);
          }
        }

        value = (values as any)[fieldName];
        if (typeof value === 'function') value = value(fieldArgs);
      } else if (
        typeof mock === 'object' &&
        mock != null &&
        typeof mock[fieldName] === 'function'
      ) {
        value = mock[fieldName](fieldArgs);
      }
    }

    if (value !== undefined) return value;

    const type = this.getType(typeName);
    // GraphQL 14 Compatibility
    const interfaces = 'getInterfaces' in type ? type.getInterfaces() : [];

    if (interfaces.length > 0) {
      for (const interface_ of interfaces) {
        if (value) break;
        value = this.generateFieldValueFromMocks(
          interface_.name,
          fieldName,
          fieldArgs,
          onOtherFieldsGenerated,
        );
      }
    }

    return value;
  }

  private generateKeyForType<KeyT extends KeyTypeConstraints>(
    typeName: string,
    onOtherFieldsGenerated?: (fieldName: string, value: unknown) => void,
  ) {
    const keyFieldName = this.getKeyFieldName(typeName);

    if (!keyFieldName) return uuidv4() as KeyT;

    return this.generateFieldValue(
      typeName,
      keyFieldName,
      undefined,
      onOtherFieldsGenerated,
    ) as KeyT;
  }

  private generateValueFromType(fieldType: GraphQLType, listIndex?: number): unknown {
    const nullableType = getNullableType(fieldType);

    if (isScalarType(nullableType)) {
      const mockFn = this.mocks[nullableType.name];
      if (typeof mockFn !== 'function')
        throw new Error(`No mock defined for type "${nullableType.name}"`);
      return mockFn(listIndex);
    } else if (isEnumType(nullableType)) {
      const mockFn = this.mocks[nullableType.name];
      if (typeof mockFn === 'function') return mockFn(listIndex);

      const values = nullableType.getValues().map(v => v.value);
      return takeOneOf(values, this.mockGenerationBehavior);
    } else if (isObjectType(nullableType) || isInputObjectType(nullableType)) {
      // this will create a new random ref
      return this.insert(nullableType.name, {});
    } else if (isListType(nullableType)) {
      return [...new Array(this.defaultListLength)].map((_, index) =>
        this.generateValueFromType(nullableType.ofType, index),
      );
    } else if (isAbstractType(nullableType)) {
      const mock = this.mocks[nullableType.name];

      let typeName: string;
      let values: { [key: string]: unknown } = {};
      if (!mock) {
        typeName = takeOneOf(
          this.schema.getPossibleTypes(nullableType).map(t => t.name),
          this.mockGenerationBehavior,
        );
      } else if (typeof mock === 'function') {
        const mockRes = mock();
        if (mockRes === null) return null;

        if (!isRecord(mockRes)) {
          throw new Error(
            `Value returned by the mock for ${nullableType.name} is not an object or null`,
          );
        }

        values = mockRes;
        if (typeof values['__typename'] !== 'string') {
          throw new Error(`Please return a __typename in "${nullableType.name}"`);
        }
        typeName = values['__typename'];
      } else if (
        typeof mock === 'object' &&
        mock != null &&
        typeof mock['__typename'] === 'function'
      ) {
        const mockRes = mock['__typename']();
        if (typeof mockRes !== 'string')
          throw new Error(
            `'__typename' returned by the mock for abstract type ${nullableType.name} is not a string`,
          );
        typeName = mockRes;
      } else {
        throw new Error(`Please return a __typename in "${nullableType.name}"`);
      }

      const toInsert = {};
      for (const fieldName in values) {
        if (fieldName === '__typename') continue;
        const fieldValue = (values as any)[fieldName];
        toInsert[fieldName] = typeof fieldValue === 'function' ? fieldValue() : fieldValue;
      }
      return this.insert(typeName, toInsert);
    } else {
      throw new Error(`${nullableType} not implemented`);
    }
  }

  private getFieldType(typeName: string, fieldName: string) {
    if (fieldName === '__typename') {
      return GraphQLString;
    }

    const type = this.getType(typeName);

    const field = type.getFields()[fieldName];

    if (!field) {
      throw new Error(`${fieldName} does not exist on type ${typeName}`);
    }

    return field.type;
  }

  private getType(typeName: string) {
    const type = this.schema.getType(typeName);

    if (!type || !(isObjectType(type) || isInterfaceType(type) || isInputObjectType(type))) {
      throw new Error(
        `${typeName} does not exist on schema or is not an object, interface, or input`,
      );
    }

    return type;
  }

  private isRootTypeName(typeName: string) {
    return getRootTypeNames(this.schema).has(typeName);
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
    // Input fields are argument data, not entity identity. An `id` on
    // UpdateUserInput is the target user's id, not this store entry's key.
    if (isInputObjectType(gqlType)) {
      return null;
    }

    for (const fieldName in gqlType.getFields()) {
      if (defaultKeyFieldNames.includes(fieldName)) {
        return fieldName;
      }
    }

    return null;
  }
}

const bareFieldId = (typeName: string, key: string | number, fieldName: string) =>
  `${typeName}:${String(key)}:${fieldName}`;

const getFieldNameInStore = (
  fieldName: string,
  fieldArgs?: string | { [argName: string]: any },
) => {
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

function assertIsDefined<T>(value: T, message?: string): asserts value is NonNullable<T> {
  if (value !== undefined && value !== null) {
    return;
  }

  throw new Error(
    process.env['NODE_ENV'] === 'production'
      ? 'Invariant failed:'
      : `Invariant failed: ${message || ''}`,
  );
}

/**
 * Will create `MockStore` for the given `schema`.
 *
 * A `MockStore` will generate mock values for the given schema when queried.
 * By default it'll generate random values, if this causes flakiness and you
 * need a more deterministic behavior, use `mockGenerationBehavior` option.
 *
 * It will store generated mocks, so that, provided with same arguments
 * the returned values will be the same.
 *
 * Its API also allows to modify the stored values.
 *
 * Basic example:
 * ```ts
 * store.get('User', 1, 'name');
 * // > "Hello World"
 * store.set('User', 1, 'name', 'Alexandre');
 * store.get('User', 1, 'name');
 * // > "Alexandre"
 * ```
 *
 * The storage key will correspond to the "key field"
 * of the type. Field with name `id` or `_id` will be
 * by default considered as the key field for the type.
 * However, use `typePolicies` to precise the field to use
 * as key.
 */
export function createMockStore(options: {
  /**
   * The `schema` to based mocks on.
   */
  schema: GraphQLSchema;

  /**
   * The mocks functions to use.
   */
  mocks?: IMocks;

  /**
   * Configures the default behavior for Scalar, Enum, Union, and Array types.
   *
   * When set to `random`, then every time a value is generated for a field with
   * one of these types
   * - For Unions and Enums one of the allowed values will be picked randomly
   * - For Arrays an array of `defaultListLength` items will be generated (2 by default)
   * - For Int and Float scalars a random number will be generated
   * - For Boolean scalars either `true` or `false` will be returned randomly
   *
   * When set to `deterministic`, then
   * - For Unions and Enums the first allowed value is picked
   * - For Arrays an array of `defaultListLength` items will be generated (2 by default)
   * - For Int and Float scalars values 1 and 1.5 will be used respectively
   * - For Boolean scalars we'll always return `true`
   * - For String scalars we'll always return "Hello World"
   *
   * Regardless of the chosen behavior, for ID scalars a random UUID string
   * will always be generated.
   *
   * @default "random"
   */
  mockGenerationBehavior?: MockGenerationBehavior;

  /**
   * Length used when the store auto-generates a list that has no explicit mock.
   *
   * @default 2
   */
  defaultListLength?: number;

  typePolicies?: {
    [typeName: string]: TypePolicy;
  };
}): IMockStore {
  return new MockStore(options);
}
