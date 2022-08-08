import http from 'http';
import https, { RequestOptions } from 'https';
import EventEmitter from 'events';
import { URL } from 'node:url';

export const EVENT_REQUEST = 'request';
export const EVENT_RESPONSE = 'response';
export type RequestEventArgs = {
  connectionID: string;
  time: number;
  method: string;
  host: string;
  port: string;
  path?: string;
  headers: Record<string, any>;
};

export type ResponseEventArgs = {
  connectionID: string;
  statusCode: number;
  time: number;
  headers: Record<string, string>;
  httpVersion: string;
  statusMessage: string;
  error?: Error;
};

let uniqID = 0;

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
  } else if (typeof optionsOrCallback !== 'object') {
    // TODO maybe return {} instead
    // @ts-ignore
    // eslint-disable-next-line prefer-rest-params
    throw new Error(
      'invalid request options' + JSON.stringify({ urlOrOpts, optionsOrCallback, callback }),
    );
  }

  const urlOpts = {
    href: url.href,
    origin: url.origin,
    protocol: url.protocol,
    username: url.username,
    password: url.password,
    host: url.host,
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    search: url.search,
    searchParams: url.searchParams,
    hash: url.hash,
  };

  return Object.assign(
    {},
    urlOpts,
    typeof urlOrOpts === 'object' ? urlOrOpts : {},
    typeof optionsOrCallback === 'object' ? optionsOrCallback : {},
  );
}

export type RequestArgs = [
  urlOrOpts: string | URL | RequestOptions,
  optionsOrCallback: RequestOptions | ((res: http.IncomingMessage) => void),
  callback?: (res: http.IncomingMessage) => void,
];

export function override(module: typeof http | typeof https, emitter: EventEmitter) {
  const original = module.request;

  // @ts-ignore
  function wrapper(...args: RequestArgs) {
    const connectionID = `rq:${++uniqID}`;
    // @ts-ignore
    const req = original.apply(this, args);

    req.once('response', (response: http.IncomingMessage) => {
      response.once('end', () => {
        const res = {
          connectionID,
          time: Date.now(),
          httpVersion: response.httpVersion,
          statusCode: response.statusCode,
          headers: response.headers || {},
          statusMessage: response.statusMessage,
        };
        emitter.emit(EVENT_RESPONSE, res);
      });
    });
    req.once('finish', () => {
      const options = requestOptions(...args);
      const log = {
        connectionID,
        time: Date.now(),
        method: options.method || 'GET',
        host: options.hostname || options.host,
        port: options.port,
        path: options.path,
        headers: options.headers || {},
      };
      emitter.emit(EVENT_REQUEST, log);
    });
    return req;
  }

  wrapper.original = original;
  // @ts-ignore
  module.request = wrapper;
}
