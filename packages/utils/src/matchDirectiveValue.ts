export function matchDirectiveValue(dirValue: any, criteria: Record<string, any>) {
  if (Array.isArray(dirValue)) {
    return dirValue.some(val => matchesValue(val, criteria));
  } else if (dirValue) {
    return matchesValue(dirValue, criteria);
  }
  return false;
}

function matchesValue(dirValue: any, criteria: Record<string, any>) {
  return Object.keys(criteria).every(key => criteria[key] === dirValue[key]);
}
