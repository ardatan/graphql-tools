const CacheHeaderRegex = /^max-age=([0-9]+), public$/;

const calculateCacheHeader = (cacheControl = []) => {
  const maxAge = cacheControl
    .map(h => CacheHeaderRegex.exec(h))
    .map(matches => matches || [])
    .map(matches => matches[1] || 0)
    .reduce((acc, val) => {
      const valNum = typeof val === 'string' ? parseInt(val, 10) : val;
      return Math.min(acc, valNum);
    }, +Infinity);

  return maxAge ? `max-age=${maxAge}, public` : 'no-cache';
};

export const CacheControlHeaderPlugin = {
  requestDidStart() {
    return {
      willSendResponse({ response, context }) {
        if (context.cacheControl) {
          // console.log(context.cacheControl);
          const cacheHeader = calculateCacheHeader(context.cacheControl);
          response.http.headers.set('Cache-Control', cacheHeader);
        }
      },
    };
  },
};
