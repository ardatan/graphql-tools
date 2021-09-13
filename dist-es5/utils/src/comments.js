import { __assign, __read, __spreadArray, __values } from "tslib";
import { visit, TokenKind, } from 'graphql';
var MAX_LINE_LENGTH = 80;
var commentsRegistry = {};
export function resetComments() {
    commentsRegistry = {};
}
export function collectComment(node) {
    var e_1, _a, e_2, _b, e_3, _c;
    var _d;
    var entityName = (_d = node.name) === null || _d === void 0 ? void 0 : _d.value;
    if (entityName == null) {
        return;
    }
    pushComment(node, entityName);
    switch (node.kind) {
        case 'EnumTypeDefinition':
            if (node.values) {
                try {
                    for (var _e = __values(node.values), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var value = _f.value;
                        pushComment(value, entityName, value.name.value);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            break;
        case 'ObjectTypeDefinition':
        case 'InputObjectTypeDefinition':
        case 'InterfaceTypeDefinition':
            if (node.fields) {
                try {
                    for (var _g = __values(node.fields), _h = _g.next(); !_h.done; _h = _g.next()) {
                        var field = _h.value;
                        pushComment(field, entityName, field.name.value);
                        if (isFieldDefinitionNode(field) && field.arguments) {
                            try {
                                for (var _j = (e_3 = void 0, __values(field.arguments)), _k = _j.next(); !_k.done; _k = _j.next()) {
                                    var arg = _k.value;
                                    pushComment(arg, entityName, field.name.value, arg.name.value);
                                }
                            }
                            catch (e_3_1) { e_3 = { error: e_3_1 }; }
                            finally {
                                try {
                                    if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
                                }
                                finally { if (e_3) throw e_3.error; }
                            }
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            break;
    }
}
export function pushComment(node, entity, field, argument) {
    var comment = getComment(node);
    if (typeof comment !== 'string' || comment.length === 0) {
        return;
    }
    var keys = [entity];
    if (field) {
        keys.push(field);
        if (argument) {
            keys.push(argument);
        }
    }
    var path = keys.join('.');
    if (!commentsRegistry[path]) {
        commentsRegistry[path] = [];
    }
    commentsRegistry[path].push(comment);
}
export function printComment(comment) {
    return '\n# ' + comment.replace(/\n/g, '\n# ');
}
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * NOTE: ==> This file has been modified just to add comments to the printed AST
 * This is a temp measure, we will move to using the original non modified printer.js ASAP.
 */
/**
 * Given maybeArray, print an empty string if it is null or empty, otherwise
 * print all items together separated by separator if provided
 */
function join(maybeArray, separator) {
    return maybeArray ? maybeArray.filter(function (x) { return x; }).join(separator || '') : '';
}
function hasMultilineItems(maybeArray) {
    var _a;
    return (_a = maybeArray === null || maybeArray === void 0 ? void 0 : maybeArray.some(function (str) { return str.includes('\n'); })) !== null && _a !== void 0 ? _a : false;
}
function addDescription(cb) {
    return function (node, _key, _parent, path, ancestors) {
        var _a;
        var keys = [];
        var parent = path.reduce(function (prev, key) {
            if (['fields', 'arguments', 'values'].includes(key) && prev.name) {
                keys.push(prev.name.value);
            }
            return prev[key];
        }, ancestors[0]);
        var key = __spreadArray(__spreadArray([], __read(keys), false), [(_a = parent === null || parent === void 0 ? void 0 : parent.name) === null || _a === void 0 ? void 0 : _a.value], false).filter(Boolean).join('.');
        var items = [];
        if (node.kind.includes('Definition') && commentsRegistry[key]) {
            items.push.apply(items, __spreadArray([], __read(commentsRegistry[key]), false));
        }
        return join(__spreadArray(__spreadArray([], __read(items.map(printComment)), false), [node.description, cb(node, _key, _parent, path, ancestors)], false), '\n');
    };
}
function indent(maybeString) {
    return maybeString && "  " + maybeString.replace(/\n/g, '\n  ');
}
/**
 * Given array, print each item on its own line, wrapped in an
 * indented "{ }" block.
 */
function block(array) {
    return array && array.length !== 0 ? "{\n" + indent(join(array, '\n')) + "\n}" : '';
}
/**
 * If maybeString is not null or empty, then wrap with start and end, otherwise
 * print an empty string.
 */
function wrap(start, maybeString, end) {
    return maybeString ? start + maybeString + (end || '') : '';
}
/**
 * Print a block string in the indented block form by adding a leading and
 * trailing blank line. However, if a block string starts with whitespace and is
 * a single-line, adding a leading blank line would strip that whitespace.
 */
function printBlockString(value, isDescription) {
    if (isDescription === void 0) { isDescription = false; }
    var escaped = value.replace(/"""/g, '\\"""');
    return (value[0] === ' ' || value[0] === '\t') && value.indexOf('\n') === -1
        ? "\"\"\"" + escaped.replace(/"$/, '"\n') + "\"\"\""
        : "\"\"\"\n" + (isDescription ? escaped : indent(escaped)) + "\n\"\"\"";
}
var printDocASTReducer = {
    Name: { leave: function (node) { return node.value; } },
    Variable: { leave: function (node) { return '$' + node.name; } },
    // Document
    Document: {
        leave: function (node) { return join(node.definitions, '\n\n'); },
    },
    OperationDefinition: {
        leave: function (node) {
            var varDefs = wrap('(', join(node.variableDefinitions, ', '), ')');
            var prefix = join([node.operation, join([node.name, varDefs]), join(node.directives, ' ')], ' ');
            // the query short form.
            return prefix + ' ' + node.selectionSet;
        },
    },
    VariableDefinition: {
        leave: function (_a) {
            var variable = _a.variable, type = _a.type, defaultValue = _a.defaultValue, directives = _a.directives;
            return variable + ': ' + type + wrap(' = ', defaultValue) + wrap(' ', join(directives, ' '));
        },
    },
    SelectionSet: { leave: function (_a) {
            var selections = _a.selections;
            return block(selections);
        } },
    Field: {
        leave: function (_a) {
            var alias = _a.alias, name = _a.name, args = _a.arguments, directives = _a.directives, selectionSet = _a.selectionSet;
            var prefix = wrap('', alias, ': ') + name;
            var argsLine = prefix + wrap('(', join(args, ', '), ')');
            if (argsLine.length > MAX_LINE_LENGTH) {
                argsLine = prefix + wrap('(\n', indent(join(args, '\n')), '\n)');
            }
            return join([argsLine, join(directives, ' '), selectionSet], ' ');
        },
    },
    Argument: { leave: function (_a) {
            var name = _a.name, value = _a.value;
            return name + ': ' + value;
        } },
    // Fragments
    FragmentSpread: {
        leave: function (_a) {
            var name = _a.name, directives = _a.directives;
            return '...' + name + wrap(' ', join(directives, ' '));
        },
    },
    InlineFragment: {
        leave: function (_a) {
            var typeCondition = _a.typeCondition, directives = _a.directives, selectionSet = _a.selectionSet;
            return join(['...', wrap('on ', typeCondition), join(directives, ' '), selectionSet], ' ');
        },
    },
    FragmentDefinition: {
        leave: function (_a) {
            var name = _a.name, typeCondition = _a.typeCondition, variableDefinitions = _a.variableDefinitions, directives = _a.directives, selectionSet = _a.selectionSet;
            // Note: fragment variable definitions are experimental and may be changed
            // or removed in the future.
            return "fragment " + name + wrap('(', join(variableDefinitions, ', '), ')') + " " +
                ("on " + typeCondition + " " + wrap('', join(directives, ' '), ' ')) +
                selectionSet;
        },
    },
    // Value
    IntValue: { leave: function (_a) {
            var value = _a.value;
            return value;
        } },
    FloatValue: { leave: function (_a) {
            var value = _a.value;
            return value;
        } },
    StringValue: {
        leave: function (_a) {
            var value = _a.value, isBlockString = _a.block;
            if (isBlockString) {
                return printBlockString(value);
            }
            return JSON.stringify(value);
        },
    },
    BooleanValue: { leave: function (_a) {
            var value = _a.value;
            return (value ? 'true' : 'false');
        } },
    NullValue: { leave: function () { return 'null'; } },
    EnumValue: { leave: function (_a) {
            var value = _a.value;
            return value;
        } },
    ListValue: { leave: function (_a) {
            var values = _a.values;
            return '[' + join(values, ', ') + ']';
        } },
    ObjectValue: { leave: function (_a) {
            var fields = _a.fields;
            return '{' + join(fields, ', ') + '}';
        } },
    ObjectField: { leave: function (_a) {
            var name = _a.name, value = _a.value;
            return name + ': ' + value;
        } },
    // Directive
    Directive: {
        leave: function (_a) {
            var name = _a.name, args = _a.arguments;
            return '@' + name + wrap('(', join(args, ', '), ')');
        },
    },
    // Type
    NamedType: { leave: function (_a) {
            var name = _a.name;
            return name;
        } },
    ListType: { leave: function (_a) {
            var type = _a.type;
            return '[' + type + ']';
        } },
    NonNullType: { leave: function (_a) {
            var type = _a.type;
            return type + '!';
        } },
    // Type System Definitions
    SchemaDefinition: {
        leave: function (_a) {
            var directives = _a.directives, operationTypes = _a.operationTypes;
            return join(['schema', join(directives, ' '), block(operationTypes)], ' ');
        },
    },
    OperationTypeDefinition: {
        leave: function (_a) {
            var operation = _a.operation, type = _a.type;
            return operation + ': ' + type;
        },
    },
    ScalarTypeDefinition: {
        leave: function (_a) {
            var name = _a.name, directives = _a.directives;
            return join(['scalar', name, join(directives, ' ')], ' ');
        },
    },
    ObjectTypeDefinition: {
        leave: function (_a) {
            var name = _a.name, interfaces = _a.interfaces, directives = _a.directives, fields = _a.fields;
            return join(['type', name, wrap('implements ', join(interfaces, ' & ')), join(directives, ' '), block(fields)], ' ');
        },
    },
    FieldDefinition: {
        leave: function (_a) {
            var name = _a.name, args = _a.arguments, type = _a.type, directives = _a.directives;
            return name +
                (hasMultilineItems(args)
                    ? wrap('(\n', indent(join(args, '\n')), '\n)')
                    : wrap('(', join(args, ', '), ')')) +
                ': ' +
                type +
                wrap(' ', join(directives, ' '));
        },
    },
    InputValueDefinition: {
        leave: function (_a) {
            var name = _a.name, type = _a.type, defaultValue = _a.defaultValue, directives = _a.directives;
            return join([name + ': ' + type, wrap('= ', defaultValue), join(directives, ' ')], ' ');
        },
    },
    InterfaceTypeDefinition: {
        leave: function (_a) {
            var name = _a.name, interfaces = _a.interfaces, directives = _a.directives, fields = _a.fields;
            return join(['interface', name, wrap('implements ', join(interfaces, ' & ')), join(directives, ' '), block(fields)], ' ');
        },
    },
    UnionTypeDefinition: {
        leave: function (_a) {
            var name = _a.name, directives = _a.directives, types = _a.types;
            return join(['union', name, join(directives, ' '), wrap('= ', join(types, ' | '))], ' ');
        },
    },
    EnumTypeDefinition: {
        leave: function (_a) {
            var name = _a.name, directives = _a.directives, values = _a.values;
            return join(['enum', name, join(directives, ' '), block(values)], ' ');
        },
    },
    EnumValueDefinition: {
        leave: function (_a) {
            var name = _a.name, directives = _a.directives;
            return join([name, join(directives, ' ')], ' ');
        },
    },
    InputObjectTypeDefinition: {
        leave: function (_a) {
            var name = _a.name, directives = _a.directives, fields = _a.fields;
            return join(['input', name, join(directives, ' '), block(fields)], ' ');
        },
    },
    DirectiveDefinition: {
        leave: function (_a) {
            var name = _a.name, args = _a.arguments, repeatable = _a.repeatable, locations = _a.locations;
            return 'directive @' +
                name +
                (hasMultilineItems(args)
                    ? wrap('(\n', indent(join(args, '\n')), '\n)')
                    : wrap('(', join(args, ', '), ')')) +
                (repeatable ? ' repeatable' : '') +
                ' on ' +
                join(locations, ' | ');
        },
    },
    SchemaExtension: {
        leave: function (_a) {
            var directives = _a.directives, operationTypes = _a.operationTypes;
            return join(['extend schema', join(directives, ' '), block(operationTypes)], ' ');
        },
    },
    ScalarTypeExtension: {
        leave: function (_a) {
            var name = _a.name, directives = _a.directives;
            return join(['extend scalar', name, join(directives, ' ')], ' ');
        },
    },
    ObjectTypeExtension: {
        leave: function (_a) {
            var name = _a.name, interfaces = _a.interfaces, directives = _a.directives, fields = _a.fields;
            return join(['extend type', name, wrap('implements ', join(interfaces, ' & ')), join(directives, ' '), block(fields)], ' ');
        },
    },
    InterfaceTypeExtension: {
        leave: function (_a) {
            var name = _a.name, interfaces = _a.interfaces, directives = _a.directives, fields = _a.fields;
            return join(['extend interface', name, wrap('implements ', join(interfaces, ' & ')), join(directives, ' '), block(fields)], ' ');
        },
    },
    UnionTypeExtension: {
        leave: function (_a) {
            var name = _a.name, directives = _a.directives, types = _a.types;
            return join(['extend union', name, join(directives, ' '), wrap('= ', join(types, ' | '))], ' ');
        },
    },
    EnumTypeExtension: {
        leave: function (_a) {
            var name = _a.name, directives = _a.directives, values = _a.values;
            return join(['extend enum', name, join(directives, ' '), block(values)], ' ');
        },
    },
    InputObjectTypeExtension: {
        leave: function (_a) {
            var name = _a.name, directives = _a.directives, fields = _a.fields;
            return join(['extend input', name, join(directives, ' '), block(fields)], ' ');
        },
    },
};
var printDocASTReducerWithComments = Object.keys(printDocASTReducer).reduce(function (prev, key) {
    var _a;
    return (__assign(__assign({}, prev), (_a = {}, _a[key] = {
        leave: addDescription(printDocASTReducer[key].leave),
    }, _a)));
}, {});
/**
 * Converts an AST into a string, using one set of reasonable
 * formatting rules.
 */
export function printWithComments(ast) {
    return visit(ast, printDocASTReducerWithComments);
}
function isFieldDefinitionNode(node) {
    return node.kind === 'FieldDefinition';
}
// graphql < v13 and > v15 does not export getDescription
export function getDescription(node, options) {
    if (node.description != null) {
        return node.description.value;
    }
    if (options === null || options === void 0 ? void 0 : options.commentDescriptions) {
        return getComment(node);
    }
}
export function getComment(node) {
    var rawValue = getLeadingCommentBlock(node);
    if (rawValue !== undefined) {
        return dedentBlockStringValue("\n" + rawValue);
    }
}
export function getLeadingCommentBlock(node) {
    var loc = node.loc;
    if (!loc) {
        return;
    }
    var comments = [];
    var token = loc.startToken.prev;
    while (token != null &&
        token.kind === TokenKind.COMMENT &&
        token.next != null &&
        token.prev != null &&
        token.line + 1 === token.next.line &&
        token.line !== token.prev.line) {
        var value = String(token.value);
        comments.push(value);
        token = token.prev;
    }
    return comments.length > 0 ? comments.reverse().join('\n') : undefined;
}
export function dedentBlockStringValue(rawString) {
    // Expand a block string's raw value into independent lines.
    var lines = rawString.split(/\r\n|[\n\r]/g);
    // Remove common indentation from all lines but first.
    var commonIndent = getBlockStringIndentation(lines);
    if (commonIndent !== 0) {
        for (var i = 1; i < lines.length; i++) {
            lines[i] = lines[i].slice(commonIndent);
        }
    }
    // Remove leading and trailing blank lines.
    while (lines.length > 0 && isBlank(lines[0])) {
        lines.shift();
    }
    while (lines.length > 0 && isBlank(lines[lines.length - 1])) {
        lines.pop();
    }
    // Return a string of the lines joined with U+000A.
    return lines.join('\n');
}
/**
 * @internal
 */
export function getBlockStringIndentation(lines) {
    var commonIndent = null;
    for (var i = 1; i < lines.length; i++) {
        var line = lines[i];
        var indent_1 = leadingWhitespace(line);
        if (indent_1 === line.length) {
            continue; // skip empty lines
        }
        if (commonIndent === null || indent_1 < commonIndent) {
            commonIndent = indent_1;
            if (commonIndent === 0) {
                break;
            }
        }
    }
    return commonIndent === null ? 0 : commonIndent;
}
function leadingWhitespace(str) {
    var i = 0;
    while (i < str.length && (str[i] === ' ' || str[i] === '\t')) {
        i++;
    }
    return i;
}
function isBlank(str) {
    return leadingWhitespace(str) === str.length;
}
