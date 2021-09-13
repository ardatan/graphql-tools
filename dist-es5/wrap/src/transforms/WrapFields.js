import { __assign, __read, __values } from "tslib";
import { Kind, } from 'graphql';
import { appendObjectFields, selectObjectFields, modifyObjectFields, relocatedError, } from '@graphql-tools/utils';
import { defaultMergedResolver } from '@graphql-tools/delegate';
import MapFields from './MapFields';
import { defaultCreateProxyingResolver } from '../generateProxyingResolvers';
var WrapFields = /** @class */ (function () {
    function WrapFields(outerTypeName, wrappingFieldNames, wrappingTypeNames, fieldNames, prefix) {
        var _a, _b, _c;
        if (prefix === void 0) { prefix = 'gqtld'; }
        this.outerTypeName = outerTypeName;
        this.wrappingFieldNames = wrappingFieldNames;
        this.wrappingTypeNames = wrappingTypeNames;
        this.numWraps = wrappingFieldNames.length;
        this.fieldNames = fieldNames;
        var remainingWrappingFieldNames = this.wrappingFieldNames.slice();
        var outerMostWrappingFieldName = remainingWrappingFieldNames.shift();
        if (outerMostWrappingFieldName == null) {
            throw new Error("Cannot wrap fields, no wrapping field name provided.");
        }
        this.transformer = new MapFields((_a = {},
            _a[outerTypeName] = (_b = {},
                _b[outerMostWrappingFieldName] = function (fieldNode, fragments, transformationContext) {
                    return hoistFieldNodes({
                        fieldNode: fieldNode,
                        path: remainingWrappingFieldNames,
                        fieldNames: fieldNames,
                        fragments: fragments,
                        transformationContext: transformationContext,
                        prefix: prefix,
                    });
                },
                _b),
            _a), (_c = {},
            _c[outerTypeName] = function (value, context) { return dehoistValue(value, context); },
            _c), function (errors, context) { return dehoistErrors(errors, context); });
    }
    WrapFields.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        var _a, _b, _c;
        var _d, _e, _f, _g;
        var fieldNames = this.fieldNames;
        var targetFieldConfigMap = selectObjectFields(originalWrappingSchema, this.outerTypeName, !fieldNames ? function () { return true; } : function (fieldName) { return fieldNames.includes(fieldName); });
        var newTargetFieldConfigMap = Object.create(null);
        for (var fieldName in targetFieldConfigMap) {
            var field = targetFieldConfigMap[fieldName];
            var newField = __assign(__assign({}, field), { resolve: defaultMergedResolver });
            newTargetFieldConfigMap[fieldName] = newField;
        }
        var wrapIndex = this.numWraps - 1;
        var wrappingTypeName = this.wrappingTypeNames[wrapIndex];
        var wrappingFieldName = this.wrappingFieldNames[wrapIndex];
        var newSchema = appendObjectFields(originalWrappingSchema, wrappingTypeName, newTargetFieldConfigMap);
        for (wrapIndex--; wrapIndex > -1; wrapIndex--) {
            var nextWrappingTypeName = this.wrappingTypeNames[wrapIndex];
            newSchema = appendObjectFields(newSchema, nextWrappingTypeName, (_a = {},
                _a[wrappingFieldName] = {
                    type: newSchema.getType(wrappingTypeName),
                    resolve: defaultMergedResolver,
                },
                _a));
            wrappingTypeName = nextWrappingTypeName;
            wrappingFieldName = this.wrappingFieldNames[wrapIndex];
        }
        var wrappingRootField = this.outerTypeName === ((_d = originalWrappingSchema.getQueryType()) === null || _d === void 0 ? void 0 : _d.name) ||
            this.outerTypeName === ((_e = originalWrappingSchema.getMutationType()) === null || _e === void 0 ? void 0 : _e.name);
        var resolve;
        if (transformedSchema) {
            if (wrappingRootField) {
                var targetSchema = subschemaConfig.schema;
                var operation = this.outerTypeName === ((_f = targetSchema.getQueryType()) === null || _f === void 0 ? void 0 : _f.name) ? 'query' : 'mutation';
                var createProxyingResolver = (_g = subschemaConfig.createProxyingResolver) !== null && _g !== void 0 ? _g : defaultCreateProxyingResolver;
                resolve = createProxyingResolver({
                    subschemaConfig: subschemaConfig,
                    transformedSchema: transformedSchema,
                    operation: operation,
                    fieldName: wrappingFieldName,
                });
            }
            else {
                resolve = defaultMergedResolver;
            }
        }
        _c = __read(modifyObjectFields(newSchema, this.outerTypeName, function (fieldName) { return !!newTargetFieldConfigMap[fieldName]; }, (_b = {},
            _b[wrappingFieldName] = {
                type: newSchema.getType(wrappingTypeName),
                resolve: resolve,
            },
            _b)), 1), newSchema = _c[0];
        return this.transformer.transformSchema(newSchema, subschemaConfig, transformedSchema);
    };
    WrapFields.prototype.transformRequest = function (originalRequest, delegationContext, transformationContext) {
        transformationContext.nextIndex = 0;
        transformationContext.paths = Object.create(null);
        return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
    };
    WrapFields.prototype.transformResult = function (originalResult, delegationContext, transformationContext) {
        return this.transformer.transformResult(originalResult, delegationContext, transformationContext);
    };
    return WrapFields;
}());
export default WrapFields;
function collectFields(selectionSet, fragments, fields, visitedFragmentNames) {
    var e_1, _a;
    if (fields === void 0) { fields = []; }
    if (visitedFragmentNames === void 0) { visitedFragmentNames = {}; }
    if (selectionSet != null) {
        try {
            for (var _b = __values(selectionSet.selections), _c = _b.next(); !_c.done; _c = _b.next()) {
                var selection = _c.value;
                switch (selection.kind) {
                    case Kind.FIELD:
                        fields.push(selection);
                        break;
                    case Kind.INLINE_FRAGMENT:
                        collectFields(selection.selectionSet, fragments, fields, visitedFragmentNames);
                        break;
                    case Kind.FRAGMENT_SPREAD: {
                        var fragmentName = selection.name.value;
                        if (!visitedFragmentNames[fragmentName]) {
                            visitedFragmentNames[fragmentName] = true;
                            collectFields(fragments[fragmentName].selectionSet, fragments, fields, visitedFragmentNames);
                        }
                        break;
                    }
                    default:
                        // unreachable
                        break;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    return fields;
}
function aliasFieldNode(fieldNode, str) {
    return __assign(__assign({}, fieldNode), { alias: {
            kind: Kind.NAME,
            value: str,
        } });
}
function hoistFieldNodes(_a) {
    var e_2, _b, e_3, _c;
    var fieldNode = _a.fieldNode, fieldNames = _a.fieldNames, path = _a.path, fragments = _a.fragments, transformationContext = _a.transformationContext, prefix = _a.prefix, _d = _a.index, index = _d === void 0 ? 0 : _d, _e = _a.wrappingPath, wrappingPath = _e === void 0 ? [] : _e;
    var alias = fieldNode.alias != null ? fieldNode.alias.value : fieldNode.name.value;
    var newFieldNodes = [];
    if (index < path.length) {
        var pathSegment = path[index];
        try {
            for (var _f = __values(collectFields(fieldNode.selectionSet, fragments)), _g = _f.next(); !_g.done; _g = _f.next()) {
                var possibleFieldNode = _g.value;
                if (possibleFieldNode.name.value === pathSegment) {
                    var newWrappingPath = wrappingPath.concat([alias]);
                    newFieldNodes = newFieldNodes.concat(hoistFieldNodes({
                        fieldNode: possibleFieldNode,
                        fieldNames: fieldNames,
                        path: path,
                        fragments: fragments,
                        transformationContext: transformationContext,
                        prefix: prefix,
                        index: index + 1,
                        wrappingPath: newWrappingPath,
                    }));
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    else {
        try {
            for (var _h = __values(collectFields(fieldNode.selectionSet, fragments)), _j = _h.next(); !_j.done; _j = _h.next()) {
                var possibleFieldNode = _j.value;
                if (!fieldNames || fieldNames.includes(possibleFieldNode.name.value)) {
                    var nextIndex = transformationContext.nextIndex;
                    transformationContext.nextIndex++;
                    var indexingAlias = "__" + prefix + nextIndex + "__";
                    transformationContext.paths[indexingAlias] = {
                        pathToField: wrappingPath.concat([alias]),
                        alias: possibleFieldNode.alias != null ? possibleFieldNode.alias.value : possibleFieldNode.name.value,
                    };
                    newFieldNodes.push(aliasFieldNode(possibleFieldNode, indexingAlias));
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
            }
            finally { if (e_3) throw e_3.error; }
        }
    }
    return newFieldNodes;
}
export function dehoistValue(originalValue, context) {
    var e_4, _a;
    if (originalValue == null) {
        return originalValue;
    }
    var newValue = Object.create(null);
    for (var alias in originalValue) {
        var obj = newValue;
        var path = context.paths[alias];
        if (path == null) {
            newValue[alias] = originalValue[alias];
            continue;
        }
        var pathToField = path.pathToField;
        var fieldAlias = path.alias;
        try {
            for (var pathToField_1 = (e_4 = void 0, __values(pathToField)), pathToField_1_1 = pathToField_1.next(); !pathToField_1_1.done; pathToField_1_1 = pathToField_1.next()) {
                var key = pathToField_1_1.value;
                obj = obj[key] = obj[key] || Object.create(null);
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (pathToField_1_1 && !pathToField_1_1.done && (_a = pathToField_1.return)) _a.call(pathToField_1);
            }
            finally { if (e_4) throw e_4.error; }
        }
        obj[fieldAlias] = originalValue[alias];
    }
    return newValue;
}
function dehoistErrors(errors, context) {
    if (errors === undefined) {
        return undefined;
    }
    return errors.map(function (error) {
        var e_5, _a;
        var originalPath = error.path;
        if (originalPath == null) {
            return error;
        }
        var newPath = [];
        try {
            for (var originalPath_1 = __values(originalPath), originalPath_1_1 = originalPath_1.next(); !originalPath_1_1.done; originalPath_1_1 = originalPath_1.next()) {
                var pathSegment = originalPath_1_1.value;
                if (typeof pathSegment !== 'string') {
                    newPath.push(pathSegment);
                    continue;
                }
                var path = context.paths[pathSegment];
                if (path == null) {
                    newPath.push(pathSegment);
                    continue;
                }
                newPath = newPath.concat(path.pathToField, [path.alias]);
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (originalPath_1_1 && !originalPath_1_1.done && (_a = originalPath_1.return)) _a.call(originalPath_1);
            }
            finally { if (e_5) throw e_5.error; }
        }
        return relocatedError(error, newPath);
    });
}
