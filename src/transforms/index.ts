import { Transform } from './transforms';
export { Transform };

export { default as transformSchema } from './transformSchema';

import AddArgumentsAsVariables from './AddArgumentsAsVariables';
import CheckResultAndHandleErrors from './CheckResultAndHandleErrors';
import ReplaceFieldWithFragment from './ReplaceFieldWithFragment';
import AddTypenameToAbstract from './AddTypenameToAbstract';
import FilterToSchema from './FilterToSchema';
import RenameTypes from './RenameTypes';
import FilterTypes from './FilterTypes';
import TransformRootFields from './TransformRootFields';
import RenameRootFields from './RenameRootFields';
import FilterRootFields from './FilterRootFields';
import ExpandAbstractTypes from './ExpandAbstractTypes';

export const Transforms: {
  [name: string]: { new (...args: Array<any>): Transform };
} = {
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
