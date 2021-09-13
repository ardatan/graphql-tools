// adapted from https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js
import { __read, __spreadArray, __values } from "tslib";
import { relocatedError } from '@graphql-tools/utils';
import { parseKey } from './prefix';
/**
 * Split and transform result of the query produced by the `merge` function
 */
export function splitResult(_a, numResults) {
    var _b, e_1, _c;
    var data = _a.data, errors = _a.errors;
    var splitResults = [];
    for (var i = 0; i < numResults; i++) {
        splitResults.push({});
    }
    if (data) {
        for (var prefixedKey in data) {
            var _d = parseKey(prefixedKey), index = _d.index, originalKey = _d.originalKey;
            var result = splitResults[index];
            if (result == null) {
                continue;
            }
            if (result.data == null) {
                result.data = (_b = {}, _b[originalKey] = data[prefixedKey], _b);
            }
            else {
                result.data[originalKey] = data[prefixedKey];
            }
        }
    }
    if (errors) {
        try {
            for (var errors_1 = __values(errors), errors_1_1 = errors_1.next(); !errors_1_1.done; errors_1_1 = errors_1.next()) {
                var error = errors_1_1.value;
                if (error.path) {
                    var parsedKey = parseKey(error.path[0]);
                    var index = parsedKey.index, originalKey = parsedKey.originalKey;
                    var newError = relocatedError(error, __spreadArray([originalKey], __read(error.path.slice(1)), false));
                    var errors_2 = (splitResults[index].errors = (splitResults[index].errors || []));
                    errors_2.push(newError);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (errors_1_1 && !errors_1_1.done && (_c = errors_1.return)) _c.call(errors_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    return splitResults;
}
