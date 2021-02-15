import path from 'path';

export class Utils {
  static isNode() {
    return (
      typeof process !== 'undefined' &&
      // @ts-ignore
      !process.browser &&
      process.release.name.search(/node|io.js/) !== -1
    );
  }

  static getTigerPath() {
    if(Utils.isNode()) {
      return path.join(__dirname, '../');
    } else {
      const scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1].src
        .split('?')[0]
        .split('/')
        .slice(0, -1)
        .join('/') + '/';
    }
  }
}
