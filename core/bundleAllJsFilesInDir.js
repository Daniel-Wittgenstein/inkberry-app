const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const os = require('os');

async function bundleAllJsFilesInDir(inputDir) {

  //broken. just some shit the AI wrote

  const files = fs.readdirSync(inputDir)
    .filter(f => f.endsWith('.js'))
    .map(f => `import "./${f}";`)
    .join('\n');

  const entryPath = path.join(os.tmpdir(), `temp-entry-${Date.now()}.js`);
  fs.writeFileSync(entryPath, files);

  const result = await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    format: 'iife',
    write: false, // don't write to disk
    absWorkingDir: inputDir,
  });

  fs.unlinkSync(entryPath); // clean up temp file
  return result.outputFiles[0].text;
}

module.exports = bundleAllJsFilesInDir;
