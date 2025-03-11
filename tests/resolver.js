// Custom resolver for Jest to handle modules like react-hooks-testing-library with React 18
module.exports = (path, options) => {
  // Call the default resolver
  return options.defaultResolver(path, {
    ...options,
    // Use package.json "main" field for resolving instead of "module" field
    packageFilter: pkg => {
      // Handle react-test-renderer specifically
      if (pkg.name === 'react-test-renderer') {
        return {
          ...pkg,
          // Force use of CJS version for react-test-renderer
          main: pkg.main || pkg.cjs || pkg.exports.require || pkg.exports.node || pkg.exports.default
        };
      }
      
      // Handle all other packages normally
      return {
        ...pkg,
        main: pkg.main || pkg.module
      };
    }
  });
}; 