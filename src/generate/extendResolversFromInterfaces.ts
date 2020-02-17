import {
  GraphQLObjectType,
  GraphQLSchema,
  versionInfo,
  GraphQLInterfaceType,
} from 'graphql';

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
    if (
      type instanceof GraphQLObjectType ||
      (versionInfo.major >= 15 && type instanceof GraphQLInterfaceType)
    ) {
      const interfaceResolvers = (type as GraphQLObjectType)
        .getInterfaces()
        .map(iFace => resolvers[iFace.name]);
      extendedResolvers[typeName] = Object.assign(
        {},
        ...interfaceResolvers,
        typeResolvers,
      );
    } else if (typeResolvers != null) {
      extendedResolvers[typeName] = typeResolvers;
    }
  });

  return extendedResolvers;
}

export default extendResolversFromInterfaces;
