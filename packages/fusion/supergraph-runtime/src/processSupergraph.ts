import { ASTVisitFn, buildASTSchema, GraphQLSchema, Kind, parse, visit } from 'graphql';
import { NamedDefinitionNodeWithDirectives } from './types.js';

export interface ProcessedSupergraph {
  supergraphSchema: GraphQLSchema;
  subgraphSchemas: Map<string, GraphQLSchema>;
}

export function processSupergraphSdl(supergraphSdl: string): ProcessedSupergraph {
  const subgraphNames = new Set<string>();
  const supergraphAst = parse(supergraphSdl, { noLocation: true });
  visit(supergraphAst, {
    [Kind.DIRECTIVE](node) {
      const subgraphArgument = node.arguments?.find(arg => arg.name.value === 'subgraph');
      if (subgraphArgument && subgraphArgument.value.kind === Kind.STRING) {
        subgraphNames.add(subgraphArgument.value.value);
      }
    },
  });

  const subgraphSchemas = new Map<string, GraphQLSchema>();

  // for (const subgraphName of subgraphNames) {
  //   const subgraphSchemaAst = visit(
  //     supergraphAst,
  //     Object.fromEntries(
  //       sourceDirectiveLocations.map(directiveLocation => [
  //         directiveLocation,
  //         {
  //           enter: createFilterBySourceDirectiveVisitorSubgraphName(subgraphName),
  //         },
  //       ]),
  //     ),
  //   );
  //   const subgraphSchema = buildASTSchema(subgraphSchemaAst);
  //   subgraphSchemas.set(subgraphName, subgraphSchema);
  // }
  const supergraphSchema = buildASTSchema(supergraphAst);

  return {
    supergraphSchema,
    subgraphSchemas,
  };
}

const sourceDirectiveLocations = [
  'ObjectTypeDefinition',
  'FieldDefinition',
  'EnumTypeDefinition',
  'EnumValueDefinition',
  'InputObjectTypeDefinition',
  'InputFieldDefinition',
  'ScalarTypeDefinition',
] as const;

function createFilterBySourceDirectiveVisitorSubgraphName(
  subgraphName: string,
): ASTVisitFn<NamedDefinitionNodeWithDirectives> {
  return function filterBySourceDirectiveVisitor(node) {
    if (
      node.directives?.some(
        directiveNode =>
          directiveNode.arguments?.some(
            argumentNode =>
              argumentNode.name.value === 'subgraph' &&
              argumentNode.value.kind === Kind.STRING &&
              argumentNode.value.value === subgraphName,
          ),
      )
    ) {
      return node;
    }
    return null;
  };
}
