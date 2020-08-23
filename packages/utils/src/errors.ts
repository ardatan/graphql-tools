import { GraphQLError } from 'graphql';

export function relocatedError(originalError: GraphQLError, path?: ReadonlyArray<string | number>): GraphQLError {
  return new GraphQLError(
    originalError.message,
    originalError.nodes,
    originalError.source,
    originalError.positions,
    path === null ? undefined : path === undefined ? originalError.path : path,
    originalError.originalError,
    originalError.extensions
  );
}

export function extendedError(originalError: GraphQLError, extensions: Record<string, any>): GraphQLError {
  return new GraphQLError(
    originalError.message,
    originalError.nodes,
    originalError.source,
    originalError.positions,
    originalError.path,
    originalError.originalError,
    extensions
  );
}

export function unextendedError(originalError: GraphQLError, extensionKey: string): GraphQLError {
  const originalExtensions = originalError.extensions;

  if (originalExtensions == null) {
    return originalError;
  }

  const originalExtensionKeys = Object.keys(originalExtensions);

  if (!originalExtensionKeys.length) {
    return originalError;
  }

  const newExtensions = {};
  let extensionsPresent = false;
  originalExtensionKeys.forEach(key => {
    if (key !== extensionKey) {
      newExtensions[key] = originalExtensions[key];
      extensionsPresent = true;
    }
  });

  if (!extensionsPresent) {
    return new GraphQLError(
      originalError.message,
      originalError.nodes,
      originalError.source,
      originalError.positions,
      originalError.path,
      originalError.originalError,
      undefined
    );
  }

  return new GraphQLError(
    originalError.message,
    originalError.nodes,
    originalError.source,
    originalError.positions,
    originalError.path,
    originalError.originalError,
    newExtensions
  );
}

export function slicedError(originalError: GraphQLError) {
  return relocatedError(originalError, originalError.path != null ? originalError.path.slice(1) : undefined);
}
