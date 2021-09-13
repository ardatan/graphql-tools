import { __values } from "tslib";
export function addProperty(object, path, value) {
    var initialSegment = path[0];
    if (path.length === 1) {
        object[initialSegment] = value;
        return;
    }
    var field = object[initialSegment];
    if (field != null) {
        addProperty(field, path.slice(1), value);
        return;
    }
    if (typeof path[1] === 'string') {
        field = Object.create(null);
    }
    else {
        field = [];
    }
    addProperty(field, path.slice(1), value);
    object[initialSegment] = field;
}
export function getProperty(object, path) {
    if (!path.length || object == null) {
        return object;
    }
    var newPath = path.slice();
    var key = newPath.shift();
    if (key == null) {
        return;
    }
    var prop = object[key];
    return getProperty(prop, newPath);
}
export function getProperties(object, propertyTree) {
    if (object == null) {
        return object;
    }
    var newObject = Object.create(null);
    var _loop_1 = function (key) {
        var subKey = propertyTree[key];
        if (subKey == null) {
            newObject[key] = object[key];
            return "continue";
        }
        var prop = object[key];
        newObject[key] = deepMap(prop, function deepMapFn(item) {
            return getProperties(item, subKey);
        });
    };
    for (var key in propertyTree) {
        _loop_1(key);
    }
    return newObject;
}
export function propertyTreeFromPaths(paths) {
    var e_1, _a;
    var propertyTree = Object.create(null);
    try {
        for (var paths_1 = __values(paths), paths_1_1 = paths_1.next(); !paths_1_1.done; paths_1_1 = paths_1.next()) {
            var path = paths_1_1.value;
            addProperty(propertyTree, path, null);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (paths_1_1 && !paths_1_1.done && (_a = paths_1.return)) _a.call(paths_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return propertyTree;
}
function deepMap(arrayOrItem, fn) {
    if (Array.isArray(arrayOrItem)) {
        return arrayOrItem.map(function (nestedArrayOrItem) { return deepMap(nestedArrayOrItem, fn); });
    }
    return fn(arrayOrItem);
}
