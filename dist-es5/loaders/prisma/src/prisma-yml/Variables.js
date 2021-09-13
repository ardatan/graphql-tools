import { __values } from "tslib";
import _ from 'lodash';
// eslint-disable-next-line
// @ts-ignore
import replaceall from 'replaceall';
import { Output } from './Output';
var Variables = /** @class */ (function () {
    function Variables(fileName, options, out, envVars) {
        if (options === void 0) { options = {}; }
        if (out === void 0) { out = new Output(); }
        this.overwriteSyntax = /,/g;
        this.envRefSyntax = /^env:/g;
        this.selfRefSyntax = /^self:/g;
        this.stringRefSyntax = /('.*')|(".*")/g;
        this.optRefSyntax = /^opt:/g;
        // eslint-disable-next-line
        this.variableSyntax = new RegExp(
        // eslint-disable-next-line
        '\\${([ ~:a-zA-Z0-9._\'",\\-\\/\\(\\)]+?)}', 'g');
        this.out = out;
        this.fileName = fileName;
        this.options = options;
        this.envVars = envVars || process.env;
    }
    Variables.prototype.populateJson = function (json) {
        var _this = this;
        this.json = json;
        return this.populateObject(this.json).then(function () {
            return Promise.resolve(_this.json);
        });
    };
    Variables.prototype.populateObject = function (objectToPopulate) {
        var _this = this;
        var populateAll = [];
        var deepMapValues = function (object, callback, propertyPath) {
            var deepMapValuesIteratee = function (value, key) {
                return deepMapValues(value, callback, propertyPath ? propertyPath.concat(key) : [key]);
            };
            if (_.isArray(object)) {
                return _.map(object, deepMapValuesIteratee);
            }
            else if (_.isObject(object) && !_.isDate(object) && !_.isFunction(object)) {
                return _.extend({}, object, _.mapValues(object, deepMapValuesIteratee));
            }
            return callback(object, propertyPath);
        };
        deepMapValues(objectToPopulate, function (property, propertyPath) {
            if (typeof property === 'string') {
                var populateSingleProperty = _this.populateProperty(property, true).then(function (newProperty) {
                    return _.set(objectToPopulate, propertyPath, newProperty);
                });
                populateAll.push(populateSingleProperty);
            }
        });
        return Promise.all(populateAll).then(function () { return objectToPopulate; });
    };
    Variables.prototype.populateProperty = function (propertyParam, populateInPlace) {
        var e_1, _a;
        var _this = this;
        var property = populateInPlace ? propertyParam : _.cloneDeep(propertyParam);
        var allValuesToPopulate = [];
        var warned = false;
        if (typeof property === 'string' && property.match(this.variableSyntax)) {
            var matchedStrings = property.match(this.variableSyntax);
            if (matchedStrings) {
                var _loop_1 = function (matchedString) {
                    var variableString = matchedString
                        .replace(this_1.variableSyntax, function (_, varName) { return varName.trim(); })
                        .replace(/\s/g, '');
                    var singleValueToPopulate = null;
                    if (variableString.match(this_1.overwriteSyntax)) {
                        singleValueToPopulate = this_1.overwrite(variableString);
                    }
                    else {
                        singleValueToPopulate = this_1.getValueFromSource(variableString).then(function (valueToPopulate) {
                            if (typeof valueToPopulate === 'object') {
                                return _this.populateObject(valueToPopulate);
                            }
                            return valueToPopulate;
                        });
                    }
                    singleValueToPopulate = singleValueToPopulate.then(function (valueToPopulate) {
                        if (_this.warnIfNotFound(variableString, valueToPopulate)) {
                            warned = true;
                        }
                        return _this.populateVariable(property, matchedString, valueToPopulate).then(function (newProperty) {
                            property = newProperty;
                            return Promise.resolve(property);
                        });
                    });
                    allValuesToPopulate.push(singleValueToPopulate);
                };
                var this_1 = this;
                try {
                    for (var matchedStrings_1 = __values(matchedStrings), matchedStrings_1_1 = matchedStrings_1.next(); !matchedStrings_1_1.done; matchedStrings_1_1 = matchedStrings_1.next()) {
                        var matchedString = matchedStrings_1_1.value;
                        _loop_1(matchedString);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (matchedStrings_1_1 && !matchedStrings_1_1.done && (_a = matchedStrings_1.return)) _a.call(matchedStrings_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            return Promise.all(allValuesToPopulate).then(function () {
                if (property !== _this.json && !warned) {
                    return _this.populateProperty(property);
                }
                return Promise.resolve(property);
            });
        }
        return Promise.resolve(property);
    };
    Variables.prototype.populateVariable = function (propertyParam, matchedString, valueToPopulate) {
        var property = propertyParam;
        if (typeof valueToPopulate === 'string') {
            property = replaceall(matchedString, valueToPopulate, property);
        }
        else {
            if (property !== matchedString) {
                if (typeof valueToPopulate === 'number') {
                    property = replaceall(matchedString, String(valueToPopulate), property);
                }
                else {
                    var errorMessage = [
                        'Trying to populate non string value into',
                        " a string for variable " + matchedString + ".",
                        ' Please make sure the value of the property is a string.',
                    ].join('');
                    this.out.warn(this.out.getErrorPrefix(this.fileName, 'warning') + errorMessage);
                }
                return Promise.resolve(property);
            }
            property = valueToPopulate;
        }
        return Promise.resolve(property);
    };
    Variables.prototype.overwrite = function (variableStringsString) {
        var _this = this;
        var finalValue;
        var variableStringsArray = variableStringsString.split(',');
        var allValuesFromSource = variableStringsArray.map(function (variableString) {
            return _this.getValueFromSource(variableString);
        });
        return Promise.all(allValuesFromSource).then(function (valuesFromSources) {
            valuesFromSources.find(function (valueFromSource) {
                finalValue = valueFromSource;
                return (finalValue !== null &&
                    typeof finalValue !== 'undefined' &&
                    !(typeof finalValue === 'object' && _.isEmpty(finalValue)));
            });
            return Promise.resolve(finalValue);
        });
    };
    Variables.prototype.getValueFromSource = function (variableString) {
        if (variableString.match(this.envRefSyntax)) {
            return this.getValueFromEnv(variableString);
        }
        else if (variableString.match(this.optRefSyntax)) {
            return this.getValueFromOptions(variableString);
        }
        else if (variableString.match(this.selfRefSyntax)) {
            return this.getValueFromSelf(variableString);
        }
        else if (variableString.match(this.stringRefSyntax)) {
            return this.getValueFromString(variableString);
        }
        var errorMessage = [
            "Invalid variable reference syntax for variable " + variableString + ".",
            ' You can only reference env vars, options, & files.',
            ' You can check our docs for more info.',
        ].join('');
        this.out.warn(this.out.getErrorPrefix(this.fileName, 'warning') + errorMessage);
        return Promise.resolve();
    };
    Variables.prototype.getValueFromEnv = function (variableString) {
        var requestedEnvVar = variableString.split(':')[1];
        var valueToPopulate = requestedEnvVar !== '' || '' in this.envVars ? this.envVars[requestedEnvVar] : this.envVars;
        return Promise.resolve(valueToPopulate);
    };
    Variables.prototype.getValueFromString = function (variableString) {
        var valueToPopulate = variableString.replace(/^['"]|['"]$/g, '');
        return Promise.resolve(valueToPopulate);
    };
    Variables.prototype.getValueFromOptions = function (variableString) {
        var requestedOption = variableString.split(':')[1];
        var valueToPopulate = requestedOption !== '' || '' in this.options ? this.options[requestedOption] : this.options;
        return Promise.resolve(valueToPopulate);
    };
    Variables.prototype.getValueFromSelf = function (variableString) {
        var valueToPopulate = this.json;
        var deepProperties = variableString.split(':')[1].split('.');
        return this.getDeepValue(deepProperties, valueToPopulate);
    };
    Variables.prototype.getDeepValue = function (deepProperties, valueToPopulate) {
        var _this = this;
        return promiseReduce(deepProperties, function (computedValueToPopulateParam, subProperty) {
            var computedValueToPopulate = computedValueToPopulateParam;
            if (typeof computedValueToPopulate === 'undefined') {
                computedValueToPopulate = {};
            }
            else if (subProperty !== '' || '' in computedValueToPopulate) {
                computedValueToPopulate = computedValueToPopulate[subProperty];
            }
            if (typeof computedValueToPopulate === 'string' && computedValueToPopulate.match(_this.variableSyntax)) {
                return _this.populateProperty(computedValueToPopulate);
            }
            return Promise.resolve(computedValueToPopulate);
        }, valueToPopulate);
    };
    Variables.prototype.warnIfNotFound = function (variableString, valueToPopulate) {
        if (valueToPopulate === null ||
            typeof valueToPopulate === 'undefined' ||
            (typeof valueToPopulate === 'object' && _.isEmpty(valueToPopulate))) {
            var varType = void 0;
            if (variableString.match(this.envRefSyntax)) {
                varType = 'environment variable';
            }
            else if (variableString.match(this.optRefSyntax)) {
                varType = 'option';
            }
            else if (variableString.match(this.selfRefSyntax)) {
                varType = 'self reference';
            }
            this.out.warn(this.out.getErrorPrefix(this.fileName, 'warning') +
                ("A valid " + varType + " to satisfy the declaration '" + variableString + "' could not be found."));
            return true;
        }
        return false;
    };
    return Variables;
}());
export { Variables };
function promiseReduce(values, callback, initialValue) {
    return values.reduce(function (previous, value) {
        return isPromise(previous) ? previous.then(function (resolved) { return callback(resolved, value); }) : callback(previous, value);
    }, initialValue);
}
function isPromise(value) {
    var _a;
    return typeof ((_a = value) === null || _a === void 0 ? void 0 : _a.then) === 'function';
}
