const vm = require('vm');
const fs = require('fs');
const path = require('path');

let Cache = {};
let Global = {};

const debounce = (fn, t=16)=>function(...args){clearTimeout(this.clk);this.clk = setTimeout(()=>fn(...args), t);};
const getModuleId = require('./minihash.js');
const defaultTransforms = require('./default.transforms.js')

const getModuleCode = (filepath, transforms={})=>{
	const code = fs.readFileSync(filepath, 'utf8');
	const func = transforms[path.extname(filepath)] || transforms['*'];
	return func ? func(code, filepath) : code;
};



////////////////

const map = (obj,fn)=>Object.entries(obj).map(([k,v])=>fn(v,k));

const builtins = {
	'process' : require.resolve('process/browser.js')
};


const BuiltinIds = {};

const cacheBuiltins = (opts)=>{
	map(builtins, (reqPath, name)=>{
		const res = updateCache(reqPath, opts);
		BuiltinIds[name] = res.id
	});
};

//////////////////


//TODO: Wrap all of this in a closure for module scope

const defaultOpts = (opts)=>{
	return {
		...opts,
		transforms : {...defaultTransforms, ...opts.transforms},
		name : opts.name || 'main',
	}
};

const getModule = (filepath)=>{
	const id = getModuleId(filepath);
	if(Cache[id]) return Cache[id];
	return {
		id,
		filepath,
		code : null,
		export : null,
		deps : {},
		dependants: new Set()
	}
};

//Move out to a file
const createContext = (reqFunc)=>{
	return {
		global  : Global,
		window  : Global,
		document  : Global,
		navigator : {},
		module  : {exports:{}},
		exports : {},
		require: reqFunc,
		console, setTimeout, setInterval, clearInterval,
		process
		//TODO: there might be more things you need
	}
}

const updateCache = (entryPoint, opts)=>{
	const packFile = (filepath, requiringId=false)=>{
		const mod = getModule(filepath);
		if(requiringId) mod.dependants.add(requiringId);
		if(mod.code) return mod;
		mod.code = getModuleCode(filepath, opts.transforms);
		const sandbox = createContext((reqPath)=>{
			const absPath = require.resolve(reqPath, {paths: [path.dirname(mod.filepath)]});
			const requiredModule = packFile(absPath, mod.id);
			mod.deps[reqPath] = requiredModule.id;
			return requiredModule.export;
		});
		vm.runInNewContext(mod.code, sandbox, {filename : filepath,
			importModuleDynamically : (a,b)=>{
				console.log(a);
				console.log(b);
			}
		});
		mod.export = sandbox.module.exports;
		Cache[mod.id] = mod;
		return mod;
	}
	return packFile(entryPoint);
};

const makeBundle = (entryId, modules, exportName = 'main')=>{
	const modsAsString = '{' + Object.values(modules).map((mod)=>{
		return `"${mod.id}":[function(require, module, exports, global){${mod.code}\n},${JSON.stringify(mod.deps)}]`
	}).join(',') + '}';

	return `(function(entryId, modules){
	let c = {};
	let g = this;
	if(typeof self !== "undefined") g = self;
	if(typeof global !== "undefined") g = global;
	if(typeof window !== "undefined") g = window;
	const req = (id)=>{
		if(c[id]) return c[id];
		let m = {exports : {}};
		modules[id][0].call(m.exports, (reqPath)=>req(modules[id][1][reqPath]), m, m.exports, g);
		c[id] = m.exports;
		return m.exports;
	}


	${map(cacheBuiltins, (id, name)=>{
		return `g.${name} = req('${id}');`
	}).join('\n')}


	if (typeof exports === "object" && typeof module !== "undefined") {
		module.exports = req(entryId);
	}else{
		g['${exportName}'] = req(entryId);
	}
})("${entryId}", ${modsAsString});`;
};

const filterDependantModules = (id)=>{
	return Cache; //Temp, until I figure out builtins


	let result = {};
	const run = (id)=>{
		if(result[id] || !Cache[id]) return;
		result[id] = Cache[id];
		Object.values(result[id].deps).map(run);
	};
	run(id);
	return result;
};

const watch = (modules, entryPoint, func, opts={})=>{
	const repack = debounce(()=>{
		try{
			const {id, export: execute } = updateCache(entryPoint, opts);
			const bundle = makeBundle(id, filterDependantModules(id), opts.name);
			func({bundle, execute});
		}catch(err){
			//TODO: make this better
			console.log(err);
		}
	});
	Object.values(modules).map((mod)=>{
		fs.watch(mod.filepath, ()=>{
			invalidate(mod.filepath);
			repack();
		});
	});
	repack();
};

const pack = (entryPoint, opts={})=>{
	entryPoint = require.resolve(entryPoint);
	opts = defaultOpts(opts);

	cacheBuiltins(opts);

	const entryMod = updateCache(require.resolve(entryPoint), opts);
	const neededModules = filterDependantModules(entryMod.id);

	if(typeof opts.dev === 'function'){
		watch(neededModules, entryPoint, opts.dev, opts);
	}

	return {
		bundle  : makeBundle(entryMod.id, neededModules, opts.name),
		execute : entryMod.export
	};
};

const invalidate = (filepath)=>{
	const run = (id)=>{
		if(!Cache[id]) return;
		Array.from(Cache[id].dependants).map(run);
		delete Cache[id];
	}
	return run(getModuleId(require.resolve(filepath)));
};

module.exports = {
	pack,
	invalidate,
	cache : Cache
}