const pack = require('../pico-pack.js');
const fs = require('fs');




console.log('here');

const res = pack('./test_files/bar.js', {
	//opts
	//name : 'foo'
	//transforms : {},
	//watch : ()=>{}

});

fs.writeFileSync('./temp/src.packed.js', res.bundle);
console.log('packed');
//console.log('result func:', res.func, func());

console.log(res.modules)



console.log('----------------------')

const foo = require('../temp/src.packed.js')

console.log(foo())


