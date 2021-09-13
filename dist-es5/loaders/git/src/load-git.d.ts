declare type PartialInput = {
  ref: string;
};
declare type Input = PartialInput & {
  path: string;
};
/**
 * @internal
 */
export declare function readTreeAtRef(ref: string): Promise<string[] | never>;
/**
 * @internal
 */
export declare function readTreeAtRefSync(ref: string): string[] | never;
/**
 * @internal
 */
export declare function loadFromGit(input: Input): Promise<string | never>;
/**
 * @internal
 */
export declare function loadFromGitSync(input: Input): string | never;
export {};
