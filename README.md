# userscriptify
A handy build setup to let you write userscripts without keeping everything in one file.

## Usage

### userscriptify(contents: string, options?: object)
Pass the contents of your javascript file to the function.

```js
import { readFileSync, writeFileSync } from "node:fs";
import { userscriptify } from "userscriptify";

let contents = readFileSync("path/to/file.js", "utf8");
contents = userscriptify(contents);
writeFileSync("path/to/file.js", contents);
```

```js
import { readFile, writeFile } from "node:fs/promises";
import { userscriptifyAsync } from "userscriptify";

readFile("path/to/file.js", "utf8")
  .then(contents => userscriptifyAsync(contents))
  .then(output => { writeFile("path/to/file.js", output) });
```

<details>
<summary>Alternate method using package.json to get the file path</summary>

```js
import { readFile, writeFile } from "node:fs/promises";
import { userscriptifyAsync } from "userscriptify";

const packageInfo = await readFile('package.json', 'utf8').then(info => JSON.parse(info));

// Assuming you have the file path as the value for "main"
readFile(packageInfo.main, "utf8")
  .then(contents => userscriptifyAsync(contents))
  .then(output => { writeFile(packageInfo.main, output) });
```
</details>

## Configuration
If you don't want to use the default options, you can configure the options in one of two ways.

Via `package.json` using the `userscriptify` key:

```javascript
{
  "name": "scriptName",
  "other": "lines omitted to save space",
  "userscriptify": {
    "metadata": "meta.json",
    "replace": "__<INSERTCSS>__",
    "indent": 2,
    "style": "src/style.css"
  }
}
```

Via an object in your build script:

```js
contents = userscriptify(contents, options);
```

## Options

### metadata

Type: `string | object`

Default: `meta.json`

If a `string`, the string will be used as the path to a JSON file containing the metadata information. JSON file should be structured like the following (keys are used as the name of the userscript header):

```json
{
    "name": "Fancy Script Name Here",
    "description": "Do something fancy",
    "match": [
        "https://some_website_a.com/*",
        "https://some_website_b.com/*"
    ],
    "grant": [
        "GM_getValue",
        "GM_setValue"
    ]
}
```

If an `object`, the object will be used as the source for metadata information. Type definition for the object must match the following (keys are used as the name of the userscript header):
```typescript
interface MetadataInfo {
  [key: string]: string | string[]
}
```

### replace

Type: `string`

Default: `__<INSERTCSS>__`

A unique string of text in your script file that you want to replace with CSS. Only used if `style` or `styleRaw` are set to something.

Typically used in your script file like this:

```javascript
(function () {
  const style = document.createElement("style");
  style.textContent = `__<INSERTCSS>__`;
  document.head.append(style);
})();
```

### indent

Type: `number`

Default: `2`

The number of spaces to insert before each line of CSS.

### style

Type: `string`

Default: `undefined`

If set, the path to a CSS or SCSS/SASS file containing the style information you want to insert. A SCSS/SASS file will be compiled before being inserted into the script.

### styleRaw

Type: `string`

Default: `undefined`

If set, used as the CSS content you want to insert. Overrides `style` if both are set.
