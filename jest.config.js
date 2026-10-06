/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Yük altında (paralel işçiler) ekran testleri 5 sn'yi aşabiliyor.
  testTimeout: 20000,
  setupFiles: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/ios/', '<rootDir>/android/', '<rootDir>/supabase/', '<rootDir>/e2e-web/', '<rootDir>/\\.claude/'],
  modulePathIgnorePatterns: ['<rootDir>/\\.claude/'],
};
