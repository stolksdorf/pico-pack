const {parse} = require('@babel/parser');
const md5 = require('md5'); //replace with native

const fs = require('fs');
const path = require('path');

const construct = (obj,fn)=>Object.keys(obj).reduce((a,key)=>{const [k,v]=fn(obj[key],key);a[k]=v;return a;},{});
const mapValues = (obj,fn)=>Object.keys(obj).reduce((a,k)=>{a[k]=fn(obj[k],k);return a;},{});

/******
Harness
;(function($) {
  'use strict'

  const md5 = 6;



	if (typeof define === 'function' && define.amd) {
	  define(function() {
	    return md5
	  })
	} else if (typeof module === 'object' && module.exports) {
	  module.exports = md5
	} else {
	  $.md5 = md5
	}
})(this)


*/

const transforms = {
	'.json' : (code, fp)=>`module.exports=${code};`,
	'.js' : (code, fp)=>{
		return code;
	},
	'*' : (code)=>`module.exports=\`${code}\`;`
}


const getCode = (filename)=>{
	const code = fs.readFileSync(filename, 'utf8');
	const ext = path.extname(filename);
	return (transforms[ext]||transforms['*'])(code, filename);
};


const opts = {
	libs : null, //true, false
	dev : false, //()=>{}
	libMatch : ()=>false, //contains node_modules

	transforms : {
		'*' : (x)=>x
	}, //Add in the basic transforms


}

const utils = {
	getPath : (fullpath)=>path.relative(process.cwd(), fullpath).replace(/\\/g, '/'),

	shouldPack : (filename, opts)=>{
		return true;

		if(opts.libs === null) return true;
		const isLib = opts.libMatch(filename);
		return (opts.libs && isLib) || (!opts.libs && !isLib);
	},

	getId : (filepath)=>{
		return md5(path.relative(process.cwd(), filepath));
	}

};


const transform = (filename, code, opts)=>{
	const ext = path.extname(filename);
	if(opts.transforms[ext]){
		return opts.transforms[ext](code, filename);
	}
	return opts.transforms['*'](code, filename);
}


//Given code, returns all the dependacies it needs
//const getDeps = (code, filepath='')=>{
const getDeps = (code)=>{
	let deps = [], ast;
	//try{ ast = parse(code, {sourceType: 'module'}); }catch(err){ err.file = filepath; throw err; }

	ast = parse(code, {sourceType: 'module'});
	const NodeType = Object.getPrototypeOf(ast);
	const walk = (node)=>{
		if(Array.isArray(node)) return node.map(walk);
		if(!node || Object.getPrototypeOf(node) !== NodeType) return;
		if(node.type == 'CallExpression' && node.callee.name == 'require'){
			return deps.push(node.arguments[0].value)
		}
		//Handle import/export?
		Object.values(node).map(walk);
	}
	walk(ast.program.body);
	return deps;
};

//Returns transformed code and it's deps
const parseFile = (fullpath, opts)=>{
	const folder = path.dirname(fullpath);

	let code = fs.readFileSync(fullpath, 'utf8'); //change out for a reader
	//Apply transforms here

	let deps = getDeps(code, fullpath);

	deps = construct(deps, (dep)=>{
		return [dep, require.resolve(dep, {paths:[folder]})]
	})

	return [code, deps]
};


const depGraph = (entry, modules = {}, opts)=>{

	const go = (fullpath)=>{
		const id = utils.getId(fullpath);

		if(modules[id] || !utils.shouldPack(fullpath, opts)) return id;

		const [code, deps] = parseFile(fullpath, opts);

		modules[id] = {
			id, code,
			deps : mapValues(deps, (dep)=>go(dep))
		}

		return id;
	};
	modules._ = go(entry);
	return modules;
}




const EntryPoint = Symbol('entry');

const getModules = (entry, opts, modules={})=>{
	const depsGraph = (fullpath)=>{

		const id = utils.getPath(fullpath);
		//if(modules[id] || !utils.shouldPack(fullpath, opts)){
		if(modules[id]){
			return id;
		}

		console.log(entry, id);

		const res = {
			id,
			code : '',
			deps : {}
		};

		res.code = fs.readFileSync(fullpath, 'utf8'); //change out for a reader

		//Apply transforms here

		const deps = getDeps(res.code, fullpath);

		const folder = path.dirname(fullpath);
		deps.map((dep)=>{
			res.deps[dep] = depsGraph(require.resolve(dep, {paths:[folder]}));
		})
		modules[res.id]=res;
		return res.id
	}

	modules.__ = depsGraph(require.resolve(entry));
	return modules;
}




const bundleModules = (modules, entry)=>{
	console.log('ENTRYPOINT', modules[EntryPoint]);
	const mods = Object.values(modules).map((mod)=>{
		return `'${mod.id}': [function(require, module, exports, global){${mod.code}},${JSON.stringify(mod.deps)}]`
	}).join(',');
	return `if(typeof global == 'undefined') global = {};
if(typeof __modules__ == 'undefined') __modules__ = {};
__modules__ = Object.assign(__modules__, {${mods}});`
};

function __require__(id){
	this.cache = this.cache || {}
	if(this.cache[id]) return this.cache[id];
	const [fn, mapping] = __modules__[id];
	const module = { exports : {} };
	fn((name)=>__require__(mapping[name]), module, module.exports, global);
	this.cache[id] = module.exports;
	return module.exports;
}

const bundleEntry = ()=>{
	const key = '';  //module path to the entry
	const name = ''; //entryfile base name

	return `const _require = (id)=>{
	if(_require.cache[id]) return _require.cache[id];
	const [fn, mapping] = __modules__[id];
	const module = { exports : {} };
	fn((name)=>_require(mapping[name]), module, module.exports, global);
	_require.cache[id] = module.exports;
	return module.exports;
}
_require.cache={};

//test
${__require__.toString()}


//replace with entry root name to expose globally
${name} = _require('${key}')

if(typeof modules !== 'undefined') module.exports = ${name};`
}


const bundle = (modules, entry)=>{

	return `
	${bundleModules(modules, entry)}
	const _require = (id)=>{
		if(_require.cache[id]) return _require.cache[id];
		const [fn, mapping] = __modules__[id];
		const module = { exports : {} };
		fn((name)=>_require(mapping[name]), module, module.exports, global);
		_require.cache[id] = module.exports;
		return module.exports;
	}
	_require.cache={};

	//test
	${__require__.toString()}


	//replace with entry root name to expose globally
	temp = _require('${entry}')

	if(typeof modules !== 'undefined') module.exports = temp;


	`
}


// 	let result = `
// if(typeof global == 'undefined') global = {};
// if(typeof __modules__ == 'undefined') __modules__ = {};

// __modules__ = Object.assign(__modules__, {${mods}});

// const _require = (id)=>{
// 	if(_require.cache[id]) return _require.cache[id];
// 	const [fn, mapping] = __modules__[id];
// 	const module = { exports : {} };
// 	fn((name)=>_require(mapping[name]), module, module.exports, global);
// 	_require.cache[id] = module.exports;
// 	return module.exports;
// }
// _require.cache={};

// //replace with entry root name to expose globally
// var temp = _require('${modules[EntryPoint]}')

// if(typeof modules !== 'undefined') module.exports = temp;

// `

// 	return result;

// }




module.exports = {
	bundleEntry,
	bundle,
	getModules,
	parseFile,
	depGraph
}