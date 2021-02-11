export default class WhenAble {
  private emitted: boolean = false;
  private handlers: Function[] = [];

  emit() {
    if(!this.emitted) this.emitted = true;

    let handler: Function;
    while(handler = this.handlers.pop()) {
      setTimeout(handler, 0);
    }
  }

  whenEmitted(handler: Function) {
    handler = this.checkHandler(handler);

    if(this.emitted) {
      setTimeout(handler, 0);
    } else {
      this.handlers.push(handler);
    }
  }

  private checkHandler(handler: Function): Function {
    const type = typeof handler;
    if(type !== 'function') {
      throw new Error(`A function may only be subscribed to the event, ${type} was provided instead.`);
    }

    return handler;
  }
}