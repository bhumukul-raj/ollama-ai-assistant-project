/**
 * @file jest.d.ts
 * @description TypeScript declaration file for Jest testing framework.
 * 
 * This simplified declaration file allows TypeScript to recognize Jest
 * as a valid module during the build process, without requiring the full
 * type definitions. It's used to prevent TypeScript errors when Jest-related
 * code is imported but the full Jest types aren't needed.
 * 
 * This is a minimal implementation that simply declares the module existence
 * without defining specific types, which is sufficient for build purposes
 * when Jest isn't directly used in the main application code.
 */

// This is a simplified declaration file for Jest
declare module 'jest' {
  // This empty declaration is enough to satisfy TypeScript
} 