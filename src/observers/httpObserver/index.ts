import http from 'http';
import https from 'https';
import { ExecuteArgs, ExecuteDoneReport, NetworkObserver } from '../../NetworkObserver';
import EventEmitter from 'events';
import {
  EVENT_REQUEST,
  EVENT_RESPONSE,
  override,
  RequestEventArgs,
  ResponseEventArgs,
} from './override';
import { DeepPartial } from '../../deepPartial';
import { ContextTest } from '../../fauxClsHooked';

export class HttpObserver implements NetworkObserver {
  constructor(private emitter: EventEmitter = new EventEmitter()) {}
  initialize() {
    override(http, this.emitter);
    override(https, this.emitter);
  }

  onExecute(args: ExecuteArgs) {
    const listener = new ExecutionListener(args.contextTest);
    listener.bind(this.emitter);
    return () => {
      // done
      listener.unbind(this.emitter);
      return listener.report();
    };
  }

  label(): string {
    return 'HTTP/HTTPS';
  }
}

type RequestDetails = RequestEventArgs & {
  response?: ResponseEventArgs;
};

export class ExecutionListener {
  constructor(
    private contextTest: ContextTest,
    private data: Record<string, RequestDetails> = {},
  ) {}

  bind(emitter: EventEmitter) {
    emitter.addListener(EVENT_REQUEST, this.handleRequestEvent.bind(this));
    emitter.addListener(EVENT_RESPONSE, this.handleResponseEvent.bind(this));
  }

  unbind(emitter: EventEmitter) {
    emitter.removeListener(EVENT_REQUEST, this.handleRequestEvent.bind(this));
    emitter.removeListener(EVENT_RESPONSE, this.handleResponseEvent.bind(this));
  }

  /** used only for testing **/
  _getData() {
    return this.data;
  }

  handleRequestEvent(event: RequestEventArgs) {
    if (!this.contextTest.isTargetContext()) {
      return;
    }
    this.data[event.connectionID] = event;
  }

  handleResponseEvent(event: ResponseEventArgs) {
    if (!this.contextTest.isTargetContext()) {
      return;
    }
    if (this.data[event.connectionID]) {
      this.data[event.connectionID].response = event;
    }
  }

  report(): ExecuteDoneReport {
    const calls = Object.keys(this.data).length;
    const hosts = Array.from(new Set(Object.entries(this.data).map(([key, value]) => value.host)));
    const requests = Object.entries(this.data).map(([key, value]) => {
      const request: DeepPartial<RequestDetails> & { duration_ms?: number } = value;
      delete request.connectionID;
      delete request.response?.connectionID;
      request.duration_ms =
        request.response?.time && request?.time
          ? request.response?.time - request?.time
          : undefined;
      return request;
    });
    return { label: 'HTTP/HTTPS', data: { calls, hosts, requests } };
  }
}
