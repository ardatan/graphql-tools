import { __assign } from "tslib";
import { mergeFields } from './fields';
import { mergeDirectives } from './directives';
import { mergeNamedTypeArray } from './merge-named-type-array';
export function mergeType(node, existingNode, config) {
    if (existingNode) {
        try {
            return {
                name: node.name,
                description: node['description'] || existingNode['description'],
                kind: (config === null || config === void 0 ? void 0 : config.convertExtensions) ||
                    node.kind === 'ObjectTypeDefinition' ||
                    existingNode.kind === 'ObjectTypeDefinition'
                    ? 'ObjectTypeDefinition'
                    : 'ObjectTypeExtension',
                loc: node.loc,
                fields: mergeFields(node, node.fields, existingNode.fields, config),
                directives: mergeDirectives(node.directives, existingNode.directives, config),
                interfaces: mergeNamedTypeArray(node.interfaces, existingNode.interfaces, config),
            };
        }
        catch (e) {
            throw new Error("Unable to merge GraphQL type \"" + node.name.value + "\": " + e.message);
        }
    }
    return (config === null || config === void 0 ? void 0 : config.convertExtensions)
        ? __assign(__assign({}, node), { kind: 'ObjectTypeDefinition' }) : node;
}
