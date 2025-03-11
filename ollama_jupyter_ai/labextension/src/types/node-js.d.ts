// This is a simplified declaration file for NodeJS namespace
declare namespace NodeJS {
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