import {
  GraphQLFieldConfig,
  GraphQLInputFieldConfig,
  GraphQLArgumentConfig,
  GraphQLEnumType,
  isEnumType,
  isNonNullType,
  getNamedType,
  isListType,
} from 'graphql';

import {
  MergeTypeCandidate,
  MergeFieldConfigCandidate,
  MergeInputFieldConfigCandidate,
  TypeMergingOptions,
  ValidationLevel,
} from './types';

export function validateFieldConsistency(
  finalFieldConfig: GraphQLFieldConfig<any, any>,
  candidates: Array<MergeFieldConfigCandidate>,
  typeMergingOptions: TypeMergingOptions
): void {
  const fieldNamespace = `${candidates[0].type.name}.${candidates[0].fieldName}`;

  validateTypeConsistency(
    finalFieldConfig,
    candidates.map(c => c.fieldConfig),
    'field',
    'fieldTypeConsistency',
    fieldNamespace,
    typeMergingOptions
  );

  if (isNonNullType(finalFieldConfig.type) && candidates.some(c => !isNonNullType(c.fieldConfig.type))) {
    validationMessage(
      `Canonical field definition of "${fieldNamespace}" is not-null while some subschemas permit null. This allows for field errors.`,
      'fieldNullConsistency',
      fieldNamespace,
      typeMergingOptions
    );
  }

  const argCandidatesMap: Record<string, Array<GraphQLArgumentConfig>> = Object.create(null);
  candidates.forEach(({ fieldConfig }) => {
    Object.entries(fieldConfig.args).forEach(([argName, arg]) => {
      argCandidatesMap[argName] = argCandidatesMap[argName] || [];
      argCandidatesMap[argName].push(arg);
    });
  });

  if (Object.values(argCandidatesMap).some(argCandidates => candidates.length !== argCandidates.length)) {
    validationMessage(
      `Definition of field "${fieldNamespace}" implements inconsistent arguments names across subschemas. This will cause some user input to be ignored.`,
      'fieldArgNameConsistency',
      fieldNamespace,
      typeMergingOptions
    );
  }

  Object.entries(argCandidatesMap).forEach(([argName, argCandidates]) => {
    const argNamespace = `${fieldNamespace}(${argName})`;
    const finalArgConfig = finalFieldConfig.args[argName] || argCandidates[argCandidates.length - 1];
    const finalArgType = getNamedType(finalArgConfig.type);

    validateTypeConsistency(
      finalArgConfig,
      argCandidates,
      'argument',
      'fieldArgTypeConsistency',
      argNamespace,
      typeMergingOptions
    );

    if (!isNonNullType(finalArgConfig.type) && argCandidates.some(c => isNonNullType(c.type))) {
      validationMessage(
        `Canonical argument definition of "${argNamespace}" permits null while some subschemas require not-null. This allows for input errors.`,
        'fieldArgNullConsistency',
        argNamespace,
        typeMergingOptions
      );
    }

    if (isEnumType(finalArgType)) {
      validateInputEnumConsistency(finalArgType, argCandidates, typeMergingOptions);
    }
  });
}

export function validateInputObjectConsistency(
  fieldInclusionMap: Record<string, number>,
  candidates: Array<MergeTypeCandidate>,
  typeMergingOptions: TypeMergingOptions
): void {
  Object.entries(fieldInclusionMap).forEach(([fieldName, count]) => {
    if (candidates.length !== count) {
      const namespace = `${candidates[0].type.name}.${fieldName}`;
      validationMessage(
        `Definition of input field "${namespace}" is not implemented by all subschemas. This will cause some user input to be ignored.`,
        'inputFieldNameConsistency',
        namespace,
        typeMergingOptions
      );
    }
  });
}

