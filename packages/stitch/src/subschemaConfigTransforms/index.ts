import { computedDirectiveTransformer } from './computedDirectiveTransformer';

export { computedDirectiveTransformer } from './computedDirectiveTransformer';
export { isolateComputedFieldsTransformer } from './isolateComputedFieldsTransformer';
export { splitMergedTypeAccessTransformer } from './splitMergedTypeAccessTransformer';

export const defaultSubschemaConfigTransforms = [computedDirectiveTransformer('computed')];
