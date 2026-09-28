module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.jsx?$": "babel-jest",
    "^.+\\.tsx?$": "ts-jest",
  },
  // Use ESM version of items.js because the CommonJS version has a bug
  moduleNameMapper: {
    "^itemsjs$": "<rootDir>/node_modules/itemsjs/dist/index.modern.js",
  },
  transformIgnorePatterns: ["/node_modules/(?!itemsjs/)"],
};
