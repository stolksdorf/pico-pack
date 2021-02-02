const vm = require('vm');
const fs = require('fs');
const path = require('path');

//let cache = {};

// const getCaller = (offset=0)=>{
// 	const cache = Error.prepareStackTrace;
// 	Error.prepareStackTrace = (_, stack)=>stack;
// 	const target = (new Error()).stack[2+offset];
// 	Error.prepareStackTrace = cache;
// 	return {
// 		name : target.getFunctionName(),
// 		file : target.getFileName(),
// 		line : target.getLineNumber(),
// 		col  : target.getColumnNumber(),
// 	};
// };


/*

(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.main = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){


	},{"./controls.less":2,"classnames":undefined,"create-react-class":undefined,"react":undefined,"shared/longPress.jsx":11}],2:[function(require,module,exports){

	},{}],"C:\\Dropbox\\root\\Programming\\Javascript\\ti4-planet-tracker\\client\\main\\main.jsx":[function(require,module,exports){
	require('./main.less');

	("C:\\Dropbox\\root\\Programming\\Javascript\\ti4-planet-tracker\\client\\main\\main.jsx")
	});

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

const getModules = (entry, opts, modules={}, libs={})=>{
	let scopeGlobal = {};

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

	const pack = (filename)=>{
		const id = path.relative(process.cwd(), filename);
		if(libs[id]) return libs[id];
		if(modules[id]) return modules[id];

		modules[id] = parseModule(filename, id);

		return modules[id];
	}
	const {id} = pack(require.resolve(entry))
	return {modules, libs, id};
}



const watch = (entry, cb)=>{
	let cache = getModules(entry), debounce;
	const update = ()=>{
		clearInterval(debounce)
		debounce = setTimeout(()=>{
			try{
				cache = getModules(entry, {}, cache.modules, cache.libs);
				cb(cache);
			}catch(e){
				console.log(e);
			}
		},10)
	};
	Object.values(cache.modules).map((mod)=>{
		fs.watch(mod.filename,()=>{
			console.log('THIS CHANGED', mod.filename);
			delete cache.modules[mod.id];
			update();
		});
	});
	cb(cache);
};


module.exports = {
	getModules,
	watch
}