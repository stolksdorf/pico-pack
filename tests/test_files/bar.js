const wooo = require('./doot.js');

//console.log('yo');

//module.exports = 7 + global.goo;
module.exports = ()=>{
	console.log('calling bar', process.env.NODE_ENV)

	console.log(setTimeout)
	return wooo + global.foo + 5
};