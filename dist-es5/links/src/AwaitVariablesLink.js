import { __extends } from "tslib";
import { ApolloLink } from '@apollo/client/link/core';
import { Observable } from '@apollo/client/utilities';
function getFinalPromise(object) {
    return Promise.resolve(object).then(function (resolvedObject) {
        if (resolvedObject == null) {
            return resolvedObject;
        }
        if (Array.isArray(resolvedObject)) {
            return Promise.all(resolvedObject.map(function (o) { return getFinalPromise(o); }));
        }
        else if (typeof resolvedObject === 'object') {
            var keys_1 = Object.keys(resolvedObject);
            return Promise.all(keys_1.map(function (key) { return getFinalPromise(resolvedObject[key]); })).then(function (awaitedValues) {
                for (var i = 0; i < keys_1.length; i++) {
                    resolvedObject[keys_1[i]] = awaitedValues[i];
                }
                return resolvedObject;
            });
        }
        return resolvedObject;
    });
}
var AwaitVariablesLink = /** @class */ (function (_super) {
    __extends(AwaitVariablesLink, _super);
    function AwaitVariablesLink() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AwaitVariablesLink.prototype.request = function (operation, forward) {
        return new Observable(function (observer) {
            var subscription;
            getFinalPromise(operation.variables)
                .then(function (resolvedVariables) {
                operation.variables = resolvedVariables;
                subscription = forward(operation).subscribe({
                    next: observer.next.bind(observer),
                    error: observer.error.bind(observer),
                    complete: observer.complete.bind(observer),
                });
            })
                .catch(observer.error.bind(observer));
            return function () {
                if (subscription != null) {
                    subscription.unsubscribe();
                }
            };
        });
    };
    return AwaitVariablesLink;
}(ApolloLink));
export { AwaitVariablesLink };
