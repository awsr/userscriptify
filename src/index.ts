import { readFileSync } from "node:fs";


export interface UserscriptifyOptions {
  metadata?: string | object;
  replace?: string;
  indent?: number;
  style?: string;
  styleRaw?: string;
}

interface UserScriptData extends UserscriptifyOptions {
  metadata: string | MetadataInfo;
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

interface MetadataInfo {
  [key: string]: string | string[]
}


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

function formatHeader(header: string) {
  return header.startsWith("@") ? header : "@" + header;
}

function insertMetadata(contents: string, config: UserScriptData) {
  let metadataInfo: MetadataInfo;
  function metadataEntry(header: string, value: string) {
    return "// " + header.padEnd(maxKeyLength + 2) + value;
  }
  
  if (typeof config.metadata == "string") {
    metadataInfo = JSON.parse(readFileSync(config.metadata.trim(), "utf8"));
  }
  else {
    metadataInfo = config.metadata;
  }

  if (!("name" in metadataInfo || "@name" in metadataInfo)) {
    throw new Error("Userscript metadata information must contain a name.");
  }
  else {
    console.log(`Building userscript '${metadataInfo.name ? metadataInfo.name : metadataInfo["@name"]}'`);
  }

  const maxKeyLength = Object.keys(metadataInfo).reduce((a, c) => Math.max(a, formatHeader(c).length), 10);
  const scriptMetadata = ["// ==UserScript=="];
  // eslint-disable-next-line prefer-const
  for (let [key, value] of Object.entries(metadataInfo)) {
    if (!value || key === "$schema") continue;

    key = formatHeader(key);
    if (Array.isArray(value)) {
      for (const v of value) {
        scriptMetadata.push(metadataEntry(key, v));
      }
    }
    else {
      scriptMetadata.push(metadataEntry(key, value));
    }
  }
  // Explicit version number takes priority over the inferred one from package.json
  if (!("version" in metadataInfo || "@version" in metadataInfo)) {
    // Insert version number into 3rd line
    scriptMetadata.splice(2, 0, metadataEntry("@version", config.version));
  }

  // Insert default namespace entry into 4th line if not provided
  if (!("namespace" in metadataInfo || "@namespace" in metadataInfo)) {
    scriptMetadata.splice(3, 0, metadataEntry("@namespace", "http://tampermonkey.net"));
  }

  // Insert "// @grant  none" at the end if no "grant" value provided
  if (!("grant" in metadataInfo || "@grant" in metadataInfo)) {
    scriptMetadata.push(metadataEntry("@grant", "none"));
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
      // Overrides config.style
      cssArray = config.styleRaw.split("\n");
    }
    else if (config.style) {
      cssArray = readFileSync(config.style, "utf8").split("\n");
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
