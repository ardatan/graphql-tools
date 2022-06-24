import {
  GraphQLSchema,
  print,
  GraphQLNamedType,
  Kind,
  isSpecifiedScalarType,
  isIntrospectionType,
  TypeDefinitionNode,
  DirectiveNode,
  FieldDefinitionNode,
  InputValueDefinitionNode,
  GraphQLArgument,
  EnumValueDefinitionNode,
  isSpecifiedDirective,
  GraphQLDirective,
  DirectiveDefinitionNode,
  astFromValue,
  ArgumentNode,
  SchemaDefinitionNode,
  OperationTypeDefinitionNode,
  SchemaExtensionNode,
  OperationTypeNode,
  GraphQLObjectType,
  GraphQLDeprecatedDirective,
  isObjectType,
  ObjectTypeDefinitionNode,
  GraphQLField,
  NamedTypeNode,
  TypeExtensionNode,
  GraphQLInterfaceType,
  InterfaceTypeDefinitionNode,
  isInterfaceType,
  isUnionType,
  UnionTypeDefinitionNode,
  GraphQLUnionType,
  isInputObjectType,
  GraphQLInputObjectType,
  InputObjectTypeDefinitionNode,
  GraphQLInputField,
  isEnumType,
  isScalarType,
  GraphQLEnumType,
  GraphQLEnumValue,
  EnumTypeDefinitionNode,
  GraphQLScalarType,
  ScalarTypeDefinitionNode,
  DefinitionNode,
  DocumentNode,
  StringValueNode,
} from 'graphql';
import { GetDocumentNodeFromSchemaOptions, PrintSchemaWithDirectivesOptions, Maybe } from './types.js';

import { astFromType } from './astFromType.js';
import { getDirectivesInExtensions } from './get-directives.js';
import { astFromValueUntyped } from './astFromValueUntyped.js';
import { isSome } from './helpers.js';
import { getRootTypeMap } from './rootTypes.js';

export function getDocumentNodeFromSchema(
  schema: GraphQLSchema,
  options: GetDocumentNodeFromSchemaOptions = {}
): DocumentNode {
  const pathToDirectivesInExtensions = options.pathToDirectivesInExtensions;

  const typesMap = schema.getTypeMap();

  const schemaNode = astFromSchema(schema, pathToDirectivesInExtensions);
  const definitions: Array<DefinitionNode> = schemaNode != null ? [schemaNode] : [];

  const directives = schema.getDirectives();
  for (const directive of directives) {
    if (isSpecifiedDirective(directive)) {
      continue;
    }

    definitions.push(astFromDirective(directive, schema, pathToDirectivesInExtensions));
  }

  for (const typeName in typesMap) {
    const type = typesMap[typeName];
    const isPredefinedScalar = isSpecifiedScalarType(type);
    const isIntrospection = isIntrospectionType(type);

    if (isPredefinedScalar || isIntrospection) {
      continue;
    }

    if (isObjectType(type)) {
      definitions.push(astFromObjectType(type, schema, pathToDirectivesInExtensions));
    } else if (isInterfaceType(type)) {
      definitions.push(astFromInterfaceType(type, schema, pathToDirectivesInExtensions));
    } else if (isUnionType(type)) {
      definitions.push(astFromUnionType(type, schema, pathToDirectivesInExtensions));
    } else if (isInputObjectType(type)) {
      definitions.push(astFromInputObjectType(type, schema, pathToDirectivesInExtensions));
    } else if (isEnumType(type)) {
      definitions.push(astFromEnumType(type, schema, pathToDirectivesInExtensions));
    } else if (isScalarType(type)) {
      definitions.push(astFromScalarType(type, schema, pathToDirectivesInExtensions));
    } else {
      throw new Error(`Unknown type ${type}.`);
    }
  }

  return {
    kind: Kind.DOCUMENT,
    definitions,
  };
}

// this approach uses the default schema printer rather than a custom solution, so may be more backwards compatible
// currently does not allow customization of printSchema options having to do with comments.
export function printSchemaWithDirectives(
  schema: GraphQLSchema,
  options: PrintSchemaWithDirectivesOptions = {}
): string {
  const documentNode = getDocumentNodeFromSchema(schema, options);
  return print(documentNode);
}

