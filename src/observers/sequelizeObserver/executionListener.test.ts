import { EVENT_AFTER_QUERY, QueryEventArgs } from './hooks';
import { Model, QueryTypes } from 'sequelize';
import { v4 } from 'uuid';
import { ContextTest, createNamespace } from '../../fauxClsHooked';
import EventEmitter from 'events';
import { ExecutionListener, QueryData } from './executionListener';

class Author extends Model {}

function stubQueryEventArgs(sql: string): QueryEventArgs {
  return {
    model: Author,
    sql,
    options: {
      bind: undefined,
      type: QueryTypes.RAW,
    },
  };
}
function QueryEventArgsToData(args: QueryEventArgs): QueryData {
  return {
    model: args?.model,
    type: args?.options?.type,
    sql: args?.sql || 'never',
    bind: args?.options?.bind,
  };
}

describe('sequelizeObserver/executionListener', () => {
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
    emitter.emit(EVENT_AFTER_QUERY, queryA);
    namespace.set('id', targetId);
    emitter.emit(EVENT_AFTER_QUERY, queryB);
    namespace.set('id', otherId);
    emitter.emit(EVENT_AFTER_QUERY, queryC);

    const collectedData = listener._getData();
    expect(collectedData).toHaveLength(1);
    expect(collectedData).toEqual(expect.arrayContaining([QueryEventArgsToData(queryB)]));
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
    emitter.emit(EVENT_AFTER_QUERY, queryA);
    emitter.emit(EVENT_AFTER_QUERY, queryB);

    const report = listener.report();
    expect(report).toEqual(
      expect.objectContaining({
        label: 'SEQUELIZE',
        data: {
          calls: 2,
          queries: expect.arrayContaining([
            QueryEventArgsToData(queryA),
            QueryEventArgsToData(queryB),
          ]),
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
