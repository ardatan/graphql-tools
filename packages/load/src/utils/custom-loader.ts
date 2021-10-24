import { joinPaths, isAbsolutePath } from '@graphql-tools/utils';

export async function getCustomLoaderByPath(pathExpression: string, cwd: string) {
  try {
    const [modulePath, exportName = 'default'] = pathExpression.split('#');
    const absoluteFilePath = isAbsolutePath(modulePath) ? modulePath : joinPaths(cwd, modulePath);
    const requiredModule = await import(absoluteFilePath);

    if (requiredModule) {
      if (requiredModule[exportName] && typeof requiredModule[exportName] === 'function') {
        return requiredModule[exportName];
      }

      if (typeof requiredModule === 'function') {
        return requiredModule;
      }
    }
  } catch (e: any) {
    console.log(e);
  }

  return null;
}

export function getCustomLoaderByPathSync(pathExpression: string, cwd: string) {
  try {
    const [modulePath, exportName = 'default'] = pathExpression.split('#');
    const absoluteFilePath = isAbsolutePath(modulePath) ? modulePath : joinPaths(cwd, modulePath);
    const requiredModule = require(absoluteFilePath);

    if (requiredModule) {
      if (requiredModule[exportName] && typeof requiredModule[exportName] === 'function') {
        return requiredModule[exportName];
      }

      if (typeof requiredModule === 'function') {
        return requiredModule;
      }
    }
  } catch (e: any) {
    console.log(e);
  }

  return null;
}

export async function useCustomLoader(loaderPointer: any, cwd: string) {
  let loader;

  if (typeof loaderPointer === 'string') {
    loader = await getCustomLoaderByPath(loaderPointer, cwd);
  } else if (typeof loaderPointer === 'function') {
    loader = loaderPointer;
  }

  if (typeof loader !== 'function') {
    throw new Error(`Failed to load custom loader: ${loaderPointer}`);
  }

  return loader;
}

export function useCustomLoaderSync(loaderPointer: any, cwd: string) {
  let loader;

  if (typeof loaderPointer === 'string') {
    loader = getCustomLoaderByPath(loaderPointer, cwd);
  } else if (typeof loaderPointer === 'function') {
    loader = loaderPointer;
  }

  if (typeof loader !== 'function') {
    throw new Error(`Failed to load custom loader: ${loaderPointer}`);
  }

  return loader;
}
