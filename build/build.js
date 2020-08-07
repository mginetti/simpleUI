/* eslint-disable no-console */
const fs = require("fs-extra");
const path = require("path");
const { execSync } = require("child_process");
const klawSync = require("klaw-sync");
const _ = require("lodash");
const packageJson = require("../package.json");

// Rollup
const rollup = require("rollup");
// Locate modules using the Node resolution algorithm, for using third party modules in node_modules
const resolve = require("@rollup/plugin-node-resolve");
// Convert CommonJS modules to ES6, so they can be included in a Rollup bundle
const commonjs = require("@rollup/plugin-commonjs");
// Adds babel as a compilation stage.
const babel = require("rollup-plugin-babel");
// Handle json
const json = require("rollup-plugin-json");
// Get filezise on output
const filesize = require("rollup-plugin-filesize");
// Minify
const terser = require("rollup-plugin-terser").terser;
// Replace strings in files while bundling them.
const alias = require("rollup-plugin-alias");
// Handle vue SFC files
const vue = require("rollup-plugin-vue");
const replace = require("@rollup/plugin-replace");

const rollupPlugins = [
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
];

// UMD/CJS shared settings: output.globals
// Refer to https://rollupjs.org/guide/en#output-globals for details
const globals = {
  // Provide global variable names to replace your external imports
  // eg. jquery: '$'
  vue: "Vue",
  axios: "Axios",
  "js-cookie": "Cookies",
  "jwt-decode": "jwtDecode",
  "vue-i18n": "VueI18n",
  "vue-router": "VueRouter",
  "vuejs-logger": "VueLogger",
  vuex: "Vuex",
  "node-vibrant": "Vibrant",
  cropperjs: "Cropper",
};

function getPath(...args) {
  return path.resolve(__dirname, ...args);
}

async function build() {
  console.info("🚀 Let's build SimpleUI!");

  // Get the names of all components in the src directory
  const components = klawSync(path.resolve(__dirname, "../src/components"), {
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

  const packageName = packageJson.name;

  console.info("🏗 Building main library");
  await rollupBuild({
    input: "src/entry.js",
    name: packageName,
    root: true,
  });
  packageJson.browser = {};

  // For each component in the src directory
  for (const component of components) {
    // Build the component individually
    console.info(`🏗 Building ${component.name}`);

    await rollupBuild({
      input: component.path,
      name: component.name,
      subfolder: "components",
    });

    packageJson.browser[
      `./${component.name}`
    ] = `./dist/components/${component.name}/${component.name}.es.js`;
  }

  // write package json
  fs.writeFileSync(
    getPath(`../package.json`),
    JSON.stringify(packageJson, null, 2)
  );

  // Build the main lib, with all plugins packaged into a plugin
  // console.info('🏗 Building styleguide')
  // execSync(`npm run styleguide:build`)
}

async function rollupBuild({ input, name, root = false, subfolder = null }) {
  const bundle = await rollup.rollup({
    external,
    input,
    plugins: [
      ...rollupPlugins,
      terser({
        output: {
          ecma: 5,
        },
      }),
    ],
  });
  const bundleEsm = await rollup.rollup({
    external,
    input,
    plugins: [...rollupPlugins, terser()],
  });
  await bundle.write({
    compact: true,
    exports: "named",
    file: `./dist/${subfolder ? `${subfolder}/` : ""}${
      !root ? `${name}/` : ""
    }${name}.umd.js`,
    format: "umd",
    globals,
    name,
  });
  await bundle.write({
    compact: true,
    exports: "named",
    file: `./dist/${subfolder ? `${subfolder}/` : ""}${
      !root ? `${name}/` : ""
    }${name}.common.js`,
    format: "cjs",
    globals,
    name,
  });
  await bundleEsm.write({
    globals,
    compact: true,
    exports: "named",
    file: `./dist/${subfolder ? `${subfolder}/` : ""}${
      !root ? `${name}/` : ""
    }${name}.es.js`,
    format: "esm",
  });
}

build();
