import {
  DefinitionNode,
  EnumTypeDefinitionNode,
  FieldDefinitionNode,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLType,
  GraphQLUnionType,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  InterfaceTypeDefinitionNode,
  Kind,
  ObjectTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  TypeNode,
  UnionTypeDefinitionNode,
  valueFromAST,
} from 'graphql';
import resolveFromParentType from './resolveFromParentTypename';

const backcompatOptions = { commentDescriptions: true };

export type GetType = (
  name: string,
  // this is a hack
  type: 'object' | 'interface' | 'input',
) => GraphQLObjectType | GraphQLInputObjectType | GraphQLInterfaceType;

export default function typeFromAST(
  node: DefinitionNode,
  getType: GetType,
): GraphQLNamedType | null {
  switch (node.kind) {
    case Kind.OBJECT_TYPE_DEFINITION:
      return makeObjectType(node, getType);
    case Kind.INTERFACE_TYPE_DEFINITION:
      return makeInterfaceType(node, getType);
    case Kind.ENUM_TYPE_DEFINITION:
      return makeEnumType(node, getType);
    case Kind.UNION_TYPE_DEFINITION:
      return makeUnionType(node, getType);
    case Kind.SCALAR_TYPE_DEFINITION:
      return makeScalarType(node, getType);
    case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      return makeInputObjectType(node, getType);
    default:
      return null;
  }
}

function makeObjectType(
  node: ObjectTypeDefinitionNode,
  getType: GetType,
): GraphQLObjectType {
  return new GraphQLObjectType({
    name: node.name.value,
    fields: () => makeFields(node.fields, getType),
    interfaces: () =>
      node.interfaces.map(
        iface => getType(iface.name.value, 'interface') as GraphQLInterfaceType,
      ),
    description: getDescription(node, backcompatOptions),
  });
}

function makeInterfaceType(
  node: InterfaceTypeDefinitionNode,
  getType: GetType,
): GraphQLInterfaceType {
  return new GraphQLInterfaceType({
    name: node.name.value,
    fields: () => makeFields(node.fields, getType),
    description: getDescription(node, backcompatOptions),
    resolveType: (parent, context, info) =>
      resolveFromParentType(parent, info.schema),
  });
}

function makeEnumType(
  node: EnumTypeDefinitionNode,
  getType: GetType,
): GraphQLEnumType {
  const values = {};
  node.values.forEach(value => {
    values[value.name.value] = {
      description: getDescription(value, backcompatOptions),
    };
  });
  return new GraphQLEnumType({
    name: node.name.value,
    values,
    description: getDescription(node, backcompatOptions),
  });
}

function makeUnionType(
  node: UnionTypeDefinitionNode,
  getType: GetType,
): GraphQLUnionType {
  return new GraphQLUnionType({
    name: node.name.value,
    types: () =>
      node.types.map(
        type => resolveType(type, getType, 'object') as GraphQLObjectType,
      ),
    description: getDescription(node, backcompatOptions),
    resolveType: (parent, context, info) =>
      resolveFromParentType(parent, info.schema),
  });
}

function makeScalarType(
  node: ScalarTypeDefinitionNode,
  getType: GetType,
): GraphQLScalarType {
  return new GraphQLScalarType({
    name: node.name.value,
    description: getDescription(node, backcompatOptions),
    serialize: () => null,
    // Note: validation calls the parse functions to determine if a
    // literal value is correct. Returning null would cause use of custom
    // scalars to always fail validation. Returning false causes them to
    // always pass validation.
    parseValue: () => false,
    parseLiteral: () => false,
  });
}

function makeInputObjectType(
  node: InputObjectTypeDefinitionNode,
  getType: GetType,
): GraphQLInputObjectType {
  return new GraphQLInputObjectType({
    name: node.name.value,
    fields: () => makeValues(node.fields, getType),
    description: getDescription(node, backcompatOptions),
  });
}

function makeFields(nodes: Array<FieldDefinitionNode>, getType: GetType) {
  const result = {};
  nodes.forEach(node => {
    result[node.name.value] = {
      type: resolveType(node.type, getType, 'object'),
      args: makeValues(node.arguments, getType),
      description: getDescription(node, backcompatOptions),
    };
  });
  return result;
}

function makeValues(nodes: Array<InputValueDefinitionNode>, getType: GetType) {
  const result = {};
  nodes.forEach(node => {
    const type = resolveType(node.type, getType, 'input') as GraphQLInputType;
    result[node.name.value] = {
      type,
      defaultValue: valueFromAST(node.defaultValue, type),
      description: getDescription(node, backcompatOptions),
    };
  });
  return result;
}

function resolveType(
  node: TypeNode,
  getType: GetType,
  type: 'object' | 'interface' | 'input',
): GraphQLType {
  switch (node.kind) {
    case Kind.LIST_TYPE:
      return new GraphQLList(resolveType(node.type, getType, type));
    case Kind.NON_NULL_TYPE:
      return new GraphQLNonNull(resolveType(node.type, getType, type));
    default:
      return getType(node.name.value, type);
  }
}

// Code below temporarily copied from graphql/graphql-js pending PR
// https://github.com/graphql/graphql-js/pull/1165

// MIT License

// Copyright (c) 2015-present, Facebook, Inc.

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
function getDescription(node: any, options: any): string {
  if (node.description) {
    return node.description.value;
  }
  if (options && options.commentDescriptions) {
    const rawValue = getLeadingCommentBlock(node);
    if (rawValue !== undefined) {
      return blockStringValue('\n' + rawValue);
    }
  }
}

function getLeadingCommentBlock(node: any): void | string {
  const loc = node.loc;
  if (!loc) {
    return;
  }
  const comments = [];
  let token = loc.startToken.prev;
  while (
    token &&
    token.kind === 'Comment' &&
    token.next &&
    token.prev &&
    token.line + 1 === token.next.line &&
    token.line !== token.prev.line
  ) {
    const value = String(token.value);
    comments.push(value);
    token = token.prev;
  }
  return comments.reverse().join('\n');
}

/**
 * Produces the value of a block string from its parsed raw value, similar to
 * Coffeescript's block string, Python's docstring trim or Ruby's strip_heredoc.
 *
 * This implements the GraphQL spec's BlockStringValue() static algorithm.
 */
function blockStringValue(rawString: string): string {
  // Expand a block string's raw value into independent lines.
  const lines = rawString.split(/\r\n|[\n\r]/g);

  // Remove common indentation from all lines but first.
  let commonIndent = null;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const indent = leadingWhitespace(line);
    if (
      indent < line.length &&
      (commonIndent === null || indent < commonIndent)
    ) {
      commonIndent = indent;
      if (commonIndent === 0) {
        break;
      }
    }
  }

  if (commonIndent) {
    for (let i = 1; i < lines.length; i++) {
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

function leadingWhitespace(str: string): number {
  let i = 0;
  while (i < str.length && (str[i] === ' ' || str[i] === '\t')) {
    i++;
  }
  return i;
}

function isBlank(str: string): boolean {
  return leadingWhitespace(str) === str.length;
}
