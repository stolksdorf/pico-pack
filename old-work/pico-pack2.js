const vm = require('vm');
const fs = require('fs');
const path = require('path');

const md5 = require('md5'); //replace with native


const cluster = (obj, fn)=>Object.keys(obj).reduce((a,k)=>{const r=fn(obj[k],k);if(!a[r]){a[r]=[]};a[r].push(obj[k]);return a;},{});

const {getModules, invalidateModule} = require('./get_modules.js');


const parseOpts = (opts)=>opts;


//Use the harness.js
const harness = (modules)=>{
	const mods = Object.values(modules).map((mod)=>{
		return `'${mod.id}': [function(require, module, exports, global){${mod.code}},${JSON.stringify(mod.deps)}]`
	}).join(',');
	return `if(typeof global == 'undefined') global = {};
if(typeof __modules__ == 'undefined') __modules__ = {};
__modules__ = Object.assign(__modules__, {${mods}});`
};


//this should be read in
const transforms = {
	'.json' : (code, fp)=>`module.exports=${code};`,
	'.js' : (code, fp)=>{
		return code;
	},
	'*' : (code)=>`module.exports=\`${code}\`;`
}

const getCode = (filename, opts)=>{
	const code = fs.readFileSync(filename, 'utf8');
	const ext = path.extname(filename);
	return (opts.transforms[ext]||opts.transforms['*'])(code, filename);
};


const isLib = (fp)=>fp.indexOf('node_modules')!==-1


const wrap = (mod)=>`'${mod.id}': [function(require, module, exports, global){${mod.code}},${JSON.stringify(mod.deps)}]`



const pack = (entry, opts, cache={})=>{
	const mods = getModules(entry, opts, cache);

	let libs =[];
	let src = [];
	let root;

	mods.map((mod)=>{
		(isLib(mod.filename) ? libs : src).push(wrap(mod));
		if(mod.entry) root = mod;
	});

	return {
		libs : harness(libs),
		src  : harness(src),
		func : root.export
	}

};


//TODO: make watch be triggered by a dev opt param
const watch = (entry, opts, cb)=>{
	let cache = getModules(entry, opts), debounce;
	const update = ()=>{
		clearInterval(debounce)
		debounce = setTimeout(()=>{
			try{
				//Add is Watch to opts, track parent?
				cache = getModules(entry, opts, cache);
				cb(cache);
			}catch(e){
				console.log(e);
			}
		},10)
	};
	Object.values(cache).map((mod)=>{
		fs.watch(mod.filename,()=>{
			console.log('THIS CHANGED', mod.filename);
			cache = invalidateModule(cache, mod.filename);
			update();
		});
	});
	cb(cache);

};


module.exports = ()=>{
	return {}
}