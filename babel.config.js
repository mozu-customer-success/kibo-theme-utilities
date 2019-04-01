const presets = [
  [
    "@babel/env",
    {
      targets: "> 0.25%, not dead",
      useBuiltIns: "usage",
      corejs: 3
    }
  ]
];

const options = {};

module.exports = Object.assign(options, { presets, plugins: [] });
