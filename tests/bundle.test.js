
// Also test global scope

// should create a bundle, save it, then require it and be able to run it

// Should create a bundle, save it into a runnable html file, and test with an alert client side

// should create a bundle using a weird transform


const fs = require('fs')

const { pack, invalidate, cache } = require('../pico-pack.js');


const run = async ()=>{

	//const { bundle, execute } = pack('./tests/test_files/foo.js');

	const {bundle, execute} = pack('./tests/test_files/foo.js', {
		// dev : ({bundle, execute})=>{
		// 	console.log('DEV STEP');
		// 	fs.writeFileSync('./bundle.temp.js', bundle);
		// 	console.log(execute());
		// },
		// name: 'foo'
	});



	fs.writeFileSync('./bundle.temp.js', bundle);
	const temp = require('./bundle.temp.js');

	console.log('bundled', temp());
	console.log('execute', execute());

	// console.log(cache);

	// invalidate('./tests/test_files/doot.js');

	// console.log(cache);

};

const dev

try{
	run();
}catch(err){
	console.log(err);
}