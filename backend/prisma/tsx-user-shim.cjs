// Node 24 on some Windows installations can fail inside os.userInfo() before
// tsx starts. tsx only needs a stable value to name its temporary directory.
if (process.platform === 'win32' && typeof process.geteuid !== 'function') {
  Object.defineProperty(process, 'geteuid', {
    configurable: true,
    value: () => 0,
  });
}
