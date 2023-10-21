import { readFileSync } from "node:fs";
import { stdout } from "node:process";
import { compile as sasscompile } from "sass";
const defaultConfig = {
  metadata: "meta.json",
  replace: "__<INSERTCSS>__",
  indent: 2,
  style: undefined,
  styleRaw: undefined,
  version: "1.0.0",
};
export function userscriptify(content, options = undefined) {
  const config = Object.assign({}, defaultConfig);
  applyPackageData(config);
  if (options) {
    // Options passed through loader script override settings in package.json
    applyOptions(config, options);
  }
  content = insertCSS(content, config);
  content = insertMetadata(content, config);
  return content;
}
export async function userscriptifyAsync(content, options = undefined) {
  return userscriptify(content, options);
}
function applyPackageData(config) {
  const packageData = JSON.parse(readFileSync("package.json", "utf8"));
  if ("userscriptify" in packageData) {
    const pkg = packageData.userscriptify;
    applyOptions(config, pkg);
  }
  config.version = packageData.version;
}
function applyOptions(config, object) {
  for (const prop in config) {
    if (prop === "version") continue; // Version is just a placeholder for later
    config[prop] = object[prop] || config[prop];
  }
}
function formatHeader(header) {
  return header.startsWith("@") ? header : "@" + header;
}
function insertMetadata(contents, config) {
  let metadataInfo;
  function metadataEntry(header, value) {
    return "// " + header.padEnd(maxKeyLength + 2) + value;
  }
  if (typeof config.metadata == "string") {
    metadataInfo = JSON.parse(readFileSync(config.metadata.trim(), "utf8"));
  } else {
    metadataInfo = config.metadata;
  }
  if (!("name" in metadataInfo || "@name" in metadataInfo)) {
    throw new Error("Userscript metadata information must contain a name.");
  }
  const maxKeyLength = Object.keys(metadataInfo).reduce(
    (a, c) => Math.max(a, formatHeader(c).length),
    10,
  );
  const scriptMetadata = ["// ==UserScript=="];
  // eslint-disable-next-line prefer-const
  for (let [key, value] of Object.entries(metadataInfo)) {
    if (!value || key === "$schema") continue;
    key = formatHeader(key);
    if (Array.isArray(value)) {
      for (const v of value) {
        scriptMetadata.push(metadataEntry(key, v));
      }
    } else {
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
function insertCSS(contents, config) {
  // Check if CSS styles are provided
  if (config.style || config.styleRaw) {
    if (!contents.includes(config.replace)) {
      console.error(`Style information is provided, but '${config.replace}' was not found`);
      return contents;
    }
    let cssArray = [];
    if (config.styleRaw) {
      cssArray = config.styleRaw.split("\n");
    } else if (config.style) {
      if (config.style.match(/\.s[ac]ss$/i)) {
        stdout.write("Compiling SASS/SCSS... ");
        cssArray = sasscompile(config.style).css.split("\n");
        console.log("Done");
      } else {
        cssArray = readFileSync(config.style, "utf8").split("\n");
      }
    }
    // TODO: Auto-detect indentation
    if (cssArray.length) {
      const spacing = "".padEnd(config.indent);
      const cssLineReducer = (accumulator, current) => {
        return accumulator + "\n" + spacing + current;
      };
      return contents.replace(
        config.replace,
        cssArray.filter((line) => line.length > 0).reduce(cssLineReducer, ""),
      );
    }
  }
  return contents;
}
