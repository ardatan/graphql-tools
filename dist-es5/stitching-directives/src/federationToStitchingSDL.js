// Taken from https://github.com/gmac/federation-to-stitching-sdl/blob/main/index.js
import { __read, __spreadArray } from "tslib";
import { print, Kind, parse, } from 'graphql';
import { stitchingDirectives } from './stitchingDirectives';
var extensionKind = /Extension$/;
var entityKinds = [
    Kind.OBJECT_TYPE_DEFINITION,
    Kind.OBJECT_TYPE_EXTENSION,
    Kind.INTERFACE_TYPE_DEFINITION,
    Kind.INTERFACE_TYPE_EXTENSION,
];
function isEntityKind(def) {
    return entityKinds.includes(def.kind);
}
function getQueryTypeDef(definitions) {
    var _a;
    var schemaDef = definitions.find(function (def) { return def.kind === Kind.SCHEMA_DEFINITION; });
    var typeName = schemaDef
        ? (_a = schemaDef.operationTypes.find(function (_a) {
            var operation = _a.operation;
            return operation === 'query';
        })) === null || _a === void 0 ? void 0 : _a.type.name.value
        : 'Query';
    return definitions.find(function (def) { return def.kind === Kind.OBJECT_TYPE_DEFINITION && def.name.value === typeName; });
}
// Federation services are actually fairly complex,
// as the `buildFederatedSchema` helper does a fair amount
// of hidden work to setup the Federation schema specification:
// https://www.apollographql.com/docs/federation/federation-spec/#federation-schema-specification
export function federationToStitchingSDL(federationSDL, stitchingConfig) {
    if (stitchingConfig === void 0) { stitchingConfig = stitchingDirectives(); }
    var doc = parse(federationSDL);
    var entityTypes = [];
    var baseTypeNames = doc.definitions.reduce(function (memo, typeDef) {
        if (!extensionKind.test(typeDef.kind) && 'name' in typeDef && typeDef.name) {
            memo[typeDef.name.value] = true;
        }
        return memo;
    }, {});
    doc.definitions.forEach(function (typeDef) {
        var _a, _b, _c;
        // Un-extend all types (remove "extends" keywords)...
        // extended types are invalid GraphQL without a local base type to extend from.
        // Stitching merges flat types in lieu of hierarchical extensions.
        if (extensionKind.test(typeDef.kind) && 'name' in typeDef && typeDef.name && !baseTypeNames[typeDef.name.value]) {
            typeDef.kind = typeDef.kind.replace(extensionKind, 'Definition');
        }
        if (!isEntityKind(typeDef))
            return;
        // Find object definitions with "@key" directives;
        // these are federated entities that get turned into merged types.
        var keyDirs = [];
        var otherDirs = [];
        (_a = typeDef.directives) === null || _a === void 0 ? void 0 : _a.forEach(function (dir) {
            if (dir.name.value === 'key') {
                keyDirs.push(dir);
            }
            else {
                otherDirs.push(dir);
            }
        });
        if (!keyDirs.length)
            return;
        // Setup stitching MergedTypeConfig for all federated entities:
        var selectionSet = "{ " + keyDirs.map(function (dir) { return dir.arguments[0].value.value; }).join(' ') + " }";
        var keyFields = parse(selectionSet).definitions[0].selectionSet.selections.map(function (sel) { return sel.name.value; });
        var keyDir = keyDirs[0];
        keyDir.name.value = stitchingConfig.keyDirective.name;
        keyDir.arguments[0].name.value = 'selectionSet';
        keyDir.arguments[0].value.value = selectionSet;
        typeDef.directives = __spreadArray([keyDir], __read(otherDirs), false);
        // Remove non-key "@external" fields from the type...
        // the stitching query planner expects services to only publish their own fields.
        // This makes "@provides" moot because the query planner can automate the logic.
        typeDef.fields = (_b = typeDef.fields) === null || _b === void 0 ? void 0 : _b.filter(function (fieldDef) {
            var _a;
            return (keyFields.includes(fieldDef.name.value) || !((_a = fieldDef.directives) === null || _a === void 0 ? void 0 : _a.find(function (dir) { return dir.name.value === 'external'; })));
        });
        // Discard remaining "@external" directives and any "@provides" directives
        (_c = typeDef.fields) === null || _c === void 0 ? void 0 : _c.forEach(function (fieldDef) {
            fieldDef.directives = fieldDef.directives.filter(function (dir) { return !/^(external|provides)$/.test(dir.name.value); });
            fieldDef.directives.forEach(function (dir) {
                if (dir.name.value === 'requires') {
                    dir.name.value = stitchingConfig.computedDirective.name;
                    dir.arguments[0].name.value = 'selectionSet';
                    dir.arguments[0].value.value = "{ " + dir.arguments[0].value.value + " }";
                }
            });
        });
        if (typeDef.kind === Kind.OBJECT_TYPE_DEFINITION || typeDef.kind === Kind.OBJECT_TYPE_EXTENSION) {
            entityTypes.push(typeDef.name.value);
        }
    });
    // Federation service SDLs are incomplete because they omit the federation spec itself...
    // (https://www.apollographql.com/docs/federation/federation-spec/#federation-schema-specification)
    // To make federation SDLs into valid and parsable GraphQL schemas,
    // we must fill in the missing details from the specification.
    if (entityTypes.length) {
        var queryDef = getQueryTypeDef(doc.definitions);
        var entitiesSchema = parse(/* GraphQL */ "\n      scalar _Any\n      union _Entity = " + entityTypes.filter(function (v, i, a) { return a.indexOf(v) === i; }).join(' | ') + "\n      type Query { _entities(representations: [_Any!]!): [_Entity]! @" + stitchingConfig.mergeDirective.name + " }\n    ").definitions;
        doc.definitions.push(entitiesSchema[0]);
        doc.definitions.push(entitiesSchema[1]);
        if (queryDef) {
            queryDef.fields.push(entitiesSchema[2].fields[0]);
        }
        else {
            doc.definitions.push(entitiesSchema[2]);
        }
    }
    return [stitchingConfig.stitchingDirectivesTypeDefs, print(doc)].join('\n');
}
