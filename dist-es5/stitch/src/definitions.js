import { __values } from "tslib";
import { Kind, } from 'graphql';
export function extractDefinitions(ast) {
    var e_1, _a;
    var typeDefinitions = [];
    var directiveDefs = [];
    var schemaDefs = [];
    var schemaExtensions = [];
    var extensionDefs = [];
    try {
        for (var _b = __values(ast.definitions), _c = _b.next(); !_c.done; _c = _b.next()) {
            var def = _c.value;
            switch (def.kind) {
                case Kind.OBJECT_TYPE_DEFINITION:
                case Kind.INTERFACE_TYPE_DEFINITION:
                case Kind.INPUT_OBJECT_TYPE_DEFINITION:
                case Kind.UNION_TYPE_DEFINITION:
                case Kind.ENUM_TYPE_DEFINITION:
                case Kind.SCALAR_TYPE_DEFINITION:
                    typeDefinitions.push(def);
                    break;
                case Kind.DIRECTIVE_DEFINITION:
                    directiveDefs.push(def);
                    break;
                case Kind.SCHEMA_DEFINITION:
                    schemaDefs.push(def);
                    break;
                case Kind.SCHEMA_EXTENSION:
                    schemaExtensions.push(def);
                    break;
                case Kind.OBJECT_TYPE_EXTENSION:
                case Kind.INTERFACE_TYPE_EXTENSION:
                case Kind.INPUT_OBJECT_TYPE_EXTENSION:
                case Kind.UNION_TYPE_EXTENSION:
                case Kind.ENUM_TYPE_EXTENSION:
                case Kind.SCALAR_TYPE_EXTENSION:
                    extensionDefs.push(def);
                    break;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return {
        typeDefinitions: typeDefinitions,
        directiveDefs: directiveDefs,
        schemaDefs: schemaDefs,
        schemaExtensions: schemaExtensions,
        extensionDefs: extensionDefs,
    };
}
