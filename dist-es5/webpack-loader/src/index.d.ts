import type { LoaderContext } from 'webpack';
interface Options {
  noDescription?: boolean;
  noEmptyNodes?: boolean;
  noLoc?: boolean;
  replaceKinds?: boolean;
  esModule?: boolean;
  importHelpers?: boolean;
}
export default function graphqlLoader(this: LoaderContext<Options>, source: string): string;
export {};
