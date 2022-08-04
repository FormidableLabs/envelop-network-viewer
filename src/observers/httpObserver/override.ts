import http from 'http';
import https, { RequestOptions } from 'https';
import EventEmitter from 'events';

export const EVENT = 'watched';
let uniqID = 0;

export function override(module: typeof http | typeof https, emitter: EventEmitter) {
  const original = module.request;

  // @ts-ignore
  function wrapper(...args) {
    const connectionID = `rq:${++uniqID}`;
    // @ts-ignore
    const req = original.apply(this, args);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalEmit = req.emit;

    // @ts-ignore
    req.emit = function emit(eventName: string | symbol, response: http.IncomingMessage, ...rest) {
      switch (eventName) {
        case 'response': {
          response.once('error', (e) => {
            const res = {
              connectionID,
              statusCode: response.statusCode,
              time: Date.now(),
              headers: response.headers || {},
              httpVersion: response.httpVersion,
              statusMessage: response.statusMessage,
              error: e,
            };
            emitter.emit(EVENT, res);
          });
          response.once('end', () => {
            const res = {
              connectionID,
              time: Date.now(),
              httpVersion: response.httpVersion,
              statusCode: response.statusCode,
              headers: response.headers || {},
              statusMessage: response.statusMessage,
            };
            emitter.emit(EVENT, res);
          });
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return originalEmit.apply(this, [eventName, response, ...rest]);
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    logger(args[0], connectionID, req);
    return req;
  }

  function logger(options: RequestOptions, connectionID: string, req: http.ClientRequest) {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const origEnd = req.end;
    // @ts-ignore
    req.end = function end(...args) {
      const log = {
        connectionID,
        time: Date.now(),
        method: options.method || 'GET',
        isRequest: true,
        host: options.host || options.hostname || 'localhost',
        port: options.port || '443',
        path: options.path || '/',
        headers: options.headers || {},
      };
      emitter.emit(EVENT, log);
      // @ts-ignore
      return origEnd.apply(this, args);
    };
  }

  module.request = wrapper;
}
