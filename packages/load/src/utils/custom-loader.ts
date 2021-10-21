import { createRequire } from 'module';
import { isAbsolute, join, join as joinPaths } from 'path';

export async function getCustomLoaderByPath(pathExpression: string, cwd: string) {
  try {
    const [modulePath, exportName = 'default'] = pathExpression.split('#');
    const absoluteFilePath = isAbsolute(modulePath) ? modulePath : join(cwd, modulePath);
    const requiredModule = await import(absoluteFilePath);

    if (requiredModule) {
      if (requiredModule[exportName] && typeof requiredModule[exportName] === 'function') {
        return requiredModule[exportName];
      }

      if (typeof requiredModule === 'function') {
        return requiredModule;
      }
    }
  } catch (e: any) {}

  return null;
}

export function getCustomLoaderByPathSync(pathExpression: string, cwd: string) {
  try {
    const [modulePath, exportName = 'default'] = pathExpression.split('#');
    const requireFn = createRequire(joinPaths(cwd, 'noop.js'));
    const requiredModule = requireFn(modulePath);

    if (requiredModule) {
      if (requiredModule[exportName] && typeof requiredModule[exportName] === 'function') {
        return requiredModule[exportName];
      }

      if (typeof requiredModule === 'function') {
        return requiredModule;
      }
    }
  } catch (e: any) {}

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
