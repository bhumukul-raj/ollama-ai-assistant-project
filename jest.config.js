module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'ollama_jupyter_ai/labextension/tsconfig.json',
      },
    ],
  },
  testRegex: '(/tests/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': '<rootDir>/tests/mocks/styleMock.js',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/tests/mocks/fileMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'ollama_jupyter_ai/labextension/src/**/*.{ts,tsx}',
    '!ollama_jupyter_ai/labextension/src/**/*.d.ts'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  testPathIgnorePatterns: ['/node_modules/', '/lib/'],
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  // Ignore some test warnings related to the testing environment
  transformIgnorePatterns: [
    'node_modules/(?!(@jupyterlab)/)'
  ],
  // Fix for Jest issue with react-hooks (support for React 18)
  resolver: '<rootDir>/tests/resolver.js'
}; 