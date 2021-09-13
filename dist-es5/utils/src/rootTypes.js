import { __read, __spreadArray } from "tslib";
import { memoize1 } from './memoize';
export function getDefinedRootType(schema, operation) {
    var rootTypeMap = getRootTypeMap(schema);
    var rootType = rootTypeMap.get(operation);
    if (rootType == null) {
        throw new Error("Root type for operation \"" + operation + "\" not defined by the given schema.");
    }
    return rootType;
}
export var getRootTypeNames = memoize1(function getRootTypeNames(schema) {
    var rootTypes = getRootTypes(schema);
    return new Set(__spreadArray([], __read(rootTypes), false).map(function (type) { return type.name; }));
});
export var getRootTypes = memoize1(function getRootTypes(schema) {
    var rootTypeMap = getRootTypeMap(schema);
    return new Set(rootTypeMap.values());
});
export var getRootTypeMap = memoize1(function getRootTypeMap(schema) {
    var rootTypeMap = new Map();
    var queryType = schema.getQueryType();
    if (queryType) {
        rootTypeMap.set('query', queryType);
    }
    var mutationType = schema.getMutationType();
    if (mutationType) {
        rootTypeMap.set('mutation', mutationType);
    }
    var subscriptionType = schema.getSubscriptionType();
    if (subscriptionType) {
        rootTypeMap.set('subscription', subscriptionType);
    }
    return rootTypeMap;
});
