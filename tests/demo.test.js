const fs = require('fs')

const pp = require('../parse-pack.js');


// let modules = getModules('./test/foo.js');


// console.log(Object.keys(modules));


// const packed = bundle(modules, './test/foo.js')



// //console.log(packed);

// fs.writeFileSync('./bundle.js', packed);

// const test = require('./bundle.js');

// console.log(test);
let res

res = pp.parseFile('./test/foo.js');
res = pp.depGraph('./test/foo.js');

console.log(res);