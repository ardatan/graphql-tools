import { __values } from "tslib";
import { TypeNameMetaFieldDef } from 'graphql';
import { pathsFromSelectionSet } from './pathsFromSelectionSet';
export function getSourcePaths(mappingInstructions, selectionSet) {
    var e_1, _a, e_2, _b;
    var sourcePaths = [];
    try {
        for (var mappingInstructions_1 = __values(mappingInstructions), mappingInstructions_1_1 = mappingInstructions_1.next(); !mappingInstructions_1_1.done; mappingInstructions_1_1 = mappingInstructions_1.next()) {
            var mappingInstruction = mappingInstructions_1_1.value;
            var sourcePath = mappingInstruction.sourcePath;
            if (sourcePath.length) {
                sourcePaths.push(sourcePath);
                continue;
            }
            if (selectionSet == null) {
                continue;
            }
            var paths = pathsFromSelectionSet(selectionSet);
            try {
                for (var paths_1 = (e_2 = void 0, __values(paths)), paths_1_1 = paths_1.next(); !paths_1_1.done; paths_1_1 = paths_1.next()) {
                    var path = paths_1_1.value;
                    sourcePaths.push(path);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (paths_1_1 && !paths_1_1.done && (_b = paths_1.return)) _b.call(paths_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            sourcePaths.push([TypeNameMetaFieldDef.name]);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (mappingInstructions_1_1 && !mappingInstructions_1_1.done && (_a = mappingInstructions_1.return)) _a.call(mappingInstructions_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return sourcePaths;
}
