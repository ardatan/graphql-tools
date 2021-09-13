import { __read, __spreadArray } from "tslib";
// Taken from graphql-js
// https://github.com/graphql/graphql-js/blob/main/src/jsutils/inspect.ts
/* eslint-disable @typescript-eslint/ban-types */
var MAX_ARRAY_LENGTH = 10;
var MAX_RECURSIVE_DEPTH = 2;
/**
 * Used to print values in error messages.
 */
export function inspect(value) {
    return formatValue(value, []);
}
function formatValue(value, seenValues) {
    switch (typeof value) {
        case 'string':
            return JSON.stringify(value);
        case 'function':
            return value.name ? "[function " + value.name + "]" : '[function]';
        case 'object':
            return formatObjectValue(value, seenValues);
        default:
            return String(value);
    }
}
function formatObjectValue(value, previouslySeenValues) {
    if (value === null) {
        return 'null';
    }
    if (previouslySeenValues.includes(value)) {
        return '[Circular]';
    }
    var seenValues = __spreadArray(__spreadArray([], __read(previouslySeenValues), false), [value], false);
    if (isJSONable(value)) {
        var jsonValue = value.toJSON();
        // check for infinite recursion
        if (jsonValue !== value) {
            return typeof jsonValue === 'string' ? jsonValue : formatValue(jsonValue, seenValues);
        }
    }
    else if (Array.isArray(value)) {
        return formatArray(value, seenValues);
    }
    return formatObject(value, seenValues);
}
function isJSONable(value) {
    return typeof value.toJSON === 'function';
}
function formatObject(object, seenValues) {
    var entries = Object.entries(object);
    if (entries.length === 0) {
        return '{}';
    }
    if (seenValues.length > MAX_RECURSIVE_DEPTH) {
        return '[' + getObjectTag(object) + ']';
    }
    var properties = entries.map(function (_a) {
        var _b = __read(_a, 2), key = _b[0], value = _b[1];
        return key + ': ' + formatValue(value, seenValues);
    });
    return '{ ' + properties.join(', ') + ' }';
}
function formatArray(array, seenValues) {
    if (array.length === 0) {
        return '[]';
    }
    if (seenValues.length > MAX_RECURSIVE_DEPTH) {
        return '[Array]';
    }
    var len = Math.min(MAX_ARRAY_LENGTH, array.length);
    var remaining = array.length - len;
    var items = [];
    for (var i = 0; i < len; ++i) {
        items.push(formatValue(array[i], seenValues));
    }
    if (remaining === 1) {
        items.push('... 1 more item');
    }
    else if (remaining > 1) {
        items.push("... " + remaining + " more items");
    }
    return '[' + items.join(', ') + ']';
}
function getObjectTag(object) {
    var tag = Object.prototype.toString
        .call(object)
        .replace(/^\[object /, '')
        .replace(/]$/, '');
    if (tag === 'Object' && typeof object.constructor === 'function') {
        var name_1 = object.constructor.name;
        if (typeof name_1 === 'string' && name_1 !== '') {
            return name_1;
        }
    }
    return tag;
}
