import AddArgumentsAsVariables from './AddArgumentsAsVariables';
import CheckResultAndHandleErrors from './CheckResultAndHandleErrors';
import ReplaceFieldWithFragment from './ReplaceFieldWithFragment';
import AddTypenameToAbstract from './AddTypenameToAbstract';
import FilterToSchema from './FilterToSchema';
import makeSimpleTransformSchema from './makeSimpleTransformSchema';
import RenameTypes from './RenameTypes';
import FilterTypes from './FilterTypes';
export * from './transforms';
export * from './visitSchema';
export { makeSimpleTransformSchema };
export const Transforms: { [name: string]: any } = {
  AddArgumentsAsVariables,
  CheckResultAndHandleErrors,
  ReplaceFieldWithFragment,
  AddTypenameToAbstract,
  FilterToSchema,
  RenameTypes,
  FilterTypes,
};
