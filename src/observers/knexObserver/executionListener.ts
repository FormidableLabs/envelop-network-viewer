import { ContextTest } from '../../fauxClsHooked';
import { EVENT_ON_QUERY, QueryEventArgs } from './hook';
import EventEmitter from 'events';
import { ExecuteDoneReport } from '../../NetworkObserver';

export type QueryData = {
  bindings?: Array<unknown>;
  method?: string;
  sql: string;
};

export class ExecutionListener {
  constructor(private contextTest: ContextTest, private data: Array<QueryData> = []) {}
  bind(emitter: EventEmitter) {
    emitter.addListener(EVENT_ON_QUERY, this.handleQueryEvent.bind(this));
  }

  unbind(emitter: EventEmitter) {
    emitter.removeListener(EVENT_ON_QUERY, this.handleQueryEvent.bind(this));
  }

  _getData() {
    return this.data;
  }
  handleQueryEvent(args: QueryEventArgs) {
    if (!this.contextTest.isTargetContext()) {
      return;
    }
    this.data.push({ method: args?.method, sql: args?.sql || 'never', bindings: args?.bindings });
  }

  report(): ExecuteDoneReport {
    if (this.data.length < 1) {
      return null;
    }
    return { label: 'KNEX', data: { calls: this.data.length, queries: this.data } };
  }
}
