const test = require('pico-check');


const pack = require('../pico-pack.js');


test('base', async (t)=>{

//	const res = await pack('./foo.js');
	const res = await pack('./test/foo.js');

	console.log("res");
	console.log(res);



})






module.exports = test