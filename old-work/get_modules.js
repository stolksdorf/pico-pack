const vm = require('vm');
const fs = require('fs');
const path = require('path');

const md5 = require('md5'); //replace with native

//TODO: Reanme with dependacy graph?



//should be util
const getId =(filename)=>md5(filename);

const GlobalScope = Symbol('GlobalScope');
// const EntryId = Symbol('EntryId');


// const defaultOpts = {
// 	transforms,
// 	isLib : (fp)=>fp.indexOf('node_modules')!==-1
// };

const defaultReadFile = (fp)=>fs.readFileSync(fp, 'utf8');

//
const getModules = (entryPath, modules, readFile=defaultReadFile)=>{
	const hasCache = !!modules
	modules = modules || {};
	modules[GlobalScope] = modules[GlobalScope] || {};
	const packFile = (filename, requiringId)=>{
		const id = getId(filename);
		if(modules[id]){
			if(!hasCache) modules[id].usedBy.push(requiringId);
			return modules[id];
		}
		const mod = { id, filename, deps : {}, usedBy : [requiringId] };
		mod.code  = readFile(filename);
		if(!!mod.code && typeof mod.code !== 'string') throw 'Readfile must be sync'

		const scope = path.dirname(filename);
		let sandbox = {
			global  : modules[GlobalScope],
			module  : {exports:{}},
			exports : {},
			process,
			require : (reqPath)=>{
				const absPath = require.resolve(reqPath, {paths: [scope]});
				//const {id, export} = packFile(absPath, id);
				const temp = packFile(absPath, id);
				mod.deps[reqPath] = temp.id;
				return temp.export;
			},
		}
		vm.runInNewContext(mod.code,sandbox,{filename,
			//importModuleDynamically
		});
		mod.export = sandbox.module.exports;
		modules[id] = mod;
		return mod;
	}
	const mod = packFile(require.resolve(entryPath)).id;
	mod.entry = true;
	return modules;
};


//Invalidates a module and all modules that depend on it
const
 = (modules, filename)=>{
	const invalidate = (id)=>{
		if(!modules[id]) return;
		modules[id].usedBy.map(invalidate);
		delete modules[id];
	}
	invalidate(getId(filename));
	return modules;
};

module.exports = {
	getModules,
	invalidateModule,
}