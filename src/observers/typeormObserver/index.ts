import {
  ExecuteArgs,
  ExecuteDoneReport,
  NetworkObserver,
  OnExecuteDoneCallback,
} from '../../NetworkObserver';
import { TypeORMObserverLogger } from './logger';
import EventEmitter from 'events';
import { ExecutionListener } from './executionListener';

export class TypeORMObserver implements NetworkObserver {
  constructor(
    private readonly logger: TypeORMObserverLogger,
    private emitter: EventEmitter = new EventEmitter(),
  ) {}

  initialize(): void {
    this.logger.initialize(this.emitter);
  }

  onExecute({ contextTest }: ExecuteArgs): OnExecuteDoneCallback {
    const listener = new ExecutionListener(contextTest);
    listener.bind(this.emitter);
    return (): ExecuteDoneReport => {
      const report = listener.report();
      listener.unbind(this.emitter);
      return report;
    };
  }
}
