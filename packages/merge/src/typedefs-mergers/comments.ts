import { Maybe } from '@graphql-tools/utils';
import {
  getDescription,
  StringValueNode,
  FieldDefinitionNode,
  ASTNode,
  NameNode,
  TypeNode,
  visit,
  VisitFn,
} from 'graphql';
import type { ASTVisitor } from 'graphql/language/visitor';
import { NamedDefinitionNode } from './merge-nodes';

const MAX_LINE_LENGTH = 80;

let commentsRegistry: {
  [path: string]: string[];
} = {};

export function resetComments(): void {
  commentsRegistry = {};
}

export function collectComment(node: NamedDefinitionNode): void {
  const entityName = node.name?.value;
  if (entityName == null) {
    return;
  }

  pushComment(node, entityName);

  switch (node.kind) {
    case 'EnumTypeDefinition':
      if (node.values) {
        for (const value of node.values) {
          pushComment(value, entityName, value.name.value);
        }
      }
      break;

    case 'ObjectTypeDefinition':
    case 'InputObjectTypeDefinition':
    case 'InterfaceTypeDefinition':
      if (node.fields) {
        for (const field of node.fields) {
          pushComment(field, entityName, field.name.value);

          if (isFieldDefinitionNode(field) && field.arguments) {
            for (const arg of field.arguments) {
              pushComment(arg, entityName, field.name.value, arg.name.value);
            }
          }
        }
      }
      break;
  }
}

export function pushComment(node: any, entity: string, field?: string, argument?: string): void {
  const comment = getDescription(node, { commentDescriptions: true });

  if (typeof comment !== 'string' || comment.length === 0) {
    return;
  }

  const keys = [entity];

  if (field) {
    keys.push(field);

    if (argument) {
      keys.push(argument);
    }
  }

  const path = keys.join('.');

  if (!commentsRegistry[path]) {
    commentsRegistry[path] = [];
  }

  commentsRegistry[path].push(comment);
}

