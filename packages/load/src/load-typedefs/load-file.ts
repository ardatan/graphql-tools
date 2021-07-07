import { Source } from '@graphql-tools/utils';
import { env } from 'process';
import { LoadTypedefsOptions } from '../load-typedefs';

export async function loadFile(pointer: string, options: LoadTypedefsOptions): Promise<Source[]> {
  const cached = useCache({ pointer, options });

  if (cached) {
    return cached;
  }

  const result: Source[] = [];

  await Promise.all(
    options.loaders.map(async loader => {
      try {
        const canLoad = await loader.canLoad(pointer, options);

        if (canLoad) {
          const loadedValue = await loader.load(pointer, options);
          if (loadedValue) {
            result.push(...loadedValue);
          }
        }
      } catch (error) {
        if (env['DEBUG']) {
          console.error(`Failed to find any GraphQL type definitions in: ${pointer} - ${error.message}`);
        }
        throw error;
      }
    })
  );

  return result;
}

export function loadFileSync(pointer: string, options: LoadTypedefsOptions): Source[] {
  const cached = useCache({ pointer, options });

  if (cached) {
    return cached;
  }

  const result: Source[] = [];

  for (const loader of options.loaders) {
    try {
      const canLoad = loader.canLoadSync && loader.loadSync && loader.canLoadSync(pointer, options);

      if (canLoad) {
        // We check for the existence so it is okay to force non null
        const loadedValue = loader.loadSync!(pointer, options);
        if (loadedValue) {
          result.push(...loadedValue);
        }
      }
    } catch (error) {
      if (env['DEBUG']) {
        console.error(`Failed to find any GraphQL type definitions in: ${pointer} - ${error.message}`);
      }
      throw error;
    }
  }

  return result;
}

function useCache<T extends any>({ pointer, options }: { pointer: string; options: T }) {
  if (options['cache']) {
    return options['cache'][pointer];
  }
}
