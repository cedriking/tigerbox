import childProcess from 'child_process';
import ConnectionMessage from './interfaces/connectionMessage';
import { TigerSite } from './models/tigerSite';
import { Whenable } from './models/whenable';
import { Utils } from './utils/utils';

let platformInit;
export class TigerBox {
  constructor() {
    if (Utils.isNode()) {
      this.initNode();
    } else {
      this.initWeb();
    }
  }

  newPlugin(url: string, api: Object) {
    return new Plugin(url, api);
  }

  newDynamicPlugin(code: string, api: Object) {
    return new DynamicPlugin(code, api);
  }

  private initNode() {
    try {
      require('./models/tigerSite.js');
    } catch (e) {
      console.log(e.stack);
    }
  }

  private initWeb() {
    const load = (path: string, cb: Function) => {
      const script = document.createElement('script');
      script.src = path;

      const clear = () => {
        script.onload = null;
        script.onerror = null;
        // @ts-ignore
        script.onreadystatechange = null;
        script.parentNode.removeChild(script);
      };

      const success = () => {
        clear();
        cb();
      };

      script.onerror = clear;
      script.onload = success;
      // @ts-ignore
      script.onreadystatechange = () => {
        // @ts-ignore
        const state = script.readyState;
        if (state === 'loaded' || state === 'complete') {
          success();
        }
      };
      document.body.appendChild(script);
    };

    platformInit = new Whenable();
    const origOnLoad = window.onload || function () {};

    window.onload = () => {
      // @ts-ignore
      origOnLoad();
      load(`${Utils.getTigerPath()}tigerSite.js`, () => platformInit.emit());
    };
  }
}

class BasicConnectionNode {
  dedicatedThread: boolean = true;
  private disconnected: boolean = false;
  private messageHandler: Function = () => {};
  private disconnectHandler: Function = () => {};
  private process: childProcess.ChildProcess;

  constructor() {
    this.process = childProcess.fork(
      `${Utils.getTigerPath()}models/pluginNode.js`,
    );
    this.process.on('message', (m) => this.messageHandler(m));
    this.process.on('exit', (m) => this.disconnectHandler(m));
  }

  whenInit(handler: Function) {
    handler();
  }

  send(data: ConnectionMessage) {
    if (!this.disconnected) {
      this.process.send(data);
    }
  }

  onMessage(handler: Function) {
    this.messageHandler = (data: Object) => {
      try {
        handler(data);
      } catch (e) {
        console.error();
        console.error(e.stack);
      }
    };
  }

  onDisconnect(handler: Function) {
    this.disconnectHandler = handler;
  }

  disconnect() {
    this.process.kill('SIGKILL');
    this.disconnected = true;
  }
}

const perm = ['allow-scripts'];
class BasicConnectionWeb {
  dedicatedThread: boolean = true;
  private disconnected: boolean = false;
  private messageHandler: Function = () => {};
  private disconnectHandler: Function = () => {};
  private init = new Whenable();
  private frame;

  constructor() {
    if (Utils.getTigerPath().substr(0, 7).toLowerCase() === 'file://') {
      perm.push('allow-same-origin');
    }

    const sample = document.createElement('iframe');
    sample.src = `${Utils.getTigerPath()}/web/frame.html`;
    // @ts-ignore
    sample.sandbox = perm.join(' ');
    sample.style.display = 'none';

    platformInit.whenEmitted(() => {
      if (this.disconnected) {
        return;
      }

      this.frame = sample.cloneNode(false);
      document.body.appendChild(this.frame);

      window.addEventListener('message', (e) => {
        if (e.source === this.frame.contentWindow) {
          if (e.data.type === 'initialized') {
            this.dedicatedThread = e.data.dedicatedThread;
            this.init.emit();
          } else {
            this.messageHandler(e.data);
          }
        }
      });
    });
  }

  whenInit(handler: Function) {
    this.init.whenEmitted(handler);
  }

  send(data: Object) {
    this.frame.contentWindow.postMessage({ type: 'message', data }, '*');
  }

  onMessage(handler: Function) {
    this.messageHandler = handler;
  }

  onDisconnect() {}

  disconnect() {
    if (this.disconnected) {
      return;
    }

    this.disconnected = true;
    if (typeof this.frame !== 'undefined') {
      this.frame.parentNode.removeChild(this.frame);
    }
  }
}

export class Connection {
  private platformConnection: BasicConnectionNode | BasicConnectionWeb;
  private importCallbacks = {};
  private executeSuccessCallback: Function = () => {};
  private executeFailureCallback: Function = () => {};
  private messageHandler: Function = () => {};

  constructor() {
    if (Utils.isNode()) {
      this.platformConnection = new BasicConnectionNode();
    } else {
      this.platformConnection = new BasicConnectionWeb();
    }

    this.platformConnection.onMessage((m: ConnectionMessage) => {
      switch (m.type) {
        case 'message':
          this.messageHandler(m.data);
          break;
        case 'importSuccess':
          this.handleImportSuccess(m.url);
          break;
        case 'importFailure':
          this.handleImportFailure(m.url);
          break;
        case 'executeSuccess':
          this.executeSuccessCallback();
          break;
        case 'executeFailure':
          this.executeFailureCallback();
          break;
      }
    });
  }

  whenInit(cb: Function) {
    this.platformConnection.whenInit(cb);
  }

  hasDedicatedThread() {
    return this.platformConnection.dedicatedThread;
  }

