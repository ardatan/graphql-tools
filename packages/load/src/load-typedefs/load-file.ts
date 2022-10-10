import { Source, AggregateError } from '@graphql-tools/utils';
import { env } from 'process';
import { LoadTypedefsOptions } from '../load-typedefs.js';

export async function loadFile(pointer: string, options: LoadTypedefsOptions): Promise<Source[]> {
  if (env['DEBUG'] != null) {
    console.time(`@graphql-tools/load: loadFile ${pointer}`);
  }
  let results = options.cache?.[pointer];

  if (!results) {
    results = [];
    const errors: Error[] = [];
    await Promise.all(
      options.loaders.map(async loader => {
        try {
          const loaderResults = await loader.load(pointer, options);
          loaderResults?.forEach(result => results!.push(result));
        } catch (error: any) {
          if (env['DEBUG']) {
            console.error(error);
          }
          if (error instanceof AggregateError) {
            for (const errorElement of error.errors) {
              errors.push(errorElement);
            }
          } else {
            errors.push(error);
          }
        }
      })
    );

    if (results.length === 0 && errors.length > 0) {
      if (errors.length === 1) {
        throw errors[0];
      }
      throw new AggregateError(
        errors,
        `Failed to find any GraphQL type definitions in: ${pointer};\n - ${errors
          .map(error => error.message)
          .join('\n  - ')}`
      );
    }
    if (options.cache) {
      options.cache[pointer] = results;
    }
  }

  if (env['DEBUG'] != null) {
    console.timeEnd(`@graphql-tools/load: loadFile ${pointer}`);
  }

  return results;
}

export function loadFileSync(pointer: string, options: LoadTypedefsOptions): Source[] {
  if (env['DEBUG'] != null) {
    console.time(`@graphql-tools/load: loadFileSync ${pointer}`);
  }
  let results = options.cache?.[pointer];

  if (!results) {
    results = [];
    const errors: Error[] = [];
    for (const loader of options.loaders) {
      try {
        // We check for the existence so it is okay to force non null
        const loaderResults = loader.loadSync!(pointer, options);
        loaderResults?.forEach(result => results!.push(result));
      } catch (error: any) {
        if (env['DEBUG']) {
          console.error(error);
        }
        if (error instanceof AggregateError) {
          for (const errorElement of error.errors) {
            errors.push(errorElement);
          }
        } else {
          errors.push(error);
        }
      }
    }

    if (results.length === 0 && errors.length > 0) {
      if (errors.length === 1) {
        throw errors[0];
      }
      throw new AggregateError(
        errors,
        `Failed to find any GraphQL type definitions in: ${pointer};\n - ${errors
          .map(error => error.message)
          .join('\n  - ')}`
      );
    }

    if (options.cache) {
      options.cache[pointer] = results;
    }
  }

  if (env['DEBUG'] != null) {
    console.timeEnd(`@graphql-tools/load: loadFileSync ${pointer}`);
  }

  return results;
}
