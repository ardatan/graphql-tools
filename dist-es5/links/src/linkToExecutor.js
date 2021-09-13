import { __awaiter, __generator } from "tslib";
import { toPromise } from '@apollo/client/core';
import { execute } from '@apollo/client/link/core';
import { observableToAsyncIterable } from '@graphql-tools/utils';
export var linkToExecutor = function (link) {
    return function (params) { return __awaiter(void 0, void 0, void 0, function () {
        var document, variables, extensions, context, operationType, operationName, info, observable;
        return __generator(this, function (_a) {
            document = params.document, variables = params.variables, extensions = params.extensions, context = params.context, operationType = params.operationType, operationName = params.operationName, info = params.info;
            observable = execute(link, {
                query: document,
                variables: variables,
                context: {
                    graphqlContext: context,
                    graphqlResolveInfo: info,
                    clientAwareness: {},
                },
                extensions: extensions,
                operationName: operationName,
            });
            if (operationType === 'subscription') {
                return [2 /*return*/, observableToAsyncIterable(observable)[Symbol.asyncIterator]()];
            }
            return [2 /*return*/, toPromise(observable)];
        });
    }); };
};
