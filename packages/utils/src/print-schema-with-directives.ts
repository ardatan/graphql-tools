import {
  GraphQLSchema,
  print,
  printType,
  GraphQLNamedType,
  Kind,
  ObjectTypeExtensionNode,
  isSpecifiedScalarType,
  isIntrospectionType,
  parse,
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
} from 'graphql';
import { PrintSchemaWithDirectivesOptions } from './types';
import { createSchemaDefinition } from './create-schema-definition';
import { astFromType } from './astFromType';
import { mapSchema } from './mapSchema';

// this approach uses the default schema printer rather than a custom solution, so may be more backwards compatible
// currently does not allow customization of printSchema options having to do with comments.
export function printSchemaWithDirectives(
  schema: GraphQLSchema,
  options: PrintSchemaWithDirectivesOptions = {}
): string {
  schema = loadDirectivesFromExtensions(schema, options);

  const typesMap = schema.getTypeMap();

  const result: string[] = [getSchemaDefinition(schema)];

  for (const typeName in typesMap) {
    const type = typesMap[typeName];
    const isPredefinedScalar = isSpecifiedScalarType(type);
    const isIntrospection = isIntrospectionType(type);

    if (isPredefinedScalar || isIntrospection) {
      continue;
    }

    // KAMIL: we might want to turn on descriptions in future
    result.push(print(correctType(typeName, typesMap)?.astNode));
  }

  const directives = schema.getDirectives();
  for (const directive of directives) {
    if (isSpecifiedDirective(directive)) {
      continue;
    }

    result.push(print(astFromDirective(directive)));
  }

  return result.join('\n');
}

function extendDefinition(type: GraphQLNamedType): GraphQLNamedType['astNode'] {
  switch (type.astNode.kind) {
    case Kind.OBJECT_TYPE_DEFINITION:
      return {
        ...type.astNode,
        fields: type.astNode.fields.concat(
          (type.extensionASTNodes as ReadonlyArray<ObjectTypeExtensionNode>).reduce(
            (fields, node) => fields.concat(node.fields),
            []
          )
        ),
      };
    case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      return {
        ...type.astNode,
        fields: type.astNode.fields.concat(
          (type.extensionASTNodes as ReadonlyArray<ObjectTypeExtensionNode>).reduce(
            (fields, node) => fields.concat(node.fields),
            []
          )
        ),
      };
    default:
      return type.astNode;
  }
}

function correctType<TMap extends { [key: string]: GraphQLNamedType }, TName extends keyof TMap>(
  typeName: TName,
  typesMap: TMap
): TMap[TName] {
  const type = typesMap[typeName];

  type.name = typeName.toString();

  if (type.astNode && type.extensionASTNodes) {
    type.astNode = type.extensionASTNodes ? extendDefinition(type) : type.astNode;
  }
  const doc = parse(printType(type));
  const fixedAstNode = doc.definitions[0] as TypeDefinitionNode;
  const originalAstNode = type?.astNode;
  if (originalAstNode) {
    (fixedAstNode.directives as DirectiveNode[]) = originalAstNode?.directives as DirectiveNode[];
    if (fixedAstNode && 'fields' in fixedAstNode && originalAstNode && 'fields' in originalAstNode) {
      for (const fieldDefinitionNode of fixedAstNode.fields) {
        const originalFieldDefinitionNode = (originalAstNode.fields as (
          | InputValueDefinitionNode
          | FieldDefinitionNode
        )[]).find(field => field.name.value === fieldDefinitionNode.name.value);
        (fieldDefinitionNode.directives as DirectiveNode[]) = originalFieldDefinitionNode?.directives as DirectiveNode[];
        if (
          fieldDefinitionNode &&
          'arguments' in fieldDefinitionNode &&
          originalFieldDefinitionNode &&
          'arguments' in originalFieldDefinitionNode
        ) {
          for (const argument of fieldDefinitionNode.arguments) {
            const originalArgumentNode = (originalFieldDefinitionNode as FieldDefinitionNode).arguments?.find(
              arg => arg.name.value === argument.name.value
            );
            (argument.directives as DirectiveNode[]) = originalArgumentNode.directives as DirectiveNode[];
          }
        }
      }
    } else if (fixedAstNode && 'values' in fixedAstNode && originalAstNode && 'values' in originalAstNode) {
      for (const valueDefinitionNode of fixedAstNode.values) {
        const originalValueDefinitionNode = (originalAstNode.values as EnumValueDefinitionNode[]).find(
          valueNode => valueNode.name.value === valueDefinitionNode.name.value
        );
        (valueDefinitionNode.directives as DirectiveNode[]) = originalValueDefinitionNode?.directives as DirectiveNode[];
      }
    }
  }
  type.astNode = fixedAstNode;

  return type;
}

