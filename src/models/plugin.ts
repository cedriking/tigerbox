import Connection from "./connection";
import tigerboxSite from "./tigerboxSite";
import TigerboxSite from "./tigerboxSite";
import WhenAble from "./whenable";

export default class Plugin {
  private path: string;
  private initialInterface: Object;
  private connect: WhenAble;
  private fail: WhenAble;
  private disconnect: WhenAble;
  private failureCallback: Function;
  private connection: Connection;
  private site: tigerboxSite;
  private isConnected: boolean = false;

  constructor(url: string, face: Object, platformInit, isNode: boolean) {
    this.path = url;
    this.initialInterface = face || {};
    
    this.connect = new WhenAble();
    this.fail = new WhenAble();
    this.disconnect = new WhenAble();

    this.failureCallback = () => {
      this.fail.emit();
      this.disconnect.emit();
    }

    this.connection = new Connection(this.path, platformInit, isNode);
    this.connection.whenInit(() => {
      this.run();
    });
  }

  run() {
    this.site = new TigerboxSite(this.connection);
    this.site.onDisconnect(() => this.disconnect.emit());
    
    const successCallback = () => this.loadCore();
    this.connection.importTigerScript(`${this.path}tigerboxSite.js`, successCallback, this.failureCallback);
  }

  loadCore() {
    const successCallback = () => this.sendInterface();
    this.connection.importTigerScript(`${this.path}pluginCore.js`, successCallback, this.failureCallback);
  }

  sendInterface() {
    this.site.onInterfaceSetAsRemote(() => {
      if(!this.isConnected) {
        this.loadPlugin();
      }
    });
    this.site.setInterface(this.initialInterface);
  }

  loadPlugin() {
    const successCallback = () => this.requestRemote();
    this.connection.importTigerScript(this.path, successCallback, this.failureCallback);
  }

  requestRemote() {
    this.site.onRemoteUpdate(() => {
      this.connect.emit();
    });

    this.site.requestRemote();
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