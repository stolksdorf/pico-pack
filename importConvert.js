// https://blog.alexdevero.com/import-and-export-statements-javascript/


// First convert all exports

/* Exports */

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export


// export features declared earlier
export { myFunction, myVariable };

// export individual features (can export var, let,
// const, function, class)
export let myVariable = Math.sqrt(2);
export function myFunction() { ... };
Copy to Clipboard
Default exports:

// export feature declared earlier as default
export { myFunction as default };

// export individual features as default
export default function () { ... }
export default class { .. }

// each export overwrites the previous one


// file test.js
let k; export default k = 12;



/* IMPORTS*/



// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import


//All types of import statements

import defaultExport from "module-name";
import * as name from "module-name";
import { export1 } from "module-name";
import { export1 as alias1 } from "module-name";
import { export1 , export2 } from "module-name";
import { export1 , export2 as alias2 , [...] } from "module-name";
import defaultExport, { export1 [ , [...] ] } from "module-name";
import defaultExport, * as name from "module-name";
import "module-name";
var promise = import("module-name");


