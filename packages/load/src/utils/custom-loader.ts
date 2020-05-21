import importFrom from 'import-from';

export function getCustomLoaderByPath(path: string, cwd: string) {
  try {
    const requiredModule: any = importFrom(cwd, path);

    if (requiredModule) {
      if (requiredModule.default && typeof requiredModule.default === 'function') {
        return requiredModule.default;
      }

      if (typeof requiredModule === 'function') {
        return requiredModule;
      }
    }
  } catch (e) {}

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
