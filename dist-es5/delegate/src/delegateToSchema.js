import { __assign } from "tslib";
import { subscribe, execute, validate, getOperationAST, } from 'graphql';
import { ValueOrPromise } from 'value-or-promise';
import { getBatchingExecutor } from '@graphql-tools/batch-execute';
import { mapAsyncIterator, AggregateError, isAsyncIterable, getDefinedRootType, memoize1, } from '@graphql-tools/utils';
import { isSubschemaConfig } from './subschemaConfig';
import { Subschema } from './Subschema';
import { createRequestFromInfo, getDelegatingOperation } from './createRequest';
import { Transformer } from './Transformer';
export function delegateToSchema(options) {
    var info = options.info, schema = options.schema, rootValue = options.rootValue, operationName = options.operationName, _a = options.operation, operation = _a === void 0 ? getDelegatingOperation(info.parentType, info.schema) : _a, _b = options.fieldName, fieldName = _b === void 0 ? info.fieldName : _b, selectionSet = options.selectionSet, fieldNodes = options.fieldNodes, context = options.context;
    var request = createRequestFromInfo({
        info: info,
        operation: operation,
        fieldName: fieldName,
        selectionSet: selectionSet,
        fieldNodes: fieldNodes,
        rootValue: rootValue !== null && rootValue !== void 0 ? rootValue : schema.rootValue,
        operationName: operationName,
        context: context,
    });
    return delegateRequest(__assign(__assign({}, options), { request: request }));
}
function getDelegationReturnType(targetSchema, operation, fieldName) {
    var rootType = getDefinedRootType(targetSchema, operation);
    return rootType.getFields()[fieldName].type;
}
export function delegateRequest(options) {
    var delegationContext = getDelegationContext(options);
    var transformer = new Transformer(delegationContext);
    var processedRequest = transformer.transformRequest(options.request);
    if (options.validateRequest) {
        validateRequest(delegationContext, processedRequest.document);
    }
    var executor = getExecutor(delegationContext);
    return new ValueOrPromise(function () { return executor(processedRequest); })
        .then(function (originalResult) {
        if (isAsyncIterable(originalResult)) {
            // "subscribe" to the subscription result and map the result through the transforms
            return mapAsyncIterator(originalResult, function (result) { return transformer.transformResult(result); });
        }
        return transformer.transformResult(originalResult);
    })
        .resolve();
}
function getDelegationContext(_a) {
    var _b, _c, _d, _e;
    var request = _a.request, schema = _a.schema, fieldName = _a.fieldName, returnType = _a.returnType, args = _a.args, info = _a.info, _f = _a.transforms, transforms = _f === void 0 ? [] : _f, transformedSchema = _a.transformedSchema, _g = _a.skipTypeMerging, skipTypeMerging = _g === void 0 ? false : _g;
    var operation = request.operationType, context = request.context, operationName = request.operationName, document = request.document;
    var operationDefinition;
    var targetFieldName;
    if (fieldName == null) {
        operationDefinition = getOperationAST(document, operationName);
        if (operationDefinition == null) {
            throw new Error('Cannot infer main operation from the provided document.');
        }
        targetFieldName = (operationDefinition === null || operationDefinition === void 0 ? void 0 : operationDefinition.selectionSet.selections[0]).name.value;
    }
    else {
        targetFieldName = fieldName;
    }
    var stitchingInfo = (_b = info === null || info === void 0 ? void 0 : info.schema.extensions) === null || _b === void 0 ? void 0 : _b['stitchingInfo'];
    var subschemaOrSubschemaConfig = (_c = stitchingInfo === null || stitchingInfo === void 0 ? void 0 : stitchingInfo.subschemaMap.get(schema)) !== null && _c !== void 0 ? _c : schema;
    if (isSubschemaConfig(subschemaOrSubschemaConfig)) {
        var targetSchema = subschemaOrSubschemaConfig.schema;
        return {
            subschema: schema,
            subschemaConfig: subschemaOrSubschemaConfig,
            targetSchema: targetSchema,
            operation: operation,
            fieldName: targetFieldName,
            args: args,
            context: context,
            info: info,
            returnType: (_d = returnType !== null && returnType !== void 0 ? returnType : info === null || info === void 0 ? void 0 : info.returnType) !== null && _d !== void 0 ? _d : getDelegationReturnType(targetSchema, operation, targetFieldName),
            transforms: subschemaOrSubschemaConfig.transforms != null
                ? subschemaOrSubschemaConfig.transforms.concat(transforms)
                : transforms,
            transformedSchema: transformedSchema !== null && transformedSchema !== void 0 ? transformedSchema : (subschemaOrSubschemaConfig instanceof Subschema ? subschemaOrSubschemaConfig.transformedSchema : targetSchema),
            skipTypeMerging: skipTypeMerging,
        };
    }
    return {
        subschema: schema,
        subschemaConfig: undefined,
        targetSchema: subschemaOrSubschemaConfig,
        operation: operation,
        fieldName: targetFieldName,
        args: args,
        context: context,
        info: info,
        returnType: (_e = returnType !== null && returnType !== void 0 ? returnType : info === null || info === void 0 ? void 0 : info.returnType) !== null && _e !== void 0 ? _e : getDelegationReturnType(subschemaOrSubschemaConfig, operation, targetFieldName),
        transforms: transforms,
        transformedSchema: transformedSchema !== null && transformedSchema !== void 0 ? transformedSchema : subschemaOrSubschemaConfig,
        skipTypeMerging: skipTypeMerging,
    };
}
function validateRequest(delegationContext, document) {
    var errors = validate(delegationContext.targetSchema, document);
    if (errors.length > 0) {
        if (errors.length > 1) {
            var combinedError = new AggregateError(errors);
            throw combinedError;
        }
        var error = errors[0];
        throw error.originalError || error;
    }
}
function getExecutor(delegationContext) {
    var _a, _b;
    var subschemaConfig = delegationContext.subschemaConfig, targetSchema = delegationContext.targetSchema, context = delegationContext.context;
    var executor = (subschemaConfig === null || subschemaConfig === void 0 ? void 0 : subschemaConfig.executor) || createDefaultExecutor(targetSchema);
    if (subschemaConfig === null || subschemaConfig === void 0 ? void 0 : subschemaConfig.batch) {
        var batchingOptions = subschemaConfig === null || subschemaConfig === void 0 ? void 0 : subschemaConfig.batchingOptions;
        executor = getBatchingExecutor((_b = (_a = context !== null && context !== void 0 ? context : globalThis) !== null && _a !== void 0 ? _a : window) !== null && _b !== void 0 ? _b : global, executor, batchingOptions === null || batchingOptions === void 0 ? void 0 : batchingOptions.dataLoaderOptions, batchingOptions === null || batchingOptions === void 0 ? void 0 : batchingOptions.extensionsReducer);
    }
    return executor;
}
export var createDefaultExecutor = memoize1(function createDefaultExecutor(schema) {
    return function defaultExecutor(_a) {
        var document = _a.document, context = _a.context, variables = _a.variables, rootValue = _a.rootValue, operationName = _a.operationName, operationType = _a.operationType;
        var executionArgs = {
            schema: schema,
            document: document,
            contextValue: context,
            variableValues: variables,
            rootValue: rootValue,
            operationName: operationName,
        };
        if (operationType === 'subscription') {
            return subscribe(executionArgs);
        }
        return execute(executionArgs);
    };
});
