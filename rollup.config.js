import babel from "rollup-plugin-babel";
import node from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import pkg from "./package.json";
let input = "index.js";

const { main } = pkg;

let external = [
  "modules/api",
  "backbone",
  "hyprlivecontext",
  "underscore",
  "modules/jquery-mozu"
];

export default {
  input,
  output: {
    name: "kibo-theme-utilities",
    compact: true,
    format: "amd",
    file: main + ".js",
    compress: false
  },
  external,
  plugins: [
    commonjs(),
    babel({ exclude: "node_modules/**" }),
    node({ browser: true })
  ]
};
