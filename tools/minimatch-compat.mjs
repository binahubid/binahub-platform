import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);

// Lint-process-only compatibility; all matching stays in the patched v11 engine.
const resolved = require.resolve('minimatch');
const engine = require(resolved);
if (typeof engine !== 'function') {
  const callable = Object.assign(
    (path, pattern, options) => engine.minimatch(path, pattern, options), engine,
  );
  callable.makeRe = (pattern, options) => {
    const matcher = new engine.Minimatch(pattern, options);
    return {test: value => matcher.match(value)};
  };
  require.cache[resolved].exports = callable;
}
