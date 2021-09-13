import { __assign, __values } from "tslib";
import { extractExtensionsFromSchema } from '@graphql-tools/merge';
import { asArray, getResolversFromSchema } from '@graphql-tools/utils';
import { makeExecutableSchema } from './makeExecutableSchema';
/**
 * Synchronously merges multiple schemas, typeDefinitions and/or resolvers into a single schema.
 * @param config Configuration object
 */
export function mergeSchemas(config) {
    var e_1, _a;
    var extractedTypeDefs = asArray(config.typeDefs || []);
    var extractedResolvers = asArray(config.resolvers || []);
    var extractedSchemaExtensions = asArray(config.schemaExtensions || []);
    var schemas = config.schemas || [];
    try {
        for (var schemas_1 = __values(schemas), schemas_1_1 = schemas_1.next(); !schemas_1_1.done; schemas_1_1 = schemas_1.next()) {
            var schema = schemas_1_1.value;
            extractedTypeDefs.push(schema);
            extractedResolvers.push(getResolversFromSchema(schema));
            extractedSchemaExtensions.push(extractExtensionsFromSchema(schema));
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (schemas_1_1 && !schemas_1_1.done && (_a = schemas_1.return)) _a.call(schemas_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return makeExecutableSchema(__assign(__assign({ parseOptions: config }, config), { typeDefs: extractedTypeDefs, resolvers: extractedResolvers, schemaExtensions: extractedSchemaExtensions }));
}
