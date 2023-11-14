import { print } from 'graphql';
import { memoize1 } from '@graphql-tools/utils';

export const defaultCachedPrint = memoize1(print);
