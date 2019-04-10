import babel from "rollup-plugin-babel";
import node from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import { uglify } from "rollup-plugin-uglify";
import replace from "rollup-plugin-replace";
import pkg from "./package.json";
let input = "index.js";
import includePaths from "rollup-plugin-includepaths";

let includePathOptions = {
  include: {},
  paths: ["./"],
  external: [],
  extensions: [".js", ".json", ".html"]
};

const { main } = pkg;

let external = [
  "modules/api",
  "backbone",
  "hyprlivecontext",
  "underscore",
  "modules/jquery-mozu"
];

let uglifyOptions = {};

let env = process.env;

let ifProduction = (is, otherwise) =>
  env.NODE_ENV === "production" ? is || true : otherwise || false;

let plugins = [
  commonjs({
    sourceMap: ifProduction(false, "inline")
  }),
  node({ browser: true, preferBuiltins: false }),
  includePaths(includePathOptions),
  replace({
    "process.env.NODE_ENV": JSON.stringify(env.NODE_ENV || "developement")
  })
];
//would be really nice to not transpile (especially since the source maps are not aligned)
//but mozu-require-compiler chokes on es6
if (true || ifProduction()) {
  plugins.splice(
    1,
    0,
    babel({
      exclude: "node_modules/**",
      sourceMaps: ifProduction(false, "inline")
    })
  );
}

if (ifProduction()) {
  plugins.push(uglify(uglifyOptions));
}

export default {
  input,
  output: {
    name: "kibo-theme-utilities",
    compact: ifProduction(),
    format: "amd",
    file: ifProduction(main.replace(".js", "") + ".min.js", main),
    compress: ifProduction(),
    sourcemap: ifProduction(false, false)
  },
  external,
  plugins
};