export function astFromSchema(
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): SchemaDefinitionNode | SchemaExtensionNode | null {
  const operationTypeMap = new Map<OperationTypeNode, OperationTypeDefinitionNode | undefined>([
    ['query', undefined],
    ['mutation', undefined],
    ['subscription', undefined],
  ] as [OperationTypeNode, OperationTypeDefinitionNode | undefined][]);

  const nodes: Array<SchemaDefinitionNode | SchemaExtensionNode> = [];
  if (schema.astNode != null) {
    nodes.push(schema.astNode);
  }
  if (schema.extensionASTNodes != null) {
    for (const extensionASTNode of schema.extensionASTNodes) {
      nodes.push(extensionASTNode);
    }
  }

  for (const node of nodes) {
    if (node.operationTypes) {
      for (const operationTypeDefinitionNode of node.operationTypes) {
        operationTypeMap.set(operationTypeDefinitionNode.operation, operationTypeDefinitionNode);
      }
    }
  }

  const rootTypeMap = getRootTypeMap(schema);

  for (const [operationTypeNode, operationTypeDefinitionNode] of operationTypeMap) {
    const rootType = rootTypeMap.get(operationTypeNode as OperationTypeNode);
    if (rootType != null) {
      const rootTypeAST = astFromType(rootType);
      if (operationTypeDefinitionNode != null) {
        (operationTypeDefinitionNode as any).type = rootTypeAST;
      } else {
        operationTypeMap.set(operationTypeNode, {
          kind: Kind.OPERATION_TYPE_DEFINITION,
          operation: operationTypeNode,
          type: rootTypeAST,
        } as OperationTypeDefinitionNode);
      }
    }
  }

  const operationTypes = [...operationTypeMap.values()].filter(isSome);

  const directives = getDirectiveNodes(schema, schema, pathToDirectivesInExtensions);

  if (!operationTypes.length && !directives.length) {
    return null;
  }

  const schemaNode: SchemaDefinitionNode | SchemaExtensionNode = {
    kind: operationTypes != null ? Kind.SCHEMA_DEFINITION : Kind.SCHEMA_EXTENSION,
    operationTypes,
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: directives as any,
  };

  // This code is so weird because it needs to support GraphQL.js 14
  // In GraphQL.js 14 there is no `description` value on schemaNode
  (schemaNode as unknown as { description?: StringValueNode }).description =
    (schema.astNode as unknown as { description: string })?.description ??
    (schema as unknown as { description: string }).description != null
      ? {
          kind: Kind.STRING,
          value: (schema as unknown as { description: string }).description,
          block: true,
        }
      : undefined;

  return schemaNode;
}

