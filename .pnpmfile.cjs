/**
 * pnpm 9 does not consistently apply workspace-level overrides to exact
 * transitive dependency pins. Next 15.5.24 still pins a vulnerable PostCSS
 * release, so normalize that dependency while keeping Next on the patched
 * 15.5 line required by this application.
 */
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === 'next' && pkg.version === '15.5.24' && pkg.dependencies) {
        pkg.dependencies.postcss = '8.5.23';
      }

      return pkg;
    },
  },
};
