import { __read, __values } from "tslib";
import { mergeDeep } from '@graphql-tools/utils';
/**
 * Deep merges multiple resolver definition objects into a single definition.
 * @param resolversDefinitions Resolver definitions to be merged
 * @param options Additional options
 *
 * ```js
 * const { mergeResolvers } = require('@graphql-tools/merge');
 * const clientResolver = require('./clientResolver');
 * const productResolver = require('./productResolver');
 *
 * const resolvers = mergeResolvers([
 *  clientResolver,
 *  productResolver,
 * ]);
 * ```
 *
 * If you don't want to manually create the array of resolver objects, you can
 * also use this function along with loadFiles:
 *
 * ```js
 * const path = require('path');
 * const { mergeResolvers } = require('@graphql-tools/merge');
 * const { loadFilesSync } = require('@graphql-tools/load-files');
 *
 * const resolversArray = loadFilesSync(path.join(__dirname, './resolvers'));
 *
 * const resolvers = mergeResolvers(resolversArray)
 * ```
 */
export function mergeResolvers(resolversDefinitions, options) {
    var e_1, _a, e_2, _b;
    if (!resolversDefinitions || (Array.isArray(resolversDefinitions) && resolversDefinitions.length === 0)) {
        return {};
    }
    if (!Array.isArray(resolversDefinitions)) {
        return resolversDefinitions;
    }
    if (resolversDefinitions.length === 1) {
        return resolversDefinitions[0] || {};
    }
    var resolvers = new Array();
    try {
        for (var resolversDefinitions_1 = __values(resolversDefinitions), resolversDefinitions_1_1 = resolversDefinitions_1.next(); !resolversDefinitions_1_1.done; resolversDefinitions_1_1 = resolversDefinitions_1.next()) {
            var resolversDefinition = resolversDefinitions_1_1.value;
            if (Array.isArray(resolversDefinition)) {
                resolversDefinition = mergeResolvers(resolversDefinition);
            }
            if (typeof resolversDefinition === 'object' && resolversDefinition) {
                resolvers.push(resolversDefinition);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (resolversDefinitions_1_1 && !resolversDefinitions_1_1.done && (_a = resolversDefinitions_1.return)) _a.call(resolversDefinitions_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var result = mergeDeep(resolvers, true);
    if (options === null || options === void 0 ? void 0 : options.exclusions) {
        try {
            for (var _c = __values(options.exclusions), _d = _c.next(); !_d.done; _d = _c.next()) {
                var exclusion = _d.value;
                var _e = __read(exclusion.split('.'), 2), typeName = _e[0], fieldName = _e[1];
                if (!fieldName || fieldName === '*') {
                    delete result[typeName];
                }
                else if (result[typeName]) {
                    delete result[typeName][fieldName];
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    return result;
}
