import {
  GraphQLSchema,
  GraphQLFieldResolver,
  GraphQLObjectType,
  GraphQLFieldConfigMap
} from 'graphql';
import { Transform } from './transforms';
import { visitSchema } from '../utils/visitSchema';
import { VisitSchemaKind } from '../Interfaces';
import { createResolveType, argsToFieldConfigArgumentMap } from '../stitching/schemaRecreation';

export default class AddDefaultResolver implements Transform {
  private defaultFieldResolver: GraphQLFieldResolver<any, any>;

  constructor(defaultFieldResolver: GraphQLFieldResolver<any, any>) {
    this.defaultFieldResolver = defaultFieldResolver;
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    const { defaultFieldResolver } = this;

    if (!defaultFieldResolver) {
      return schema;
    }

    const resolveType = createResolveType((name, type) => type);
    const transformedSchema = visitSchema(schema, {
      [VisitSchemaKind.OBJECT_TYPE](type: GraphQLObjectType) {
        const fields = type.getFields();
        const interfaces = type.getInterfaces();

        const newFields: GraphQLFieldConfigMap<any, any> = {};
        Object.keys(fields).forEach(name => {
          const field = fields[name];
          const resolvedType = resolveType(field.type);
          if (resolvedType !== null) {
            newFields[name] = {
              type: resolvedType,
              args: argsToFieldConfigArgumentMap(field.args, resolveType),
              resolve: field.resolve ? field.resolve : defaultFieldResolver,
              subscribe: field.subscribe,
              description: field.description,
              deprecationReason: field.deprecationReason,
              astNode: field.astNode,
            };
          }
        });

        return new GraphQLObjectType({
          name: type.name,
          description: type.description,
          astNode: type.astNode,
          isTypeOf: type.isTypeOf,
          fields: () => newFields,
          interfaces: () => interfaces.map(iface => resolveType(iface)),
        });
      },
    });

    return transformedSchema;
  }
}
