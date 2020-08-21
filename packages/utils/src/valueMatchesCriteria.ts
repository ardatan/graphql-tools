export function valueMatchesCriteria(value: any, criteria: any): boolean {
  if (value == null) {
    return value === criteria;
  } else if (Array.isArray(value)) {
    return Array.isArray(criteria) && value.every((val, index) => valueMatchesCriteria(val, criteria[index]));
  } else if (typeof value === 'object') {
    return (
      typeof criteria === 'object' &&
      criteria &&
      Object.keys(criteria).every(propertyName => valueMatchesCriteria(value[propertyName], criteria[propertyName]))
    );
  }

  return value === criteria;
}