export function astFromDirective(
  directive: GraphQLDirective,
  schema?: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): DirectiveDefinitionNode {
  return {
    kind: Kind.DIRECTIVE_DEFINITION,
    description:
      directive.astNode?.description ??
      (directive.description
        ? {
            kind: Kind.STRING,
            value: directive.description,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: directive.name,
    },
    arguments: directive.args?.map(arg => astFromArg(arg, schema, pathToDirectivesInExtensions)),
    repeatable: directive.isRepeatable,
    locations:
      directive.locations?.map(location => ({
        kind: Kind.NAME,
        value: location,
      })) || [],
  };
}

export function getDirectiveNodes(
  entity: GraphQLSchema | GraphQLNamedType | GraphQLEnumValue,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): Array<DirectiveNode> {
  const directivesInExtensions = getDirectivesInExtensions(entity, pathToDirectivesInExtensions);

  let nodes: Array<
    SchemaDefinitionNode | SchemaExtensionNode | TypeDefinitionNode | TypeExtensionNode | EnumValueDefinitionNode
  > = [];
  if (entity.astNode != null) {
    nodes.push(entity.astNode);
  }
  if ('extensionASTNodes' in entity && entity.extensionASTNodes != null) {
    nodes = nodes.concat(entity.extensionASTNodes);
  }

  let directives: Array<DirectiveNode>;
  if (directivesInExtensions != null) {
    directives = makeDirectiveNodes(schema, directivesInExtensions);
  } else {
    directives = [];
    for (const node of nodes) {
      if (node.directives) {
        directives.push(...node.directives);
      }
    }
  }

  return directives;
}

export function getDeprecatableDirectiveNodes(
  entity: GraphQLArgument | GraphQLField<any, any> | GraphQLInputField | GraphQLEnumValue,
  schema?: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): Array<DirectiveNode> {
  let directiveNodesBesidesDeprecated: Array<DirectiveNode> = [];
  let deprecatedDirectiveNode: Maybe<DirectiveNode> = null;

  const directivesInExtensions = getDirectivesInExtensions(entity, pathToDirectivesInExtensions);

  let directives: Maybe<ReadonlyArray<DirectiveNode>>;
  if (directivesInExtensions != null) {
    directives = makeDirectiveNodes(schema, directivesInExtensions);
  } else {
    directives = entity.astNode?.directives;
  }

  if (directives != null) {
    directiveNodesBesidesDeprecated = directives.filter(directive => directive.name.value !== 'deprecated');
    if ((entity as unknown as { deprecationReason: string }).deprecationReason != null) {
      deprecatedDirectiveNode = directives.filter(directive => directive.name.value === 'deprecated')?.[0];
    }
  }

  if (
    (entity as unknown as { deprecationReason: string }).deprecationReason != null &&
    deprecatedDirectiveNode == null
  ) {
    deprecatedDirectiveNode = makeDeprecatedDirective(
      (entity as unknown as { deprecationReason: string }).deprecationReason
    );
  }

  return deprecatedDirectiveNode == null
    ? directiveNodesBesidesDeprecated
    : [deprecatedDirectiveNode].concat(directiveNodesBesidesDeprecated);
}

export function astFromArg(
  arg: GraphQLArgument,
  schema?: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): InputValueDefinitionNode {
  return {
    kind: Kind.INPUT_VALUE_DEFINITION,
    description:
      arg.astNode?.description ??
      (arg.description
        ? {
            kind: Kind.STRING,
            value: arg.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: arg.name,
    },
    type: astFromType(arg.type),
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    defaultValue:
      arg.defaultValue !== undefined ? astFromValue(arg.defaultValue, arg.type) ?? undefined : (undefined as any),
    directives: getDeprecatableDirectiveNodes(arg, schema, pathToDirectivesInExtensions) as any,
  };
}

export function astFromObjectType(
  type: GraphQLObjectType,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): ObjectTypeDefinitionNode {
  return {
    kind: Kind.OBJECT_TYPE_DEFINITION,
    description:
      type.astNode?.description ??
      (type.description
        ? {
            kind: Kind.STRING,
            value: type.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: type.name,
    },
    fields: Object.values(type.getFields()).map(field => astFromField(field, schema, pathToDirectivesInExtensions)),
    interfaces: Object.values(type.getInterfaces()).map(iFace => astFromType(iFace) as NamedTypeNode),
    directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions) as any,
  };
}

export function astFromInterfaceType(
  type: GraphQLInterfaceType,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): InterfaceTypeDefinitionNode {
  const node: InterfaceTypeDefinitionNode = {
    kind: Kind.INTERFACE_TYPE_DEFINITION,
    description:
      type.astNode?.description ??
      (type.description
        ? {
            kind: Kind.STRING,
            value: type.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: type.name,
    },
    fields: Object.values(type.getFields()).map(field => astFromField(field, schema, pathToDirectivesInExtensions)),
    directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions) as any,
  };

  if ('getInterfaces' in type) {
    (node as unknown as { interfaces: Array<NamedTypeNode> }).interfaces = Object.values(
      (type as unknown as GraphQLObjectType).getInterfaces()
    ).map(iFace => astFromType(iFace) as NamedTypeNode);
  }

  return node;
}

export function astFromUnionType(
  type: GraphQLUnionType,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): UnionTypeDefinitionNode {
  return {
    kind: Kind.UNION_TYPE_DEFINITION,
    description:
      type.astNode?.description ??
      (type.description
        ? {
            kind: Kind.STRING,
            value: type.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: type.name,
    },
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions) as any,
    types: type.getTypes().map(type => astFromType(type) as NamedTypeNode),
  };
}

export function astFromInputObjectType(
  type: GraphQLInputObjectType,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): InputObjectTypeDefinitionNode {
  return {
    kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
    description:
      type.astNode?.description ??
      (type.description
        ? {
            kind: Kind.STRING,
            value: type.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: type.name,
    },
    fields: Object.values(type.getFields()).map(field =>
      astFromInputField(field, schema, pathToDirectivesInExtensions)
    ),
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions) as any,
  };
}

export function astFromEnumType(
  type: GraphQLEnumType,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): EnumTypeDefinitionNode {
  return {
    kind: Kind.ENUM_TYPE_DEFINITION,
    description:
      type.astNode?.description ??
      (type.description
        ? {
            kind: Kind.STRING,
            value: type.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: type.name,
    },
    values: Object.values(type.getValues()).map(value => astFromEnumValue(value, schema, pathToDirectivesInExtensions)),
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions) as any,
  };
}

export function astFromScalarType(
  type: GraphQLScalarType,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): ScalarTypeDefinitionNode {
  const directivesInExtensions = getDirectivesInExtensions(type, pathToDirectivesInExtensions);

  const directives: DirectiveNode[] = directivesInExtensions
    ? makeDirectiveNodes(schema, directivesInExtensions)
    : (type.astNode?.directives as DirectiveNode[]) || [];

  const specifiedByValue = ((type as any)['specifiedByUrl'] || (type as any)['specifiedByURL']) as string;
  if (specifiedByValue && !directives.some(directiveNode => directiveNode.name.value === 'specifiedBy')) {
    const specifiedByArgs = {
      url: specifiedByValue,
    };
    directives.push(makeDirectiveNode('specifiedBy', specifiedByArgs));
  }

  return {
    kind: Kind.SCALAR_TYPE_DEFINITION,
    description:
      type.astNode?.description ??
      (type.description
        ? {
            kind: Kind.STRING,
            value: type.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: type.name,
    },
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: directives as any,
  };
}

export function astFromField(
  field: GraphQLField<any, any>,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): FieldDefinitionNode {
  return {
    kind: Kind.FIELD_DEFINITION,
    description:
      field.astNode?.description ??
      (field.description
        ? {
            kind: Kind.STRING,
            value: field.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: field.name,
    },
    arguments: field.args.map(arg => astFromArg(arg, schema, pathToDirectivesInExtensions)),
    type: astFromType(field.type),
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: getDeprecatableDirectiveNodes(field, schema, pathToDirectivesInExtensions) as any,
  };
}

export function astFromInputField(
  field: GraphQLInputField,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): InputValueDefinitionNode {
  return {
    kind: Kind.INPUT_VALUE_DEFINITION,
    description:
      field.astNode?.description ??
      (field.description
        ? {
            kind: Kind.STRING,
            value: field.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: field.name,
    },
    type: astFromType(field.type),
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: getDeprecatableDirectiveNodes(field, schema, pathToDirectivesInExtensions) as any,
    defaultValue: astFromValue(field.defaultValue, field.type) ?? (undefined as any),
  };
}

export function astFromEnumValue(
  value: GraphQLEnumValue,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): EnumValueDefinitionNode {
  return {
    kind: Kind.ENUM_VALUE_DEFINITION,
    description:
      value.astNode?.description ??
      (value.description
        ? {
            kind: Kind.STRING,
            value: value.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: value.name,
    },
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: getDeprecatableDirectiveNodes(value, schema, pathToDirectivesInExtensions) as any,
  };
}

export function makeDeprecatedDirective(deprecationReason: string): DirectiveNode {
  return makeDirectiveNode('deprecated', { reason: deprecationReason }, GraphQLDeprecatedDirective);
}

export function makeDirectiveNode(
  name: string,
  args: Record<string, any>,
  directive?: Maybe<GraphQLDirective>
): DirectiveNode {
  const directiveArguments: Array<ArgumentNode> = [];

  if (directive != null) {
    for (const arg of directive.args) {
      const argName = arg.name;
      const argValue = args[argName];
      if (argValue !== undefined) {
        const value = astFromValue(argValue, arg.type);
        if (value) {
          directiveArguments.push({
            kind: Kind.ARGUMENT,
            name: {
              kind: Kind.NAME,
              value: argName,
            },
            value,
          });
        }
      }
    }
  } else {
    for (const argName in args) {
      const argValue = args[argName];
      const value = astFromValueUntyped(argValue);
      if (value) {
        directiveArguments.push({
          kind: Kind.ARGUMENT,
          name: {
            kind: Kind.NAME,
            value: argName,
          },
          value,
        });
      }
    }
  }

  return {
    kind: Kind.DIRECTIVE,
    name: {
      kind: Kind.NAME,
      value: name,
    },
    arguments: directiveArguments,
  };
}

export function makeDirectiveNodes(
  schema: Maybe<GraphQLSchema>,
  directiveValues: Record<string, any>
): Array<DirectiveNode> {
  const directiveNodes: Array<DirectiveNode> = [];
  for (const directiveName in directiveValues) {
    const arrayOrSingleValue = directiveValues[directiveName];
    const directive = schema?.getDirective(directiveName);
    if (Array.isArray(arrayOrSingleValue)) {
      for (const value of arrayOrSingleValue) {
        directiveNodes.push(makeDirectiveNode(directiveName, value, directive));
      }
    } else {
      directiveNodes.push(makeDirectiveNode(directiveName, arrayOrSingleValue, directive));
    }
  }
  return directiveNodes;
}
