import { Source } from '@graphql-tools/utils';
import { env } from 'process';
import { LoadTypedefsOptions } from '../load-typedefs';

export async function loadFile(pointer: string, options: LoadTypedefsOptions): Promise<Source[]> {
  let results = options.cache?.[pointer];

  if (!results) {
    results = [];
    await Promise.all(
      options.loaders.map(async loader => {
        try {
          const loaderResults = await loader.load(pointer, options);
          loaderResults?.forEach(result => results!.push(result));
        } catch (error) {
          if (env['DEBUG']) {
            console.error(`Failed to find any GraphQL type definitions in: ${pointer} - ${error.message}`);
          }
          throw error;
        }
      })
    );
    if (options.cache) {
      options.cache[pointer] = results;
    }
  }

  return results;
}

export function loadFileSync(pointer: string, options: LoadTypedefsOptions): Source[] {
  let results = options.cache?.[pointer];

  if (!results) {
    results = [];
    for (const loader of options.loaders) {
      try {
        // We check for the existence so it is okay to force non null
        const loaderResults = loader.loadSync!(pointer, options);
        loaderResults?.forEach(result => results!.push(result));
      } catch (error) {
        if (env['DEBUG']) {
          console.error(`Failed to find any GraphQL type definitions in: ${pointer} - ${error.message}`);
        }
        throw error;
      }
    }

    if (options.cache) {
      options.cache[pointer] = results;
    }
  }

  return results;
}
