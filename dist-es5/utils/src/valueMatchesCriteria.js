export function valueMatchesCriteria(value, criteria) {
    if (value == null) {
        return value === criteria;
    }
    else if (Array.isArray(value)) {
        return Array.isArray(criteria) && value.every(function (val, index) { return valueMatchesCriteria(val, criteria[index]); });
    }
    else if (typeof value === 'object') {
        return (typeof criteria === 'object' &&
            criteria &&
            Object.keys(criteria).every(function (propertyName) { return valueMatchesCriteria(value[propertyName], criteria[propertyName]); }));
    }
    else if (criteria instanceof RegExp) {
        return criteria.test(value);
    }
    return value === criteria;
}
