import { readFile } from "node:fs/promises";
import { stdout } from "node:process";
import { compile as sasscompile } from "sass";


export interface USOptions {
  meta: string;
  replace: string;
  indent: number;
  style: string | undefined;
  styleRaw: string | undefined;
}

interface UserScriptData extends USOptions {
  version: string;
}

const defaultConfig: UserScriptData = {
  meta: "meta.json",
  replace: "__<INSERTCSS>__",
  indent: 2,
  style: undefined,
  styleRaw: undefined,
  version: "1.0.0"
};


export async function userscriptify(content: string, options: undefined | Partial<USOptions> = undefined) {
  const config = Object.assign({}, defaultConfig);
  await applyPackageData(config);
  if (options) {
    applyOptions(config, options);
  }
  return await insertCSS(content, config)
    .then(contents => insertMetadata(contents, config));
}

async function applyPackageData(config: UserScriptData) {
  const packageData = await readFile('package.json', 'utf8').then(file => JSON.parse(file));
  if ("userscriptify" in packageData) {
    const pkg = packageData.userscriptify as Partial<USOptions>;
    applyOptions(config, pkg);
  }
  config.version = packageData.version as string;
}

function applyOptions(config: UserScriptData, object: Partial<USOptions>) {
  config.meta = object.meta || config.meta;
  config.replace = object.replace || config.replace;
  config.indent = object.indent || config.indent;
  config.style = object.style || config.style;
  config.styleRaw = object.styleRaw || config.styleRaw;
}

function formatProp(header: string) {
  return header.startsWith("@") ? header : "@" + header;
}

async function insertMetadata(contents: string, config: UserScriptData) {
  const info = await readFile(config.meta, 'utf8').then(file => JSON.parse(file));
  const maxKeyLength = Object.keys(info).reduce((a, c) => Math.max(a, formatProp(c).length), 8);
  const metadata = ["// ==UserScript=="];
  for (let [key, value] of Object.entries(info)) {  // eslint-disable-line prefer-const
    if (key === "version" || !value) continue;

    key = formatProp(key);
    if (Array.isArray(value)) {
      for (const v of value) {
        metadata.push(`// ${key.padEnd(maxKeyLength + 2)}${v}`);
      }
    }
    else {
      metadata.push(`// ${key.padEnd(maxKeyLength + 2)}${value}`);
    }
  }
  // Insert version number into 3rd line
  metadata.splice(Math.min(2, metadata.length), 0, `// ${"@version".padEnd(maxKeyLength + 2)}${config.version}`);

  metadata.push("// ==/UserScript==", "\n");
  contents = metadata.join("\n") + contents;
  return contents;
}

async function insertCSS(contents: string, config: UserScriptData) {
  if ((config.style || config.styleRaw) && contents.includes(config.replace)) {
    let cssArray: string[] = [];
    if (config.style) {
      if (config.style.match(/\.s[ac]ss$/i)) {
        stdout.write("Compiling SASS/SCSS... ");
        cssArray = sasscompile(config.style).css.split("\n");
        console.log("Done");
      }
      else {
        cssArray = await readFile(config.style, "utf8").then(input => input.split("\n"));
      }
    }
    else if (config.styleRaw) {
      cssArray = config.styleRaw.split("\n");
    }
    // TODO: Auto-detect indentation
    if (cssArray.length) {
      const spacing = "".padEnd(config.indent);
      const cssLineReducer = (accumulator: string, current: string) => {
        return accumulator + "\n" + spacing + current;
      };
      return contents.replace(config.replace, cssArray.filter(line => line.length > 0).reduce(cssLineReducer, ""));
    }
  }
  return contents;
}
