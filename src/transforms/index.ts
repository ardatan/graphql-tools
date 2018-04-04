import AddArgumentsAsVariables from './AddArgumentsAsVariables';
import CheckResultAndHandleErrors from './CheckResultAndHandleErrors';
import ReplaceFieldWithFragment from './ReplaceFieldWithFragment';
import AddTypenameToAbstract from './AddTypenameToAbstract';
import FilterToSchema from './FilterToSchema';
import transformSchema from './transformSchema';
import RenameTypes from './RenameTypes';
import FilterTypes from './FilterTypes';
import TransformRootFields from './TransformRootFields';
import RenameRootFields from './RenameRootFields';
import FilterRootFields from './FilterRootFields';
import ExpandAbstractTypes from './ExpandAbstractTypes';
export * from './transforms';
export * from './visitSchema';
export { transformSchema };
export const Transforms: { [name: string]: any } = {
  AddArgumentsAsVariables,
  CheckResultAndHandleErrors,
  ReplaceFieldWithFragment,
  AddTypenameToAbstract,
  FilterToSchema,
  RenameTypes,
  FilterTypes,
  TransformRootFields,
  RenameRootFields,
  FilterRootFields,
  ExpandAbstractTypes,
};
