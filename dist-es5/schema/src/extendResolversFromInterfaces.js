import { __assign, __values } from "tslib";
export function extendResolversFromInterfaces(schema, resolvers) {
    var e_1, _a;
    var extendedResolvers = {};
    var typeMap = schema.getTypeMap();
    for (var typeName in typeMap) {
        var type = typeMap[typeName];
        if ('getInterfaces' in type) {
            extendedResolvers[typeName] = {};
            try {
                for (var _b = (e_1 = void 0, __values(type.getInterfaces())), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var iFace = _c.value;
                    if (resolvers[iFace.name]) {
                        for (var fieldName in resolvers[iFace.name]) {
                            if (fieldName === '__isTypeOf' || !fieldName.startsWith('__')) {
                                extendedResolvers[typeName][fieldName] = resolvers[iFace.name][fieldName];
                            }
                        }
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
            var typeResolvers = resolvers[typeName];
            extendedResolvers[typeName] = __assign(__assign({}, extendedResolvers[typeName]), typeResolvers);
        }
        else {
            var typeResolvers = resolvers[typeName];
            if (typeResolvers != null) {
                extendedResolvers[typeName] = typeResolvers;
            }
        }
    }
    return extendedResolvers;
}
