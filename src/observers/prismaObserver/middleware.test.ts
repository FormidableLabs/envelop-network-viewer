import { Middleware, middlewareFactory, QueryMiddlewareParams } from './middleware';
import EventEmitter from 'events';
import { EVENT_PRISMA_QUERY } from './index';
import { DMMF } from '@prisma/client/runtime';

describe('prismaObserver/middleware', () => {
  it('emits a prisma query event', () => {
    const emitter = new EventEmitter();
    emitter.emit = jest.fn();
    const middleware = middlewareFactory(emitter);
    const params: QueryMiddlewareParams = {
      action: DMMF.ModelAction.create,
      args: { name: 'john doe' },
      dataPath: [],
      model: 'Author',
      runInTransaction: false,
    };
    const next = (_params: QueryMiddlewareParams) => Promise.resolve();
    middleware(params, next);
    expect(emitter.emit).toHaveBeenCalledTimes(1);
    expect(emitter.emit).toHaveBeenCalledWith(
      EVENT_PRISMA_QUERY,
      expect.objectContaining({
        ...params,
        duration_ms: 0,
      }),
    );
  });
});
