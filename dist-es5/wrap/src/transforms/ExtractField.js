import { __assign } from "tslib";
import { visit, Kind, BREAK } from 'graphql';
var ExtractField = /** @class */ (function () {
    function ExtractField(_a) {
        var from = _a.from, to = _a.to;
        this.from = from;
        this.to = to;
    }
    ExtractField.prototype.transformRequest = function (originalRequest, _delegationContext, _transformationContext) {
        var _a, _b;
        var fromSelection;
        var ourPathFrom = JSON.stringify(this.from);
        var ourPathTo = JSON.stringify(this.to);
        var fieldPath = [];
        visit(originalRequest.document, (_a = {},
            _a[Kind.FIELD] = {
                enter: function (node) {
                    fieldPath.push(node.name.value);
                    if (ourPathFrom === JSON.stringify(fieldPath)) {
                        fromSelection = node.selectionSet;
                        return BREAK;
                    }
                },
                leave: function () {
                    fieldPath.pop();
                },
            },
            _a));
        fieldPath = [];
        var document = visit(originalRequest.document, (_b = {},
            _b[Kind.FIELD] = {
                enter: function (node) {
                    fieldPath.push(node.name.value);
                    if (ourPathTo === JSON.stringify(fieldPath) && fromSelection != null) {
                        return __assign(__assign({}, node), { selectionSet: fromSelection });
                    }
                },
                leave: function () {
                    fieldPath.pop();
                },
            },
            _b));
        return __assign(__assign({}, originalRequest), { document: document });
    };
    return ExtractField;
}());
export default ExtractField;
