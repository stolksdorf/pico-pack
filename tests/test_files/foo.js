global.goo = 6;

const Bar = require('./bar.js');

const wooo = require('./doot.js');

console.log(require('./temp.txt'));

//require('react');

// require('@babel/parser');
//const go = require('react');


module.exports = ()=>{
	setTimeout(()=>console.log('foo'), 500);
	console.log('helloe');

	return 6 + Bar() + 1;
}

//module.exports = 5 + Bar + wooo;