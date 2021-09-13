export function isRef(maybeRef) {
    return !!(maybeRef && typeof maybeRef === 'object' && '$ref' in maybeRef);
}
export function assertIsRef(maybeRef, message) {
    if (!isRef(maybeRef)) {
        throw new Error(message || "Expected " + maybeRef + " to be a valid Ref.");
    }
}
export function isRecord(obj) {
    return typeof obj === 'object' && obj !== null;
}
