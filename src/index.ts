import { readFile } from "node:fs/promises";
import { stdout } from "node:process";
import { compile as sasscompile } from "sass";


export interface USOptions {
  meta: string;
  replace: string;
  indent: number;
  style?: string;
  styleRaw?: string;
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
    // Options passed through loader script override settings in package.json
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
  for (const prop in config) {
    if (prop === "version") continue; // Version isn't set through options object
    config[prop] = object[prop] || config[prop];
  }
}

function formatProp(header: string) {
  return header.startsWith("@") ? header : "@" + header;
}

async function insertMetadata(contents: string, config: UserScriptData) {
  const info = await readFile(config.meta, 'utf8').then(file => JSON.parse(file));
  if (!("name" in info || "@name" in info)) {
    throw new Error(`${config.meta} must contain a name.`);
  }
  const maxKeyLength = Object.keys(info).reduce((a, c) => Math.max(a, formatProp(c).length), 10);
  const metadata = ["// ==UserScript=="];
  // eslint-disable-next-line prefer-const
  for (let [key, value] of Object.entries(info)) {
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
  metadata.splice(2, 0, `// ${"@version".padEnd(maxKeyLength + 2)}${config.version}`);

  // Insert default namespace entry into 4th line if not provided
  if (!("namespace" in info || "@namespace" in info)) {
    metadata.splice(3, 0, `// ${"@namespace".padEnd(maxKeyLength + 2)}http://tampermonkey.net`);
  }

  metadata.push("// ==/UserScript==\n\n");
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
