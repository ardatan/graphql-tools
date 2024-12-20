import {
  ArgumentNode,
  DefinitionNode,
  DirectiveDefinitionNode,
  DirectiveNode,
  DocumentNode,
  EnumTypeDefinitionNode,
  EnumValueDefinitionNode,
  FieldDefinitionNode,
  GraphQLArgument,
  GraphQLDeprecatedDirective,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLEnumValue,
  GraphQLField,
  GraphQLInputField,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLUnionType,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  InterfaceTypeDefinitionNode,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isIntrospectionType,
  isObjectType,
  isScalarType,
  isSpecifiedDirective,
  isSpecifiedScalarType,
  isUnionType,
  Kind,
  NamedTypeNode,
  ObjectTypeDefinitionNode,
  OperationTypeDefinitionNode,
  OperationTypeNode,
  print,
  ScalarTypeDefinitionNode,
  SchemaDefinitionNode,
  SchemaExtensionNode,
  UnionTypeDefinitionNode,
  ValueNode,
} from 'graphql';
import { astFromType } from './astFromType.js';
import { astFromValue } from './astFromValue.js';
import { astFromValueUntyped } from './astFromValueUntyped.js';
import { getDescriptionNode } from './descriptionFromObject.js';
import {
  DirectableGraphQLObject,
  DirectiveAnnotation,
  getDirectivesInExtensions,
} from './get-directives.js';
import { isSome } from './helpers.js';
import { getRootTypeMap } from './rootTypes.js';
import {
  GetDocumentNodeFromSchemaOptions,
  Maybe,
  PrintSchemaWithDirectivesOptions,
} from './types.js';

export function getDocumentNodeFromSchema(
  schema: GraphQLSchema,
  options: GetDocumentNodeFromSchemaOptions = {},
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
  options: PrintSchemaWithDirectivesOptions = {},
): string {
  const documentNode = getDocumentNodeFromSchema(schema, options);
  return print(documentNode);
}

export function astFromSchema(
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>,
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

  const descriptionNode = getDescriptionNode(schema);
  if (descriptionNode) {
    (schemaNode as any).description = descriptionNode;
  }

  return schemaNode;
}

