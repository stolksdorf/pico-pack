const vm = require('vm');
const fs = require('fs');
const path = require('path');




const parseModule = (filename, id)=>{
	const mod = {
		id,
		filename,
		code : getCode(filename),
		deps : {}
	}
	const folder = path.dirname(filename);
	const req = (reqPath)=>{
		const {id, exports} = pack(require.resolve(reqPath, {paths: [folder]}));
		mod.deps[reqPath] = id;
		return exports;
	}
	let sandbox = {
		require : req,
		global  :scopeGlobal,
		module  :{exports:{}},
		exports :{},process
	}
	vm.runInNewContext(mod.code,sandbox,{filename});
	mod.exports = sandbox.module.exports;
	return mod;
}