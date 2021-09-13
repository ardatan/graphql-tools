import { __values } from "tslib";
import { Kind } from 'graphql';
import { env } from 'process';
/**
 * @internal
 */
export var filterKind = function (content, filterKinds) {
    var e_1, _a, e_2, _b;
    if (content && content.definitions && content.definitions.length && filterKinds && filterKinds.length > 0) {
        var invalidDefinitions = [];
        var validDefinitions = [];
        try {
            for (var _c = __values(content.definitions), _d = _c.next(); !_d.done; _d = _c.next()) {
                var definitionNode = _d.value;
                if (filterKinds.includes(definitionNode.kind)) {
                    invalidDefinitions.push(definitionNode);
                }
                else {
                    validDefinitions.push(definitionNode);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (invalidDefinitions.length > 0) {
            if (env['DEBUG']) {
                try {
                    for (var invalidDefinitions_1 = __values(invalidDefinitions), invalidDefinitions_1_1 = invalidDefinitions_1.next(); !invalidDefinitions_1_1.done; invalidDefinitions_1_1 = invalidDefinitions_1.next()) {
                        var d = invalidDefinitions_1_1.value;
                        console.log("Filtered document of kind " + d.kind + " due to filter policy (" + filterKinds.join(', ') + ")");
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (invalidDefinitions_1_1 && !invalidDefinitions_1_1.done && (_b = invalidDefinitions_1.return)) _b.call(invalidDefinitions_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        }
        return {
            kind: Kind.DOCUMENT,
            definitions: validDefinitions,
        };
    }
    return content;
};
