// import pkg from './package.json'
import path from "path";
// Locate modules using the Node resolution algorithm, for using third party modules in node_modules
import resolve from "@rollup/plugin-node-resolve";
// Convert CommonJS modules to ES6, so they can be included in a Rollup bundle
import commonjs from "@rollup/plugin-commonjs";
// Adds babel as a compilation stage.
import babel from "rollup-plugin-babel";
// Handle json
import json from "rollup-plugin-json";
// Get filezise on output
import filesize from "rollup-plugin-filesize";
// Replace strings in files while bundling them.
import alias from "rollup-plugin-alias";
// Handle vue SFC files
import vue from "rollup-plugin-vue";
import replace from "@rollup/plugin-replace";
import klawSync from "klaw-sync";
import _ from "lodash";

const plugins = [
  replace({
    "process.env.NODE_ENV": JSON.stringify("production"),
  }),
  alias({
    resolve: [".js", ".ts", ".tsx", ".jsx", ".es6", ".es", ".mjs", ".vue"],
    entries: [{ find: /@\/(.*)/, replacement: path.resolve("./src/$1") }],
  }),
  vue({
    css: true, // Dynamically inject css as a <style> tag
    template: {
      isProduction: true, // Explicitly convert template to render function
    },
    customBlocks: [
      "!docs", // exclude <docs>
    ],
    normalizer: "~vue-runtime-helpers/dist/normalize-component.js",
    styleInjector: "~vue-runtime-helpers/dist/inject-style/browser.js",
  }),
  resolve({ jsnext: true, preferBuiltins: true, browser: true }), // so Rollup can find node_modules
  commonjs(), // so Rollup can convert ES module
  json(),
  filesize(),
  babel({
    runtimeHelpers: false,
    exclude: "node_modules/**",
    extensions: [".js", ".ts", ".tsx", ".jsx", ".es6", ".es", ".mjs", ".vue"],
  }), // Transpile to ES5
];

// ESM/UMD/IIFE shared settings: externals
// Refer to https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency
const external = [
  "vue",
  "axios",
  "js-cookie",
  "jwt-decode",
  "vue-i18n",
  "vue-router",
  "vuejs-logger",
  "vuex",
  "node-vibrant",
  "cropperjs",
  "xlsx",
];

// Get the names of all components in the src directory
const simpleComponents = klawSync(path.resolve(__dirname, "./src/components"), {
  nodir: true,
  traverseAll: true,
  filter: (item) => {
    return /Simple.*\.vue$/.test(path.basename(item.path));
  },
}).map((item) => {
  return {
    name: _.kebabCase(path.basename(item.path).replace(/\.\w+$/, "")),
    path: item.path,
  };
});

export default [
  // ES module (for bundlers) build.
  {
    external,
    output: [
      {
        exports: "named",
        file: "./dist/simple-ui.es.js",
        format: "esm",
      },
    ],
    plugins: [...plugins],
  },

  ...simpleComponents.map((simpleComponent) => {
    return {
      input: simpleComponent.path,
      external,
      output: [
        {
          exports: "named",
          file: `./dist/components/${simpleComponent.name}/${simpleComponent.name}.es.js`,
          format: "esm",
        },
      ],
      plugins: [...plugins],
    };
  }),
];
