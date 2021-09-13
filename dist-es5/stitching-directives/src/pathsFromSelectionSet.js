import { __values } from "tslib";
import { Kind } from 'graphql';
export function pathsFromSelectionSet(selectionSet, path) {
    var e_1, _a, e_2, _b;
    var _c;
    if (path === void 0) { path = []; }
    var paths = [];
    try {
        for (var _d = __values(selectionSet.selections), _e = _d.next(); !_e.done; _e = _d.next()) {
            var selection = _e.value;
            var additions = (_c = pathsFromSelection(selection, path)) !== null && _c !== void 0 ? _c : [];
            try {
                for (var additions_1 = (e_2 = void 0, __values(additions)), additions_1_1 = additions_1.next(); !additions_1_1.done; additions_1_1 = additions_1.next()) {
                    var addition = additions_1_1.value;
                    paths.push(addition);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (additions_1_1 && !additions_1_1.done && (_b = additions_1.return)) _b.call(additions_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return paths;
}
function pathsFromSelection(selection, path) {
    var _a, _b;
    if (selection.kind === Kind.FIELD) {
        var responseKey = (_b = (_a = selection.alias) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : selection.name.value;
        if (selection.selectionSet) {
            return pathsFromSelectionSet(selection.selectionSet, path.concat([responseKey]));
        }
        else {
            return [path.concat([responseKey])];
        }
    }
    else if (selection.kind === Kind.INLINE_FRAGMENT) {
        return pathsFromSelectionSet(selection.selectionSet, path);
    }
}
