const vm = require('vm');
const fse = require('fs-extra');

require('lodash/core')

const testPath = './a.js';

let cache = {}


const requireShim = (resPath)=>{
	const actualPath = require.resolve(resPath);
	if(cache[actualPath]) return cache[actualPath].result;
	cache[actualPath] = parseFile(actualPath);

	console.log(cache[actualPath]);
	return cache[actualPath].result;
}


let scopeGlobal = {};

const parseFile = (filePath)=>{
	const code = fse.readFileSync(filePath, 'utf8'); //Might not need to be utf8, keep as buf?
	let sandbox = {
		global : scopeGlobal,
		require : requireShim,
		exports : null,
		module : {exports : null}
	};
	vm.runInNewContext(code, sandbox, { filename : filePath });
	//console.log(sandbox);
	return {
		path : require.resolve(filePath),
		//code : code,
		result : sandbox.exports = sandbox.module.exports
	};
}


const file = require.resolve('./a.js');

console.log(parseFile(file));


console.log(cache);