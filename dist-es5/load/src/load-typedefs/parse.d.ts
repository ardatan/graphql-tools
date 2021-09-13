import { Source } from '@graphql-tools/utils';
declare type AddValidSource = (source: Source) => void;
declare type ParseOptions = {
  partialSource: Source;
  options: any;
  pointerOptionMap: any;
  addValidSource: AddValidSource;
};
export declare function parseSource({ partialSource, options, pointerOptionMap, addValidSource }: ParseOptions): void;
export {};