export function getSchemaDefinition(schema: GraphQLSchema) {
  if (!Object.getOwnPropertyDescriptor(schema, 'astNode').get && schema.astNode) {
    return print(schema.astNode);
  } else {
    return createSchemaDefinition({
      query: schema.getQueryType(),
      mutation: schema.getMutationType(),
      subscription: schema.getSubscriptionType(),
    });
  }
}

function astFromDirective(directive: GraphQLDirective): DirectiveDefinitionNode {
  return {
    kind: Kind.DIRECTIVE_DEFINITION,
    loc: directive.astNode?.loc,
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
    arguments: directive?.args ? directive.args.map(astFromArg) : undefined,
    repeatable: directive.isRepeatable,
    locations: directive?.locations
      ? directive.locations.map(location => ({
          kind: Kind.NAME,
          value: location,
        }))
      : undefined,
  };
}

function astFromArg(arg: GraphQLArgument): InputValueDefinitionNode {
  let directiveNodesBesidesDeprecated: Array<DirectiveNode> = [];
  let deprecatedDirectiveNode: DirectiveNode;

  const hasASTDirectives = arg.astNode?.directives;
  if (hasASTDirectives) {
    directiveNodesBesidesDeprecated = arg.astNode.directives.filter(directive => directive.name.value !== 'deprecated');
    if (((arg as unknown) as { deprecationReason: string }).deprecationReason != null) {
      deprecatedDirectiveNode = ((arg as unknown) as { astNode: InputValueDefinitionNode }).astNode.directives.filter(
        directive => directive.name.value === 'deprecated'
      )?.[0];
    }
  }

  if (
    ((arg as unknown) as { deprecationReason: string }).deprecationReason != null &&
    deprecatedDirectiveNode == null
  ) {
    deprecatedDirectiveNode = {
      kind: Kind.DIRECTIVE,
      name: {
        kind: Kind.NAME,
        value: 'deprecated',
      },
      arguments: [
        {
          kind: Kind.ARGUMENT,
          name: {
            kind: Kind.NAME,
            value: 'reason',
          },
          value: {
            kind: Kind.STRING,
            value: ((arg as unknown) as { deprecationReason: string }).deprecationReason,
          },
        },
      ],
    };
  }

  return {
    kind: Kind.INPUT_VALUE_DEFINITION,
    loc: arg.astNode?.loc,
    description:
      arg.astNode?.description ??
      (arg.description
        ? {
            kind: Kind.STRING,
            value: arg.description,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: arg.name,
    },
    type: astFromType(arg.type),
    defaultValue: arg.defaultValue !== undefined ? astFromValue(arg.defaultValue, arg.type) : undefined,
    directives:
      deprecatedDirectiveNode == null
        ? directiveNodesBesidesDeprecated
        : [deprecatedDirectiveNode].concat(directiveNodesBesidesDeprecated),
  };
}

export function loadDirectivesFromExtensions(schema: GraphQLSchema, options: PrintSchemaWithDirectivesOptions) {
  const pathToDirectivesInExtensions = options.pathToDirectivesInExtensions ?? ['directives'];

  // do the thing
  return mapSchema(schema, {});
}
