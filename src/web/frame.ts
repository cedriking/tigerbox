const scripts = document.getElementsByTagName("script");
const thisScript = scripts[scripts.length - 1];
const parentNode = thisScript.parentNode;
const tigerPath = thisScript.src.split('?')[0]
  .split('/')
  .slice(0, -1)
  .join('/')+'/';

const initWebWorkerPlugin = () => {
  const blobCode = `
  self.addEventListener('message', function(m) {
    if(m.data.type === 'initImport') {
      importScripts(m.data.url);
      self.postMessage({
        type: 'initialized',
        dedicatedThread: true
      });
    }
  });
  `;

  const blobUrl = window.URL.createObjectURL(new Blob([blobCode]));
  const worker = new Worker(blobUrl);

  worker.postMessage({type: 'initImport', url: `${tigerPath}pluginWebWorker.js`});

  const fallbackTimeout = setTimeout(() => {
    worker.terminate();
    initIframePlugin();
  });

  // @ts-ignore
  worker.addEventListner('message', (m) => worker.postMessage(m.data));
};

let currentErrorHandler: Function = () => {};
const initIframePlugin = () => {
  // @ts-ignore
  window.loadScript = (path: string, successCallback: Function = () => {}, failureCallback: Function = () => {}) => {
    const script = document.createElement('script');
    script.src = path;

    const clear = () => {
      script.onload = null;
      script.onerror = null;
      // @ts-ignore
      script.onreadystatechange = null;
      script.parentNode.removeChild(script);
      currentErrorHandler = () => {};
    };

    const success = () => {
      clear();
      successCallback();
    };

    const failure = () => {
      clear();
      failureCallback();
    };

    currentErrorHandler = failure;

    script.onerror = failure;
    script.onload = success;
    // @ts-ignore
    script.onreadystatechange = () => {
      // @ts-ignore
      const state = script.readyState;
      if(state === 'loaded' || state === 'complete') {
        success();
      }
    };

    parentNode.appendChild(script);
  }

  window.addEventListener('error', (msg) => currentErrorHandler());
  // @ts-ignore
  window.loadScript(`${tigerPath}pluginWebIframe.js`);
};

try {
  initWebWorkerPlugin();
} catch (e) {
  initIframePlugin();
}