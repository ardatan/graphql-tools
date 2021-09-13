import { Kind, visit } from 'graphql';
export function extractVariables(inputValue) {
    var _a;
    var path = [];
    var variablePaths = Object.create(null);
    var keyPathVisitor = {
        enter: function (_node, key) {
            if (typeof key === 'number') {
                path.push(key);
            }
        },
        leave: function (_node, key) {
            if (typeof key === 'number') {
                path.pop();
            }
        },
    };
    var fieldPathVisitor = {
        enter: function (node) {
            path.push(node.name.value);
        },
        leave: function () {
            path.pop();
        },
    };
    var variableVisitor = {
        enter: function (node, key) {
            if (typeof key === 'number') {
                variablePaths[node.name.value] = path.concat([key]);
            }
            else {
                variablePaths[node.name.value] = path.slice();
            }
            return {
                kind: Kind.NULL,
            };
        },
    };
    var newInputValue = visit(inputValue, (_a = {},
        _a[Kind.OBJECT] = keyPathVisitor,
        _a[Kind.LIST] = keyPathVisitor,
        _a[Kind.OBJECT_FIELD] = fieldPathVisitor,
        _a[Kind.VARIABLE] = variableVisitor,
        _a));
    return {
        inputValue: newInputValue,
        variablePaths: variablePaths,
    };
}
