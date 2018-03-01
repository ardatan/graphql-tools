/* tslint:disable:no-unused-expression */

import { GraphQLSchema, GraphQLNamedType } from 'graphql';
import { Transform } from '../transforms/transforms';
import { visitSchema, VisitSchemaKind } from '../transforms/visitSchema';

export default function FilterTypes(
  filter: (type: GraphQLNamedType) => Boolean,
): Transform {
  return {
    transformSchema(schema: GraphQLSchema): GraphQLSchema {
      return visitSchema(schema, {
        [VisitSchemaKind.TYPE](type: GraphQLNamedType): null | undefined {
          if (filter(type)) {
            return undefined;
          } else {
            return null;
          }
        },
      });
    },
  };
}
