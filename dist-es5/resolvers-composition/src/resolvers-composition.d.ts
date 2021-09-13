import { GraphQLFieldResolver } from 'graphql';
export declare type ResolversComposition<
  Resolver extends GraphQLFieldResolver<any, any, any> = GraphQLFieldResolver<any, any>
> = (next: Resolver) => Resolver;
export declare type ResolversComposerMapping<Resolvers extends Record<string, any> = Record<string, any>> =
  | {
      [TypeName in keyof Resolvers]?: {
        [FieldName in keyof Resolvers[TypeName]]: Resolvers[TypeName][FieldName] extends GraphQLFieldResolver<any, any>
          ?
              | ResolversComposition<Resolvers[TypeName][FieldName]>
              | Array<ResolversComposition<Resolvers[TypeName][FieldName]>>
          : ResolversComposition | ResolversComposition[];
      };
    }
  | {
      [path: string]: ResolversComposition | ResolversComposition[];
    };
/**
 * Wraps the resolvers object with the resolvers composition objects.
 * Implemented as a simple and basic middleware mechanism.
 *
 * @param resolvers - resolvers object
 * @param mapping - resolvers composition mapping
 * @hidden
 */
export declare function composeResolvers<Resolvers extends Record<string, any>>(
  resolvers: Resolvers,
  mapping?: ResolversComposerMapping<Resolvers>
): Resolvers;
