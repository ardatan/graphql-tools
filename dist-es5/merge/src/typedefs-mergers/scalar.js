import { __assign } from "tslib";
import { mergeDirectives } from './directives';
export function mergeScalar(node, existingNode, config) {
    if (existingNode) {
        return {
            name: node.name,
            description: node['description'] || existingNode['description'],
            kind: (config === null || config === void 0 ? void 0 : config.convertExtensions) ||
                node.kind === 'ScalarTypeDefinition' ||
                existingNode.kind === 'ScalarTypeDefinition'
                ? 'ScalarTypeDefinition'
                : 'ScalarTypeExtension',
            loc: node.loc,
            directives: mergeDirectives(node.directives, existingNode.directives, config),
        };
    }
    return (config === null || config === void 0 ? void 0 : config.convertExtensions)
        ? __assign(__assign({}, node), { kind: 'ScalarTypeDefinition' }) : node;
}
