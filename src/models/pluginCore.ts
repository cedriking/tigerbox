import { TigerSite } from './tigerSite';
import { Whenable } from './whenable';

declare let application;
declare let connection;

(() => {
  const site = new TigerSite(connection);
  connection = null;

  site.onGetApi(() => whenable.emit());
  site.onRemoteUpdate(() => (application.remote = site.getRemote()));
  
  const whenable = new Whenable();
  application.whenConnected = (handler: Function) =>
    whenable.whenEmitted(handler);
  
  application.setApi = (api: Object) => site.setApi(api);
  application.disconnect = () => site.disconnect();
  
})();