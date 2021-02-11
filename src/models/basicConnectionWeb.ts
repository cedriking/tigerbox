import WhenAble from "./whenable";

export default class BasicConnectionWeb {
  private permissions = ['allow-scripts'];
  private init: WhenAble;
  private frame;
  private messageHandler: (m: string) => void = (m: string) => {};
  private isDedicatedThread: boolean = true;
  private isDisconnected: boolean = false;

  constructor(tigerPath: string, platformInit) {
    if(tigerPath.substr(0, 7).toLocaleLowerCase() === 'file://') {
      this.permissions.push('allow-same-origin');
    }

    const sample = document.createElement('iframe');
    sample.src = `${tigerPath}frame.html`;
    // @ts-ignore
    sample.sandbox = permissions.join(' ');
    sample.style.display = 'none';

    this.init = new WhenAble();
    this.isDisconnected = false;

    platformInit.whenEmitted(() => {
      if(!this.isDisconnected) {
        this.frame = sample.cloneNode(false);
        document.body.appendChild(this.frame);

        window.addEventListener('message', (e) => {
          if(e.source === this.frame.contentWindow) {
            if(e.data.type === 'initialized') {
              this.isDedicatedThread = e.data.dedicatedThread;
              this.init.emit();
            } else {
              this.messageHandler(e.data);
            }
          }
        });
      }
    });
  }

  whenInit(handler) {
    this.init.whenEmitted(handler);
  } 

  send(data: Object) {
    this.frame.contentWindow.postMessage({type: 'message', data }, '*');
  }

  onMessage(handler) {
    this.messageHandler(handler);
  }

  onDisconnect() {}

  disconnect() {
    if(!this.isDisconnected) {
      this.isDisconnected = true;
      if(typeof this.frame !== 'undefined') {
        this.frame.parentNode.removeChild(this.frame);
      }
    }
  }
}