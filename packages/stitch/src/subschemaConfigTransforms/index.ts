import { SubschemaConfigTransform } from '../types.js';
import { computedDirectiveTransformer } from './computedDirectiveTransformer.js';

export { computedDirectiveTransformer } from './computedDirectiveTransformer.js';
export { isolateComputedFieldsTransformer } from './isolateComputedFieldsTransformer.js';
export { splitMergedTypeEntryPointsTransformer } from './splitMergedTypeEntryPointsTransformer.js';

export const defaultSubschemaConfigTransforms: Array<SubschemaConfigTransform<any>> = [
  computedDirectiveTransformer('computed'),
];
