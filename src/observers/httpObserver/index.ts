import http from 'http';
import https from 'https';
import { NetworkObserver } from '../../NetworkObserver';
import EventEmitter from 'events';
import { override } from './override';

export type HttpObserverConfig = {};

export class HttpObserver implements NetworkObserver {
  private readonly emitter: EventEmitter;
  constructor() {
    this.emitter = new EventEmitter();
  }
  initialize() {
    override(http, this.emitter);
    override(https, this.emitter);
  }
  onExecute() {
    return () => {
      // done
    };
  }
}
