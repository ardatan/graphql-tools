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
//
// TODO put back import once PR is merged
// https://github.com/graphql/graphql-js/pull/1165
// import { getDescription } from 'graphql/utilities/buildASTSchema';

const backcompatOptions = { commentDescriptions: true };

import resolveFromParentType from './resolveFromParentTypename';
import TypeRegistry from './TypeRegistry';

export default function typeFromAST(
  typeRegistry: TypeRegistry,
  node: DefinitionNode,
): GraphQLNamedType | null {
  switch (node.kind) {
    case Kind.OBJECT_TYPE_DEFINITION:
      return makeObjectType(typeRegistry, node);
    case Kind.INTERFACE_TYPE_DEFINITION:
      return makeInterfaceType(typeRegistry, node);
    case Kind.ENUM_TYPE_DEFINITION:
      return makeEnumType(typeRegistry, node);
    case Kind.UNION_TYPE_DEFINITION:
      return makeUnionType(typeRegistry, node);
    case Kind.SCALAR_TYPE_DEFINITION:
      return makeScalarType(typeRegistry, node);
    case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      return makeInputObjectType(typeRegistry, node);
    default:
      return null;
  }
}

function makeObjectType(
  typeRegistry: TypeRegistry,
  node: ObjectTypeDefinitionNode,
): GraphQLObjectType {
  return new GraphQLObjectType({
    name: node.name.value,
    fields: () => makeFields(typeRegistry, node.fields),
    interfaces: () =>
      node.interfaces.map(
        iface => typeRegistry.getType(iface.name.value) as GraphQLInterfaceType,
      ),
    description: getDescription(node, backcompatOptions),
  });
}

function makeInterfaceType(
  typeRegistry: TypeRegistry,
  node: InterfaceTypeDefinitionNode,
): GraphQLInterfaceType {
  return new GraphQLInterfaceType({
    name: node.name.value,
    fields: () => makeFields(typeRegistry, node.fields),
    description: getDescription(node, backcompatOptions),
    resolveType: (parent, context, info) =>
      resolveFromParentType(parent, info.schema),
  });
}

function makeEnumType(
  typeRegistry: TypeRegistry,
  node: EnumTypeDefinitionNode,
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
  typeRegistry: TypeRegistry,
  node: UnionTypeDefinitionNode,
): GraphQLUnionType {
  return new GraphQLUnionType({
    name: node.name.value,
    types: () =>
      node.types.map(
        type => resolveType(typeRegistry, type) as GraphQLObjectType,
      ),
    description: getDescription(node, backcompatOptions),
    resolveType: (parent, context, info) =>
      resolveFromParentType(parent, info.schema),
  });
}

function makeScalarType(
  typeRegistry: TypeRegistry,
  node: ScalarTypeDefinitionNode,
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
  typeRegistry: TypeRegistry,
  node: InputObjectTypeDefinitionNode,
): GraphQLInputObjectType {
  return new GraphQLInputObjectType({
    name: node.name.value,
    fields: () => makeValues(typeRegistry, node.fields),
    description: getDescription(node, backcompatOptions),
  });
}

function makeFields(
  typeRegistry: TypeRegistry,
  nodes: Array<FieldDefinitionNode>,
) {
  const result = {};
  nodes.forEach(node => {
    result[node.name.value] = {
      type: resolveType(typeRegistry, node.type),
      args: makeValues(typeRegistry, node.arguments),
      description: getDescription(node, backcompatOptions),
    };
  });
  return result;
}

function makeValues(
  typeRegistry: TypeRegistry,
  nodes: Array<InputValueDefinitionNode>,
) {
  const result = {};
  nodes.forEach(node => {
    const type = resolveType(typeRegistry, node.type) as GraphQLInputType;
    result[node.name.value] = {
      type,
      defaultValue: valueFromAST(node.defaultValue, type),
      description: getDescription(node, backcompatOptions),
    };
  });
  return result;
}

function resolveType(typeRegistry: TypeRegistry, node: TypeNode): GraphQLType {
  switch (node.kind) {
    case Kind.LIST_TYPE:
      return new GraphQLList(resolveType(typeRegistry, node.type));
    case Kind.NON_NULL_TYPE:
      return new GraphQLNonNull(resolveType(typeRegistry, node.type));
    default:
      return typeRegistry.getType(node.name.value);
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
