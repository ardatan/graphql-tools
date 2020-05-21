import { Source, debugLog } from '@graphql-tools/utils';
import { LoadTypedefsOptions } from '../load-typedefs';

export async function loadFile(pointer: string, options: LoadTypedefsOptions): Promise<Source> {
  const cached = useCache({ pointer, options });

  if (cached) {
    return cached;
  }

  for await (const loader of options.loaders) {
    try {
      const canLoad = await loader.canLoad(pointer, options);

      if (canLoad) {
        return await loader.load(pointer, options);
      }
    } catch (error) {
      debugLog(`Failed to find any GraphQL type definitions in: ${pointer} - ${error.message}`);
      throw error;
    }
  }

  return undefined;
}

export function loadFileSync(pointer: string, options: LoadTypedefsOptions): Source {
  const cached = useCache({ pointer, options });

  if (cached) {
    return cached;
  }

  for (const loader of options.loaders) {
    try {
      const canLoad = loader.canLoadSync && loader.loadSync && loader.canLoadSync(pointer, options);

      if (canLoad) {
        return loader.loadSync(pointer, options);
      }
    } catch (error) {
      debugLog(`Failed to find any GraphQL type definitions in: ${pointer} - ${error.message}`);
      throw error;
    }
  }

  return undefined;
}

function useCache<T extends any>({ pointer, options }: { pointer: string; options: T }) {
  if (options['cache']) {
    return options['cache'][pointer];
  }
}
