import { __assign } from "tslib";
import { mergeDirectives } from './directives';
import { mergeNamedTypeArray } from './merge-named-type-array';
export function mergeUnion(first, second, config) {
    if (second) {
        return {
            name: first.name,
            description: first['description'] || second['description'],
            // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
            directives: mergeDirectives(first.directives, second.directives, config),
            kind: (config === null || config === void 0 ? void 0 : config.convertExtensions) || first.kind === 'UnionTypeDefinition' || second.kind === 'UnionTypeDefinition'
                ? 'UnionTypeDefinition'
                : 'UnionTypeExtension',
            loc: first.loc,
            types: mergeNamedTypeArray(first.types, second.types, config),
        };
    }
    return (config === null || config === void 0 ? void 0 : config.convertExtensions)
        ? __assign(__assign({}, first), { kind: 'UnionTypeDefinition' }) : first;
}
