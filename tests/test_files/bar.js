const wooo = require('./doot.js');

//console.log('yo');

//module.exports = 7 + global.goo;
module.exports = ()=>{
	console.log('calling bar')
	return 7 + wooo + global.foo
};