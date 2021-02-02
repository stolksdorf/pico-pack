const vm = require('vm');
const fs = require('fs');
const path = require('path');

const hash = (str)=>[...str].reduce((acc, char)=>{acc = ((acc<<5)-acc)+char.charCodeAt(0);return acc&acc; }, 0).toString(32);

const baseTransforms = {
	'.json' : (code, filename)=>`module.exports=${code};`,
	'.js'   : (code, filename)=>code,
	'*'     : (code, filename)=>`module.exports=\`${code}\`;`
};

const getModuleCode = (filepath, transforms={})=>{
	const code = fs.readFileSync(filepath, 'utf8');
	const func = transforms[path.extname(filepath)] || transforms['*'];
	return func ? func(code, filepath) : code;
};

module.exports = (entryFilePath, opts={})=>{
	let modules = {}, Global = {};
	opts.transforms = {
		...baseTransforms,
		...(opts.transforms||{})
	};
	opts.name = opts.name || 'main';

	const pack = (filepath, requiringId=false)=>{
		let mod = { id : hash(filepath), deps : {}, filepath };
		if(modules[mod.id]) return modules[mod.id];
		mod.code = getModuleCode(filepath, opts.transforms);
		const context = {
			module  : {exports:{}}, exports : {},
			global : Global,
			console, setTimeout, setInterval, clearInterval, process,
			require: (reqPath)=>{
				const reqMod = pack(require.resolve(reqPath, {paths: [path.dirname(filepath)]}), mod.id);
				mod.deps[reqPath] = reqMod.id;
				return reqMod.exports;
			},
		};
		vm.runInNewContext(mod.code, context, {
			filename : filepath,
			importModuleDynamically : (a,b)=>{ console.log(a); console.log(b); }
		});
		mod.exports = context.module.exports;
		modules[mod.id] = mod;
		return mod;
	};

	const root = pack(require.resolve(entryFilePath));

	const modsAsString = Object.values(modules).map((mod)=>{
		return `global.Modules["${mod.id}"]={func:function(module, exports, global, require){${mod.code}\n},deps:${JSON.stringify(mod.deps)}};`
	}).join('\n');

	const bundle = `
if(typeof window !=='undefined') global=window;
global.Modules = global.Modules||{};
${modsAsString}
(function(){
	const req = (id)=>{
		if(global.Modules[id].ran) return global.Modules[id].exports;
		let m = {exports : {}};
		global.Modules[id].func(m,m.exports,global,(reqPath)=>req(global.Modules[id].deps[reqPath]));
		global.Modules[id].ran = true;
		global.Modules[id].exports = m.exports;
		return global.Modules[id].exports;
	}
	if(typeof module === 'undefined'){
		global['${opts.name}'] = req('${root.id}');
	}else{
		module.exports = req('${root.id}');
	}
})();`
	return {
		bundle,
		modules,
		exports : root.exports
	}
}