const process = require('process');
const http = require('src/httpObserver');
const https = require('https');
const { unzip } = require('zlib');
const WSocket = require('ws');

const wsServer = new WSocket.Server({ port: 12346, host: '127.0.0.1' });

wsServer.on('error', e => {
  console.error(e);
});

function sendMsg(msg) {
  if (wsServer) {
    wsServer.clients.forEach(function each(client) {
      if (client.readyState === WSocket.OPEN) {
        client.send(JSON.stringify(msg));
      }
    });
  }
}

let uniqID = 0;
const pid = process.pid;

function override(module) {
  const original = module.request;
  function wrapper(...args) {
    const connectionID = `rq:${pid}:${++uniqID}`;
    const req = original.apply(this, args);
    const originalEmit = req.emit;
    const body = [];

    req.emit = function emit(eventName, response, ...rest) {
      switch (eventName) {
        case 'response': {
          response.once('error', e => {
            const res = {
              connectionID: connectionID,
              statusCode: response.statusCode,
              httpVersion: response.httpVersion,
              headers: response.headers || {},
              statusMessage: response.statusMessage,
              error: e,
            };
            sendMsg(res);
          });
          if (response.headers['content-encoding'] === 'gzip') {
            response.on('data', d => {
              body.push(d);
            });

            response.on('end', () => {
              unzip(Buffer.concat(body), (err, buffer) => {
                if (err) {
                  console.error('An error occurred:', err);
                  return;
                }

                const res = {
                  connectionID: connectionID,
                  time: Date.now(),
                  httpVersion: response.httpVersion,
                  statusCode: response.statusCode,
                  headers: response.headers || {},
                  statusMessage: response.statusMessage,
                  body: tryParse(buffer.toString()),
                };
                sendMsg(res);
              });
            });
          } else {
            response.on('data', d => {
              body.push(d);
            });

            response.on('end', () => {
              const res = {
                connectionID: connectionID,
                time: Date.now(),
                statusCode: response.statusCode,
                headers: response.headers || {},
                httpVersion: response.httpVersion,
                statusMessage: response.statusMessage,
                body: tryParse(body.join('')),
              };

              sendMsg(res);
            });
          }
        }
      }
      return originalEmit.apply(this, [eventName, response, ...rest]);
    };

    logger(args[0], connectionID, req);
    return req;
  }

  function logger(options, connectionID, req) {
    const origEnd = req.end;
    const origWrite = req.write;
    const payload = [];

    req.write = function write(...args) {
      const chunk = args[0];

      if (Buffer.isBuffer(chunk)) {
        payload.push(chunk.toString('utf-8'));
      }
      return origWrite.apply(this, args);
    };
    req.end = function end(...args) {
      const body = payload.length ? payload.join('') : options.body;

      const log = {
        connectionID: connectionID || undefined,
        time: Date.now(),
        method: options.method || 'GET',
        isRequest: true,
        host: options.host || options.hostname || 'localhost',
        port: options.port || '443',
        path: options.path || options.pathname || '/',
        headers: options.headers || {},
        body: typeof body === 'string' ? tryParse(body) : body,
      };
      sendMsg(log);
      return origEnd.apply(this, args);
    };
  }

  function tryParse(obj) {
    try {
      return JSON.parse(obj);
    } catch (e) {
      return obj;
    }
  }
  module.request = wrapper;
}
override(http);
override(https);
