import { __awaiter, __generator } from "tslib";
import { createRequire } from 'module';
import { join as joinPaths } from 'path';
export function getCustomLoaderByPath(path, cwd) {
    try {
        var requireFn = createRequire(joinPaths(cwd, 'noop.js'));
        var requiredModule = requireFn(path);
        if (requiredModule) {
            if (requiredModule.default && typeof requiredModule.default === 'function') {
                return requiredModule.default;
            }
            if (typeof requiredModule === 'function') {
                return requiredModule;
            }
        }
    }
    catch (e) { }
    return null;
}
export function useCustomLoader(loaderPointer, cwd) {
    return __awaiter(this, void 0, void 0, function () {
        var loader;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(typeof loaderPointer === 'string')) return [3 /*break*/, 2];
                    return [4 /*yield*/, getCustomLoaderByPath(loaderPointer, cwd)];
                case 1:
                    loader = _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    if (typeof loaderPointer === 'function') {
                        loader = loaderPointer;
                    }
                    _a.label = 3;
                case 3:
                    if (typeof loader !== 'function') {
                        throw new Error("Failed to load custom loader: " + loaderPointer);
                    }
                    return [2 /*return*/, loader];
            }
        });
    });
}
export function useCustomLoaderSync(loaderPointer, cwd) {
    var loader;
    if (typeof loaderPointer === 'string') {
        loader = getCustomLoaderByPath(loaderPointer, cwd);
    }
    else if (typeof loaderPointer === 'function') {
        loader = loaderPointer;
    }
    if (typeof loader !== 'function') {
        throw new Error("Failed to load custom loader: " + loaderPointer);
    }
    return loader;
}