export function astFromDirective(
  directive: GraphQLDirective,
  schema?: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>,
): DirectiveDefinitionNode {
  return {
    kind: Kind.DIRECTIVE_DEFINITION,
    description: getDescriptionNode(directive),
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

export function getDirectiveNodes<TDirectiveNode extends DirectiveNode>(
  entity: DirectableGraphQLObject & {
    deprecationReason?: string | null;
    specifiedByUrl?: string | null;
    specifiedByURL?: string | null;
  },
  schema?: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>,
): Array<TDirectiveNode> {
  let directiveNodesBesidesDeprecatedAndSpecifiedBy: Array<TDirectiveNode> = [];

  const directivesInExtensions = getDirectivesInExtensions(entity, pathToDirectivesInExtensions);

  let directives: Maybe<ReadonlyArray<TDirectiveNode>>;
  if (directivesInExtensions != null) {
    directives = makeDirectiveNodes(schema, directivesInExtensions);
  }

  let deprecatedDirectiveNode: Maybe<TDirectiveNode> = null;
  let specifiedByDirectiveNode: Maybe<TDirectiveNode> = null;
  if (directives != null) {
    directiveNodesBesidesDeprecatedAndSpecifiedBy = directives.filter(
      directive => directive.name.value !== 'deprecated' && directive.name.value !== 'specifiedBy',
    );
    if (entity.deprecationReason != null) {
      deprecatedDirectiveNode = directives.filter(
        directive => directive.name.value === 'deprecated',
      )?.[0];
    }
    if (entity.specifiedByUrl != null || entity.specifiedByURL != null) {
      specifiedByDirectiveNode = directives.filter(
        directive => directive.name.value === 'specifiedBy',
      )?.[0];
    }
  }

  if (entity.deprecationReason != null && deprecatedDirectiveNode == null) {
    deprecatedDirectiveNode = makeDeprecatedDirective<TDirectiveNode>(entity.deprecationReason);
  }

  if (
    entity.specifiedByUrl != null ||
    (entity.specifiedByURL != null && specifiedByDirectiveNode == null)
  ) {
    const specifiedByValue = entity.specifiedByUrl || entity.specifiedByURL;
    const specifiedByArgs = {
      url: specifiedByValue,
    };
    specifiedByDirectiveNode = makeDirectiveNode<TDirectiveNode>('specifiedBy', specifiedByArgs);
  }

  if (deprecatedDirectiveNode != null) {
    directiveNodesBesidesDeprecatedAndSpecifiedBy.push(deprecatedDirectiveNode);
  }
  if (specifiedByDirectiveNode != null) {
    directiveNodesBesidesDeprecatedAndSpecifiedBy.push(specifiedByDirectiveNode);
  }
  return directiveNodesBesidesDeprecatedAndSpecifiedBy;
}

export function astFromArg(
  arg: GraphQLArgument,
  schema?: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>,
): InputValueDefinitionNode {
  return {
    kind: Kind.INPUT_VALUE_DEFINITION,
    description: getDescriptionNode(arg),
    name: {
      kind: Kind.NAME,
      value: arg.name,
    },
    type: astFromType(arg.type),
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    defaultValue:
      arg.defaultValue !== undefined
        ? (astFromValue(arg.defaultValue, arg.type) ?? undefined)
        : (undefined as any),
    directives: getDirectiveNodes(arg, schema, pathToDirectivesInExtensions) as any,
  };
}

export function astFromObjectType(
  type: GraphQLObjectType,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>,
): ObjectTypeDefinitionNode {
  return {
    kind: Kind.OBJECT_TYPE_DEFINITION,
    description: getDescriptionNode(type),
    name: {
      kind: Kind.NAME,
      value: type.name,
    },
    fields: Object.values(type.getFields()).map(field =>
      astFromField(field, schema, pathToDirectivesInExtensions),
    ),
    interfaces: Object.values(type.getInterfaces()).map(
      iFace => astFromType(iFace) as NamedTypeNode,
    ),
    directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions) as any,
  };
}

export function astFromInterfaceType(
  type: GraphQLInterfaceType,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>,
): InterfaceTypeDefinitionNode {
  const node: InterfaceTypeDefinitionNode = {
    kind: Kind.INTERFACE_TYPE_DEFINITION,
    description: getDescriptionNode(type),
    name: {
      kind: Kind.NAME,
      value: type.name,
    },
    fields: Object.values(type.getFields()).map(field =>
      astFromField(field, schema, pathToDirectivesInExtensions),
    ),
    directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions) as any,
  };

  if ('getInterfaces' in type) {
    (node as unknown as { interfaces: Array<NamedTypeNode> }).interfaces = Object.values(
      (type as unknown as GraphQLObjectType).getInterfaces(),
    ).map(iFace => astFromType(iFace) as NamedTypeNode);
  }

  return node;
}

export function astFromUnionType(
  type: GraphQLUnionType,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>,
): UnionTypeDefinitionNode {
  return {
    kind: Kind.UNION_TYPE_DEFINITION,
    description: getDescriptionNode(type),
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
  pathToDirectivesInExtensions?: Array<string>,
): InputObjectTypeDefinitionNode {
  return {
    kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
    description: getDescriptionNode(type),
    name: {
      kind: Kind.NAME,
      value: type.name,
    },
    fields: Object.values(type.getFields()).map(field =>
      astFromInputField(field, schema, pathToDirectivesInExtensions),
    ),
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions) as any,
  };
}

export function astFromEnumType(
  type: GraphQLEnumType,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>,
): EnumTypeDefinitionNode {
  return {
    kind: Kind.ENUM_TYPE_DEFINITION,
    description: getDescriptionNode(type),
    name: {
      kind: Kind.NAME,
      value: type.name,
    },
    values: Object.values(type.getValues()).map(value =>
      astFromEnumValue(value, schema, pathToDirectivesInExtensions),
    ),
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions) as any,
  };
}

