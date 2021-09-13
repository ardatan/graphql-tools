import { getIntrospectionQuery, buildClientSchema, parse, } from 'graphql';
import { ValueOrPromise } from 'value-or-promise';
import { AggregateError, isAsyncIterable, } from '@graphql-tools/utils';
function getSchemaFromIntrospection(introspectionResult, options) {
    var _a, _b;
    if ((_a = introspectionResult === null || introspectionResult === void 0 ? void 0 : introspectionResult.data) === null || _a === void 0 ? void 0 : _a.__schema) {
        return buildClientSchema(introspectionResult.data, options);
    }
    else if ((_b = introspectionResult === null || introspectionResult === void 0 ? void 0 : introspectionResult.errors) === null || _b === void 0 ? void 0 : _b.length) {
        if (introspectionResult.errors.length > 1) {
            var combinedError = new AggregateError(introspectionResult.errors, 'Could not obtain introspection result');
            throw combinedError;
        }
        var error = introspectionResult.errors[0];
        throw error.originalError || error;
    }
    else {
        throw new Error('Could not obtain introspection result, received: ' + JSON.stringify(introspectionResult));
    }
}
export function introspectSchema(executor, context, options) {
    var parsedIntrospectionQuery = parse(getIntrospectionQuery(options), options);
    return new ValueOrPromise(function () {
        return executor({
            document: parsedIntrospectionQuery,
            operationType: 'query',
            context: context,
        });
    })
        .then(function (introspection) {
        if (isAsyncIterable(introspection)) {
            return introspection.next().then(function (_a) {
                var value = _a.value;
                return value;
            });
        }
        return introspection;
    })
        .then(function (introspection) { return getSchemaFromIntrospection(introspection, options); })
        .resolve();
}
