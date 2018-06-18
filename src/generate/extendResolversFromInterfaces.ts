import { GraphQLObjectType, GraphQLSchema } from 'graphql';

import { IResolvers } from '../Interfaces';

function extendResolversFromInterfaces(
  schema: GraphQLSchema,
  resolvers: IResolvers,
) {
  const typeNames = Object.keys({
    ...schema.getTypeMap(),
    ...resolvers,
  });

  const extendedResolvers: IResolvers = {};
  typeNames.forEach(typeName => {
    const typeResolvers = resolvers[typeName];
    const type = schema.getType(typeName);
    if (type instanceof GraphQLObjectType) {
      const interfaceResolvers = type
        .getInterfaces()
        .map(iFace => resolvers[iFace.name]);
      extendedResolvers[typeName] = Object.assign(
        {},
        ...interfaceResolvers,
        typeResolvers,
      );
    } else {
      if (typeResolvers) {
        extendedResolvers[typeName] = typeResolvers;
      }
    }
  });

  return extendedResolvers;
}

export default extendResolversFromInterfaces;
