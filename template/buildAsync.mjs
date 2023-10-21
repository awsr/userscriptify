import { readFile, writeFile } from "node:fs/promises";
import { userscriptifyAsync } from "userscriptify";

const packageInfo = await readFile('package.json', 'utf8').then(info => JSON.parse(info));

// Assuming you have the file path as the value for "main" in package.json
readFile(packageInfo.main, "utf8")
  .then(contents => userscriptifyAsync(contents))
  .then(output => { writeFile(packageInfo.main, output) });
