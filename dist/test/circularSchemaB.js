"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var circularSchemaA_1 = require("./circularSchemaA");
exports.default = function () { return ["\ntype TypeB {\n  id: ID\n  a: TypeA\n}",
    circularSchemaA_1.default,
]; };
//# sourceMappingURL=circularSchemaB.js.map