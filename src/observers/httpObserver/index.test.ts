import { v4 } from 'uuid';
import { ContextTest, createNamespace } from '../../fauxClsHooked';
import { ExecutionListener } from './index';
import EventEmitter from 'events';
import { EVENT_REQUEST, EVENT_RESPONSE, RequestEventArgs, ResponseEventArgs } from './override';

function stubRequestEventArgs(): RequestEventArgs {
  return {
    connectionID: v4(),
    headers: {},
    host: 'localhost',
    method: 'GET',
    port: '80',
    time: Date.now(),
  };
}
function stubResponseEventArgs(connectionID: string): ResponseEventArgs {
  return {
    connectionID,
    headers: {},
    httpVersion: '1.1',
    statusCode: 200,
    statusMessage: 'Successful',
    time: Date.now(),
  };
}

describe('httpObserver/index', () => {
  describe('ExecutionListener', () => {
    it('only collects events if event originated from target context', () => {
      const targetId = v4();
      const otherId = v4();
      const namespace = createNamespace('faux');
      const contextTest = new ContextTest(targetId, namespace);
      const emitter = new EventEmitter();
      const listener = new ExecutionListener(contextTest);
      listener.bind(emitter);

      const requestA = stubRequestEventArgs();
      const responseA = stubResponseEventArgs(requestA.connectionID);
      const requestB = stubRequestEventArgs();
      const responseB = stubResponseEventArgs(requestB.connectionID);

      namespace.set('id', otherId);
      emitter.emit(EVENT_REQUEST, requestA);
      namespace.set('id', targetId);
      emitter.emit(EVENT_REQUEST, requestB);
      emitter.emit(EVENT_RESPONSE, responseB);
      namespace.set('id', otherId);
      emitter.emit(EVENT_RESPONSE, responseA);

      const collectedData = listener._getData();
      expect(Object.keys(collectedData).length).toBe(1);
      expect(collectedData).toHaveProperty(requestB.connectionID);
      expect(collectedData[requestB.connectionID]).toEqual(requestB);
      expect(collectedData[requestB.connectionID]).toHaveProperty('response');
      expect(collectedData[requestB.connectionID].response).toEqual(responseB);
    });
    it('reports collected events', () => {
      const targetId = v4();
      const namespace = createNamespace('faux');
      const contextTest = new ContextTest(targetId, namespace);
      const emitter = new EventEmitter();
      const listener = new ExecutionListener(contextTest);
      listener.bind(emitter);

      const requestA = stubRequestEventArgs();
      const responseA = stubResponseEventArgs(requestA.connectionID);
      const requestB = stubRequestEventArgs();
      const responseB = stubResponseEventArgs(requestB.connectionID);

      namespace.set('id', targetId);
      emitter.emit(EVENT_REQUEST, requestA);
      emitter.emit(EVENT_RESPONSE, responseA);
      emitter.emit(EVENT_REQUEST, requestB);
      emitter.emit(EVENT_RESPONSE, responseB);

      const report = listener.report();
      expect(report).toEqual(
        expect.objectContaining({
          label: 'HTTP/HTTPS',
          data: {
            calls: 2,
            hosts: ['localhost'],
            requests: expect.arrayContaining([
              {
                ...requestA,
                response: responseA,
                duration_ms: 0,
              },
              {
                ...requestB,
                response: responseB,
                duration_ms: 0,
              },
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
});
