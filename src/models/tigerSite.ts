import ConnectionMessage from '../interfaces/connectionMessage';
import { Connection } from '../tigerbox';

export class TigerSite {
  private connection: Connection;
  private api: Object = {};
  private remote;
  private remoteUpdateHandler: Function = () => {};
  private getApiHandler: Function = () => {};
  private apiSetAsRemoteHandler: Function = () => {};
  private disconnectHandler: Function = () => {};
  private store = new ReferenceStore();

  constructor(connection: Connection) {
    this.connection = connection;
    this.connection.onMessage((data) => this.processMessage(data));
    this.connection.onDisconnect((m) => this.disconnectHandler(m));
  }

  onRemoteUpdate(handler: Function) {
    this.remoteUpdateHandler = handler;
  }

  onApiSetAsRemote(handler: Function) {
    this.apiSetAsRemoteHandler = handler;
  }

  onGetApi(handler: Function) {
    this.getApiHandler = handler;
  }

  getRemote() {
    return this.remote;
  }

  setApi(api: Object) {
    this.api = api;
    this.sendApi();
  }

  private sendApi() {
    const names = [];
    for (const name in this.api) {
      if (this.api.hasOwnProperty(name)) {
        names.push(name);
      }
    }

    this.connection.send({ type: 'setApi', api: names });
  }

  private processMessage(data: ConnectionMessage) {
    let method;
    let args;
    switch (data.type) {
      case 'method':
        method = this.api[data.name];
        args = this.unwrap(data.args);
        method.apply(null, args);
        break;
      case 'callback':
        method = this.store.fetch(data.id)[data.num];
        args = this.unwrap(data.args);
        method.apply(null, args);
        break;
      case 'setApi':
        this.setRemote(data.api);
        break;
      case 'getApi':
        this.sendApi();
        this.getApiHandler();
        break;
      case 'apiSetAsRemote':
        this.apiSetAsRemoteHandler();
        break;
      case 'disconnect':
        this.disconnectHandler();
        this.connection.disconnect();
        break;
    }
  }

  requestRemote() {
    this.connection.send({ type: 'getApi' });
  }

  disconnect() {
    this.connection.send({ type: 'disconnect' });
    this.connection.disconnect();
  }

  onDisconnect(handler: Function) {
    this.disconnectHandler = handler;
  }

  private setRemote(names: string[]) {
    this.remote = {};
    for (const name of names) {
      this.remote[name] = this.genRemoteMethod(name);
    }

    this.remoteUpdateHandler();
    this.reportRemoteSet();
  }

  private genRemoteMethod(name: string) {
    const remoteMethod = () => {
      this.connection.send({
        type: 'method',
        name,
        args: this.wrap(arguments),
      });
    };

    return remoteMethod;
  }

  private reportRemoteSet() {
    this.connection.send({ type: 'apiSetAsRemote' });
  }

  private wrap(args) {
    const wrapped = [];
    const callbacks = {};
    let callbacksPresent = false;

    for (let i = 0, j = args.length; i < j; i++) {
      if (typeof args[i] === 'function') {
        callbacks[i] = args[i];
        wrapped[i] = { type: 'callback', num: i };
        callbacksPresent = true;
      } else {
        wrapped[i] = { type: 'argument', value: args[i] };
      }
    }

    let result = { args: wrapped, callbackId: null };
    if (callbacksPresent) {
      result.callbackId = this.store.put(callbacks);
    }

    return result;
  }

  private unwrap(args) {
    let called = false;

    const once = (cb: Function) => {
      return () => {
        if (!called) {
          called = true;
          cb.apply(this, arguments);
        } else {
          throw new Error(
            'A callback from this set has already been executed.',
          );
        }
      };
    };

    const result = [];
    for (let i = 0, j = args.largs.length; i < j; i++) {
      const arg = args.args[i];
      if (arg.type === 'argument') {
        result.push(arg.value);
      } else {
        const cb = once(this.genRemoteCallback(args.callbackId, i));
        result.push(cb);
      }
    }

    return result;
  }

  private genRemoteCallback(id: number, argNum: number) {
    const remoteCallback = () => {
      this.connection.send({
        type: 'callback',
        id,
        num: argNum,
        args: this.wrap(arguments),
      });
    };

    return remoteCallback;
  }
}

class ReferenceStore {
  private store: Object = {};
  private indices: number[] = [0];

  put(obj: Object): number {
    const id = this.genId();
    this.store[id] = obj;

    return id;
  }

  fetch(id: number) {
    const obj = this.store[id];
    this.store[id] = null;
    delete this.store[id];
    this.releaseId(id);

    return obj;
  }

  private genId() {
    let id: number;
    if (this.indices.length === 1) {
      id = this.indices[0]++;
    } else {
      id = this.indices.shift();
    }

    return id;
  }

  private releaseId(id: number) {
    for (let i = 0, j = this.indices.length; i < j; i++) {
      if (id < this.indices[i]) {
        this.indices.splice(i, 0, id);
        break;
      }
    }

    for (let i = this.indices.length - 1; i >= 0; i--) {
      if (this.indices[i] - 1 === this.indices[i - 1]) {
        this.indices.pop();
      } else {
        break;
      }
    }
  }
}
