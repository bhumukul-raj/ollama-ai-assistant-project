/**
 * @file node.d.ts
 * @description TypeScript declaration file providing minimal type definitions
 * for the Node.js module system.
 * 
 * This simplified declaration file allows TypeScript to recognize 'node' as a valid
 * module name during compilation, preventing type errors when Node.js functionality
 * is referenced. This is particularly useful for code that might run in both
 * browser and Node.js environments.
 * 
 * Rather than importing the full @types/node package, this minimal declaration
 * satisfies TypeScript's module resolution without adding unnecessary type definitions
 * to the codebase.
 */

// This is a simplified declaration file for Node.js
declare module 'node' {
  // This empty declaration is enough to satisfy TypeScript
} 