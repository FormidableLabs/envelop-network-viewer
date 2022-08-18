import { EVENT_LOG_QUERY, TypeORMObserverLogger } from './logger';
import { Logger } from 'typeorm';
import EventEmitter from 'events';

describe('typeormObserver/logger', () => {
  describe('passthru', () => {
    type testCase = [method: keyof Logger, args: unknown[]];
    const testCases: Array<testCase> = [
      ['log', ['all', 'my message', undefined]],
      ['logMigration', ['migration message', undefined]],
      ['logQuery', ['select * from authors', [], undefined]],
      ['logQueryError', [new Error('bad query'), 'select all from table authors', [], undefined]],
      ['logQuerySlow', [2000, 'select * from authors', [], undefined]],
      ['logSchemaBuild', ['built schema', undefined]],
    ];
    testCases.forEach((testCase) => {
      const [method, args] = testCase;
      it(`constructed with logger: ${method} passed thru`, () => {
        const passThru: Logger = {
          log: jest.fn(),
          logMigration: jest.fn(),
          logQuery: jest.fn(),
          logQueryError: jest.fn(),
          logQuerySlow: jest.fn(),
          logSchemaBuild: jest.fn(),
        };
        const logger = new TypeORMObserverLogger(passThru);
        // @ts-ignore
        logger[method](...args);
        expect(passThru[method]).toHaveBeenCalledWith(...args);
      });
      it(`constructed without logger: ${method} not passed thru`, () => {
        const logger = new TypeORMObserverLogger();
        // @ts-ignore
        logger[method](...args); // if it doesn't blow up, we're good
      });
    });
  });

  it('logQuery emits', () => {
    const emitter = new EventEmitter();
    emitter.emit = jest.fn();
    const query = 'select * from authors where id = ?';
    const parameters = [1];
    const logger = new TypeORMObserverLogger();
    logger.initialize(emitter);
    logger.logQuery(query, parameters);

    expect(emitter.emit).toHaveBeenCalledWith(EVENT_LOG_QUERY, { query, parameters });
  });
});
