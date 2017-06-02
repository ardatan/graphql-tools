"use strict";
// Generates a schema for graphql-js given a shorthand schema
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// TODO: document each function clearly in the code: what arguments it accepts
// and what it outputs.
// TODO: we should refactor this file, rename it to makeExecutableSchema, and move
// a bunch of utility functions into a separate utitlities folder, one file per function.
var graphql_1 = require("graphql");
var lodash_1 = require("lodash");
var graphql_2 = require("graphql");
var graphql_3 = require("graphql");
var deprecated_decorator_1 = require("deprecated-decorator");
// @schemaDefinition: A GraphQL type schema in shorthand
// @resolvers: Definitions for resolvers to be merged with schema
var SchemaError = (function (_super) {
    __extends(SchemaError, _super);
    function SchemaError(message) {
        var _this = _super.call(this, message) || this;
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        return _this;
    }
    return SchemaError;
}(Error));
exports.SchemaError = SchemaError;
// type definitions can be a string or an array of strings.
function _generateSchema(typeDefinitions, resolveFunctions, logger, 
    // TODO: rename to allowUndefinedInResolve to be consistent
    allowUndefinedInResolve, resolverValidationOptions) {
    if (typeof resolverValidationOptions !== 'object') {
        throw new SchemaError('Expected `resolverValidationOptions` to be an object');
    }
    if (!typeDefinitions) {
        throw new SchemaError('Must provide typeDefs');
    }
    if (!resolveFunctions) {
        throw new SchemaError('Must provide resolvers');
    }
    // TODO: check that typeDefinitions is either string or array of strings
    var schema = buildSchemaFromTypeDefinitions(typeDefinitions);
    addResolveFunctionsToSchema(schema, resolveFunctions);
    assertResolveFunctionsPresent(schema, resolverValidationOptions);
    if (!allowUndefinedInResolve) {
        addCatchUndefinedToSchema(schema);
    }
    if (logger) {
        addErrorLoggingToSchema(schema, logger);
    }
    return schema;
}
function makeExecutableSchema(_a) {
    var typeDefs = _a.typeDefs, _b = _a.resolvers, resolvers = _b === void 0 ? {} : _b, connectors = _a.connectors, logger = _a.logger, _c = _a.allowUndefinedInResolve, allowUndefinedInResolve = _c === void 0 ? true : _c, _d = _a.resolverValidationOptions, resolverValidationOptions = _d === void 0 ? {} : _d;
    var jsSchema = _generateSchema(typeDefs, resolvers, logger, allowUndefinedInResolve, resolverValidationOptions);
    if (typeof resolvers['__schema'] === 'function') {
        // TODO a bit of a hack now, better rewrite generateSchema to attach it there.
        // not doing that now, because I'd have to rewrite a lot of tests.
        addSchemaLevelResolveFunction(jsSchema, resolvers['__schema']);
    }
    if (connectors) {
        // connectors are optional, at least for now. That means you can just import them in the resolve
        // function if you want.
        attachConnectorsToContext(jsSchema, connectors);
    }
    return jsSchema;
}
exports.makeExecutableSchema = makeExecutableSchema;
function isDocumentNode(typeDefinitions) {
    return typeDefinitions.kind !== undefined;
}
function concatenateTypeDefs(typeDefinitionsAry, calledFunctionRefs) {
    if (calledFunctionRefs === void 0) { calledFunctionRefs = []; }
    var resolvedTypeDefinitions = [];
    typeDefinitionsAry.forEach(function (typeDef) {
        if (isDocumentNode(typeDef)) {
            typeDef = graphql_1.print(typeDef);
        }
        if (typeof typeDef === 'function') {
            if (calledFunctionRefs.indexOf(typeDef) === -1) {
                calledFunctionRefs.push(typeDef);
                resolvedTypeDefinitions = resolvedTypeDefinitions.concat(concatenateTypeDefs(typeDef(), calledFunctionRefs));
            }
        }
        else if (typeof typeDef === 'string') {
            resolvedTypeDefinitions.push(typeDef.trim());
        }
        else {
            var type = typeof typeDef;
            throw new SchemaError("typeDef array must contain only strings and functions, got " + type);
        }
    });
    return lodash_1.uniq(resolvedTypeDefinitions.map(function (x) { return x.trim(); })).join('\n');
}
exports.concatenateTypeDefs = concatenateTypeDefs;
function buildSchemaFromTypeDefinitions(typeDefinitions) {
    // TODO: accept only array here, otherwise interfaces get confusing.
    var myDefinitions = typeDefinitions;
    var astDocument;
    if (isDocumentNode(typeDefinitions)) {
        astDocument = typeDefinitions;
    }
    else if (typeof myDefinitions !== 'string') {
        if (!Array.isArray(myDefinitions)) {
            var type = typeof myDefinitions;
            throw new SchemaError("typeDefs must be a string, array or schema AST, got " + type);
        }
        myDefinitions = concatenateTypeDefs(myDefinitions);
    }
    if (typeof myDefinitions === 'string') {
        astDocument = graphql_1.parse(myDefinitions);
    }
    var schema = graphql_2.buildASTSchema(astDocument);
    var extensionsAst = extractExtensionDefinitions(astDocument);
    if (extensionsAst.definitions.length > 0) {
        schema = graphql_2.extendSchema(schema, extensionsAst);
    }
    return schema;
}
exports.buildSchemaFromTypeDefinitions = buildSchemaFromTypeDefinitions;
function extractExtensionDefinitions(ast) {
    var extensionDefs = ast.definitions.filter(function (def) { return def.kind === graphql_1.Kind.TYPE_EXTENSION_DEFINITION; });
    return Object.assign({}, ast, {
        definitions: extensionDefs,
    });
}
function forEachField(schema, fn) {
    var typeMap = schema.getTypeMap();
    Object.keys(typeMap).forEach(function (typeName) {
        var type = typeMap[typeName];
        // TODO: maybe have an option to include these?
        if (!graphql_3.getNamedType(type).name.startsWith('__') && type instanceof graphql_3.GraphQLObjectType) {
            var fields_1 = type.getFields();
            Object.keys(fields_1).forEach(function (fieldName) {
                var field = fields_1[fieldName];
                fn(field, typeName, fieldName);
            });
        }
    });
}
exports.forEachField = forEachField;
// takes a GraphQL-JS schema and an object of connectors, then attaches
// the connectors to the context by wrapping each query or mutation resolve
// function with a function that attaches connectors if they don't exist.
// attaches connectors only once to make sure they are singletons
var attachConnectorsToContext = deprecated_decorator_1.deprecated({
    version: '0.7.0',
    url: 'https://github.com/apollostack/graphql-tools/issues/140',
}, function attachConnectorsToContext(schema, connectors) {
    if (!schema || !(schema instanceof graphql_3.GraphQLSchema)) {
        throw new Error('schema must be an instance of GraphQLSchema. ' +
            'This error could be caused by installing more than one version of GraphQL-JS');
    }
    if (typeof connectors !== 'object') {
        var connectorType = typeof connectors;
        throw new Error("Expected connectors to be of type object, got " + connectorType);
    }
    if (Object.keys(connectors).length === 0) {
        throw new Error('Expected connectors to not be an empty object');
    }
    if (Array.isArray(connectors)) {
        throw new Error('Expected connectors to be of type object, got Array');
    }
    if (schema['_apolloConnectorsAttached']) {
        throw new Error('Connectors already attached to context, cannot attach more than once');
    }
    schema['_apolloConnectorsAttached'] = true;
    var attachconnectorFn = function (root, args, ctx) {
        if (typeof ctx !== 'object') {
            // if in any way possible, we should throw an error when the attachconnectors
            // function is called, not when a query is executed.
            var contextType = typeof ctx;
            throw new Error("Cannot attach connector because context is not an object: " + contextType);
        }
        if (typeof ctx.connectors === 'undefined') {
            ctx.connectors = {};
        }
        Object.keys(connectors).forEach(function (connectorName) {
            var connector = connectors[connectorName];
            if (!!connector.prototype) {
                ctx.connectors[connectorName] = new connector(ctx);
            }
            else {
                throw new Error("Connector must be a function or an class");
            }
        });
        return root;
    };
    addSchemaLevelResolveFunction(schema, attachconnectorFn);
});
exports.attachConnectorsToContext = attachConnectorsToContext;
// wraps all resolve functions of query, mutation or subscription fields
// with the provided function to simulate a root schema level resolve funciton
function addSchemaLevelResolveFunction(schema, fn) {
    // TODO test that schema is a schema, fn is a function
    var rootTypes = ([
        schema.getQueryType(),
        schema.getMutationType(),
        schema.getSubscriptionType(),
    ]).filter(function (x) { return !!x; });
    rootTypes.forEach(function (type) {
        // XXX this should run at most once per request to simulate a true root resolver
        // for graphql-js this is an approximation that works with queries but not mutations
        var rootResolveFn = runAtMostOncePerRequest(fn);
        var fields = type.getFields();
        Object.keys(fields).forEach(function (fieldName) {
            // XXX if the type is a subscription, a same query AST will be ran multiple times so we
            // deactivate here the runOnce if it's a subscription. This may not be optimal though...
            if (type === schema.getSubscriptionType()) {
                fields[fieldName].resolve = wrapResolver(fields[fieldName].resolve, fn);
            }
            else {
                fields[fieldName].resolve = wrapResolver(fields[fieldName].resolve, rootResolveFn);
            }
        });
    });
}
exports.addSchemaLevelResolveFunction = addSchemaLevelResolveFunction;
function getFieldsForType(type) {
    if ((type instanceof graphql_3.GraphQLObjectType) ||
        (type instanceof graphql_3.GraphQLInterfaceType)) {
        return type.getFields();
    }
    else {
        return undefined;
    }
}
function addResolveFunctionsToSchema(schema, resolveFunctions) {
    Object.keys(resolveFunctions).forEach(function (typeName) {
        var type = schema.getType(typeName);
        if (!type && typeName !== '__schema') {
            throw new SchemaError("\"" + typeName + "\" defined in resolvers, but not in schema");
        }
        Object.keys(resolveFunctions[typeName]).forEach(function (fieldName) {
            if (fieldName.startsWith('__')) {
                // this is for isTypeOf and resolveType and all the other stuff.
                // TODO require resolveType for unions and interfaces.
                type[fieldName.substring(2)] = resolveFunctions[typeName][fieldName];
                return;
            }
            if (type instanceof graphql_3.GraphQLScalarType) {
                type[fieldName] = resolveFunctions[typeName][fieldName];
                return;
            }
            var fields = getFieldsForType(type);
            if (!fields) {
                throw new SchemaError(typeName + " was defined in resolvers, but it's not an object");
            }
            if (!fields[fieldName]) {
                throw new SchemaError(typeName + "." + fieldName + " defined in resolvers, but not in schema");
            }
            var field = fields[fieldName];
            var fieldResolve = resolveFunctions[typeName][fieldName];
            if (typeof fieldResolve === 'function') {
                // for convenience. Allows shorter syntax in resolver definition file
                setFieldProperties(field, { resolve: fieldResolve });
            }
            else {
                if (typeof fieldResolve !== 'object') {
                    throw new SchemaError("Resolver " + typeName + "." + fieldName + " must be object or function");
                }
                setFieldProperties(field, fieldResolve);
            }
        });
    });
}
exports.addResolveFunctionsToSchema = addResolveFunctionsToSchema;
function setFieldProperties(field, propertiesObj) {
    Object.keys(propertiesObj).forEach(function (propertyName) {
        field[propertyName] = propertiesObj[propertyName];
    });
}
function assertResolveFunctionsPresent(schema, resolverValidationOptions) {
    if (resolverValidationOptions === void 0) { resolverValidationOptions = {}; }
    var _a = resolverValidationOptions.requireResolversForArgs, requireResolversForArgs = _a === void 0 ? false : _a, _b = resolverValidationOptions.requireResolversForNonScalar, requireResolversForNonScalar = _b === void 0 ? false : _b, _c = resolverValidationOptions.requireResolversForAllFields, requireResolversForAllFields = _c === void 0 ? false : _c;
    if (requireResolversForAllFields && (requireResolversForArgs || requireResolversForNonScalar)) {
        throw new TypeError('requireResolversForAllFields takes precedence over the more specific assertions. ' +
            'Please configure either requireResolversForAllFields or requireResolversForArgs / ' +
            'requireResolversForNonScalar, but not a combination of them.');
    }
    forEachField(schema, function (field, typeName, fieldName) {
        // requires a resolve function for *every* field.
        if (requireResolversForAllFields) {
            expectResolveFunction(field, typeName, fieldName);
        }
        // requires a resolve function on every field that has arguments
        if (requireResolversForArgs && field.args.length > 0) {
            expectResolveFunction(field, typeName, fieldName);
        }
        // requires a resolve function on every field that returns a non-scalar type
        if (requireResolversForNonScalar && !(graphql_3.getNamedType(field.type) instanceof graphql_3.GraphQLScalarType)) {
            expectResolveFunction(field, typeName, fieldName);
        }
    });
}
exports.assertResolveFunctionsPresent = assertResolveFunctionsPresent;
function expectResolveFunction(field, typeName, fieldName) {
    if (!field.resolve) {
        // tslint:disable-next-line: max-line-length
        console.warn("Resolve function missing for \"" + typeName + "." + fieldName + "\". To disable this warning check https://github.com/apollostack/graphql-tools/issues/131");
        return;
    }
    if (typeof field.resolve !== 'function') {
        throw new SchemaError("Resolver \"" + typeName + "." + fieldName + "\" must be a function");
    }
}
function addErrorLoggingToSchema(schema, logger) {
    if (!logger) {
        throw new Error('Must provide a logger');
    }
    if (typeof logger.log !== 'function') {
        throw new Error('Logger.log must be a function');
    }
    forEachField(schema, function (field, typeName, fieldName) {
        var errorHint = typeName + "." + fieldName;
        field.resolve = decorateWithLogger(field.resolve, logger, errorHint);
    });
}
exports.addErrorLoggingToSchema = addErrorLoggingToSchema;
// XXX badly named function. this doesn't really wrap, it just chains resolvers...
function wrapResolver(innerResolver, outerResolver) {
    return function (obj, args, ctx, info) {
        return Promise.resolve(outerResolver(obj, args, ctx, info)).then(function (root) {
            if (innerResolver) {
                return innerResolver(root, args, ctx, info);
            }
            return defaultResolveFn(root, args, ctx, info);
        });
    };
}
function chainResolvers(resolvers) {
    return function (root, args, ctx, info) {
        return resolvers.reduce(function (prev, curResolver) {
            if (curResolver) {
                return curResolver(prev, args, ctx, info);
            }
            return defaultResolveFn(prev, args, ctx, info);
        }, root);
    };
}
exports.chainResolvers = chainResolvers;
/*
 * fn: The function to decorate with the logger
 * logger: an object instance of type Logger
 * hint: an optional hint to add to the error's message
 */
