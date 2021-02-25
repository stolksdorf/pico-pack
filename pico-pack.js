const vm   = require('vm');
const fs   = require('fs');
const path = require('path');

const hash = (str)=>[...str].reduce((acc, char)=>{acc = ((acc<<5)-acc)+char.charCodeAt(0);return acc&acc; }, 0).toString(32);

const baseTransforms = {
	'.json' : (code, filename)=>`module.exports=${code};`,
	'.js'   : (code, filename)=>code,
	'*'     : (code, filename)=>`module.exports=\`${code}\`;`
};

const getCaller = (offset=0)=>{
	const [_, name, file, line, col] =
		/    at (.*?) \((.*?):(\d*):(\d*)\)/.exec((new Error()).stack.split('\n')[3 + offset]);
	return { name, file, line : Number(line), col  : Number(col) };
};

module.exports = (entryFilePath, opts={})=>{
	const {file} = getCaller();
	entryFilePath = require.resolve(entryFilePath, {paths: [path.dirname(file)]});

	let modules = {};
	opts.transforms = {
		...(opts.transforms||{}),
		...baseTransforms,
	};
	opts.name = opts.name || 'main';
	opts.global = opts.global || {};

	const getCode = (filepath)=>{
		const code = fs.readFileSync(filepath, 'utf8');
		const funcKey = Object.keys(opts.transforms).find(key=>filepath.endsWith(key)) || '*'
		const func = opts.transforms[funcKey];
		//const func = opts.transforms[path.extname(filepath)] || opts.transforms['*'];
		return func ? func(code, filepath, opts.global) : code;
	};

	const pack = (filepath, requiringId=false)=>{
		let mod = { id : hash(filepath), deps : {}, filepath };
		if(modules[mod.id]) return modules[mod.id];
		mod.code = getCode(filepath);
		const context = {
			module  : {exports:{}}, exports : {},
			global  : opts.global,
			console, setTimeout, setInterval, clearInterval, process,
			require: (reqPath)=>{
				const reqMod = pack(require.resolve(reqPath, {paths: [path.dirname(filepath)]}), mod.id);
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
		if(global.Modules[id].ran) return global.Modules[id].export;
		let m = {exports : {}};
		global.Modules[id].func(m,m.exports,global,(reqPath)=>req(global.Modules[id].deps[reqPath]));
		global.Modules[id].ran = true;
		global.Modules[id].export = m.exports;
		return global.Modules[id].export;
	}
	if(typeof module === 'undefined'){
		global['${opts.name}'] = req('${root.id}');
	}else{
		module.exports = req('${root.id}');
	}
})();`
	return { bundle, modules, export : root.export, global : opts.global }
}