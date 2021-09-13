import { __assign, __read, __spreadArray, __values } from "tslib";
import { GraphQLString, isObjectType, isScalarType, getNullableType, isListType, isEnumType, isAbstractType, isCompositeType, isNullableType, isInterfaceType, } from 'graphql';
import stringify from 'fast-json-stable-stringify';
import { isRef, assertIsRef, isRecord, } from './types';
import { uuidv4, randomListLength, takeRandom, makeRef } from './utils';
import { deepResolveMockList, isMockList } from './MockList';
export var defaultMocks = {
    Int: function () { return Math.round(Math.random() * 200) - 100; },
    Float: function () { return Math.random() * 200 - 100; },
    String: function () { return 'Hello World'; },
    Boolean: function () { return Math.random() > 0.5; },
    ID: function () { return uuidv4(); },
};
var defaultKeyFieldNames = ['id', '_id'];
var MockStore = /** @class */ (function () {
    function MockStore(_a) {
        var schema = _a.schema, mocks = _a.mocks, typePolicies = _a.typePolicies;
        this.store = {};
        this.schema = schema;
        this.mocks = __assign(__assign({}, defaultMocks), mocks);
        this.typePolicies = typePolicies || {};
    }
    MockStore.prototype.get = function (_typeName, _key, _fieldName, _fieldArgs) {
        if (typeof _typeName !== 'string') {
            if (_key === undefined) {
                if (isRef(_typeName)) {
                    throw new Error("Can't provide a ref as first argument and no other argument");
                }
                // get({...})
                return this.getImpl(_typeName);
            }
            else {
                assertIsRef(_typeName);
                var $ref = _typeName.$ref;
                // arguments shift
                _fieldArgs = _fieldName;
                _fieldName = _key;
                _key = $ref.key;
                _typeName = $ref.typeName;
            }
        }
        var args = {
            typeName: _typeName,
        };
        if (isRecord(_key) || _key === undefined) {
            // get('User', { name: 'Alex'})
            args.defaultValue = _key;
            return this.getImpl(args);
        }
        args.key = _key;
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
            var ref = this.get(_typeName, _key, _fieldName[0], _fieldArgs);
            assertIsRef(ref);
            return this.get(ref.$ref.typeName, ref.$ref.key, _fieldName.slice(1, _fieldName.length));
        }
        // get('User', 'me', 'name'...);
        args.fieldName = _fieldName;
        args.fieldArgs = _fieldArgs;
        return this.getImpl(args);
    };
    MockStore.prototype.set = function (_typeName, _key, _fieldName, _value) {
        if (typeof _typeName !== 'string') {
            if (_key === undefined) {
                if (isRef(_typeName)) {
                    throw new Error("Can't provide a ref as first argument and no other argument");
                }
                // set({...})
                return this.setImpl(_typeName);
            }
            else {
                assertIsRef(_typeName);
                var $ref = _typeName.$ref;
                // arguments shift
                _value = _fieldName;
                _fieldName = _key;
                _key = $ref.key;
                _typeName = $ref.typeName;
            }
        }
        assertIsDefined(_key, 'key was not provided');
        var args = {
            typeName: _typeName,
            key: _key,
        };
        if (typeof _fieldName !== 'string') {
            // set('User', 1, { name: 'Foo' })
            if (!isRecord(_fieldName))
                throw new Error('Expected value to be a record');
            args.value = _fieldName;
            return this.setImpl(args);
        }
        args.fieldName = _fieldName;
        args.value = _value;
        return this.setImpl(args);
    };
    MockStore.prototype.reset = function () {
        this.store = {};
    };
    MockStore.prototype.filter = function (key, predicate) {
        var entity = this.store[key];
        return Object.values(entity).filter(predicate);
    };
    MockStore.prototype.find = function (key, predicate) {
        var entity = this.store[key];
        return Object.values(entity).find(predicate);
    };
    MockStore.prototype.getImpl = function (args) {
        var _this = this;
        var typeName = args.typeName, key = args.key, fieldName = args.fieldName, fieldArgs = args.fieldArgs, defaultValue = args.defaultValue;
        if (!fieldName) {
            if (defaultValue !== undefined && !isRecord(defaultValue)) {
                throw new Error('`defaultValue` should be an object');
            }
            var valuesToInsert = defaultValue || {};
            if (key) {
                valuesToInsert = __assign(__assign({}, valuesToInsert), makeRef(typeName, key));
            }
            return this.insert(typeName, valuesToInsert, true);
        }
        assertIsDefined(key, 'key argument should be given when fieldName is given');
        var fieldNameInStore = getFieldNameInStore(fieldName, fieldArgs);
        if (this.store[typeName] === undefined ||
            this.store[typeName][key] === undefined ||
            this.store[typeName][key][fieldNameInStore] === undefined) {
            var value = void 0;
            if (defaultValue !== undefined) {
                value = defaultValue;
            }
            else if (this.isKeyField(typeName, fieldName)) {
                value = key;
            }
            else {
                value = this.generateFieldValue(typeName, fieldName, function (otherFieldName, otherValue) {
                    // if we get a key field in the mix we don't care
                    if (_this.isKeyField(typeName, otherFieldName))
                        return;
                    _this.set({ typeName: typeName, key: key, fieldName: otherFieldName, value: otherValue, noOverride: true });
                });
            }
            this.set({ typeName: typeName, key: key, fieldName: fieldName, fieldArgs: fieldArgs, value: value, noOverride: true });
        }
        return this.store[typeName][key][fieldNameInStore];
    };
    MockStore.prototype.setImpl = function (args) {
        var _a;
        var _this = this;
        var typeName = args.typeName, key = args.key, fieldName = args.fieldName, fieldArgs = args.fieldArgs, noOverride = args.noOverride;
        var value = args.value;
        if (isMockList(value)) {
            value = deepResolveMockList(value);
        }
        if (!fieldName) {
            if (!isRecord(value)) {
                throw new Error('When no `fieldName` is provided, `value` should be a record.');
            }
            for (var fieldName_1 in value) {
                this.setImpl({
                    typeName: typeName,
                    key: key,
                    fieldName: fieldName_1,
                    value: value[fieldName_1],
                    noOverride: noOverride,
                });
            }
            return;
        }
        var fieldNameInStore = getFieldNameInStore(fieldName, fieldArgs);
        if (this.isKeyField(typeName, fieldName) && value !== key) {
            throw new Error("Field " + fieldName + " is a key field of " + typeName + " and you are trying to set it to " + value + " while the key is " + key);
        }
        if (this.store[typeName] === undefined) {
            this.store[typeName] = {};
        }
        if (this.store[typeName][key] === undefined) {
            this.store[typeName][key] = {};
        }
        // if already set and we don't override
        if (this.store[typeName][key][fieldNameInStore] !== undefined && noOverride) {
            return;
        }
        var fieldType = this.getFieldType(typeName, fieldName);
        var currentValue = this.store[typeName][key][fieldNameInStore];
        var valueToStore;
        try {
            valueToStore = this.normalizeValueToStore(fieldType, value, currentValue, function (typeName, values) {
                return _this.insert(typeName, values, noOverride);
            });
        }
        catch (e) {
            throw new Error("Value to set in " + typeName + "." + fieldName + " in not normalizable: " + e.message);
        }
        this.store[typeName][key] = __assign(__assign({}, this.store[typeName][key]), (_a = {}, _a[fieldNameInStore] = valueToStore, _a));
    };
    MockStore.prototype.normalizeValueToStore = function (fieldType, value, currentValue, onInsertType) {
        var _this = this;
        var fieldTypeName = fieldType.toString();
        if (value === null) {
            if (!isNullableType(fieldType)) {
                throw new Error("should not be null because " + fieldTypeName + " is not nullable. Received null.");
            }
            return null;
        }
        var nullableFieldType = getNullableType(fieldType);
        if (value === undefined)
            return this.generateValueFromType(nullableFieldType);
        // deal with nesting insert
        if (isCompositeType(nullableFieldType)) {
            if (!isRecord(value))
                throw new Error("should be an object or null or undefined. Received " + value);
            var joinedTypeName = void 0;
            if (isAbstractType(nullableFieldType)) {
                if (isRef(value)) {
                    joinedTypeName = value.$ref.typeName;
                }
                else {
                    if (typeof value['__typename'] !== 'string') {
                        throw new Error("should contain a '__typename' because " + nullableFieldType.name + " an abstract type");
                    }
                    joinedTypeName = value['__typename'];
                }
            }
            else {
                joinedTypeName = nullableFieldType.name;
            }
            return onInsertType(joinedTypeName, isRef(currentValue) ? __assign(__assign({}, currentValue), value) : value);
        }
        if (isListType(nullableFieldType)) {
            if (!Array.isArray(value))
                throw new Error("should be an array or null or undefined. Received " + value);
            return value.map(function (v, index) {
                return _this.normalizeValueToStore(nullableFieldType.ofType, v, typeof currentValue === 'object' && currentValue != null && currentValue[index] ? currentValue : undefined, onInsertType);
            });
        }
        return value;
    };
    MockStore.prototype.insert = function (typeName, values, noOverride) {
        var keyFieldName = this.getKeyFieldName(typeName);
        var key;
        // when we generate a key for the type, we might produce
        // other associated values with it
        // We keep track of them and we'll insert them, with propririty
        // for the ones that we areasked to insert
        var otherValues = {};
        if (isRef(values)) {
            key = values.$ref.key;
        }
        else if (keyFieldName && keyFieldName in values) {
            key = values[keyFieldName];
        }
        else {
            key = this.generateKeyForType(typeName, function (otherFieldName, otherFieldValue) {
                otherValues[otherFieldName] = otherFieldValue;
            });
        }
        var toInsert = __assign(__assign({}, otherValues), values);
        for (var fieldName in toInsert) {
            if (fieldName === '$ref')
                continue;
            if (fieldName === '__typename')
                continue;
            this.set({
                typeName: typeName,
                key: key,
                fieldName: fieldName,
                value: toInsert[fieldName],
                noOverride: noOverride,
            });
        }
        return makeRef(typeName, key);
    };
    MockStore.prototype.generateFieldValue = function (typeName, fieldName, onOtherFieldsGenerated) {
        var mockedValue = this.generateFieldValueFromMocks(typeName, fieldName, onOtherFieldsGenerated);
        if (mockedValue !== undefined)
            return mockedValue;
        var fieldType = this.getFieldType(typeName, fieldName);
        return this.generateValueFromType(fieldType);
    };
    MockStore.prototype.generateFieldValueFromMocks = function (typeName, fieldName, onOtherFieldsGenerated) {
        var e_1, _a;
        var value;
        var mock = this.mocks ? this.mocks[typeName] : undefined;
        if (mock) {
            if (typeof mock === 'function') {
                var values = mock();
                if (typeof values !== 'object' || values == null) {
                    throw new Error("Value returned by the mock for " + typeName + " is not an object");
                }
                for (var otherFieldName in values) {
                    if (otherFieldName === fieldName)
                        continue;
                    if (typeof values[otherFieldName] === 'function')
                        continue;
                    onOtherFieldsGenerated && onOtherFieldsGenerated(otherFieldName, values[otherFieldName]);
                }
                value = values[fieldName];
                if (typeof value === 'function')
                    value = value();
            }
            else if (typeof mock === 'object' && mock != null && typeof mock[fieldName] === 'function') {
                value = mock[fieldName]();
            }
        }
        if (value !== undefined)
            return value;
        var type = this.getType(typeName);
        // GraphQL 14 Compatibility
        var interfaces = 'getInterfaces' in type ? type.getInterfaces() : [];
        if (interfaces.length > 0) {
            try {
                for (var interfaces_1 = __values(interfaces), interfaces_1_1 = interfaces_1.next(); !interfaces_1_1.done; interfaces_1_1 = interfaces_1.next()) {
                    var interface_ = interfaces_1_1.value;
                    if (value)
                        break;
                    value = this.generateFieldValueFromMocks(interface_.name, fieldName, onOtherFieldsGenerated);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (interfaces_1_1 && !interfaces_1_1.done && (_a = interfaces_1.return)) _a.call(interfaces_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        return value;
    };
    MockStore.prototype.generateKeyForType = function (typeName, onOtherFieldsGenerated) {
        var keyFieldName = this.getKeyFieldName(typeName);
        if (!keyFieldName)
            return uuidv4();
        return this.generateFieldValue(typeName, keyFieldName, onOtherFieldsGenerated);
    };
    MockStore.prototype.generateValueFromType = function (fieldType) {
        var _this = this;
        var nullableType = getNullableType(fieldType);
        if (isScalarType(nullableType)) {
            var mockFn = this.mocks[nullableType.name];
            if (typeof mockFn !== 'function')
                throw new Error("No mock defined for type \"" + nullableType.name + "\"");
            return mockFn();
        }
        else if (isEnumType(nullableType)) {
            var mockFn = this.mocks[nullableType.name];
            if (typeof mockFn === 'function')
                return mockFn();
            var values = nullableType.getValues().map(function (v) { return v.value; });
            return takeRandom(values);
        }
        else if (isObjectType(nullableType)) {
            // this will create a new random ref
            return this.insert(nullableType.name, {});
        }
        else if (isListType(nullableType)) {
            return __spreadArray([], __read(new Array(randomListLength())), false).map(function () { return _this.generateValueFromType(nullableType.ofType); });
        }
        else if (isAbstractType(nullableType)) {
            var mock = this.mocks[nullableType.name];
            var typeName = void 0;
            var values = {};
            if (!mock) {
                typeName = takeRandom(this.schema.getPossibleTypes(nullableType).map(function (t) { return t.name; }));
            }
            else if (typeof mock === 'function') {
                var mockRes = mock();
                if (mockRes === null)
                    return null;
                if (!isRecord(mockRes)) {
                    throw new Error("Value returned by the mock for " + nullableType.name + " is not an object or null");
                }
                values = mockRes;
                if (typeof values['__typename'] !== 'string') {
                    throw new Error("Please return a __typename in \"" + nullableType.name + "\"");
                }
                typeName = values['__typename'];
            }
            else if (typeof mock === 'object' && mock != null && typeof mock['__typename'] === 'function') {
                var mockRes = mock['__typename']();
                if (typeof mockRes !== 'string')
                    throw new Error("'__typename' returned by the mock for abstract type " + nullableType.name + " is not a string");
                typeName = mockRes;
            }
            else {
                throw new Error("Please return a __typename in \"" + nullableType.name + "\"");
            }
            var toInsert = {};
            for (var fieldName in values) {
                if (fieldName === '__typename')
                    continue;
                var fieldValue = values[fieldName];
                toInsert[fieldName] = typeof fieldValue === 'function' ? fieldValue() : fieldValue;
            }
            return this.insert(typeName, toInsert);
        }
        else {
            throw new Error(nullableType + " not implemented");
        }
    };
    MockStore.prototype.getFieldType = function (typeName, fieldName) {
        if (fieldName === '__typename') {
            return GraphQLString;
        }
        var type = this.getType(typeName);
        var field = type.getFields()[fieldName];
        if (!field) {
            throw new Error(fieldName + " does not exist on type " + typeName);
        }
        return field.type;
    };
    MockStore.prototype.getType = function (typeName) {
        var type = this.schema.getType(typeName);
        if (!type || !(isObjectType(type) || isInterfaceType(type))) {
            throw new Error(typeName + " does not exist on schema or is not an object or interface");
        }
        return type;
    };
    MockStore.prototype.isKeyField = function (typeName, fieldName) {
        return this.getKeyFieldName(typeName) === fieldName;
    };
    MockStore.prototype.getKeyFieldName = function (typeName) {
        var _a;
        var typePolicyKeyField = (_a = this.typePolicies[typeName]) === null || _a === void 0 ? void 0 : _a.keyFieldName;
        if (typePolicyKeyField !== undefined) {
            if (typePolicyKeyField === false)
                return null;
            return typePolicyKeyField;
        }
        // How about common key field names?
        var gqlType = this.getType(typeName);
        for (var fieldName in gqlType.getFields()) {
            if (defaultKeyFieldNames.includes(fieldName)) {
                return fieldName;
            }
        }
        return null;
    };
    return MockStore;
}());
export { MockStore };
var getFieldNameInStore = function (fieldName, fieldArgs) {
    if (!fieldArgs)
        return fieldName;
    if (typeof fieldArgs === 'string') {
        return fieldName + ":" + fieldArgs;
    }
    // empty args
    if (Object.keys(fieldArgs).length === 0) {
        return fieldName;
    }
    return fieldName + ":" + stringify(fieldArgs);
};
function assertIsDefined(value, message) {
    if (value !== undefined && value !== null) {
        return;
    }
    throw new Error(process.env['NODE_ENV'] === 'production' ? 'Invariant failed:' : "Invariant failed: " + (message || ''));
}
/**
 * Will create `MockStore` for the given `schema`.
 *
 * A `MockStore` will generate mock values for the given schem when queried.
 *
 * It will stores generated mocks, so that, provided with same arguments
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
export function createMockStore(options) {
    return new MockStore(options);
}
