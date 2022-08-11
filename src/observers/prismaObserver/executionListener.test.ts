import { DMMF } from '@prisma/client/runtime';
import { ExecutionListener, QueryEventArgs } from './executionListener';
import { v4 } from 'uuid';
import { ContextTest, createNamespace } from '../../fauxClsHooked';
import EventEmitter from 'events';
import { EVENT_PRISMA_QUERY } from './index';

function stubQueryEventArgs(
  action: DMMF.ModelAction,
  args: Record<string, unknown>,
): QueryEventArgs {
  return {
    action,
    args,
    dataPath: [],
    duration_ms: 0,
    model: 'Author',
    runInTransaction: false,
  };
}

describe('prismaObserver/executionListener', () => {
  it('only collects events if event originated from target context', () => {
    const targetId = v4();
    const otherId = v4();
    const namespace = createNamespace('faux');
    const contextTest = new ContextTest(targetId, namespace);
    const emitter = new EventEmitter();
    const listener = new ExecutionListener(contextTest);
    listener.bind(emitter);

    const queryA = stubQueryEventArgs(DMMF.ModelAction.create, {
      firstName: 'Jane',
      lastName: 'Austen',
    });
    const queryB = stubQueryEventArgs(DMMF.ModelAction.findFirst, {
      where: { lastName: 'Austen' },
    });
    const queryC = stubQueryEventArgs(DMMF.ModelAction.findMany, { where: { firstName: 'Jane' } });

    namespace.set('id', otherId);
    emitter.emit(EVENT_PRISMA_QUERY, queryA);
    namespace.set('id', targetId);
    emitter.emit(EVENT_PRISMA_QUERY, queryB);
    namespace.set('id', otherId);
    emitter.emit(EVENT_PRISMA_QUERY, queryC);

    const collectedData = listener._getData();
    expect(collectedData).toHaveLength(1);
    expect(collectedData).toEqual(expect.arrayContaining([queryB]));
  });
  it('reports collected events', () => {
    const targetId = v4();
    const namespace = createNamespace('faux');
    const contextTest = new ContextTest(targetId, namespace);
    const emitter = new EventEmitter();
    const listener = new ExecutionListener(contextTest);
    listener.bind(emitter);

    const queryA = stubQueryEventArgs(DMMF.ModelAction.findFirst, {
      where: { lastName: 'Austen' },
    });
    const queryB = stubQueryEventArgs(DMMF.ModelAction.findMany, { where: { firstName: 'Jane' } });

    namespace.set('id', targetId);
    emitter.emit(EVENT_PRISMA_QUERY, queryA);
    emitter.emit(EVENT_PRISMA_QUERY, queryB);

    const report = listener.report();
    expect(report).toEqual(
      expect.objectContaining({
        label: 'PRISMA',
        data: {
          calls: 2,
          queries: expect.arrayContaining([queryA, queryB]),
        },
      }),
    );
  });
  it('does not report if events were not collected', () => {
    const targetId = v4();
    const namespace = createNamespace('faux');
    const contextTest = new ContextTest(targetId, namespace);
    const emitter = new EventEmitter();
    const listener = new ExecutionListener(contextTest);
    listener.bind(emitter);

    namespace.set('id', targetId);

    const report = listener.report();
    expect(report).toBe(null);
  });
});
