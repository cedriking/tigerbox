const { build } = require('esbuild');
const rimraf = require('rimraf');

const clean = async () => {
  return new Promise(resolve => {
    rimraf('./dist', () => resolve());
  });
}

const runBuild = async (doClean = false) => {
  // Do not clean each time on watch, only on build or first run.
  if(doClean) await clean();
 
  // Build to browser js
  build({
    entryPoints: ['./src/tigerbox.ts'],
    minify: false,
    bundle: true,
    platform: 'browser',
    target: ['chrome58','firefox57','safari11','edge16'],
    outfile: './dist/tigerbox.js',
    sourcemap: 'inline'
  }).catch((e) => {
    console.log(e);
    process.exit(1)
  });

  // Minified version
  build({
    entryPoints: ['./src/tigerbox.ts'],
    minify: true,
    bundle: true,
    platform: 'browser',
    target: ['chrome58','firefox57','safari11','edge16'],
    outfile: './dist/tigerbox.min.js',
    sourcemap: 'inline'
  }).catch((e) => {
    console.log(e);
    process.exit(1);
  });

  build({
    entryPoints: [
      './src/models/tigerSite.ts', 
      './src/models/pluginNode.ts', 
      './src/models/pluginCore.ts'
    ],
    minify: false,
    bundle: true,
    platform: 'browser',
    target: ['chrome58', 'firefox57', 'safari11', 'edge16'],
    outdir: './dist/models',
    sourcemap: 'inline'
  }).catch(e => {
    console.log(e);
    process.exit(1);
  });
  
};
runBuild(true);

module.exports = runBuild;