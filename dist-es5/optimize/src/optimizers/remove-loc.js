import { __rest } from "tslib";
import { visit } from 'graphql';
/**
 * This optimizer removes "loc" fields
 * @param input
 */
export var removeLoc = function (input) {
    function transformNode(node) {
        if (node.loc && typeof node.loc === 'object') {
            var loc = node.loc, rest = __rest(node, ["loc"]);
            return rest;
        }
        return node;
    }
    return visit(input, { enter: transformNode });
};
