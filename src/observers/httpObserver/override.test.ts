import http from 'http';
import https from 'https';
import { override, EVENT } from './override';
import EventEmitter from 'events';
import { Stubby } from 'stubby';

type TestCases = Array<[string, typeof http | typeof https, string]>;

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

describe('httpObserver/override', () => {
  const emitter = new EventEmitter();
  override(http, emitter);
  override(https, emitter);

  const tests: TestCases = [
    ['http', http, 'http://localhost:8882/'],
    ['https', https, 'https://localhost:7443/'],
  ];

  const stubby = new Stubby();

  beforeAll((done) => {
    stubby.start(
      {
        tls: 7443,
        data: [
          {
            request: { url: '/' },
          },
        ],
      },
      (err) => {
        done();
      },
    );
  }, 100);
  afterAll((done) => {
    stubby.stop(() => {
      done();
    });
  }, 1000);

  it('stub', (done) => {
    const req = https.request(
      'https://localhost:7443/',
      {
        rejectUnauthorized: false,
      },
      (res) => {},
    );
    req.end(() => {
      done();
    });
    req.on('error', (err) => {
      console.error(err);
      done(err);
    });
  }, 30000);

  tests.forEach((test) => {
    const scenario = test[0];
    const mod = test[1];
    const url = test[2];
    describe(`${scenario}`, () => {
      it('emits on request', function (done) {
        const cb = jest.fn();
        emitter.once(EVENT, cb);
        const req = mod.request(
          url,
          {
            rejectUnauthorized: false,
          },
          (res) => {},
        );
        req.end(() => {
          expect(cb).toHaveBeenCalled();
          done();
        });
        req.on('error', (err) => {
          done(err);
        });
      }, 1000);
      it.todo('emits on response error');
      it.todo('emits on response end');
    });
  });
});
