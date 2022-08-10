import { URL } from 'node:url';
import { RequestOptions } from 'https';
import http from 'http';

/**
 * url can be a string or a URL object. If url is a string, it is automatically parsed with new URL(). If it is a URL object, it will be automatically converted to an ordinary options object.
 *
 * If both url and options are specified, the objects are merged, with the options properties taking precedence.
 */
export function requestOptions(
  urlOrOpts: string | URL | RequestOptions,
  optionsOrCallback: RequestOptions | ((res: http.IncomingMessage) => void),
  callback?: (res: http.IncomingMessage) => void,
) {
  let url: Partial<URL> = {};
  if (typeof urlOrOpts === 'string') {
    url = new URL(urlOrOpts);
  } else if (urlOrOpts instanceof URL) {
    url = urlOrOpts;
  } else if (typeof urlOrOpts === 'object') {
    // handled later
  } else {
    throw new Error(
      'First parameter should be the url, or options object. Got ' + typeof urlOrOpts,
    );
  }

  if (
    typeof optionsOrCallback !== 'undefined' &&
    typeof optionsOrCallback !== 'object' &&
    typeof optionsOrCallback !== 'function'
  ) {
    throw new Error(
      'Second parameter should be an options object or callback or undefined. Got ' +
        typeof optionsOrCallback,
    );
  }

  if (typeof callback !== 'function' && typeof callback !== 'undefined') {
    throw new Error('Third parameter should be a callback or undefined. Got ' + typeof callback);
  }

  const urlOpts = {
    protocol: url.protocol,
    host: url.hostname,
    port: url.port,
    path: url.pathname
      ? url.pathname +
        (url.searchParams?.toString() === '' ? '' : `?${url.searchParams?.toString()}`)
      : undefined,
  };

  return Object.assign(
    {},
    urlOpts,
    typeof urlOrOpts === 'object' ? urlOrOpts : {},
    typeof optionsOrCallback === 'object' ? optionsOrCallback : {},
  );
}
