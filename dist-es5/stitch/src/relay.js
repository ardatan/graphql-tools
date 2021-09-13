import { __read, __spreadArray, __values } from "tslib";
import { makeExecutableSchema } from '@graphql-tools/schema';
import { isInterfaceType, Kind } from 'graphql';
var defaultRelayMergeConfig = {
    selectionSet: "{ id }",
    fieldName: 'node',
    args: function (_a) {
        var id = _a.id;
        return ({ id: id });
    },
};
export function handleRelaySubschemas(subschemas, getTypeNameFromId) {
    var e_1, _a, e_2, _b;
    var typeNames = [];
    try {
        for (var subschemas_1 = __values(subschemas), subschemas_1_1 = subschemas_1.next(); !subschemas_1_1.done; subschemas_1_1 = subschemas_1.next()) {
            var subschema = subschemas_1_1.value;
            var nodeType = subschema.schema.getType('Node');
            if (nodeType) {
                if (!isInterfaceType(nodeType)) {
                    throw new Error("Node type should be an interface!");
                }
                var implementations = subschema.schema.getPossibleTypes(nodeType);
                try {
                    for (var implementations_1 = (e_2 = void 0, __values(implementations)), implementations_1_1 = implementations_1.next(); !implementations_1_1.done; implementations_1_1 = implementations_1.next()) {
                        var implementedType = implementations_1_1.value;
                        typeNames.push(implementedType.name);
                        subschema.merge = subschema.merge || {};
                        subschema.merge[implementedType.name] = defaultRelayMergeConfig;
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (implementations_1_1 && !implementations_1_1.done && (_b = implementations_1.return)) _b.call(implementations_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (subschemas_1_1 && !subschemas_1_1.done && (_a = subschemas_1.return)) _a.call(subschemas_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var relaySubschemaConfig = {
        schema: makeExecutableSchema({
            typeDefs: /* GraphQL */ "\n        type Query {\n          node(id: ID!): Node\n        }\n        interface Node {\n          id: ID!\n        }\n        " + typeNames
                .map(function (typeName) { return "\n          type " + typeName + " implements Node {\n            id: ID!\n          }\n        "; })
                .join('\n') + "\n      ",
            resolvers: {
                Query: {
                    node: function (_, _a) {
                        var id = _a.id;
                        return ({ id: id });
                    },
                },
                Node: {
                    __resolveType: function (_a, _, info) {
                        var e_3, _b, e_4, _c;
                        var _d, _e, _f;
                        var id = _a.id;
                        if (!getTypeNameFromId) {
                            var possibleTypeNames = new Set();
                            try {
                                for (var _g = __values(info.fieldNodes), _h = _g.next(); !_h.done; _h = _g.next()) {
                                    var fieldNode = _h.value;
                                    if ((_d = fieldNode.selectionSet) === null || _d === void 0 ? void 0 : _d.selections) {
                                        try {
                                            for (var _j = (e_4 = void 0, __values((_e = fieldNode.selectionSet) === null || _e === void 0 ? void 0 : _e.selections)), _k = _j.next(); !_k.done; _k = _j.next()) {
                                                var selection = _k.value;
                                                switch (selection.kind) {
                                                    case Kind.FRAGMENT_SPREAD: {
                                                        var fragment = info.fragments[selection.name.value];
                                                        possibleTypeNames.add(fragment.typeCondition.name.value);
                                                        break;
                                                    }
                                                    case Kind.INLINE_FRAGMENT: {
                                                        var possibleTypeName = (_f = selection.typeCondition) === null || _f === void 0 ? void 0 : _f.name.value;
                                                        if (possibleTypeName) {
                                                            possibleTypeNames.add(possibleTypeName);
                                                        }
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                        catch (e_4_1) { e_4 = { error: e_4_1 }; }
                                        finally {
                                            try {
                                                if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
                                            }
                                            finally { if (e_4) throw e_4.error; }
                                        }
                                    }
                                }
                            }
                            catch (e_3_1) { e_3 = { error: e_3_1 }; }
                            finally {
                                try {
                                    if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                                }
                                finally { if (e_3) throw e_3.error; }
                            }
                            if (possibleTypeNames.size !== 1) {
                                console.warn("You need to define getTypeNameFromId as a parameter to handleRelaySubschemas or add a fragment for \"node\" operation with specific single type condition!");
                            }
                            return __spreadArray([], __read(possibleTypeNames), false)[0] || typeNames[0];
                        }
                        return getTypeNameFromId(id);
                    },
                },
            },
        }),
    };
    subschemas.push(relaySubschemaConfig);
    return subschemas;
}
