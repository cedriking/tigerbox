import Connection from "./connection";
import TigerboxSite from "./tigerboxSite";

declare let connection: Connection;
declare const application: any;
let Tiger = TigerboxSite;

(() => {
  const site = new Tiger(connection);

  Tiger = null;
  connection = null;

  site.onGetInterface(() => launchConnected());
  site.onRemoteUpdate(() => application.remote = site.getRemote());

  let connected = false;
  let connectedHandlers = [];

  const launchConnected = () => {
    if(!connected) {
      connected = true;

      let handler: Function;
      while(handler = connectedHandlers.pop()) {
        handler();
      }
    }
  };

  const checkHandler = (handler: Function) => {
    const type = typeof handler;
    if(type !== 'function') {
      throw new Error(`A function may only be subscribed to the event, ${type} was provided instead.`);
    }

    return handler;
  }

  application.whenConnected = (handler: Function) => {
    handler = checkHandler(handler);
    if(connected) {
      handler();
    } else {
      connectedHandlers.push(handler);
    }
  }

  application.setInterface =  (api: Object = {}) => {
    site.setInterface (api);
  }

  application.disconnect =  (api: Object = {}) => {
    site.disconnect();
  }
})();