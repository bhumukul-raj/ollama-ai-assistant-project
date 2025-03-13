/**
 * @file node-js.d.ts
 * @description TypeScript declaration file providing minimal type definitions
 * for the NodeJS namespace used in browser environments.
 * 
 * This file defines a subset of Node.js related types that are needed for browser-based
 * code, specifically for timer-related functionalities like setTimeout and clearTimeout.
 * By providing these definitions, TypeScript can properly type-check code that uses
 * these browser APIs that are part of the Node.js compatibility layer.
 * 
 * The primary focus is on the Timeout interface, which is needed to correctly
 * handle timer IDs in TypeScript when working with setTimeout/clearTimeout.
 */

// This is a simplified declaration file for NodeJS namespace
declare namespace NodeJS {
  /**
   * Interface defining the structure of a timer timeout object
   * 
   * This extends the Number primitive to work with clearTimeout and clearInterval
   * functions. When setTimeout or setInterval returns a timer ID, it's actually
   * returning an object with these properties, which is treated as a number
   * by the JavaScript runtime.
   * 
   * @interface Timeout
   * @extends Number
   * @property {number} _idleTimeout - The timeout period in milliseconds
   * @property {any} _idlePrev - Internal linked list pointer to previous timeout
   * @property {any} _idleNext - Internal linked list pointer to next timeout
   * @property {number} _idleStart - Timestamp when this timeout was created
   * @property {Function} _onTimeout - Callback function to execute when timer fires
   * @property {any[]} _timerArgs - Arguments to pass to the callback function
   * @property {Function|null} _repeat - For interval timers, the function to repeat
   */
  interface Timeout extends Number {
    // This interface extends Number to work with clearTimeout and clearInterval
    _idleTimeout: number;
    _idlePrev: any;
    _idleNext: any;
    _idleStart: number;
    _onTimeout: Function;
    _timerArgs: any[];
    _repeat: Function | null;
  }
} 