export function validateInputFieldConsistency(
  finalInputFieldConfig: GraphQLInputFieldConfig,
  candidates: Array<MergeInputFieldConfigCandidate>,
  typeMergingOptions: TypeMergingOptions
): void {
  const inputFieldNamespace = `${candidates[0].type.name}.${candidates[0].fieldName}`;
  const inputFieldConfigs = candidates.map(c => c.inputFieldConfig);

  validateTypeConsistency(
    finalInputFieldConfig,
    inputFieldConfigs,
    'input field',
    'inputFieldTypeConsistency',
    inputFieldNamespace,
    typeMergingOptions
  );

  if (!isNonNullType(finalInputFieldConfig.type) && candidates.some(c => isNonNullType(c.inputFieldConfig.type))) {
    validationMessage(
      `Canonical input field definition of "${inputFieldNamespace}" permits null while some subschemas require not-null. This allows for input errors.`,
      'inputFieldNullConsistency',
      inputFieldNamespace,
      typeMergingOptions
    );
  }

  const finalInputFieldType = getNamedType(finalInputFieldConfig.type);
  if (isEnumType(finalInputFieldType)) {
    validateInputEnumConsistency(finalInputFieldType, inputFieldConfigs, typeMergingOptions);
  }
}

export function validateTypeConsistency(
  finalElementConfig: GraphQLFieldConfig<any, any> | GraphQLArgumentConfig | GraphQLInputFieldConfig,
  candidates: Array<GraphQLFieldConfig<any, any> | GraphQLArgumentConfig | GraphQLInputFieldConfig>,
  definitionType: string,
  settingName: string,
  settingNamespace: string,
  typeMergingOptions: TypeMergingOptions
): void {
  const finalType = getNamedType(finalElementConfig.type);
  const finalIsListType = isListType(finalElementConfig.type);
  const typeConflict = candidates.find(c => {
    if (finalIsListType !== isListType(c.type)) {
      throw new Error(
        `Definitions of ${definitionType} "${settingNamespace}" implement inconsistent list types across subschemas and cannot be merged.`
      );
    }
    return finalType.toString() !== getNamedType(c.type).toString();
  });

  if (typeConflict) {
    validationMessage(
      `Definitions of ${definitionType} "${settingNamespace}" implement inconsistent named types across subschemas. This may cause incompatibilities between the gateway proxy and subservices.`,
      settingName,
      settingNamespace,
      typeMergingOptions
    );
  }
}

export function validateInputEnumConsistency(
  inputEnumType: GraphQLEnumType,
  candidates: Array<GraphQLArgumentConfig | GraphQLInputFieldConfig>,
  typeMergingOptions: TypeMergingOptions
): void {
  const enumValueInclusionMap: Record<string, number> = Object.create(null);

  candidates.forEach(candidate => {
    const enumType = getNamedType(candidate.type) as GraphQLEnumType;
    if (isEnumType(enumType)) {
      enumType.getValues().forEach(({ value }) => {
        enumValueInclusionMap[value] = enumValueInclusionMap[value] || 0;
        enumValueInclusionMap[value] += 1;
      });
    }
  });

  if (Object.values(enumValueInclusionMap).some(count => candidates.length !== count)) {
    validationMessage(
      `Enum "${inputEnumType.name}" is used as an input with inconsistent values across subschemas. This allows for input errors.`,
      'inputEnumValueConsistency',
      inputEnumType.name,
      typeMergingOptions
    );
  }
}

function validationMessage(
  message: string,
  settingName: string,
  settingNamespace: string,
  typeMergingOptions: TypeMergingOptions
): void {
  const setting =
    typeMergingOptions?.elementValidationSettings?.[settingNamespace]?.[settingName] ??
    typeMergingOptions?.validationSettings?.[settingName] ??
    ValidationLevel.Warn;

  switch (setting) {
    case ValidationLevel.Off:
      return;
    case ValidationLevel.Error:
      throw new Error(message);
    default:
      console.warn(
        message,
        `To disable this warning or elevate it to an error, adjust "validationSettings.${settingName}" or "elementValidationSettings['${settingNamespace}'].${settingName}" in typeMergingOptions.`
      );
  }
}
