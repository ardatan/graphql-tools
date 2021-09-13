import { __assign, __read, __spreadArray } from "tslib";
import { visit, Kind } from 'graphql';
import { relocatedError } from '@graphql-tools/utils';
var TransformQuery = /** @class */ (function () {
    function TransformQuery(_a) {
        var path = _a.path, queryTransformer = _a.queryTransformer, _b = _a.resultTransformer, resultTransformer = _b === void 0 ? function (result) { return result; } : _b, _c = _a.errorPathTransformer, errorPathTransformer = _c === void 0 ? function (errorPath) { return __spreadArray([], __read(errorPath), false); } : _c, _d = _a.fragments, fragments = _d === void 0 ? {} : _d;
        this.path = path;
        this.queryTransformer = queryTransformer;
        this.resultTransformer = resultTransformer;
        this.errorPathTransformer = errorPathTransformer;
        this.fragments = fragments;
    }
    TransformQuery.prototype.transformRequest = function (originalRequest, delegationContext, transformationContext) {
        var _a;
        var _this = this;
        var pathLength = this.path.length;
        var index = 0;
        var document = visit(originalRequest.document, (_a = {},
            _a[Kind.FIELD] = {
                enter: function (node) {
                    if (index === pathLength || node.name.value !== _this.path[index] || node.selectionSet == null) {
                        return false;
                    }
                    index++;
                    if (index === pathLength) {
                        var selectionSet = _this.queryTransformer(node.selectionSet, _this.fragments, delegationContext, transformationContext);
                        return __assign(__assign({}, node), { selectionSet: selectionSet });
                    }
                },
                leave: function () {
                    index--;
                },
            },
            _a));
        return __assign(__assign({}, originalRequest), { document: document });
    };
    TransformQuery.prototype.transformResult = function (originalResult, delegationContext, transformationContext) {
        var data = this.transformData(originalResult.data, delegationContext, transformationContext);
        var errors = originalResult.errors;
        return {
            data: data,
            errors: errors != null ? this.transformErrors(errors) : undefined,
        };
    };
    TransformQuery.prototype.transformData = function (data, delegationContext, transformationContext) {
        var leafIndex = this.path.length - 1;
        var index = 0;
        var newData = data;
        if (newData) {
            var next = this.path[index];
            while (index < leafIndex) {
                if (data[next]) {
                    newData = newData[next];
                }
                else {
                    break;
                }
                index++;
                next = this.path[index];
            }
            newData[next] = this.resultTransformer(newData[next], delegationContext, transformationContext);
        }
        return data;
    };
    TransformQuery.prototype.transformErrors = function (errors) {
        var _this = this;
        return errors.map(function (error) {
            var path = error.path;
            if (path == null) {
                return error;
            }
            var match = true;
            var index = 0;
            while (index < _this.path.length) {
                if (path[index] !== _this.path[index]) {
                    match = false;
                    break;
                }
                index++;
            }
            var newPath = match ? path.slice(0, index).concat(_this.errorPathTransformer(path.slice(index))) : path;
            return relocatedError(error, newPath);
        });
    };
    return TransformQuery;
}());
export default TransformQuery;
