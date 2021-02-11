import Connection from "./connection";
import ReferenceStore from "./referenceStore";

export default class TigerboxSite {
  private face: Object = {};
  private remote = null;
  private remoteUpdateHandler: Function = () => {};
  private getInterfaceHandler: Function = () => {};
  private interfaceSetAsRemoteHandler: Function = () => {};
  private disconnectHandler: Function = () => {};
  private store = new ReferenceStore();
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
    this.connection.onMessage((data) => this.processMessage(data));
    this.connection.onDisconnect((m) => this.disconnectHandler(m));
  }

  onRemoteUpdate(handler: Function) {
    this.remoteUpdateHandler = handler;
  }

  onInterfaceSetAsRemote(handler: Function) {
    this.interfaceSetAsRemoteHandler = handler;
  }

  onGetInterface(handler: Function) {
    this.getInterfaceHandler = handler;
  }

  getRemote() {
    this.remote;
  }

  setInterface(face) {
    this.face = face;
    this.sendInterface();
  }

  sendInterface() {
    const api = [];
    for(let name in this.face) {
      if(this.face.hasOwnProperty(name)) {
        api.push(name);
      }
    }

    this.connection.send({type: 'setInterface', api});
  }

  requestRemote() {
    this.connection.send({type: 'getInterface'});
  }

  disconnect() {
    this.connection.send({type: 'disconnect'});
    this.connection.disconnect();
  }

  onDisconnect(handler: Function) {
    this.disconnectHandler = handler;
  }

  private processMessage(data) {
    let method;
    let args;
    switch(data.type) {
      case 'method':
        method = this.face[data.name];
        args = this.unwrap(data.args);
        method.apply(null, args);
        break;
      case 'callback':
        method = this.store.fetch(data.id)[data.number];
        args = this.unwrap(data.args);
        method.apply(null, args);
        break;
      case 'setInterface':
        this.setRemote(data.api);
        break;
      case 'getInterface':
        this.sendInterface();
        this.getInterfaceHandler();
        break;
      case 'interfaceSetAsRemote':
        this.interfaceSetAsRemoteHandler();
        break;
      case 'disconnect':
        this.disconnectHandler();
        this.connection.disconnect();
        break;
    }
  }

  private setRemote(names: string[]): void {
    this.remote = {};
    for(const name of names) {
      this.remote[name] = this.genRemoteMethod(name);
    }

    this.remoteUpdateHandler();
    this.reportRemoteSet();
  }

  private genRemoteMethod(name: string) {
    return () => {
      this.connection.send({ type: 'method', name, args: this.wrap(arguments) });
    };
  }

  private reportRemoteSet() {
    this.connection.send({ type: 'interfaceSetAsRemote'});
  }

  private wrap(...args) {
    const wrapped = [];
    const callbacks = {};
    let isCallbacksPresent = false;

    for(const i in args) {
      const arg = args[i];
      if(typeof arg === 'function') {
        callbacks[i] = arg;
        wrapped[i] = {type: 'callback', num: i};
        isCallbacksPresent = true;
      } else {
        wrapped[i] = {type: 'argument', value: arg};
      }
    }

    let result = {args: wrapped, callbackId: null};
    if(isCallbacksPresent) {
      result.callbackId = this.store.put(callbacks);
    }

    return result;
  }

  private unwrap(args: any) {
    let called = false;

    const once = (cb) => {
      return () => {
        if(!called) {
          called = true;
          cb.apply(this, arguments);
        } else {
          throw new Error('A callback from this set has already been executed.');
        }
      }
    };

    const result = [];
    for(const i in args.args) {
      const arg = args.args[i];
      if(arg.type === 'argument') {
        result.push(arg.value);
      } else {
        const cb = once(this.genRemoteCallback(args.callbackId, +i));
        result.push(cb);
      }
    }

    return result;
  }

  private genRemoteCallback(id: number, argNum: number) {
    const remoteCallback = () => {
      this.connection.send({ type: 'callback', id, num: argNum, args: this.wrap(arguments)});
    }

    return remoteCallback;
  }
}