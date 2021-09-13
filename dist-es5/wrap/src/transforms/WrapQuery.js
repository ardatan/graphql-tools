import { __assign, __read, __spreadArray } from "tslib";
import { visit, Kind } from 'graphql';
var WrapQuery = /** @class */ (function () {
    function WrapQuery(path, wrapper, extractor) {
        this.path = path;
        this.wrapper = wrapper;
        this.extractor = extractor;
    }
    WrapQuery.prototype.transformRequest = function (originalRequest, _delegationContext, _transformationContext) {
        var _a;
        var _this = this;
        var fieldPath = [];
        var ourPath = JSON.stringify(this.path);
        var document = visit(originalRequest.document, (_a = {},
            _a[Kind.FIELD] = {
                enter: function (node) {
                    fieldPath.push(node.name.value);
                    if (node.selectionSet != null && ourPath === JSON.stringify(fieldPath)) {
                        var wrapResult = _this.wrapper(node.selectionSet);
                        // Selection can be either a single selection or a selection set. If it's just one selection,
                        // let's wrap it in a selection set. Otherwise, keep it as is.
                        var selectionSet = wrapResult != null && wrapResult.kind === Kind.SELECTION_SET
                            ? wrapResult
                            : {
                                kind: Kind.SELECTION_SET,
                                selections: [wrapResult],
                            };
                        return __assign(__assign({}, node), { selectionSet: selectionSet });
                    }
                },
                leave: function () {
                    fieldPath.pop();
                },
            },
            _a));
        return __assign(__assign({}, originalRequest), { document: document });
    };
    WrapQuery.prototype.transformResult = function (originalResult, _delegationContext, _transformationContext) {
        var rootData = originalResult.data;
        if (rootData != null) {
            var data = rootData;
            var path = __spreadArray([], __read(this.path), false);
            while (path.length > 1) {
                var next = path.shift();
                if (data[next]) {
                    data = data[next];
                }
            }
            data[path[0]] = this.extractor(data[path[0]]);
        }
        return {
            data: rootData,
            errors: originalResult.errors,
        };
    };
    return WrapQuery;
}());
export default WrapQuery;
