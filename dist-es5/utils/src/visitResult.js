import { __read, __values } from "tslib";
import { getOperationRootType, getOperationAST, Kind, isListType, getNullableType, isAbstractType, isObjectType, TypeNameMetaFieldDef, } from 'graphql';
import { collectFields, collectSubFields } from './collectFields';
export function visitData(data, enter, leave) {
    if (Array.isArray(data)) {
        return data.map(function (value) { return visitData(value, enter, leave); });
    }
    else if (typeof data === 'object') {
        var newData = enter != null ? enter(data) : data;
        if (newData != null) {
            for (var key in newData) {
                var value = newData[key];
                newData[key] = visitData(value, enter, leave);
            }
        }
        return leave != null ? leave(newData) : newData;
    }
    return data;
}
export function visitErrors(errors, visitor) {
    return errors.map(function (error) { return visitor(error); });
}
export function visitResult(result, request, schema, resultVisitorMap, errorVisitorMap) {
    var fragments = request.document.definitions.reduce(function (acc, def) {
        if (def.kind === Kind.FRAGMENT_DEFINITION) {
            acc[def.name.value] = def;
        }
        return acc;
    }, {});
    var variableValues = request.variables || {};
    var errorInfo = {
        segmentInfoMap: new Map(),
        unpathedErrors: new Set(),
    };
    var data = result.data;
    var errors = result.errors;
    var visitingErrors = errors != null && errorVisitorMap != null;
    var operationDocumentNode = getOperationAST(request.document, undefined);
    if (data != null && operationDocumentNode != null) {
        result.data = visitRoot(data, operationDocumentNode, schema, fragments, variableValues, resultVisitorMap, visitingErrors ? errors : undefined, errorInfo);
    }
    if (errors != null && errorVisitorMap) {
        result.errors = visitErrorsByType(errors, errorVisitorMap, errorInfo);
    }
    return result;
}
function visitErrorsByType(errors, errorVisitorMap, errorInfo) {
    var segmentInfoMap = errorInfo.segmentInfoMap;
    var unpathedErrors = errorInfo.unpathedErrors;
    var unpathedErrorVisitor = errorVisitorMap['__unpathed'];
    return errors.map(function (originalError) {
        var pathSegmentsInfo = segmentInfoMap.get(originalError);
        var newError = pathSegmentsInfo == null
            ? originalError
            : pathSegmentsInfo.reduceRight(function (acc, segmentInfo) {
                var typeName = segmentInfo.type.name;
                var typeVisitorMap = errorVisitorMap[typeName];
                if (typeVisitorMap == null) {
                    return acc;
                }
                var errorVisitor = typeVisitorMap[segmentInfo.fieldName];
                return errorVisitor == null ? acc : errorVisitor(acc, segmentInfo.pathIndex);
            }, originalError);
        if (unpathedErrorVisitor && unpathedErrors.has(originalError)) {
            return unpathedErrorVisitor(newError);
        }
        return newError;
    });
}
function visitRoot(root, operation, schema, fragments, variableValues, resultVisitorMap, errors, errorInfo) {
    var operationRootType = getOperationRootType(schema, operation);
    var collectedFields = collectFields(schema, fragments, variableValues, operationRootType, operation.selectionSet, new Map(), new Set());
    return visitObjectValue(root, operationRootType, collectedFields, schema, fragments, variableValues, resultVisitorMap, 0, errors, errorInfo);
}
function visitObjectValue(object, type, fieldNodeMap, schema, fragments, variableValues, resultVisitorMap, pathIndex, errors, errorInfo) {
    var e_1, _a, e_2, _b, e_3, _c;
    var fieldMap = type.getFields();
    var typeVisitorMap = resultVisitorMap === null || resultVisitorMap === void 0 ? void 0 : resultVisitorMap[type.name];
    var enterObject = typeVisitorMap === null || typeVisitorMap === void 0 ? void 0 : typeVisitorMap.__enter;
    var newObject = enterObject != null ? enterObject(object) : object;
    var sortedErrors;
    var errorMap = null;
    if (errors != null) {
        sortedErrors = sortErrorsByPathSegment(errors, pathIndex);
        errorMap = sortedErrors.errorMap;
        try {
            for (var _d = __values(sortedErrors.unpathedErrors), _e = _d.next(); !_e.done; _e = _d.next()) {
                var error = _e.value;
                errorInfo.unpathedErrors.add(error);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    try {
        for (var fieldNodeMap_1 = __values(fieldNodeMap), fieldNodeMap_1_1 = fieldNodeMap_1.next(); !fieldNodeMap_1_1.done; fieldNodeMap_1_1 = fieldNodeMap_1.next()) {
            var _f = __read(fieldNodeMap_1_1.value, 2), responseKey = _f[0], subFieldNodes = _f[1];
            var fieldName = subFieldNodes[0].name.value;
            var fieldType = fieldName === '__typename' ? TypeNameMetaFieldDef.type : fieldMap[fieldName].type;
            var newPathIndex = pathIndex + 1;
            var fieldErrors = void 0;
            if (errorMap) {
                fieldErrors = errorMap[responseKey];
                if (fieldErrors != null) {
                    delete errorMap[responseKey];
                }
                addPathSegmentInfo(type, fieldName, newPathIndex, fieldErrors, errorInfo);
            }
            var newValue = visitFieldValue(object[responseKey], fieldType, subFieldNodes, schema, fragments, variableValues, resultVisitorMap, newPathIndex, fieldErrors, errorInfo);
            updateObject(newObject, responseKey, newValue, typeVisitorMap, fieldName);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (fieldNodeMap_1_1 && !fieldNodeMap_1_1.done && (_b = fieldNodeMap_1.return)) _b.call(fieldNodeMap_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    var oldTypename = newObject.__typename;
    if (oldTypename != null) {
        updateObject(newObject, '__typename', oldTypename, typeVisitorMap, '__typename');
    }
    if (errorMap) {
        for (var errorsKey in errorMap) {
            var errors_2 = errorMap[errorsKey];
            try {
                for (var errors_1 = (e_3 = void 0, __values(errors_2)), errors_1_1 = errors_1.next(); !errors_1_1.done; errors_1_1 = errors_1.next()) {
                    var error = errors_1_1.value;
                    errorInfo.unpathedErrors.add(error);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (errors_1_1 && !errors_1_1.done && (_c = errors_1.return)) _c.call(errors_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
    }
    var leaveObject = typeVisitorMap === null || typeVisitorMap === void 0 ? void 0 : typeVisitorMap.__leave;
    return leaveObject != null ? leaveObject(newObject) : newObject;
}
function updateObject(object, responseKey, newValue, typeVisitorMap, fieldName) {
    if (typeVisitorMap == null) {
        object[responseKey] = newValue;
        return;
    }
    var fieldVisitor = typeVisitorMap[fieldName];
    if (fieldVisitor == null) {
        object[responseKey] = newValue;
        return;
    }
    var visitedValue = fieldVisitor(newValue);
    if (visitedValue === undefined) {
        delete object[responseKey];
        return;
    }
    object[responseKey] = visitedValue;
}
function visitListValue(list, returnType, fieldNodes, schema, fragments, variableValues, resultVisitorMap, pathIndex, errors, errorInfo) {
    return list.map(function (listMember) {
        return visitFieldValue(listMember, returnType, fieldNodes, schema, fragments, variableValues, resultVisitorMap, pathIndex + 1, errors, errorInfo);
    });
}
function visitFieldValue(value, returnType, fieldNodes, schema, fragments, variableValues, resultVisitorMap, pathIndex, errors, errorInfo) {
    if (errors === void 0) { errors = []; }
    if (value == null) {
        return value;
    }
    var nullableType = getNullableType(returnType);
    if (isListType(nullableType)) {
        return visitListValue(value, nullableType.ofType, fieldNodes, schema, fragments, variableValues, resultVisitorMap, pathIndex, errors, errorInfo);
    }
    else if (isAbstractType(nullableType)) {
        var finalType = schema.getType(value.__typename);
        var collectedFields = collectSubFields(schema, fragments, variableValues, finalType, fieldNodes);
        return visitObjectValue(value, finalType, collectedFields, schema, fragments, variableValues, resultVisitorMap, pathIndex, errors, errorInfo);
    }
    else if (isObjectType(nullableType)) {
        var collectedFields = collectSubFields(schema, fragments, variableValues, nullableType, fieldNodes);
        return visitObjectValue(value, nullableType, collectedFields, schema, fragments, variableValues, resultVisitorMap, pathIndex, errors, errorInfo);
    }
    var typeVisitorMap = resultVisitorMap === null || resultVisitorMap === void 0 ? void 0 : resultVisitorMap[nullableType.name];
    if (typeVisitorMap == null) {
        return value;
    }
    var visitedValue = typeVisitorMap(value);
    return visitedValue === undefined ? value : visitedValue;
}
function sortErrorsByPathSegment(errors, pathIndex) {
    var e_4, _a;
    var _b;
    var errorMap = Object.create(null);
    var unpathedErrors = new Set();
    try {
        for (var errors_3 = __values(errors), errors_3_1 = errors_3.next(); !errors_3_1.done; errors_3_1 = errors_3.next()) {
            var error = errors_3_1.value;
            var pathSegment = (_b = error.path) === null || _b === void 0 ? void 0 : _b[pathIndex];
            if (pathSegment == null) {
                unpathedErrors.add(error);
                continue;
            }
            if (pathSegment in errorMap) {
                errorMap[pathSegment].push(error);
            }
            else {
                errorMap[pathSegment] = [error];
            }
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (errors_3_1 && !errors_3_1.done && (_a = errors_3.return)) _a.call(errors_3);
        }
        finally { if (e_4) throw e_4.error; }
    }
    return {
        errorMap: errorMap,
        unpathedErrors: unpathedErrors,
    };
}
function addPathSegmentInfo(type, fieldName, pathIndex, errors, errorInfo) {
    var e_5, _a;
    if (errors === void 0) { errors = []; }
    try {
        for (var errors_4 = __values(errors), errors_4_1 = errors_4.next(); !errors_4_1.done; errors_4_1 = errors_4.next()) {
            var error = errors_4_1.value;
            var segmentInfo = {
                type: type,
                fieldName: fieldName,
                pathIndex: pathIndex,
            };
            var pathSegmentsInfo = errorInfo.segmentInfoMap.get(error);
            if (pathSegmentsInfo == null) {
                errorInfo.segmentInfoMap.set(error, [segmentInfo]);
            }
            else {
                pathSegmentsInfo.push(segmentInfo);
            }
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (errors_4_1 && !errors_4_1.done && (_a = errors_4.return)) _a.call(errors_4);
        }
        finally { if (e_5) throw e_5.error; }
    }
}
