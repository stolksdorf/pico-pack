// https://github.com/browserify/browserify-handbook#builtins

/*
	you'll have to use browserside defaults for a bunch of context functions


*/

const jsBuiltins = {console, setTimeout, setInterval, clearInterval, process}

module.exports = (Global, filepath, reqFunc)=>{
	return {
		...jsBuiltins,
		global  : Global,
		window  : Global,
		module  : {exports:{}},
		exports : {},

		require : reqFunc,

		//__filename : //use process.cwd() and a basedir
		//__dirname

		process : require('process'),
	}

};



// assert
// buffer
// console
// domain
// path
// querystring
// url
// util
// __filename
// __dirname