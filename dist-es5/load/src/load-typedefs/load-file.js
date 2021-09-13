import { __awaiter, __generator, __values } from "tslib";
import { AggregateError } from '@graphql-tools/utils';
import { env } from 'process';
export function loadFile(pointer, options) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var results, errors_1;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    results = (_a = options.cache) === null || _a === void 0 ? void 0 : _a[pointer];
                    if (!!results) return [3 /*break*/, 2];
                    results = [];
                    errors_1 = [];
                    return [4 /*yield*/, Promise.all(options.loaders.map(function (loader) { return __awaiter(_this, void 0, void 0, function () {
                            var loaderResults, error_1, _a, _b, errorElement;
                            var e_1, _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        _d.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, loader.load(pointer, options)];
                                    case 1:
                                        loaderResults = _d.sent();
                                        loaderResults === null || loaderResults === void 0 ? void 0 : loaderResults.forEach(function (result) { return results.push(result); });
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_1 = _d.sent();
                                        if (env['DEBUG']) {
                                            console.error(error_1);
                                        }
                                        if (error_1 instanceof AggregateError) {
                                            try {
                                                for (_a = __values(error_1.errors), _b = _a.next(); !_b.done; _b = _a.next()) {
                                                    errorElement = _b.value;
                                                    errors_1.push(errorElement);
                                                }
                                            }
                                            catch (e_1_1) { e_1 = { error: e_1_1 }; }
                                            finally {
                                                try {
                                                    if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                                                }
                                                finally { if (e_1) throw e_1.error; }
                                            }
                                        }
                                        else {
                                            errors_1.push(error_1);
                                        }
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 1:
                    _b.sent();
                    if (results.length === 0 && errors_1.length > 0) {
                        if (errors_1.length === 1) {
                            throw errors_1[0];
                        }
                        throw new AggregateError(errors_1, "Failed to find any GraphQL type definitions in: " + pointer + ";\n - " + errors_1
                            .map(function (error) { return error.message; })
                            .join('\n  - '));
                    }
                    if (options.cache) {
                        options.cache[pointer] = results;
                    }
                    _b.label = 2;
                case 2: return [2 /*return*/, results];
            }
        });
    });
}
export function loadFileSync(pointer, options) {
    var e_2, _a, e_3, _b;
    var _c;
    var results = (_c = options.cache) === null || _c === void 0 ? void 0 : _c[pointer];
    if (!results) {
        results = [];
        var errors = [];
        try {
            for (var _d = __values(options.loaders), _e = _d.next(); !_e.done; _e = _d.next()) {
                var loader = _e.value;
                try {
                    // We check for the existence so it is okay to force non null
                    var loaderResults = loader.loadSync(pointer, options);
                    loaderResults === null || loaderResults === void 0 ? void 0 : loaderResults.forEach(function (result) { return results.push(result); });
                }
                catch (error) {
                    if (env['DEBUG']) {
                        console.error(error);
                    }
                    if (error instanceof AggregateError) {
                        try {
                            for (var _f = (e_3 = void 0, __values(error.errors)), _g = _f.next(); !_g.done; _g = _f.next()) {
                                var errorElement = _g.value;
                                errors.push(errorElement);
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                    }
                    else {
                        errors.push(error);
                    }
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
            }
            finally { if (e_2) throw e_2.error; }
        }
        if (results.length === 0 && errors.length > 0) {
            if (errors.length === 1) {
                throw errors[0];
            }
            throw new AggregateError(errors, "Failed to find any GraphQL type definitions in: " + pointer + ";\n - " + errors
                .map(function (error) { return error.message; })
                .join('\n  - '));
        }
        if (options.cache) {
            options.cache[pointer] = results;
        }
    }
    return results;
}
