import { EVENT_LOG_QUERY, EventLogQueryArgs } from './logger';
import { v4 } from 'uuid';
import { ContextTest, createNamespace } from '../../fauxClsHooked';
import EventEmitter from 'events';
import { ExecutionListener } from './executionListener';

function stubQueryEventArgs(sql: string): EventLogQueryArgs {
  return {
    query: sql,
    parameters: [],
  };
}

describe('typeormObserver/executionListener', () => {
  it('only collects events if event originated from target context', () => {
    const targetId = v4();
    const otherId = v4();
    const namespace = createNamespace('faux');
    const contextTest = new ContextTest(targetId, namespace);
    const emitter = new EventEmitter();
    const listener = new ExecutionListener(contextTest);
    listener.bind(emitter);

    const queryA = stubQueryEventArgs("select * from authors where firstName = 'Jane'");
    const queryB = stubQueryEventArgs("select * from authors where firstName = 'Robin'");
    const queryC = stubQueryEventArgs("select * from authors where lastName = 'Tolkien'");

    namespace.set('id', otherId);
    emitter.emit(EVENT_LOG_QUERY, queryA);
    namespace.set('id', targetId);
    emitter.emit(EVENT_LOG_QUERY, queryB);
    namespace.set('id', otherId);
    emitter.emit(EVENT_LOG_QUERY, queryC);

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

    const queryA = stubQueryEventArgs("select * from authors where firstName = 'Jane'");
    const queryB = stubQueryEventArgs("select * from authors where firstName = 'Robin'");

    namespace.set('id', targetId);
    emitter.emit(EVENT_LOG_QUERY, queryA);
    emitter.emit(EVENT_LOG_QUERY, queryB);

    const report = listener.report();
    expect(report).toEqual(
      expect.objectContaining({
        label: 'TYPEORM',
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
