import BasicConnectionNode from "./models/basicConnectionNode";
import BasicConnectionWeb from "./models/basicConnectionWeb";
import WhenAble from "./models/whenable";
import Plugin from './models/plugin';

export default class TigerBox {
  private isNode: boolean = false;
  private tigerPath: string;
  private platformInit = new WhenAble();

  constructor() {
    this.isNode = (
      (typeof process !== 'undefined') && 
      // @ts-ignore
      (!process.browser) && 
      (process.release.name.search(/node|io.js/) !== -1));

    if(this.isNode) {
      this.tigerPath = __dirname + '/';
      this.initNode();
      // @ts-ignore
      this.BasicConnection = BasicConnectionNode;
    } else {
      const scripts = document.getElementsByTagName('script');
      this.tigerPath = scripts[scripts.length - 1].src.split('?')[0].split('/').slice(0, -1).join('/')+'/';
      
      this.initWeb();
    }
  }

  getPlugin() {
    return Plugin;
  }

  private initNode() {
    require('./tigerboxSite.ts');
  }

  private initWeb() {
    const load = async (path) => {
      return new Promise((resolve) => {
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
          resolve(true);
        }

        script.onerror = clear;
        script.onload = success;
        // @ts-ignore
        script.onreadystatechange = () => {
          // @ts-ignore
          const state = script.readyState;
          if(state === 'loaded' || state === 'complete') {
            success();
          }
        }

        document.body.appendChild(script);
      });
      
    };

    const winOnLoad = window.onload || function() {};

    window.onload = async () => {
      // @ts-ignore
      winOnLoad();
      await load(this.tigerPath);
      this.platformInit.emit();
    }
  }
}