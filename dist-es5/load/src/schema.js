import { __assign, __awaiter, __generator, __values } from "tslib";
import { loadTypedefs, loadTypedefsSync } from './load-typedefs';
import { Source as GraphQLSource, print, lexicographicSortSchema, } from 'graphql';
import { OPERATION_KINDS } from './documents';
import { mergeSchemas } from '@graphql-tools/schema';
/**
 * Asynchronously loads a schema from the provided pointers.
 * @param schemaPointers Pointers to the sources to load the schema from
 * @param options Additional options
 */
export function loadSchema(schemaPointers, options) {
    return __awaiter(this, void 0, void 0, function () {
        var sources, _a, schemas, typeDefs, mergeSchemasOptions, schema;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, loadTypedefs(schemaPointers, __assign(__assign({}, options), { filterKinds: OPERATION_KINDS }))];
                case 1:
                    sources = _b.sent();
                    _a = collectSchemasAndTypeDefs(sources), schemas = _a.schemas, typeDefs = _a.typeDefs;
                    mergeSchemasOptions = __assign(__assign({}, options), { schemas: schemas, typeDefs: typeDefs });
                    schema = mergeSchemas(mergeSchemasOptions);
                    if (options === null || options === void 0 ? void 0 : options.includeSources) {
                        includeSources(schema, sources);
                    }
                    return [2 /*return*/, options.sort ? lexicographicSortSchema(schema) : schema];
            }
        });
    });
}
/**
 * Synchronously loads a schema from the provided pointers.
 * @param schemaPointers Pointers to the sources to load the schema from
 * @param options Additional options
 */
export function loadSchemaSync(schemaPointers, options) {
    var sources = loadTypedefsSync(schemaPointers, __assign({ filterKinds: OPERATION_KINDS }, options));
    var _a = collectSchemasAndTypeDefs(sources), schemas = _a.schemas, typeDefs = _a.typeDefs;
    var schema = mergeSchemas(__assign({ schemas: schemas, typeDefs: typeDefs }, options));
    if (options === null || options === void 0 ? void 0 : options.includeSources) {
        includeSources(schema, sources);
    }
    return options.sort ? lexicographicSortSchema(schema) : schema;
}
function includeSources(schema, sources) {
    var e_1, _a;
    var finalSources = [];
    try {
        for (var sources_1 = __values(sources), sources_1_1 = sources_1.next(); !sources_1_1.done; sources_1_1 = sources_1.next()) {
            var source = sources_1_1.value;
            if (source.rawSDL) {
                finalSources.push(new GraphQLSource(source.rawSDL, source.location));
            }
            else if (source.document) {
                finalSources.push(new GraphQLSource(print(source.document), source.location));
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (sources_1_1 && !sources_1_1.done && (_a = sources_1.return)) _a.call(sources_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    schema.extensions = __assign(__assign({}, schema.extensions), { sources: finalSources, extendedSources: sources });
}
function collectSchemasAndTypeDefs(sources) {
    var e_2, _a;
    var schemas = [];
    var typeDefs = [];
    try {
        for (var sources_2 = __values(sources), sources_2_1 = sources_2.next(); !sources_2_1.done; sources_2_1 = sources_2.next()) {
            var source = sources_2_1.value;
            if (source.schema) {
                schemas.push(source.schema);
            }
            else if (source.document) {
                typeDefs.push(source.document);
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (sources_2_1 && !sources_2_1.done && (_a = sources_2.return)) _a.call(sources_2);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return {
        schemas: schemas,
        typeDefs: typeDefs,
    };
}
