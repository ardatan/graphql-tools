import { getLoader } from './getLoader';
export function batchDelegateToSchema(options) {
    var key = options.key;
    if (key == null) {
        return null;
    }
    else if (Array.isArray(key) && !key.length) {
        return [];
    }
    var loader = getLoader(options);
    return Array.isArray(key) ? loader.loadMany(key) : loader.load(key);
}
