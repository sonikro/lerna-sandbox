async function lernaPublishAsync(packageToVersionChange) {
  // HACK: Lerna publish does not provide a way to specify multiple package versions via
  // flags so instead we need to interact with their interactive prompt interface.
  const child = spawn('lerna', ['publish', '--registry=https://registry.npmjs.org/'], {
    cwd: constants.monorepoRootPath,
  });
  let shouldPrintOutput = false;
  child.stdout.on('data', (data) => {
    const output = data.toString('utf8');
    if (shouldPrintOutput) {
      utils.log(output);
    }
    const isVersionPrompt = _.includes(output, 'Select a new version');
    if (isVersionPrompt) {
      const outputStripLeft = output.split('new version for ')[1];
      const packageName = outputStripLeft.split(' ')[0];
      let versionChange = packageToVersionChange[packageName];
      const isPrivatePackage = _.isUndefined(versionChange);
      if (isPrivatePackage) {
        versionChange = 'patch'; // Always patch updates to private packages.
      }
      const semVerIndex = semverNameToIndex[versionChange];
      child.stdin.write(`${semVerIndex}\n`);
    }
    const isFinalPrompt = _.includes(output, 'Are you sure you want to publish the above changes?');
    if (isFinalPrompt && !IS_DRY_RUN) {
      child.stdin.write(`y\n`);
      // After confirmations, we want to print the output to watch the `lerna publish` command
      shouldPrintOutput = true;
    } else if (isFinalPrompt && IS_DRY_RUN) {
      utils.log(
        `Submitted all versions to Lerna but since this is a dry run, did not confirm. You need to CTRL-C to exit.`,
      );
    }
  });
}