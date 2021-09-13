import { __assign } from "tslib";
import { GraphQLEnumType, isSchema, GraphQLScalarType, GraphQLUnionType, GraphQLInterfaceType, GraphQLObjectType, isSpecifiedScalarType, isScalarType, isEnumType, isUnionType, isInterfaceType, isObjectType, } from 'graphql';
import { mapSchema, MapperKind, forEachDefaultValue, serializeInputValue, healSchema, parseInputValue, forEachField, } from '@graphql-tools/utils';
import { checkForResolveTypeResolver } from './checkForResolveTypeResolver';
import { extendResolversFromInterfaces } from './extendResolversFromInterfaces';
export function addResolversToSchema(schemaOrOptions, legacyInputResolvers, legacyInputValidationOptions) {
    var options = isSchema(schemaOrOptions)
        ? {
            schema: schemaOrOptions,
            resolvers: legacyInputResolvers !== null && legacyInputResolvers !== void 0 ? legacyInputResolvers : {},
            resolverValidationOptions: legacyInputValidationOptions,
        }
        : schemaOrOptions;
    var schema = options.schema, inputResolvers = options.resolvers, defaultFieldResolver = options.defaultFieldResolver, _a = options.resolverValidationOptions, resolverValidationOptions = _a === void 0 ? {} : _a, _b = options.inheritResolversFromInterfaces, inheritResolversFromInterfaces = _b === void 0 ? false : _b, _c = options.updateResolversInPlace, updateResolversInPlace = _c === void 0 ? false : _c;
    var _d = resolverValidationOptions.requireResolversToMatchSchema, requireResolversToMatchSchema = _d === void 0 ? 'error' : _d, requireResolversForResolveType = resolverValidationOptions.requireResolversForResolveType;
    var resolvers = inheritResolversFromInterfaces
        ? extendResolversFromInterfaces(schema, inputResolvers)
        : inputResolvers;
    for (var typeName in resolvers) {
        var resolverValue = resolvers[typeName];
        var resolverType = typeof resolverValue;
        if (resolverType !== 'object') {
            throw new Error("\"" + typeName + "\" defined in resolvers, but has invalid value \"" + resolverValue + "\". The resolver's value must be of type object.");
        }
        var type = schema.getType(typeName);
        if (type == null) {
            if (requireResolversToMatchSchema === 'ignore') {
                break;
            }
            throw new Error("\"" + typeName + "\" defined in resolvers, but not in schema");
        }
        else if (isSpecifiedScalarType(type)) {
            // allow -- without recommending -- overriding of specified scalar types
            for (var fieldName in resolverValue) {
                if (fieldName.startsWith('__')) {
                    type[fieldName.substring(2)] = resolverValue[fieldName];
                }
                else {
                    type[fieldName] = resolverValue[fieldName];
                }
            }
        }
        else if (isEnumType(type)) {
            var values = type.getValues();
            var _loop_1 = function (fieldName) {
                if (!fieldName.startsWith('__') &&
                    !values.some(function (value) { return value.name === fieldName; }) &&
                    requireResolversToMatchSchema &&
                    requireResolversToMatchSchema !== 'ignore') {
                    throw new Error(type.name + "." + fieldName + " was defined in resolvers, but not present within " + type.name);
                }
            };
            for (var fieldName in resolverValue) {
                _loop_1(fieldName);
            }
        }
        else if (isUnionType(type)) {
            for (var fieldName in resolverValue) {
                if (!fieldName.startsWith('__') &&
                    requireResolversToMatchSchema &&
                    requireResolversToMatchSchema !== 'ignore') {
                    throw new Error(type.name + "." + fieldName + " was defined in resolvers, but " + type.name + " is not an object or interface type");
                }
            }
        }
        else if (isObjectType(type) || isInterfaceType(type)) {
            for (var fieldName in resolverValue) {
                if (!fieldName.startsWith('__')) {
                    var fields = type.getFields();
                    var field = fields[fieldName];
                    if (field == null) {
                        // Field present in resolver but not in schema
                        if (requireResolversToMatchSchema && requireResolversToMatchSchema !== 'ignore') {
                            throw new Error(typeName + "." + fieldName + " defined in resolvers, but not in schema");
                        }
                    }
                    else {
                        // Field present in both the resolver and schema
                        var fieldResolve = resolverValue[fieldName];
                        if (typeof fieldResolve !== 'function' && typeof fieldResolve !== 'object') {
                            throw new Error("Resolver " + typeName + "." + fieldName + " must be object or function");
                        }
                    }
                }
            }
        }
    }
    schema = updateResolversInPlace
        ? addResolversToExistingSchema(schema, resolvers, defaultFieldResolver)
        : createNewSchemaWithResolvers(schema, resolvers, defaultFieldResolver);
    if (requireResolversForResolveType && requireResolversForResolveType !== 'ignore') {
        checkForResolveTypeResolver(schema, requireResolversForResolveType);
    }
    return schema;
}
function addResolversToExistingSchema(schema, resolvers, defaultFieldResolver) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
    var typeMap = schema.getTypeMap();
    for (var typeName in resolvers) {
        var type = schema.getType(typeName);
        var resolverValue = resolvers[typeName];
        if (isScalarType(type)) {
            for (var fieldName in resolverValue) {
                if (fieldName.startsWith('__')) {
                    type[fieldName.substring(2)] = resolverValue[fieldName];
                }
                else if (fieldName === 'astNode' && type.astNode != null) {
                    type.astNode = __assign(__assign({}, type.astNode), { description: (_c = (_b = (_a = resolverValue) === null || _a === void 0 ? void 0 : _a.astNode) === null || _b === void 0 ? void 0 : _b.description) !== null && _c !== void 0 ? _c : type.astNode.description, directives: ((_d = type.astNode.directives) !== null && _d !== void 0 ? _d : []).concat((_g = (_f = (_e = resolverValue) === null || _e === void 0 ? void 0 : _e.astNode) === null || _f === void 0 ? void 0 : _f.directives) !== null && _g !== void 0 ? _g : []) });
                }
                else if (fieldName === 'extensionASTNodes' && type.extensionASTNodes != null) {
                    type.extensionASTNodes = type.extensionASTNodes.concat((_j = (_h = resolverValue) === null || _h === void 0 ? void 0 : _h.extensionASTNodes) !== null && _j !== void 0 ? _j : []);
                }
                else if (fieldName === 'extensions' &&
                    type.extensions != null &&
                    resolverValue.extensions != null) {
                    type.extensions = Object.assign(Object.create(null), type.extensions, resolverValue.extensions);
                }
                else {
                    type[fieldName] = resolverValue[fieldName];
                }
            }
        }
        else if (isEnumType(type)) {
            var config = type.toConfig();
            var enumValueConfigMap = config.values;
            for (var fieldName in resolverValue) {
                if (fieldName.startsWith('__')) {
                    config[fieldName.substring(2)] = resolverValue[fieldName];
                }
                else if (fieldName === 'astNode' && config.astNode != null) {
                    config.astNode = __assign(__assign({}, config.astNode), { description: (_m = (_l = (_k = resolverValue) === null || _k === void 0 ? void 0 : _k.astNode) === null || _l === void 0 ? void 0 : _l.description) !== null && _m !== void 0 ? _m : config.astNode.description, directives: ((_o = config.astNode.directives) !== null && _o !== void 0 ? _o : []).concat((_r = (_q = (_p = resolverValue) === null || _p === void 0 ? void 0 : _p.astNode) === null || _q === void 0 ? void 0 : _q.directives) !== null && _r !== void 0 ? _r : []) });
                }
                else if (fieldName === 'extensionASTNodes' && config.extensionASTNodes != null) {
                    config.extensionASTNodes = config.extensionASTNodes.concat((_t = (_s = resolverValue) === null || _s === void 0 ? void 0 : _s.extensionASTNodes) !== null && _t !== void 0 ? _t : []);
                }
                else if (fieldName === 'extensions' &&
                    type.extensions != null &&
                    resolverValue.extensions != null) {
                    type.extensions = Object.assign(Object.create(null), type.extensions, resolverValue.extensions);
                }
                else if (enumValueConfigMap[fieldName]) {
                    enumValueConfigMap[fieldName].value = resolverValue[fieldName];
                }
            }
            typeMap[typeName] = new GraphQLEnumType(config);
        }
        else if (isUnionType(type)) {
            for (var fieldName in resolverValue) {
                if (fieldName.startsWith('__')) {
                    type[fieldName.substring(2)] = resolverValue[fieldName];
                }
            }
        }
        else if (isObjectType(type) || isInterfaceType(type)) {
            for (var fieldName in resolverValue) {
                if (fieldName.startsWith('__')) {
                    // this is for isTypeOf and resolveType and all the other stuff.
                    type[fieldName.substring(2)] = resolverValue[fieldName];
                    break;
                }
                var fields = type.getFields();
                var field = fields[fieldName];
                if (field != null) {
                    var fieldResolve = resolverValue[fieldName];
                    if (typeof fieldResolve === 'function') {
                        // for convenience. Allows shorter syntax in resolver definition file
                        field.resolve = fieldResolve.bind(resolverValue);
                    }
                    else {
                        setFieldProperties(field, fieldResolve);
                    }
                }
            }
        }
    }
    // serialize all default values prior to healing fields with new scalar/enum types.
    forEachDefaultValue(schema, serializeInputValue);
    // schema may have new scalar/enum types that require healing
    healSchema(schema);
    // reparse all default values with new parsing functions.
    forEachDefaultValue(schema, parseInputValue);
    if (defaultFieldResolver != null) {
        forEachField(schema, function (field) {
            if (!field.resolve) {
                field.resolve = defaultFieldResolver;
            }
        });
    }
    return schema;
}
function createNewSchemaWithResolvers(schema, resolvers, defaultFieldResolver) {
    var _a, _b;
    schema = mapSchema(schema, (_a = {},
        _a[MapperKind.SCALAR_TYPE] = function (type) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            var config = type.toConfig();
            var resolverValue = resolvers[type.name];
            if (!isSpecifiedScalarType(type) && resolverValue != null) {
                for (var fieldName in resolverValue) {
                    if (fieldName.startsWith('__')) {
                        config[fieldName.substring(2)] = resolverValue[fieldName];
                    }
                    else if (fieldName === 'astNode' && config.astNode != null) {
                        config.astNode = __assign(__assign({}, config.astNode), { description: (_c = (_b = (_a = resolverValue) === null || _a === void 0 ? void 0 : _a.astNode) === null || _b === void 0 ? void 0 : _b.description) !== null && _c !== void 0 ? _c : config.astNode.description, directives: ((_d = config.astNode.directives) !== null && _d !== void 0 ? _d : []).concat((_g = (_f = (_e = resolverValue) === null || _e === void 0 ? void 0 : _e.astNode) === null || _f === void 0 ? void 0 : _f.directives) !== null && _g !== void 0 ? _g : []) });
                    }
                    else if (fieldName === 'extensionASTNodes' && config.extensionASTNodes != null) {
                        config.extensionASTNodes = config.extensionASTNodes.concat((_j = (_h = resolverValue) === null || _h === void 0 ? void 0 : _h.extensionASTNodes) !== null && _j !== void 0 ? _j : []);
                    }
                    else if (fieldName === 'extensions' &&
                        config.extensions != null &&
                        resolverValue.extensions != null) {
                        config.extensions = Object.assign(Object.create(null), type.extensions, resolverValue.extensions);
                    }
                    else {
                        config[fieldName] = resolverValue[fieldName];
                    }
                }
                return new GraphQLScalarType(config);
            }
        },
        _a[MapperKind.ENUM_TYPE] = function (type) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            var resolverValue = resolvers[type.name];
            var config = type.toConfig();
            var enumValueConfigMap = config.values;
            if (resolverValue != null) {
                for (var fieldName in resolverValue) {
                    if (fieldName.startsWith('__')) {
                        config[fieldName.substring(2)] = resolverValue[fieldName];
                    }
                    else if (fieldName === 'astNode' && config.astNode != null) {
                        config.astNode = __assign(__assign({}, config.astNode), { description: (_c = (_b = (_a = resolverValue) === null || _a === void 0 ? void 0 : _a.astNode) === null || _b === void 0 ? void 0 : _b.description) !== null && _c !== void 0 ? _c : config.astNode.description, directives: ((_d = config.astNode.directives) !== null && _d !== void 0 ? _d : []).concat((_g = (_f = (_e = resolverValue) === null || _e === void 0 ? void 0 : _e.astNode) === null || _f === void 0 ? void 0 : _f.directives) !== null && _g !== void 0 ? _g : []) });
                    }
                    else if (fieldName === 'extensionASTNodes' && config.extensionASTNodes != null) {
                        config.extensionASTNodes = config.extensionASTNodes.concat((_j = (_h = resolverValue) === null || _h === void 0 ? void 0 : _h.extensionASTNodes) !== null && _j !== void 0 ? _j : []);
                    }
                    else if (fieldName === 'extensions' &&
                        config.extensions != null &&
                        resolverValue.extensions != null) {
                        config.extensions = Object.assign(Object.create(null), type.extensions, resolverValue.extensions);
                    }
                    else if (enumValueConfigMap[fieldName]) {
                        enumValueConfigMap[fieldName].value = resolverValue[fieldName];
                    }
                }
                return new GraphQLEnumType(config);
            }
        },
        _a[MapperKind.UNION_TYPE] = function (type) {
            var resolverValue = resolvers[type.name];
            if (resolverValue != null) {
                var config = type.toConfig();
                if (resolverValue['__resolveType']) {
                    config.resolveType = resolverValue['__resolveType'];
                }
                return new GraphQLUnionType(config);
            }
        },
        _a[MapperKind.OBJECT_TYPE] = function (type) {
            var resolverValue = resolvers[type.name];
            if (resolverValue != null) {
                var config = type.toConfig();
                if (resolverValue['__isTypeOf']) {
                    config.isTypeOf = resolverValue['__isTypeOf'];
                }
                return new GraphQLObjectType(config);
            }
        },
        _a[MapperKind.INTERFACE_TYPE] = function (type) {
            var resolverValue = resolvers[type.name];
            if (resolverValue != null) {
                var config = type.toConfig();
                if (resolverValue['__resolveType']) {
                    config.resolveType = resolverValue['__resolveType'];
                }
                return new GraphQLInterfaceType(config);
            }
        },
        _a[MapperKind.COMPOSITE_FIELD] = function (fieldConfig, fieldName, typeName) {
            var resolverValue = resolvers[typeName];
            if (resolverValue != null) {
                var fieldResolve = resolverValue[fieldName];
                if (fieldResolve != null) {
                    var newFieldConfig = __assign({}, fieldConfig);
                    if (typeof fieldResolve === 'function') {
                        // for convenience. Allows shorter syntax in resolver definition file
                        newFieldConfig.resolve = fieldResolve.bind(resolverValue);
                    }
                    else {
                        setFieldProperties(newFieldConfig, fieldResolve);
                    }
                    return newFieldConfig;
                }
            }
        },
        _a));
    if (defaultFieldResolver != null) {
        schema = mapSchema(schema, (_b = {},
            _b[MapperKind.OBJECT_FIELD] = function (fieldConfig) { return (__assign(__assign({}, fieldConfig), { resolve: fieldConfig.resolve != null ? fieldConfig.resolve : defaultFieldResolver })); },
            _b));
    }
    return schema;
}
function setFieldProperties(field, propertiesObj) {
    for (var propertyName in propertiesObj) {
        field[propertyName] = propertiesObj[propertyName];
    }
}
