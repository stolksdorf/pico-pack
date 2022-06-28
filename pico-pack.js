const fs = require('node:fs');
const Path = require('node:path');
const Module = require('node:module');

Module.prototype.require = new Proxy(Module.prototype.require, {
	apply(_, mod, [target]){
		const targetPath = require.resolve(target, {paths:[mod.path]});
		const _export = Reflect.apply(_, mod, [target]);
		mod.deps = mod.deps||{};
		mod.deps[target] = targetPath;
		const child = require.cache[targetPath];
		if(child){
			child.parents = child.parents || [];
			child.parents.push(mod.filename);
		}
		return _export;
	}
});

/* Utils */
const getCallStack = ()=>{
	const _prepareStackTrace = Error.prepareStackTrace
	Error.prepareStackTrace = (_, stack) => stack;
	const stack = new Error().stack.slice(1);
	Error.prepareStackTrace = _prepareStackTrace;
	return stack;
};
const resolveFromCaller = (fp, offset=0)=>{
	const callDir = Path.dirname(getCallStack()[2+offset].getFileName());
	return require.resolve(fp, {paths:[callDir]});
};
const fixPath = (path)=>path.replace(process.cwd(), '').replaceAll('\\', '/');
const mapDeps = (mod, func)=>{ func(mod); mod.children.map(dep=>mapDeps(dep, func)); };


const packModule = (mod)=>{
	if(!mod.content) mod.content = fs.readFileSync(mod.filename, 'utf8');
	mod.content = mod.content.replaceAll('</script>','&lt;/script&gt;');
	const depStr = Object.entries(mod.deps||{}).map(([k,v])=>`'${k}':'${fixPath(v)}'`).join(',\n');
	return `{ func: function(module, exports, require){${mod.content};}, deps: {${depStr}} }`;
};
const packModules = (mod)=>{
	let Modules = {};
	mapDeps(mod, (dep)=>{
		if(!Modules[dep.filename]){
			Modules[dep.filename] = `global.__mods__['${fixPath(dep.filename)}']=${packModule(dep)};`;
		}
	});
	return Modules;
};

const pack = (filename, opts={})=>{
	opts = {name:'main', ...opts};

	filename = resolveFromCaller(filename);
	require(filename);

	let PackedModules = packModules(require.cache[filename]);
	return `(function(){
		if(typeof window !=='undefined') global=window;
		global.__mods__ = global.__mods__||{};
		${Object.values(PackedModules).join('\n')}
		const _require = (path)=>{
			const mod = global.__mods__[path];
			if(mod.loaded) return mod.exports;
			mod.exports = {};
			mod.func(mod,mod.exports,(target)=>_require(mod.deps[target]));
			mod.loaded = true;
			return mod.exports;
		};
		global['${opts.name}'] = _require('${fixPath(filename)}');
		if(typeof module !== 'undefined') module.exports = global['${opts.name}'];
	})();`;
};

const decache = (fp, stopAt=null)=>{
	if(!require.cache[fp]) return;
	if(stopAt !== fp) (require.cache[fp].parents||[]).map(decache);
	delete require.cache[fp];
};

const watch = (filename, func)=>{
	filename = resolveFromCaller(filename);
	let watchers = {}, timer;
	const run = async (changedFile)=>{
		timer=null;
		await func(changedFile, require(filename), filename);
		mapDeps(require.cache[filename], (dep)=>{
			if(watchers[dep.filename]) return;
			watchers[dep.filename] = fs.watch(dep.filename, ()=>{
				decache(dep.filename, filename);
				if(!timer) timer=setTimeout(()=>run(dep.filename), 200);
			})
		});
	};
	run();
};

const addTransform = (ext, func)=>{
	Module._extensions[ext] = (module, filename)=>{
		const content = fs.readFileSync(filename, 'utf8');
		module.content = func(content, filename);
		module._compile(module.content, filename);
	};
};

addTransform('.json', (content)=>`module.exports=${content}`);

module.exports = pack;
module.exports.addTransform = addTransform;
module.exports.watch = watch;
module.exports.pack = pack;
module.exports.resolveFromCaller = resolveFromCaller;
module.exports.decache = decache;