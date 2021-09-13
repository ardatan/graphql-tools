import { __values } from "tslib";
import * as yamlParser from 'yaml-ast-parser';
/**
 * Comments out the current entry of a specific key in a yaml document and creates a new value next to it
 * @param key key in yaml document to comment out
 * @param newValue new value to add in the document
 */
export function replaceYamlValue(input, key, newValue) {
    var ast = yamlParser.safeLoad(input);
    var position = getPosition(ast, key);
    var newEntry = key + ": " + newValue + "\n";
    if (!position) {
        return input + '\n' + newEntry;
    }
    return (input.slice(0, position.start) +
        '#' +
        input.slice(position.start, position.end) +
        newEntry +
        input.slice(position.end));
}
function getPosition(ast, key) {
    var mapping = ast.mappings.find(function (m) { return m.key.value === key; });
    if (!mapping) {
        return undefined;
    }
    return {
        start: mapping.startPosition,
        end: mapping.endPosition + 1,
    };
}
function commentOut(input, keys) {
    var e_1, _a;
    var output = input;
    try {
        for (var keys_1 = __values(keys), keys_1_1 = keys_1.next(); !keys_1_1.done; keys_1_1 = keys_1.next()) {
            var key = keys_1_1.value;
            var ast = yamlParser.safeLoad(output);
            var position = getPosition(ast, key);
            if (position) {
                output = output.slice(0, position.start) + '#' + output.slice(position.start);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (keys_1_1 && !keys_1_1.done && (_a = keys_1.return)) _a.call(keys_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return output;
}
export function migrateToEndpoint(input, endpoint) {
    var output = commentOut(input, ['service', 'stage', 'cluster']);
    return replaceYamlValue(output, 'endpoint', endpoint);
}
