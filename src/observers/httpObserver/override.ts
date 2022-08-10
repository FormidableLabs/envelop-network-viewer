import http from 'http';
import https, { RequestOptions } from 'https';
import EventEmitter from 'events';
import { URL } from 'node:url';
import { requestOptions } from './requestOptions';

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
        host: options.host,
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
