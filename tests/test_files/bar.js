const wooo = require('./doot.js');



//console.log('yo');

//module.exports = 7 + global.goo;
module.exports = (a)=>{
	console.log(module);

	console.log('calling bar', process.env.NODE_ENV)

	console.log(setTimeout)
	return wooo + global.foo + 5
};