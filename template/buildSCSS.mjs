import { readFileSync, writeFileSync } from "node:fs";
import { stdout } from "node:process";
import { userscriptify } from "userscriptify";
import { compile } from "sass";

const packageInfo = JSON.parse(readFileSync('package.json', 'utf8'));

// Compile the SASS/SCSS here and pass it in through 'styleRaw"
const options = {};
if (packageInfo?.userscriptify?.style?.match(/\.s[ac]ss$/i)) {
  stdout.write("Compiling SASS/SCSS... ");
  options.styleRaw = compile(packageInfo.userscriptify.style).css;
  console.log("Done");
  // Since 'styleRaw' is set, the 'style' value will be ignored by the script
}

// Assuming you have the file path as the value for "main" in package.json
let contents = readFileSync(packageInfo.main, "utf8");
contents = userscriptify(contents, options);
writeFileSync(packageInfo.main, contents);
