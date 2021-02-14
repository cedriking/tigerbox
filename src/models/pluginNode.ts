let application = {};
let connection = {};

const printError = (msg) => {
  console.error();
  console.error(msg);
};

process.on('message', (m) => {
  switch (m.type) {
    case 'import':
      importScript(m.url);
      break;
    case 'importTiger':
      importScriptTiger(m.url);
      break;
    case 'execute':
      execute(m.code);
      break;
    case 'message':
      try {
        conn.messageHandler(m.data);
      } catch (e) {
        printError(e.stack);
      }
      break;
  }
});

const isRemote = (path: string) => {
  return (
    path.substr(0, 7).toLowerCase() == 'http://' ||
    path.substr(0, 8).toLowerCase() == 'https://'
  );
};

const importScript = (url) => {
  const successCallback = () => {
    process.send({type: 'importSuccess', url})
  };
  const failureCallback = () => {
    process.send({type: 'importFailure', url});
  }

  const run = (code: string) => {
    executeNormal(code, url, successCallback, failureCallback);
  }

  if(isRemote(url)) {
    loadRemote(url, run, failureCallback);
  } else {
    try {
      run(loadLocal(url));
    } catch (e) {
      printError(e.stack)
      failureCallback();
    }
  }
};

const importScriptTiger = (url: string) => {
  const successCallback = () => process.send({type: 'importSuccess', url});
  const failureCallback = () => process.send({type: 'importFailure', url});

  const run = (code: string) => executeTiger(code, url, successCallback, failureCallback);

  if(isRemote(url)) {
    loadRemote(url, run, failureCallback);
  } else {
    try {
      run(loadLocal(url));
    } catch (e) {
      printError(e.stack);
      failureCallback();
    }
  }
};

const execute = (code: string) => {
  const successCallback = () => process.send({type: 'executeSuccess'})
  const failureCallback = () => process.send({type: 'executeFailure'})

  executeTiger(code, 'DYNAMIC PLUGIN', successCallback, failureCallback)
};

const executeNormal = (code: string, url: string, successCallback: Function, failureCallback: Function) => {
  try {
    require('vm').runInthisContext(code, url);
  } catch(e) {
    printError(e.stack);
    failureCallback();
  }
};

const executeTiger = (code: string, url: string, successCallback: Function, failureCallback: Function) => {
  console.log('executingTiger');
  console.log(url);

  let vm;
  try {
    vm = require('vm');
  } catch(e) {
    printError(e.stack);
    failureCallback();
    return;
  }
  
  const sandbox: Object = {};
  const expose = [
    'application',
    'setTimeout',
    'setInterval',
    'clearTimeout',
    'clearInterval'
  ];

  for(const exp of expose) {
    sandbox[exp] = global[exp];
  }

  code = `"use strict";\n${code}`;
  try {
    vm.runInNewContext(code, vm.createContext(sandbox), url);
    successCallback();
  } catch (e) {
    printError(e.stack)
    failureCallback();
  }
};

const loadLocal = (path: string) => {
  let res = '';

  try {
    res = require('fs').readFileSync(path).toString();
  } catch (e) {
    console.error(e.stack);
  }

  return res;
}

const loadRemote = (url: string, successCallback: Function, failureCallback: Function) => {
  const receive = (res) => {
    if(res.statusCode !== 200) {
      printError(`Failed to load ${url}\nHTTP response status code: ${res.statusCode}`);
      failureCallback();
    } else {
      let content = '';
      res.on('end', () => successCallback(content));
      res.on('readable', () => {
        const chunk = res.read();
        content += chunk.toString();
      })
    }
  };

  try {
    require('http').get(url, receive).on('error', failureCallback);
  } catch (err) {
    printError(err.stack);
    failureCallback();
  }
}

const conn = {
  disconnect: () => process.exit(),
  send: (data) => process.send({type: 'message', data}),
  onMessage: (handler) => conn.messageHandler = handler,
  messageHandler: (m) => {},
  onDisconnect: () => {}
};

connection = conn;