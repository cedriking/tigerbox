import Connection from './connection';
import tigerboxSite from './tigerboxSite';
import TigerboxSite from './tigerboxSite';
import WhenAble from './whenable';

class PluginParent {
  protected path: string;
  protected code: string;
  protected initialInterface: Object;
  protected connect: WhenAble;
  protected fail: WhenAble;
  protected disconnect: WhenAble;
  protected failureCallback: Function;
  protected connection: Connection;
  protected site: tigerboxSite;
  protected isConnected: boolean = false;

  constructor(url: string, face: Object = {}, platformInit, isNode: boolean) {
    this.path = url;
    this.initialInterface = face;

    this.connect = new WhenAble();
    this.fail = new WhenAble();
    this.disconnect = new WhenAble();

    this.failureCallback = () => {
      this.fail.emit();
      this.disconnect.emit();
    };

    this.connection = new Connection(this.path, platformInit, isNode);
  }

  whenConnected(handler: Function) {
    this.connect.whenEmitted(handler);
  }

  requestRemote() {
    this.site.onRemoteUpdate(() => {
      this.connect.emit();
    });

    this.site.requestRemote();
  }
}

export class Plugin extends PluginParent {

  constructor(url: string, face: Object = {}, platformInit, isNode: boolean) {
    super(url, face, platformInit, isNode);

    this.connection.whenInit(() => {
      this.init();
    });
  }

  init() {
    this.site = new TigerboxSite(this.connection);
    this.site.onDisconnect(() => this.disconnect.emit());

    const successCallback = () => this.loadCore();
    this.connection.importTigerScript(
      `${this.path}models/tigerboxSite.ts`,
      successCallback,
      this.failureCallback,
    );
  }

  loadCore() {
    const successCallback = () => this.sendInterface();
    this.connection.importTigerScript(
      `${this.path}models/pluginCore.ts`,
      successCallback,
      this.failureCallback,
    );
  }

  sendInterface() {
    this.site.onInterfaceSetAsRemote(() => {
      if (!this.isConnected) {
        this.loadPlugin();
      }
    });
    this.site.setInterface(this.initialInterface);
  }

  loadPlugin() {
    const successCallback = () => this.requestRemote();
    this.connection.importTigerScript(
      this.path,
      successCallback,
      this.failureCallback,
    );
  }

  hasDedicatedThread() {
    return this.connection.hasDedicatedThread();
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

  close() {
    this.connection.disconnect();
    this.disconnect.emit();
  }
}

export class DynamicPlugin extends PluginParent {
  constructor(url: string, code: string, face: Object = {}, platformInit, isNode: boolean) {
    super(url, face, platformInit, isNode);
    this.code = code;

    this.connection.whenInit(() => {
      this.init();
    });
  }

  init() {
    this.site = new TigerboxSite(this.connection);
    this.site.onDisconnect(() => this.disconnect.emit());

    const successCallback = () => this.loadCore();
    this.connection.importTigerScript(
      `${this.path}models/tigerboxSite.ts`,
      successCallback,
      this.failureCallback,
    );
  }

  loadCore() {
    const successCallback = () => this.sendInterface();
    this.connection.importTigerScript(
      `${this.path}models/pluginCore.ts`,
      successCallback,
      this.failureCallback,
    );
  }

  sendInterface() {
    this.site.onInterfaceSetAsRemote(() => {
      if (!this.isConnected) {
        this.loadPlugin();
      }
    });
    this.site.setInterface(this.initialInterface);
  }

  loadPlugin() {
    const successCallback = () => this.requestRemote();
    this.connection.execute(this.code, successCallback, this.failureCallback);
  }
}