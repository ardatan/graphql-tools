import { GraphQLObjectType, GraphQLSchema } from 'graphql';

export default function resolveFromParentTypename(
  parent: any,
  schema: GraphQLSchema,
) {
  const parentTypename: string = parent['__typename'];
  if (!parentTypename) {
    throw new Error(
      'Did not fetch typename for object, unable to resolve interface.',
    );
  }

  const resolvedType = schema.getType(parentTypename);

  if (!(resolvedType instanceof GraphQLObjectType)) {
    throw new Error(
      '__typename did not match an object type: ' + parentTypename,
    );
  }

  return resolvedType;
}
