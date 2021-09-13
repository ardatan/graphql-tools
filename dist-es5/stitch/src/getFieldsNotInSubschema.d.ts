import { GraphQLSchema, FieldNode, GraphQLObjectType, FragmentDefinitionNode } from 'graphql';
import { StitchingInfo } from '@graphql-tools/delegate';
export declare function getFieldsNotInSubschema(
  schema: GraphQLSchema,
  stitchingInfo: StitchingInfo,
  gatewayType: GraphQLObjectType,
  subschemaType: GraphQLObjectType,
  fieldNodes: FieldNode[],
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>
): Array<FieldNode>;
