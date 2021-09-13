import { PropertyTree } from './types';
export declare function addProperty(object: Record<string, any>, path: Array<string | number>, value: any): void;
export declare function getProperty(object: Record<string, any>, path: Array<string>): any;
export declare function getProperties(object: Record<string, any>, propertyTree: PropertyTree): any;
export declare function propertyTreeFromPaths(paths: Array<Array<string>>): PropertyTree;
