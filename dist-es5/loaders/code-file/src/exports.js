import { __awaiter, __generator } from "tslib";
import { parse, buildClientSchema, isSchema } from 'graphql';
import { isSchemaAst, isSchemaJson, isSchemaText, isWrappedSchemaJson, pick } from './helpers';
var identifiersToLookFor = ['default', 'schema', 'typeDefs', 'data'];
// Pick exports
/**
 * @internal
 */
export function pickExportFromModule(_a) {
    var module = _a.module, filepath = _a.filepath;
    ensureModule({ module: module, filepath: filepath });
    return resolveModule(ensureExports({ module: module, filepath: filepath }));
}
/**
 * @internal
 */
export function pickExportFromModuleSync(_a) {
    var module = _a.module, filepath = _a.filepath;
    ensureModule({ module: module, filepath: filepath });
    return resolveModuleSync(ensureExports({ module: module, filepath: filepath }));
}
// module
function resolveModule(identifiers) {
    return __awaiter(this, void 0, void 0, function () {
        var exportValue, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = pick;
                    return [4 /*yield*/, identifiers];
                case 1: return [4 /*yield*/, _a.apply(void 0, [_b.sent(), identifiersToLookFor])];
                case 2:
                    exportValue = _b.sent();
                    return [2 /*return*/, resolveExport(exportValue)];
            }
        });
    });
}
function resolveModuleSync(identifiers) {
    var exportValue = pick(identifiers, identifiersToLookFor);
    return resolveExport(exportValue);
}
// validate
function ensureModule(_a) {
    var module = _a.module, filepath = _a.filepath;
    if (!module) {
        throw new Error("Invalid export from export file " + filepath + ": empty export!");
    }
}
function ensureExports(_a) {
    var module = _a.module, filepath = _a.filepath;
    var identifiers = pick(module, identifiersToLookFor);
    if (!identifiers) {
        throw new Error("Invalid export from export file " + filepath + ": missing default export or 'schema' export!");
    }
    return identifiers;
}
// Decide what to do with an exported value
function resolveExport(fileExport) {
    try {
        if (isSchema(fileExport)) {
            return fileExport;
        }
        if (isSchemaText(fileExport)) {
            return parse(fileExport);
        }
        if (isWrappedSchemaJson(fileExport)) {
            return buildClientSchema(fileExport.data);
        }
        if (isSchemaJson(fileExport)) {
            return buildClientSchema(fileExport);
        }
        if (isSchemaAst(fileExport)) {
            return fileExport;
        }
        return null;
    }
    catch (e) {
        throw new Error('Exported schema must be of type GraphQLSchema, text, AST, or introspection JSON.');
    }
}
