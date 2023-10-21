import { readFileSync, writeFileSync } from "node:fs";
import { userscriptify } from "userscriptify";

const packageInfo = JSON.parse(readFileSync('package.json', 'utf8'))

// Assuming you have the file path as the value for "main" in package.json
let contents = readFileSync(packageInfo.main, "utf8");
contents = userscriptify(contents);
writeFileSync(packageInfo.main, contents);
