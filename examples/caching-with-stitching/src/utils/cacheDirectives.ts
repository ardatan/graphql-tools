export const CacheDirectives = `
    directive @cacheControl(
        maxAge: Int,
        scope: CacheControlScope
    ) on OBJECT | FIELD_DEFINITION

    enum CacheControlScope {
        PUBLIC
        PRIVATE
    }
`;
