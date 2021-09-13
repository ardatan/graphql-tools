import { __assign, __read, __values } from "tslib";
import { getNullableType, Kind, } from 'graphql';
import { appendObjectFields, removeObjectFields, relocatedError, } from '@graphql-tools/utils';
import { defaultMergedResolver } from '@graphql-tools/delegate';
import { defaultCreateProxyingResolver } from '../generateProxyingResolvers';
import MapFields from './MapFields';
var HoistField = /** @class */ (function () {
    function HoistField(typeName, pathConfig, newFieldName, alias) {
        var _a, _b, _c;
        if (alias === void 0) { alias = '__gqtlw__'; }
        this.typeName = typeName;
        this.newFieldName = newFieldName;
        var path = pathConfig.map(function (segment) { return (typeof segment === 'string' ? segment : segment.fieldName); });
        this.argFilters = pathConfig.map(function (segment, index) {
            if (typeof segment === 'string' || segment.argFilter == null) {
                return index === pathConfig.length - 1 ? function () { return true; } : function () { return false; };
            }
            return segment.argFilter;
        });
        var pathToField = path.slice();
        var oldFieldName = pathToField.pop();
        if (oldFieldName == null) {
            throw new Error("Cannot hoist field to " + newFieldName + " on type " + typeName + ", no path provided.");
        }
        this.oldFieldName = oldFieldName;
        this.pathToField = pathToField;
        var argLevels = Object.create(null);
        this.transformer = new MapFields((_a = {},
            _a[typeName] = (_b = {},
                _b[newFieldName] = function (fieldNode) {
                    return wrapFieldNode(renameFieldNode(fieldNode, oldFieldName), pathToField, alias, argLevels);
                },
                _b),
            _a), (_c = {},
            _c[typeName] = function (value) { return unwrapValue(value, alias); },
            _c), function (errors) { return (errors != null ? unwrapErrors(errors, alias) : undefined); });
        this.argLevels = argLevels;
    }
    HoistField.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        var _a;
        var _this = this;
        var _b, _c, _d, _e;
        var argsMap = Object.create(null);
        var innerType = this.pathToField.reduce(function (acc, pathSegment, index) {
            var e_1, _a;
            var field = acc.getFields()[pathSegment];
            try {
                for (var _b = __values(field.args), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var arg = _c.value;
                    if (_this.argFilters[index](arg)) {
                        argsMap[arg.name] = arg;
                        _this.argLevels[arg.name] = index;
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
            return getNullableType(field.type);
        }, originalWrappingSchema.getType(this.typeName));
        var _f = __read(removeObjectFields(originalWrappingSchema, innerType.name, function (fieldName) { return fieldName === _this.oldFieldName; }), 2), newSchema = _f[0], targetFieldConfigMap = _f[1];
        var targetField = targetFieldConfigMap[this.oldFieldName];
        var resolve;
        if (transformedSchema) {
            var hoistingToRootField = this.typeName === ((_b = originalWrappingSchema.getQueryType()) === null || _b === void 0 ? void 0 : _b.name) ||
                this.typeName === ((_c = originalWrappingSchema.getMutationType()) === null || _c === void 0 ? void 0 : _c.name);
            if (hoistingToRootField) {
                var targetSchema = subschemaConfig.schema;
                var operation = this.typeName === ((_d = targetSchema.getQueryType()) === null || _d === void 0 ? void 0 : _d.name) ? 'query' : 'mutation';
                var createProxyingResolver = (_e = subschemaConfig.createProxyingResolver) !== null && _e !== void 0 ? _e : defaultCreateProxyingResolver;
                resolve = createProxyingResolver({
                    subschemaConfig: subschemaConfig,
                    transformedSchema: transformedSchema,
                    operation: operation,
                    fieldName: this.newFieldName,
                });
            }
            else {
                resolve = defaultMergedResolver;
            }
        }
        var newTargetField = __assign(__assign({}, targetField), { resolve: resolve });
        var level = this.pathToField.length;
        var args = targetField.args;
        if (args != null) {
            for (var argName in args) {
                var argConfig = args[argName];
                if (argConfig == null) {
                    continue;
                }
                var arg = __assign(__assign({}, argConfig), { name: argName, description: argConfig.description, defaultValue: argConfig.defaultValue, extensions: argConfig.extensions, astNode: argConfig.astNode });
                if (this.argFilters[level](arg)) {
                    argsMap[argName] = arg;
                    this.argLevels[arg.name] = level;
                }
            }
        }
        newTargetField.args = argsMap;
        newSchema = appendObjectFields(newSchema, this.typeName, (_a = {},
            _a[this.newFieldName] = newTargetField,
            _a));
        return this.transformer.transformSchema(newSchema, subschemaConfig, transformedSchema);
    };
    HoistField.prototype.transformRequest = function (originalRequest, delegationContext, transformationContext) {
        return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
    };
    HoistField.prototype.transformResult = function (originalResult, delegationContext, transformationContext) {
        return this.transformer.transformResult(originalResult, delegationContext, transformationContext);
    };
    return HoistField;
}());
export default HoistField;
export function wrapFieldNode(fieldNode, path, alias, argLevels) {
    return path.reduceRight(function (acc, fieldName, index) { return ({
        kind: Kind.FIELD,
        alias: {
            kind: Kind.NAME,
            value: alias,
        },
        name: {
            kind: Kind.NAME,
            value: fieldName,
        },
        selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [acc],
        },
        arguments: fieldNode.arguments != null
            ? fieldNode.arguments.filter(function (arg) { return argLevels[arg.name.value] === index; })
            : undefined,
    }); }, __assign(__assign({}, fieldNode), { arguments: fieldNode.arguments != null
            ? fieldNode.arguments.filter(function (arg) { return argLevels[arg.name.value] === path.length; })
            : undefined }));
}
export function renameFieldNode(fieldNode, name) {
    return __assign(__assign({}, fieldNode), { alias: {
            kind: Kind.NAME,
            value: fieldNode.alias != null ? fieldNode.alias.value : fieldNode.name.value,
        }, name: {
            kind: Kind.NAME,
            value: name,
        } });
}
export function unwrapValue(originalValue, alias) {
    var newValue = originalValue;
    var object = newValue[alias];
    while (object != null) {
        newValue = object;
        object = newValue[alias];
    }
    delete originalValue[alias];
    Object.assign(originalValue, newValue);
    return originalValue;
}
function unwrapErrors(errors, alias) {
    if (errors === undefined) {
        return undefined;
    }
    return errors.map(function (error) {
        var originalPath = error.path;
        if (originalPath == null) {
            return error;
        }
        var newPath = originalPath.filter(function (pathSegment) { return pathSegment !== alias; });
        return relocatedError(error, newPath);
    });
}