function decorateWithLogger(fn, logger, hint) {
    if (typeof fn === 'undefined') {
        fn = defaultResolveFn;
    }
    var logError = function (e) {
        // TODO: clone the error properly
        var newE = new Error();
        newE.stack = e.stack;
        /* istanbul ignore else: always get the hint from addErrorLoggingToSchema */
        if (hint) {
            newE['originalMessage'] = e.message;
            newE['message'] = "Error in resolver " + hint + "\n" + e.message;
        }
        logger.log(newE);
    };
    return function (root, args, ctx, info) {
        try {
            var result = fn(root, args, ctx, info);
            // If the resolve function returns a Promise log any Promise rejects.
            if (result && typeof result.then === 'function' && typeof result.catch === 'function') {
                result.catch(function (reason) {
                    // make sure that it's an error we're logging.
                    var error = reason instanceof Error ? reason : new Error(reason);
                    logError(error);
                    // We don't want to leave an unhandled exception so pass on error.
                    return reason;
                });
            }
            return result;
        }
        catch (e) {
            logError(e);
            // we want to pass on the error, just in case.
            throw e;
        }
    };
}
function addCatchUndefinedToSchema(schema) {
    forEachField(schema, function (field, typeName, fieldName) {
        var errorHint = typeName + "." + fieldName;
        field.resolve = decorateToCatchUndefined(field.resolve, errorHint);
    });
}
exports.addCatchUndefinedToSchema = addCatchUndefinedToSchema;
function decorateToCatchUndefined(fn, hint) {
    if (typeof fn === 'undefined') {
        fn = defaultResolveFn;
    }
    return function (root, args, ctx, info) {
        var result = fn(root, args, ctx, info);
        if (typeof result === 'undefined') {
            throw new Error("Resolve function for \"" + hint + "\" returned undefined");
        }
        return result;
    };
}
// XXX this function only works for resolvers
// XXX very hacky way to remember if the function
// already ran for this request. This will only work
// if people don't actually cache the operation.
// if they do cache the operation, they will have to
// manually remove the __runAtMostOnce before every request.
function runAtMostOncePerRequest(fn) {
    var value;
    var randomNumber = Math.random();
    return function (root, args, ctx, info) {
        if (!info.operation['__runAtMostOnce']) {
            info.operation['__runAtMostOnce'] = {};
        }
        if (!info.operation['__runAtMostOnce'][randomNumber]) {
            info.operation['__runAtMostOnce'][randomNumber] = true;
            value = fn(root, args, ctx, info);
        }
        return value;
    };
}
/**
 * XXX taken from graphql-js: src/execution/execute.js, because that function
 * is not exported
 *
 * If a resolve function is not given, then a default resolve behavior is used
 * which takes the property of the source object of the same name as the field
 * and returns it as the result, or if it's a function, returns the result
 * of calling that function.
 */
function defaultResolveFn(source, args, context, _a) {
    var fieldName = _a.fieldName;
    // ensure source is a value for which property access is acceptable.
    if (typeof source === 'object' || typeof source === 'function') {
        var property = source[fieldName];
        if (typeof property === 'function') {
            return property(args, context);
        }
        return property;
    }
}
//# sourceMappingURL=schemaGenerator.js.map