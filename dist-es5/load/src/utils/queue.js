import { __awaiter, __generator, __values } from "tslib";
import pLimit from 'p-limit';
export function useQueue(options) {
    var _this = this;
    var queue = [];
    var limit = (options === null || options === void 0 ? void 0 : options.concurrency) ? pLimit(options.concurrency) : function (fn) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, fn()];
    }); }); };
    return {
        add: function (fn) {
            queue.push(function () { return limit(fn); });
        },
        runAll: function () {
            return Promise.all(queue.map(function (fn) { return fn(); }));
        },
    };
}
export function useSyncQueue() {
    var queue = [];
    return {
        add: function (fn) {
            queue.push(fn);
        },
        runAll: function () {
            var e_1, _a;
            try {
                for (var queue_1 = __values(queue), queue_1_1 = queue_1.next(); !queue_1_1.done; queue_1_1 = queue_1.next()) {
                    var fn = queue_1_1.value;
                    fn();
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (queue_1_1 && !queue_1_1.done && (_a = queue_1.return)) _a.call(queue_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        },
    };
}
