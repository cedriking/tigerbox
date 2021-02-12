import {Plugin} from '../../src/models/plugin';
import tigerbox from '../../src/tigerbox';
// @ponicode
describe('inst.getPlugin', () => {
  let inst = new tigerbox();

  beforeEach(() => {
    inst = new tigerbox();
  });

  test('0', () => {
    expect(inst.Plugin).toBeInstanceOf(Function);
  });

  test('1', () => {
    const code = `application.remote.console.log('Hello from the plugin!')`;
    const plugin = inst.DynamicPlugin(code, { console: console });

    // called after the plugin is loaded
    const start = function () {
      // exported method is available at this point
      // @ts-ignore
      plugin.remote.square(2, reportResult);
    };

    const reportResult = function (result) {
      console.log('Result is: ' + result);
    };

    plugin.whenConnected(start);
  });
});
