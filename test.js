const Tigerbox = require('./lib/tigerbox').default;

const tiger = new Tigerbox();

const code = `function square() {return num*num;}`;
const plugin = tiger.DynamicPlugin(code, { console: console });

// called after the plugin is loaded
const start = function () {
    // exported method is available at this point
    // @ts-ignore
    plugin.remote.square(2, reportResult);
};

const reportResult = function (result) {
    console.log('Result is: ' + result);
    plugin.disconnect();
    done();
};

plugin.whenConnected(() => {
  console.log('connected');
  start();
});