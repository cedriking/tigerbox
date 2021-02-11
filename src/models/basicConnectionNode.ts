import childProcess from 'child_process';

export default class BasicConnectionNode {
  private process: childProcess.ChildProcess;
  private isDisconnected: boolean = true;
  private messageHandler: (m: childProcess.Serializable) => void = (m: childProcess.Serializable) => {};
  private disconnectHandler: (m: childProcess.Serializable) => void = (m: childProcess.Serializable) => {};

  constructor(tigerPath: string) {
    this.process = childProcess.fork(tigerPath);
    this.process.on('message', (m) => {
      this.messageHandler(m);
    });
    this.process.on('exit', (m) => {
      this.isDisconnected = true;
      this.disconnectHandler(m);
    });
  }

  whenInit(handler: Function) {
    handler();
  }

  send(data: Object) {
    if(!this.isDisconnected) {
      this.process.send(data);
    }
  }

  onMessage(handler: (m: childProcess.Serializable) => void) {
    this.messageHandler = (data: Object) => {
      try {
        handler(data);
      } catch (e) {
        console.error(e.stack);
      }
    }
  }

  onDisconnect(handler: (m: childProcess.Serializable) => void) {
    this.disconnectHandler = handler;
  }

  disconnect() {
    this.process.kill('SIGKILL');
    this.isDisconnected = true;
  }
}