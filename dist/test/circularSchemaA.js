"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var circularSchemaB_1 = require("./circularSchemaB");
exports.default = function () { return ["\ntype TypeA {\n  id: ID\n  b: TypeB\n}",
    circularSchemaB_1.default,
]; };
//# sourceMappingURL=circularSchemaA.js.map