export function printComment(comment: string): string {
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

// import { visit, VisitFn } from 'graphql';

/**
 * Given maybeArray, print an empty string if it is null or empty, otherwise
 * print all items together separated by separator if provided
 */
function join(maybeArray?: readonly any[], separator?: string) {
  return maybeArray ? maybeArray.filter(x => x).join(separator || '') : '';
}

function hasMultilineItems(maybeArray: Maybe<ReadonlyArray<string>>): boolean {
  return maybeArray?.some(str => str.includes('\n')) ?? false;
}

function addDescription(cb: VisitFn<any, any>): VisitFn<any, any> {
  return (
    node: { description?: StringValueNode; name?: NameNode; type?: TypeNode; kind: string },
    _key,
    _parent,
    path,
    ancestors
  ) => {
    const keys: string[] = [];
    const parent = path.reduce((prev, key) => {
      if (['fields', 'arguments', 'values'].includes(key as any)) {
        keys.push(prev.name.value);
      }

      return prev[key];
    }, ancestors[0]);

    const key = [...keys, parent?.name?.value].filter(Boolean).join('.');
    const items: string[] = [];

    if (node.kind.includes('Definition') && commentsRegistry[key]) {
      items.push(...commentsRegistry[key]);
    }

    return join([...items.map(printComment), node.description, (cb as any)(node)], '\n');
  };
}

function indent(maybeString?: string) {
  return maybeString && `  ${maybeString.replace(/\n/g, '\n  ')}`;
}

/**
 * Given array, print each item on its own line, wrapped in an
 * indented "{ }" block.
 */
function block(array?: readonly any[]) {
  return array && array.length !== 0 ? `{\n${indent(join(array, '\n'))}\n}` : '';
}

/**
 * If maybeString is not null or empty, then wrap with start and end, otherwise
 * print an empty string.
 */
function wrap(start: string, maybeString: any, end?: string) {
  return maybeString ? start + maybeString + (end || '') : '';
}

/**
 * Print a block string in the indented block form by adding a leading and
 * trailing blank line. However, if a block string starts with whitespace and is
 * a single-line, adding a leading blank line would strip that whitespace.
 */
function printBlockString(value: string, isDescription = false) {
  const escaped = value.replace(/"""/g, '\\"""');
  return (value[0] === ' ' || value[0] === '\t') && value.indexOf('\n') === -1
    ? `"""${escaped.replace(/"$/, '"\n')}"""`
    : `"""\n${isDescription ? escaped : indent(escaped)}\n"""`;
}

const printDocASTReducer: ASTVisitor = {
  Name: { leave: node => node.value },
  Variable: { leave: node => '$' + node.name },

  // Document

  Document: {
    leave: node => join(node.definitions, '\n\n'),
  },

  OperationDefinition: {
    leave: node => {
      const varDefs = wrap('(', join(node.variableDefinitions, ', '), ')');
      const prefix = join([node.operation, join([node.name, varDefs]), join(node.directives, ' ')], ' ');

      // the query short form.
      return prefix + ' ' + node.selectionSet;
    },
  },

  VariableDefinition: {
    leave: ({ variable, type, defaultValue, directives }) =>
      variable + ': ' + type + wrap(' = ', defaultValue) + wrap(' ', join(directives, ' ')),
  },

  SelectionSet: { leave: ({ selections }) => block(selections) },

  Field: {
    leave({ alias, name, arguments: args, directives, selectionSet }) {
      const prefix = wrap('', alias, ': ') + name;
      let argsLine = prefix + wrap('(', join(args, ', '), ')');

      if (argsLine.length > MAX_LINE_LENGTH) {
        argsLine = prefix + wrap('(\n', indent(join(args, '\n')), '\n)');
      }

      return join([argsLine, join(directives, ' '), selectionSet], ' ');
    },
  },

  Argument: { leave: ({ name, value }) => name + ': ' + value },

  // Fragments

  FragmentSpread: {
    leave: ({ name, directives }) => '...' + name + wrap(' ', join(directives, ' ')),
  },

  InlineFragment: {
    leave: ({ typeCondition, directives, selectionSet }) =>
      join(['...', wrap('on ', typeCondition), join(directives, ' '), selectionSet], ' '),
  },

  FragmentDefinition: {
    leave: ({ name, typeCondition, variableDefinitions, directives, selectionSet }) =>
      // Note: fragment variable definitions are experimental and may be changed
      // or removed in the future.
      `fragment ${name}${wrap('(', join(variableDefinitions, ', '), ')')} ` +
      `on ${typeCondition} ${wrap('', join(directives, ' '), ' ')}` +
      selectionSet,
  },

  // Value

  IntValue: { leave: ({ value }) => value },
  FloatValue: { leave: ({ value }) => value },
  StringValue: {
    leave: ({ value, block: isBlockString }) => (isBlockString ? printBlockString(value) : JSON.stringify(value)),
  },
  BooleanValue: { leave: ({ value }) => (value ? 'true' : 'false') },
  NullValue: { leave: () => 'null' },
  EnumValue: { leave: ({ value }) => value },
  ListValue: { leave: ({ values }) => '[' + join(values, ', ') + ']' },
  ObjectValue: { leave: ({ fields }) => '{' + join(fields, ', ') + '}' },
  ObjectField: { leave: ({ name, value }) => name + ': ' + value },

  // Directive

  Directive: {
    leave: ({ name, arguments: args }) => '@' + name + wrap('(', join(args, ', '), ')'),
  },

  // Type

  NamedType: { leave: ({ name }) => name },
  ListType: { leave: ({ type }) => '[' + type + ']' },
  NonNullType: { leave: ({ type }) => type + '!' },

  // Type System Definitions

  SchemaDefinition: {
    leave: ({ description, directives, operationTypes }: any) =>
      wrap('', description, '\n') + join(['schema', join(directives, ' '), block(operationTypes)], ' '),
  },

  OperationTypeDefinition: {
    leave: ({ operation, type }) => operation + ': ' + type,
  },

  ScalarTypeDefinition: {
    leave: ({ description, name, directives }) =>
      wrap('', description, '\n') + join(['scalar', name, join(directives, ' ')], ' '),
  },

  ObjectTypeDefinition: {
    leave: ({ description, name, interfaces, directives, fields }) =>
      wrap('', description, '\n') +
      join(['type', name, wrap('implements ', join(interfaces, ' & ')), join(directives, ' '), block(fields)], ' '),
  },

  FieldDefinition: {
    leave: ({ description, name, arguments: args, type, directives }) =>
      wrap('', description, '\n') +
      name +
      (hasMultilineItems(args as any as string[])
        ? wrap('(\n', indent(join(args, '\n')), '\n)')
        : wrap('(', join(args, ', '), ')')) +
      ': ' +
      type +
      wrap(' ', join(directives, ' ')),
  },

  InputValueDefinition: {
    leave: ({ description, name, type, defaultValue, directives }) =>
      wrap('', description, '\n') + join([name + ': ' + type, wrap('= ', defaultValue), join(directives, ' ')], ' '),
  },

  InterfaceTypeDefinition: {
    leave: ({ description, name, interfaces, directives, fields }: any) =>
      wrap('', description, '\n') +
      join(
        ['interface', name, wrap('implements ', join(interfaces, ' & ')), join(directives, ' '), block(fields)],
        ' '
      ),
  },

  UnionTypeDefinition: {
    leave: ({ description, name, directives, types }) =>
      wrap('', description, '\n') + join(['union', name, join(directives, ' '), wrap('= ', join(types, ' | '))], ' '),
  },

  EnumTypeDefinition: {
    leave: ({ description, name, directives, values }) =>
      wrap('', description, '\n') + join(['enum', name, join(directives, ' '), block(values)], ' '),
  },

  EnumValueDefinition: {
    leave: ({ description, name, directives }) =>
      wrap('', description, '\n') + join([name, join(directives, ' ')], ' '),
  },

  InputObjectTypeDefinition: {
    leave: ({ description, name, directives, fields }) =>
      wrap('', description, '\n') + join(['input', name, join(directives, ' '), block(fields)], ' '),
  },

  DirectiveDefinition: {
    leave: ({ description, name, arguments: args, repeatable, locations }) =>
      wrap('', description, '\n') +
      'directive @' +
      name +
      (hasMultilineItems(args as any as string[])
        ? wrap('(\n', indent(join(args, '\n')), '\n)')
        : wrap('(', join(args, ', '), ')')) +
      (repeatable ? ' repeatable' : '') +
      ' on ' +
      join(locations, ' | '),
  },

  SchemaExtension: {
    leave: ({ directives, operationTypes }) =>
      join(['extend schema', join(directives, ' '), block(operationTypes)], ' '),
  },

  ScalarTypeExtension: {
    leave: ({ name, directives }) => join(['extend scalar', name, join(directives, ' ')], ' '),
  },

  ObjectTypeExtension: {
    leave: ({ name, interfaces, directives, fields }) =>
      join(
        ['extend type', name, wrap('implements ', join(interfaces, ' & ')), join(directives, ' '), block(fields)],
        ' '
      ),
  },

  InterfaceTypeExtension: {
    leave: ({ name, interfaces, directives, fields }: any) =>
      join(
        ['extend interface', name, wrap('implements ', join(interfaces, ' & ')), join(directives, ' '), block(fields)],
        ' '
      ),
  },

  UnionTypeExtension: {
    leave: ({ name, directives, types }) =>
      join(['extend union', name, join(directives, ' '), wrap('= ', join(types, ' | '))], ' '),
  },

  EnumTypeExtension: {
    leave: ({ name, directives, values }) => join(['extend enum', name, join(directives, ' '), block(values)], ' '),
  },

  InputObjectTypeExtension: {
    leave: ({ name, directives, fields }) => join(['extend input', name, join(directives, ' '), block(fields)], ' '),
  },
};

const printDocASTReducerWithComments = Object.keys(printDocASTReducer).reduce(
  (prev, key) => ({
    ...prev,
    [key]: {
      leave: addDescription(printDocASTReducer[key].leave),
    },
  }),
  {} as typeof printDocASTReducer
);

/**
 * Converts an AST into a string, using one set of reasonable
 * formatting rules.
 */
export function printWithComments(ast: ASTNode) {
  return visit(ast, printDocASTReducerWithComments);
}

function isFieldDefinitionNode(node: any): node is FieldDefinitionNode {
  return node.kind === 'FieldDefinition';
}
