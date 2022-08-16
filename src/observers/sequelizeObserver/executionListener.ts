import { ContextTest } from '../../fauxClsHooked';
import EventEmitter from 'events';
import { ExecuteDoneReport } from '../../NetworkObserver';
import { EVENT_AFTER_QUERY, QueryEventArgs } from './hooks';

export type QueryData = {
  sql: string;
  bind?: Array<unknown>;
  model?: unknown;
  type?: string;
};

export class ExecutionListener {
  constructor(private contextTest: ContextTest, private data: Array<QueryData> = []) {}

  bind(emitter: EventEmitter) {
    emitter.addListener(EVENT_AFTER_QUERY, this.handleQueryEvent.bind(this));
  }

  unbind(emitter: EventEmitter) {
    emitter.removeListener(EVENT_AFTER_QUERY, this.handleQueryEvent.bind(this));
  }

  /** used only for testing **/
  _getData() {
    return this.data;
  }
  handleQueryEvent(args: QueryEventArgs) {
    if (!this.contextTest.isTargetContext()) {
      return;
    }
    this.data.push({
      model: args?.model,
      type: args?.options?.type,
      sql: args?.sql || 'never',
      bind: args?.options?.bind,
    });
  }

  report(): ExecuteDoneReport {
    if (this.data.length < 1) {
      return null;
    }
    return { label: 'SEQUELIZE', data: { calls: this.data.length, queries: this.data } };
  }
}
