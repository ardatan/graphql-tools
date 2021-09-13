import { __values } from "tslib";
import { removeDescriptions } from './optimizers/remove-description';
import { removeEmptyNodes } from './optimizers/remove-empty-nodes';
import { removeLoc } from './optimizers/remove-loc';
var DEFAULT_OPTIMIZERS = [removeDescriptions, removeEmptyNodes, removeLoc];
/**
 * This method accept a DocumentNode and applies the optimizations you wish to use.
 * You can override the default ones or provide you own optimizers if you wish.
 *
 * @param node document to optimize
 * @param optimizers optional, list of optimizer to use
 */
export function optimizeDocumentNode(node, optimizers) {
    var e_1, _a;
    if (optimizers === void 0) { optimizers = DEFAULT_OPTIMIZERS; }
    var resultNode = node;
    try {
        for (var optimizers_1 = __values(optimizers), optimizers_1_1 = optimizers_1.next(); !optimizers_1_1.done; optimizers_1_1 = optimizers_1.next()) {
            var optimizer = optimizers_1_1.value;
            if (typeof optimizer !== 'function') {
                throw new Error("Optimizer provided for \"optimizeDocumentNode\" must be a function!");
            }
            var result = optimizer(resultNode);
            if (!result) {
                throw new Error("Optimizer provided for \"optimizeDocumentNode\" returned empty value instead of modified \"DocumentNode\"!");
            }
            resultNode = result;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (optimizers_1_1 && !optimizers_1_1.done && (_a = optimizers_1.return)) _a.call(optimizers_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return resultNode;
}
