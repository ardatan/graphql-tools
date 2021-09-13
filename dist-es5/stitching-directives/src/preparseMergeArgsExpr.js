export var KEY_DELIMITER = '__dot__';
export var EXPANSION_PREFIX = '__exp';
export function preparseMergeArgsExpr(mergeArgsExpr) {
    var variableRegex = /\$[_A-Za-z][_A-Za-z0-9.]*/g;
    var dotRegex = /\./g;
    mergeArgsExpr = mergeArgsExpr.replace(variableRegex, function (variable) { return variable.replace(dotRegex, KEY_DELIMITER); });
    var segments = mergeArgsExpr.split('[[');
    var expansionExpressions = Object.create(null);
    if (segments.length === 1) {
        return { mergeArgsExpr: mergeArgsExpr, expansionExpressions: expansionExpressions };
    }
    var finalSegments = [segments[0]];
    for (var i = 1; i < segments.length; i++) {
        var additionalSegments = segments[i].split(']]');
        if (additionalSegments.length !== 2) {
            throw new Error("Each opening \"[[\" must be matched by a closing \"]]\" without nesting.");
        }
        finalSegments = finalSegments.concat(additionalSegments);
    }
    var finalMergeArgsExpr = finalSegments[0];
    for (var i = 1; i < finalSegments.length - 1; i += 2) {
        var variableName = "" + EXPANSION_PREFIX + ((i - 1) / 2 + 1);
        expansionExpressions[variableName] = finalSegments[i];
        finalMergeArgsExpr += "$" + variableName + finalSegments[i + 1];
    }
    return { mergeArgsExpr: finalMergeArgsExpr, expansionExpressions: expansionExpressions };
}