  importScript(
    path: string,
    successCallback: Function,
    failureCallback: Function,
    connection: Connection
  ) {
    const f = () => {};
    this.importCallbacks[path] = {
      successCallback: successCallback || f,
      failureCallback: failureCallback || f,
    };
    this.platformConnection.send({ type: 'import', url: path, connection });
  }

  importTigerScript(
    path: string,
    successCallback: Function,
    failureCallback: Function,
  ) {
    const f = () => {};
    this.importCallbacks[path] = {
      successCallback: successCallback || f,
      failureCallback: failureCallback || f,
    };
    this.platformConnection.send({ type: 'importTiger', url: path });
  }

  execute(code: string, successCallback: Function, failureCallback: Function) {
    const f = () => {};
    this.executeSuccessCallback = successCallback || f;
    this.executeFailureCallback = failureCallback || f;
    this.platformConnection.send({ type: 'execute', code });
  }

  onMessage(handler: Function) {
    this.messageHandler = handler;
  }

  onDisconnect(handler: Function) {
    this.platformConnection.onDisconnect(handler);
  }

  send(data: Object) {
    this.platformConnection.send({ type: 'message', data });
  }

  private handleImportSuccess(url: string) {
    const successCallback = this.importCallbacks[url].successCallback;
    this.importCallbacks[url] = null;
    delete this.importCallbacks[url];
    successCallback();
  }

  private handleImportFailure(url: string) {
    const failureCallback = this.importCallbacks[url].failureCallback;
    this.importCallbacks[url] = null;
    delete this.importCallbacks[url];
    failureCallback();
  }

  disconnect() {
    this.platformConnection.disconnect();
  }
}

class ParentPlugin {
  protected initialApi: Object;
  protected remote;
  protected connect: Whenable;
  protected fail: Whenable;
  protected disconnect: Whenable;
  protected failureCallback: Function;
  protected connection: Connection;
  protected site;
  protected connected;

  constructor(api: Object) {
    this.initialApi = api;
  }

  hasDedicatedThread() {
    return this.connection.hasDedicatedThread();
  }

  endConnection() {
    this.connection.disconnect();
    this.disconnect.emit();
  }

  whenFailed(handler: Function) {
    this.fail.whenEmitted(handler);
  }

  whenConnected(handler: Function) {
    this.connect.whenEmitted(handler);
  }

  whenDisconnected(handler: Function) {
    this.disconnect.whenEmitted(handler);
  }
}
class Plugin extends ParentPlugin {
  private path: string;

  constructor(url: string, api: Object) {
    super(api);

    this.path = url;
    this.startConnection();
  }

  private startConnection() {
    this.remote = null;
    this.connect = new Whenable();
    this.fail = new Whenable();
    this.disconnect = new Whenable();

    this.failureCallback = () => {
      this.fail.emit();
      this.endConnection();
    };

    this.connection = new Connection();
    this.connection.whenInit(() => {
      this.init();
    });
  }

  private init() {
    this.site = new TigerSite(this.connection);
    this.site.onDisconnect(() => {
      this.disconnect.emit();
    });

    const successCallback = () => this.loadCore();
    this.connection.importScript(
      `${Utils.getTigerPath()}models/tigerSite.js`,
      successCallback,
      this.failureCallback,
      this.connection
    );
  }

  private loadCore() {
    const successCallback = () => {
      this.sendApi();
    };

    this.connection.importScript(
      `${Utils.getTigerPath()}models/pluginCore.js`,
      successCallback,
      this.failureCallback,
      this.connection
    );
  }

  private sendApi() {
    this.site.onApiSetAsRemote(() => {
      if (!this.connected) {
        this.loadPlugin();
      }
    });
    this.site.setApi(this.initialApi);
  }

  private loadPlugin() {
    const successCallback = () => this.requestRemote();
    this.connection.importTigerScript(
      this.path,
      successCallback,
      this.failureCallback,
    );
  }

  private requestRemote() {
    this.site.onRemoteUpdate(() => {
      this.remote = this.site.getRemote();
      this.connect.emit();
    });
    this.site.requestRemote();
  }
}
class DynamicPlugin extends ParentPlugin {
  private code: string;

  constructor(code: string, api: Object) {
    super(api);

    this.code = code;
    this.startConnection();
  }

  private startConnection() {
    this.remote = null;
    this.connect = new Whenable();
    this.fail = new Whenable();
    this.disconnect = new Whenable();

    this.failureCallback = () => {
      this.fail.emit();
      this.endConnection();
    };

    this.connection = new Connection();
    this.connection.whenInit(() => {
      this.init();
    });
  }

  private init() {
    this.site = new TigerSite(this.connection);
    this.site.onDisconnect(() => this.disconnect.emit());

    const successCallback = () => this.loadCore();
    this.connection.importScript(
      `${Utils.getTigerPath()}models/tigerSite.js`,
      successCallback,
      this.failureCallback,
      this.connection
    );
  }

  private loadCore() {
    const successCallback = () => {
      this.sendApi();
    };

    this.connection.importScript(
      `${Utils.getTigerPath()}models/pluginCore.js`,
      successCallback,
      this.failureCallback,
      this.connection
    );
  }

  private sendApi() {
    this.site.onApiSetAsRemote(() => {
      if (!this.connected) {
        this.loadPlugin();
      }
    });
    this.site.setApi(this.initialApi);
  }

  private loadPlugin() {
    const successCallback = () => this.requestRemote();
    this.connection.execute(this.code, successCallback, this.failureCallback);
  }

  private requestRemote() {
    this.site.onRemoteUpdate(() => {
      this.remote = this.site.getRemote();
      this.connect.emit();
    });
    this.site.requestRemote();
  }
}
