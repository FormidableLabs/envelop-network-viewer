process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

import http from 'http';
import https from 'https';
import {
  override,
  EVENT_REQUEST,
  RequestArgs,
  RequestEventArgs,
  ResponseEventArgs,
  EVENT_RESPONSE,
} from './override';
import EventEmitter from 'events';
import { Stubby } from 'stubby';

type TestCases = Array<
  [
    string,
    typeof http | typeof https,
    Partial<RequestArgs>,
    Partial<RequestEventArgs>,
    Partial<ResponseEventArgs>,
  ]
>;

describe('httpObserver/override', () => {
  const emitter = new EventEmitter();

  const tests: TestCases = [
    [
      'http.request(url)',
      http,
      ['http://127.0.0.1:8882/'],
      { method: 'GET', port: '8882', host: '127.0.0.1' },
      { statusCode: 200 },
    ],
    // Can't test url only because we have to provide rejectUnauthorized: false for self sign cert of stub
    // [
    //   'https.request(url)',
    //   https,
    //   ['https://localhost:7443/', { rejectUnauthorized: false }],
    //   { method: 'GET', port: '7443', host: 'localhost' },
    // ],
    [
      'http.request(options)',
      http,
      [{ method: 'GET', host: '127.0.0.1', protocol: 'http:', port: '8882', path: '/' }],
      { method: 'GET', port: '8882', host: '127.0.0.1', path: '/' },
      { statusCode: 200 },
    ],
    [
      'https.request(options)',
      https,
      [
        {
          method: 'GET',
          host: '127.0.0.1',
          protocol: 'https:',
          port: '7443',
          path: '/',
          rejectUnauthorized: false,
        },
      ],
      { method: 'GET', port: '7443', host: '127.0.0.1' },
      { statusCode: 200 },
    ],
    [
      'http.request(url, options)',
      http,
      ['http://127.0.0.1:8882/', { method: 'OPTIONS' }],
      { method: 'OPTIONS', port: '8882', host: '127.0.0.1' },
      { statusCode: 200 },
    ],
    [
      'https.request(url, options)',
      https,
      ['https://127.0.0.1:7443/', { method: 'OPTIONS', rejectUnauthorized: false }],
      { method: 'OPTIONS', port: '7443', host: '127.0.0.1' },
      { statusCode: 200 },
    ],
    [
      'http.request(url, options) => 500 response',
      http,
      ['http://127.0.0.1:8882/error', { method: 'OPTIONS' }],
      { method: 'OPTIONS', port: '8882', host: '127.0.0.1' },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      { statusCode: 500 },
    ],
    [
      'https.request(url, options) => 500 response',
      https,
      ['https://127.0.0.1:7443/error', { method: 'OPTIONS', rejectUnauthorized: false }],
      { method: 'OPTIONS', port: '7443', host: '127.0.0.1' },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      { statusCode: 500 },
    ],
  ];

  const stubby = new Stubby();

  beforeAll((done) => {
    stubby.start(
      {
        tls: 7443,
        data: [
          {
            request: { url: '/$', method: 'GET' },
          },
          {
            request: { url: '/$', method: 'OPTIONS' },
          },
          {
            request: { url: '/error', method: 'GET' },
            response: {
              status: 500,
            },
          },
          {
            request: { url: '/error', method: 'OPTIONS' },
            response: {
              status: 500,
            },
          },
        ],
      },
      (err) => {
        done(err);
      },
    );
  }, 100);
  afterAll((done) => {
    stubby.stop(() => {
      done();
    });
  }, 1000);

  beforeEach(() => {
    jest.resetModules();
    override(http, emitter);
    override(https, emitter);
  });

  tests.forEach((test) => {
    const scenario = test[0];
    const mod = test[1];
    const args = test[2];
    const expectedRequestEventArgs = test[3];
    const expectedResponseEventArgs = test[4];
    describe(`${scenario}`, () => {
      it('emits request and response events', function (done) {
        const requestEventCallback = jest.fn();
        const responseEventCallback = jest.fn();
        emitter.once(EVENT_REQUEST, requestEventCallback);
        emitter.once(EVENT_RESPONSE, responseEventCallback);

        // @ts-ignore
        const req = mod.request(...args);
        req.on('close', () => {
          try {
            expect(requestEventCallback).toHaveBeenCalledWith(
              expect.objectContaining(expectedRequestEventArgs),
            );
            expect(responseEventCallback).toHaveBeenCalledWith(
              expect.objectContaining(expectedResponseEventArgs),
            );
            done();
          } catch (err) {
            done(err);
          }
        });

        req.on('response', (response) => {
          // data must be consumed for end event to fire
          response.on('data', (_chunk) => {
            return _chunk;
          });
        });
        req.end();
      }, 1000);
    });
  });
});
