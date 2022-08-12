import { ContextTest } from '../../fauxClsHooked';
import EventEmitter from 'events';
import { ExecuteDoneReport } from '../../NetworkObserver';
import { QueryMiddlewareParams } from './middleware';
import { EVENT_PRISMA_QUERY } from './index';

export type QueryEventArgs = QueryMiddlewareParams & { duration_ms: number };

export class ExecutionListener {
  constructor(private contextTest: ContextTest, private data: Array<QueryEventArgs> = []) {}

  bind(emitter: EventEmitter) {
    emitter.addListener(EVENT_PRISMA_QUERY, this.handleQueryEvent.bind(this));
  }

  unbind(emitter: EventEmitter) {
    emitter.removeListener(EVENT_PRISMA_QUERY, this.handleQueryEvent.bind(this));
  }

  /** used only for testing **/
  _getData() {
    return this.data;
  }
  handleQueryEvent(args: QueryEventArgs) {
    if (!this.contextTest.isTargetContext()) {
      return;
    }
    this.data.push(args);
  }

  report(): ExecuteDoneReport {
    if (this.data.length < 1) {
      return null;
    }
    return { label: 'PRISMA', data: { calls: this.data.length, queries: this.data } };
  }
}
