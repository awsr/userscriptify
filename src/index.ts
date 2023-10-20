import { readFileSync } from "node:fs";
import { stdout } from "node:process";
import { compile as sasscompile } from "sass";


export interface UserscriptifyOptions {
  metadata?: string | object;
  replace?: string;
  indent?: number;
  style?: string;
  styleRaw?: string;
}

interface UserScriptData extends UserscriptifyOptions {
  metadata: string | object;
  replace: string;
  indent: number;
  version: string;
}

const defaultConfig: UserScriptData = {
  metadata: "meta.json",
  replace: "__<INSERTCSS>__",
  indent: 2,
  style: undefined,
  styleRaw: undefined,
  version: "1.0.0"
};


export function userscriptify(content: string, options: undefined | UserscriptifyOptions = undefined) {
  const config = Object.assign({}, defaultConfig);
  applyPackageData(config);
  if (options) {
    // Options passed through loader script override settings in package.json
    applyOptions(config, options);
  }
  content = insertCSS(content, config);
  content = insertMetadata(content, config);
  return content
}

export async function userscriptifyAsync(content: string, options: undefined | UserscriptifyOptions = undefined) {
  return userscriptify(content, options);
}

function applyPackageData(config: UserScriptData) {
  const packageData = JSON.parse(readFileSync("package.json", "utf8"));
  if ("userscriptify" in packageData) {
    const pkg = packageData.userscriptify as UserscriptifyOptions;
    applyOptions(config, pkg);
  }
  config.version = packageData.version as string;
}

function applyOptions(config: UserScriptData, object: UserscriptifyOptions) {
  for (const prop in config) {
    if (prop === "version") continue; // Version is just a placeholder for later
    config[prop] = object[prop] || config[prop];
  }
}

function formatProp(header: string) {
  return header.startsWith("@") ? header : "@" + header;
}

function insertMetadata(contents: string, config: UserScriptData) {
  let metadataInfo;
  if (typeof config.metadata == "string") {
    metadataInfo = JSON.parse(readFileSync(config.metadata.trim(), "utf8"));
  }
  else {
    metadataInfo = config.metadata;
  }

  if (!("name" in metadataInfo || "@name" in metadataInfo)) {
    throw new Error(`Userscript metadata information must contain a name.`);
  }

  const maxKeyLength = Object.keys(metadataInfo).reduce((a, c) => Math.max(a, formatProp(c).length), 10);
  const scriptMetadata = ["// ==UserScript=="];
  // eslint-disable-next-line prefer-const
  for (let [key, value] of Object.entries(metadataInfo)) {
    if (!value) continue;

    key = formatProp(key);
    if (Array.isArray(value)) {
      for (const v of value) {
        scriptMetadata.push(`// ${key.padEnd(maxKeyLength + 2)}${v}`);
      }
    }
    else {
      scriptMetadata.push(`// ${key.padEnd(maxKeyLength + 2)}${value}`);
    }
  }
  // Explicit version number takes priority over the inferred one from package.json
  if (!("version" in metadataInfo || "@version" in metadataInfo)) {
    // Insert version number into 3rd line
    scriptMetadata.splice(2, 0, `// ${"@version".padEnd(maxKeyLength + 2)}${config.version}`);
  }

  // Insert default namespace entry into 4th line if not provided
  if (!("namespace" in metadataInfo || "@namespace" in metadataInfo)) {
    scriptMetadata.splice(3, 0, `// ${"@namespace".padEnd(maxKeyLength + 2)}http://tampermonkey.net`);
  }

  scriptMetadata.push("// ==/UserScript==\n\n");
  contents = scriptMetadata.join("\n") + contents;
  return contents;
}

function insertCSS(contents: string, config: UserScriptData) {
  // Check if CSS styles are provided
  if ((config.style || config.styleRaw)) {
    if (!contents.includes(config.replace)) {
      console.error(`Style information is provided, but '${config.replace}' was not found`);
      return contents;
    }

    let cssArray: string[] = [];
    if (config.styleRaw) {
      cssArray = config.styleRaw.split("\n");
    }
    else if (config.style) {
      if (config.style.match(/\.s[ac]ss$/i)) {
        stdout.write("Compiling SASS/SCSS... ");
        cssArray = sasscompile(config.style).css.split("\n");
        console.log("Done");
      }
      else {
        cssArray = readFileSync(config.style, "utf8").split("\n");
      }
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