export function astFromScalarType(
  type: GraphQLScalarType,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>,
): ScalarTypeDefinitionNode {
  const directivesInExtensions = getDirectivesInExtensions(type, pathToDirectivesInExtensions);

  const directives = makeDirectiveNodes(schema, directivesInExtensions);

  const specifiedByValue = ((type as any)['specifiedByUrl'] ||
    (type as any)['specifiedByURL']) as string;
  if (
    specifiedByValue &&
    !directives.some(directiveNode => directiveNode.name.value === 'specifiedBy')
  ) {
    const specifiedByArgs = {
      url: specifiedByValue,
    };
    directives.push(makeDirectiveNode('specifiedBy', specifiedByArgs));
  }

  return {
    kind: Kind.SCALAR_TYPE_DEFINITION,
    description: getDescriptionNode(type),
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
  pathToDirectivesInExtensions?: Array<string>,
): FieldDefinitionNode {
  return {
    kind: Kind.FIELD_DEFINITION,
    description: getDescriptionNode(field),
    name: {
      kind: Kind.NAME,
      value: field.name,
    },
    arguments: field.args.map(arg => astFromArg(arg, schema, pathToDirectivesInExtensions)),
    type: astFromType(field.type),
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: getDirectiveNodes(field, schema, pathToDirectivesInExtensions) as any,
  };
}

export function astFromInputField(
  field: GraphQLInputField,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>,
): InputValueDefinitionNode {
  return {
    kind: Kind.INPUT_VALUE_DEFINITION,
    description: getDescriptionNode(field),
    name: {
      kind: Kind.NAME,
      value: field.name,
    },
    type: astFromType(field.type),
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: getDirectiveNodes(field, schema, pathToDirectivesInExtensions) as any,
    defaultValue: astFromValue(field.defaultValue, field.type) ?? (undefined as any),
  };
}

export function astFromEnumValue(
  value: GraphQLEnumValue,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>,
): EnumValueDefinitionNode {
  return {
    kind: Kind.ENUM_VALUE_DEFINITION,
    description: getDescriptionNode(value),
    name: {
      kind: Kind.NAME,
      value: value.name,
    },
    directives: getDirectiveNodes(value, schema, pathToDirectivesInExtensions),
  };
}

export function makeDeprecatedDirective<TDirectiveNode extends DirectiveNode>(
  deprecationReason: string,
): TDirectiveNode {
  return makeDirectiveNode('deprecated', { reason: deprecationReason }, GraphQLDeprecatedDirective);
}

export function makeDirectiveNode<TDirectiveNode extends DirectiveNode>(
  name: string,
  args?: Record<string, any>,
  directive?: Maybe<GraphQLDirective>,
): TDirectiveNode {
  const directiveArguments: Array<ArgumentNode> = [];

  for (const argName in args) {
    const argValue = args[argName];
    let value: Maybe<ValueNode>;
    if (directive != null) {
      const arg = directive.args.find(arg => arg.name === argName);
      if (arg) {
        value = astFromValue(argValue, arg.type);
      }
    }
    if (value == null) {
      value = astFromValueUntyped(argValue);
    }
    if (value != null) {
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

  return {
    kind: Kind.DIRECTIVE,
    name: {
      kind: Kind.NAME,
      value: name,
    },
    arguments: directiveArguments,
  } as unknown as TDirectiveNode;
}

export function makeDirectiveNodes<TDirectiveNode extends DirectiveNode>(
  schema: Maybe<GraphQLSchema>,
  directiveValues: DirectiveAnnotation[],
): Array<TDirectiveNode> {
  const directiveNodes: Array<TDirectiveNode> = [];
  for (const { name, args } of directiveValues) {
    const directive = schema?.getDirective(name);
    directiveNodes.push(makeDirectiveNode(name, args, directive));
  }
  return directiveNodes;
}
