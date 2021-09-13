import { __assign } from "tslib";
import { parseSelectionSet } from '@graphql-tools/utils';
import { Kind } from 'graphql';
export var forwardArgsToSelectionSet = function (selectionSet, mapping) {
    var selectionSetDef = parseSelectionSet(selectionSet, { noLocation: true });
    return function (field) {
        var selections = selectionSetDef.selections.map(function (selectionNode) {
            var _a, _b;
            if (selectionNode.kind === Kind.FIELD) {
                if (!mapping) {
                    return __assign(__assign({}, selectionNode), { arguments: (_a = field.arguments) === null || _a === void 0 ? void 0 : _a.slice() });
                }
                else if (selectionNode.name.value in mapping) {
                    var selectionArgs_1 = mapping[selectionNode.name.value];
                    return __assign(__assign({}, selectionNode), { arguments: (_b = field.arguments) === null || _b === void 0 ? void 0 : _b.filter(function (arg) { return selectionArgs_1.includes(arg.name.value); }) });
                }
            }
            return selectionNode;
        });
        return __assign(__assign({}, selectionSetDef), { selections: selections });
    };
};
