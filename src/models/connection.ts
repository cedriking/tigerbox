import BasicConnectionNode from './basicConnectionNode';
import BasicConnectionWeb from './basicConnectionWeb';
import Whenable from './whenable';

export default class Connection {
  private platformConnection;
  private importCallbacks = {};
  private executeSuccessCallback: Function = () => {};
  private executeFailureCallback: Function = () => {};
  private messageHandler: Function = () => {};

  constructor(tigerPath: string, platformInit: Whenable, isNode: boolean) {
    if (isNode) {
      this.platformConnection = new BasicConnectionNode(tigerPath);
    } else {
      this.platformConnection = new BasicConnectionWeb(tigerPath, platformInit);
    }

    this.platformConnection.onMessage((m) => {
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

  whenInit(callback: Function) {
    this.platformConnection.whenInit(callback);
  }

  hasDedicatedThread() {
    return this.platformConnection.dedicatedThread;
  }

  importScript(
    path: string,
    successCallback: Function,
    failureCallback: Function,
  ) {
    const f = () => {};
    this.importCallbacks[path] = {
      successCallback: successCallback || f,
      failureCallback: failureCallback || f,
    };
    this.platformConnection.send({ type: 'import', url: path });
  }

  importTigerScript(path: string, successCallback: Function, failureCallback: Function) {
    const f = () => {};
    this.importCallbacks[path] = {
      successCallback: successCallback || f,
      failureCallback: failureCallback || f,
    };
    this.platformConnection.send({ type: 'importTiger', url: path });
  }

  execute(
    code: string,
    successCallback: Function = () => {},
    failureCallback: Function = () => {},
  ) {
    this.executeSuccessCallback = successCallback;
    this.executeFailureCallback = failureCallback;
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

  handleImportSuccess(url) {
    const success = this.importCallbacks[url].successCallback;
    this.importCallbacks[url] = null;
    delete this.importCallbacks[url];

    success();
  }

  handleImportFailure(url) {
    const failure = this.importCallbacks[url].failureCallback;
    this.importCallbacks[url] = null;
    delete this.importCallbacks[url];

    failure();
  }

  disconnect() {
    this.platformConnection.disconnect();
  }
}
