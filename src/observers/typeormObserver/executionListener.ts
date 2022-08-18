import { ContextTest } from '../../fauxClsHooked';
import EventEmitter from 'events';
import { EVENT_LOG_QUERY, EventLogQueryArgs } from './logger';
import { ExecuteDoneReport } from '../../NetworkObserver';

export class ExecutionListener {
  constructor(private contextTest: ContextTest, private data: Array<EventLogQueryArgs> = []) {}

  bind(emitter: EventEmitter) {
    emitter.addListener(EVENT_LOG_QUERY, this.handleQueryEvent.bind(this));
  }

  unbind(emitter: EventEmitter) {
    emitter.removeListener(EVENT_LOG_QUERY, this.handleQueryEvent.bind(this));
  }

  /** used only for testing **/
  _getData() {
    return this.data;
  }

  handleQueryEvent(args: EventLogQueryArgs) {
    if (!this.contextTest.isTargetContext()) {
      return;
    }
    this.data.push(args);
  }

  report(): ExecuteDoneReport {
    if (this.data.length < 1) {
      return null;
    }
    return { label: 'TYPEORM', data: { calls: this.data.length, queries: this.data } };
  }
}
