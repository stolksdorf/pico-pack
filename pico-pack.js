const vm   = require('vm');
const fs   = require('fs');
const path = require('path');

const hash = (str)=>[...str].reduce((acc, char)=>{acc = ((acc<<5)-acc)+char.charCodeAt(0);return acc&acc; }, 0).toString(32);

const baseTransforms = {
	'.json' : (code, filename)=>`module.exports=${code};`,
	'.js'   : (code, filename)=>code,
	'*'     : (code, filename)=>`module.exports=\`${code}\`;`
};

const builtins = { console, setTimeout, setInterval, clearInterval, process }

const debounce = (fn)=>{ let timeout; return (...args)=>{ clearInterval(timeout); timeout = setTimeout(()=>fn(...args), 50); }; };
const resolveFrom = (fp, base)=>require.resolve(fp, {paths: [path.dirname(base)]})
const getCaller = (offset=0)=>{
	const [_, name, file, line, col] =
		/    at (.*?) \((.*?):(\d*):(\d*)\)/.exec((new Error()).stack.split('\n')[3 + offset]);
	return { name, file, line : Number(line), col  : Number(col) };
};

const picopack = (entryFilePath, modules, opts={})=>{
	const getCode = (filepath)=>{
		const code = fs.readFileSync(filepath, 'utf8');
		const funcKey = Object.keys(opts.transforms).find(key=>filepath.endsWith(key)) || '*';
		const func = opts.transforms[funcKey];
		return func ? func(code, filepath, opts.global) : code;
	};

	const pack = (filepath, requiringId)=>{
		const id = hash(filepath);
		if(modules[id]){
			modules[id].upstream.add(requiringId);
			return modules[id];
		}
		let mod = { id, deps : {}, filepath, upstream : new Set([requiringId]), code: getCode(filepath) };
		//if(requiringId) mod.upstream.add(requiringId);
		const context = {
			module  : {exports:{}}, exports : {},
			global  : opts.global,
			...builtins,

			//console, setTimeout, setInterval, clearInterval, process,

			require: (reqPath)=>{
				//const reqMod = pack(require.resolve(reqPath, {paths: [path.dirname(filepath)]}), mod.id);
				const reqMod = pack(resolveFrom(reqPath, filepath), mod.id);
				mod.deps[reqPath] = reqMod.id;
				return reqMod.export;
			},
		};
		vm.runInNewContext(mod.code, context, { filename : filepath });
		mod.export = context.module.exports;
		modules[mod.id] = mod;
		return mod;
	};

	const root = pack(entryFilePath);

	const modsAsString = Object.values(modules).map((mod)=>{
		return `global.Modules["${mod.id}"]={func:function(module, exports, global, require){${mod.code}\n},deps:${JSON.stringify(mod.deps)}};`
	}).join('\n');

	const bundle = `
if(typeof window !=='undefined') global=window;
global.Modules = global.Modules||{};
${modsAsString}
(function(){
	const req = (id)=>{
		if(global.Modules[id].executed) return global.Modules[id].export;
		let m = {exports : {}};
		global.Modules[id].func(m,m.exports,global,(reqPath)=>req(global.Modules[id].deps[reqPath]));
		global.Modules[id].executed = true;
		global.Modules[id].export = m.exports;
		return global.Modules[id].export;
	}
	if(typeof module === 'undefined'){
		global['${opts.name}'] = req('${root.id}');
	}else{
		module.exports = req('${root.id}');
	}
})();`;

	return { bundle, modules, export : root.export, global : opts.global }
};

module.exports = (entryFilePath, opts={})=>{
	//entryFilePath = require.resolve(entryFilePath, {paths: [path.dirname(getCaller().file)]});
	entryFilePath = resolveFrom(entryFilePath, getCaller().file);
	opts.transforms = {
		...(opts.transforms||{}),
		...baseTransforms,
	};
	opts.name = opts.name || 'main';
	opts.global = opts.global || {};

	let result = picopack(entryFilePath, {}, opts);

	if(typeof opts.watch === 'function'){
		const decache = (mod_id)=>{
			if(!result.modules[mod_id]) return;
			result.modules[mod_id].upstream.forEach(decache);
			delete result.modules[mod_id];
		};
		const rebundle = debounce(()=>{
			result = picopack(entryFilePath, result.modules, opts);
			opts.watch(result);
		});
		Object.values(result.modules).map(mod=>{
			fs.watch(mod.filepath, ()=>{ decache(mod.id); rebundle(); });
		});
		opts.watch(result);
	};
	return result;
}