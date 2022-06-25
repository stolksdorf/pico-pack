const vm   = require('vm');
const fs   = require('fs');
const path = require('path');

const baseTransforms = {
	'.json' : (code, filename, global)=>`module.exports=${code};`,
	'.js'   : (code, filename, global)=>code,
	'*'     : (code, filename, global)=>`module.exports=\`${code}\`;`
};

const fixSlash = (str)=>str.replace(/\\/g, '/').replace(/\\\\/g, '/')
const Emitter=()=>{
	let cache={};
	return {
		emit : (evt, ...args)=>(cache[evt]||[]).map(fn=>fn(...args)),
		on : (evt, func)=>{
			cache[evt]=(cache[evt]||[]).concat(func);
			return ()=>cache[evt]=cache[evt].filter(x=>x!=func);
		}
	};
};



const builtins = { console, setTimeout, setInterval, clearInterval, process };

const noop = (x)=>x;
const hash = (s)=>{for(var i=0,h=9;i<s.length;)h=Math.imul(h^s.charCodeAt(i++),9**9);return (h^h>>>9).toString(32)};
const debounce = (fn, time=50)=>{ let timeout; return (...args)=>{ clearInterval(timeout); timeout = setTimeout(()=>fn(...args), time); }; };
const resolveFrom = (fp, base)=>require.resolve(fp, {paths:[path.dirname(base)]})
const getCaller = (offset=0)=>{
	const [_, name, file, line, col] =
		/    at (.*?) \((.*?):(\d*):(\d*)\)/.exec((new Error()).stack.split('\n')[3 + offset]);
	return { name, file, line : Number(line), col  : Number(col) };
};

const picopack = (entryFilePath, modules={}, opts={})=>{
	const getCode = (filepath)=>{
		const code = fs.readFileSync(filepath, 'utf8');
		const key = Object.keys(opts.transforms).find(key=>filepath.endsWith(key)) || '*';
		const transform = opts.transforms[key] || noop;
		return transform(code, filepath, opts.global);
	};

	const pack = (filepath, requiringId)=>{
		const id = hash(filepath);
		if(modules[id]){
			modules[id].upstream.add(requiringId);
			return modules[id];
		}
		let mod = {
			id, filepath,
			fn       : fixSlash(path.relative(process.cwd(), filepath)),
			root     : fixSlash(path.relative(path.dirname(filepath), process.cwd())),
			deps     : {},
			upstream : new Set([requiringId]),
			code     : getCode(filepath)
		};
		const context = {
			module  : {exports:{}}, exports : {},
			__filename : mod.fn, __dirname : path.dirname(mod.fn), __root : mod.root,
			global  : opts.global,
			...builtins,
			require: (reqPath)=>{
				try{
					const reqMod = pack(resolveFrom(reqPath, filepath), mod.id);
					mod.deps[reqPath] = reqMod.id;
					return reqMod.export;
				}catch(err){
					console.log(err)
				}
			},
		};
		try{
			vm.runInNewContext(mod.code, context, { filename : filepath });
			mod.export = context.module.exports;
		}catch(err){
			console.log(err)
		}
		modules[mod.id] = mod;
		return mod;
	};

	const root = pack(entryFilePath);

	const modsAsString = Object.values(modules).map((mod)=>{
		return `global.__Modules["${mod.id}"]={func:function(module, exports, global, __filename, __dirname, __root, require){${mod.code}\n},deps:${JSON.stringify(mod.deps)},fn:'${mod.fn}',dn:'${path.dirname(mod.fn)}', root:'${mod.root}'};`
	}).join('\n');

	const bundle = `
if(typeof window !=='undefined') global=window;
global.__Modules = global.__Modules||{};
(function(){
	${modsAsString}
	const req = (id)=>{
		const mod = global.__Modules[id];
		if(mod.executed) return mod.export;
		let m = {exports : {}};
		mod.func(m,m.exports,global,mod.fn,mod.dn,mod.root,(reqPath)=>req(mod.deps[reqPath]));
		mod.executed = true;
		mod.export = m.exports;
		return mod.export;
	}
	if(typeof module === 'undefined'){
		global['${opts.name}'] = req('${root.id}');
	}else{
		module.exports = req('${root.id}');
	}
})();`.replace(new RegExp('</script>','g'), '&lt;/script&gt;');

	root.export = root.export || function(){};
	return { bundle, modules, export : root.export, global : opts.global }
};

const PicoPack = (entryFilePath, opts={})=>{
	entryFilePath = resolveFrom(entryFilePath, getCaller(opts.callOffset).file);

	opts.transforms = { ...baseTransforms, ...(opts.transforms||{})};
	opts.name = opts.name || 'main';
	opts.global = opts.global || {};

	let result = picopack(entryFilePath, {}, opts);

	if(typeof opts.watch === 'function'){
		opts.global = result.global;
		const decache = (mod_id)=>{
			if(!result.modules[mod_id]) return;
			result.modules[mod_id].upstream.forEach(decache);
			delete result.modules[mod_id];
		};
		const rebundle = debounce((changedFilePath)=>{
			result = picopack(entryFilePath, result.modules, opts);
			opts.global = result.global;
			opts.watch(result, changedFilePath);
			PicoPack.emitter.emit('update', entryFilePath);
		});
		Object.values(result.modules).map(mod=>{
			fs.watch(mod.filepath, ()=>{ decache(mod.id); rebundle(mod.filepath); });
		});
		opts.watch(result);
	};
	return result;
};

PicoPack.emitter = Emitter();

module.exports = PicoPack;