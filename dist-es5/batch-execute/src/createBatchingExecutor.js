import { __awaiter, __generator } from "tslib";
import DataLoader from 'dataloader';
import { mergeRequests } from './mergeRequests';
import { splitResult } from './splitResult';
export function createBatchingExecutor(executor, dataLoaderOptions, extensionsReducer) {
    if (extensionsReducer === void 0) { extensionsReducer = defaultExtensionsReducer; }
    var loadFn = createLoadFn(executor, extensionsReducer);
    var loader = new DataLoader(loadFn, dataLoaderOptions);
    return function batchingExecutor(request) {
        return request.operationType === 'subscription' ? executor(request) : loader.load(request);
    };
}
function createLoadFn(executor, extensionsReducer) {
    return function batchExecuteLoadFn(requests) {
        return __awaiter(this, void 0, void 0, function () {
            var execBatches, index, request, currentBatch, operationType, currentOperationType, results;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        execBatches = [];
                        index = 0;
                        request = requests[index];
                        currentBatch = [request];
                        execBatches.push(currentBatch);
                        operationType = request.operationType;
                        while (++index < requests.length) {
                            currentOperationType = requests[index].operationType;
                            if (operationType == null) {
                                throw new Error('Could not identify operation type of document.');
                            }
                            if (operationType === currentOperationType) {
                                currentBatch.push(requests[index]);
                            }
                            else {
                                currentBatch = [requests[index]];
                                execBatches.push(currentBatch);
                            }
                        }
                        return [4 /*yield*/, Promise.all(execBatches.map(function (execBatch) { return __awaiter(_this, void 0, void 0, function () {
                                var mergedRequests, resultBatches;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            mergedRequests = mergeRequests(execBatch, extensionsReducer);
                                            return [4 /*yield*/, executor(mergedRequests)];
                                        case 1:
                                            resultBatches = (_a.sent());
                                            return [2 /*return*/, splitResult(resultBatches, execBatch.length)];
                                    }
                                });
                            }); }))];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results.flat()];
                }
            });
        });
    };
}
function defaultExtensionsReducer(mergedExtensions, request) {
    var newExtensions = request.extensions;
    if (newExtensions != null) {
        Object.assign(mergedExtensions, newExtensions);
    }
    return mergedExtensions;
}
