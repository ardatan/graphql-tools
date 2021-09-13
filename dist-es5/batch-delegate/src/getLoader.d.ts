import DataLoader from 'dataloader';
import { BatchDelegateOptions } from './types';
export declare function getLoader<K = any, V = any, C = K>(options: BatchDelegateOptions<any>): DataLoader<K, V, C>;
