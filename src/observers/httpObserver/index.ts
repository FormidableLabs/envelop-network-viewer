import http from 'http';
import https from 'https';
import { ExecuteDoneReport, NetworkObserver } from '../../NetworkObserver';
import EventEmitter from 'events';
import {
  EVENT_REQUEST,
  EVENT_RESPONSE,
  override,
  RequestEventArgs,
  ResponseEventArgs,
} from './override';

export type HttpObserverConfig = {};

export class HttpObserver implements NetworkObserver {
  constructor(private emitter: EventEmitter = new EventEmitter()) {}
  initialize() {
    override(http, this.emitter);
    override(https, this.emitter);
  }
  onExecute() {
    const listener = new ExecutionListener();
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

class ExecutionListener {
  constructor(private data: Record<string, RequestDetails> = {}) {}

  bind(emitter: EventEmitter) {
    emitter.addListener(EVENT_REQUEST, this.handleRequestEvent.bind(this));
    emitter.addListener(EVENT_RESPONSE, this.handleResponseEvent.bind(this));
  }

  unbind(emitter: EventEmitter) {
    emitter.removeListener(EVENT_REQUEST, this.handleRequestEvent.bind(this));
    emitter.removeListener(EVENT_RESPONSE, this.handleResponseEvent.bind(this));
  }

  handleRequestEvent(event: RequestEventArgs) {
    this.data[event.connectionID] = event;
  }

  handleResponseEvent(event: ResponseEventArgs) {
    if (this.data[event.connectionID]) {
      this.data[event.connectionID].response = event;
    }
  }

  report(): ExecuteDoneReport {
    const requests = Object.keys(this.data).length;
    const hosts = Object.entries(this.data).map(([key, value]) => value.host);
    return { label: 'HTTP/HTTPS', data: { requests, hosts } };
  }
}
