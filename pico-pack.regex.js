





//const babelify = async (code)=>(await require('@babel/core').transformAsync(code,{ })).code;






/*
	depGraph = {
		[id] : {
			path,
			code,
			deps,
			watched : true,
			id
		}


	}
*/

//TODO:

// Regex to detect require statements?
// test how imports are transformed, possibly need to regex these as well
//

const execAll = (rgx, str)=>{let m,r=[]; while (m=rgx.exec(str)){r.push(m[1]);}; return r;};
const getDeps = (code)=>execAll(/require\(['"`]([\s\S]*?)['"`]\)/g, code);

const fs = require('fs').promises;

module.exports = (path, opts = {})=>{
	let DepGraph = {};


	const graphFile = async (path, opts={transform, skip, watch:bool})=>{
		// Check cache and skip option?, jetpack out, return id
		// Read in code, and transform
		// Use regex to check for deps
		// resolve each dep Path, using path as context




		let code = await fs.readFile(path, 'utf8');
		if(opts.transform) code = await opts.transform(code, path);


		DepGraph[path] = {
			id : path,
			code,
			deps : {}
		}

		let deps = {}

		await Promise.all(getDeps(code).maps(async (dep)=>{
			// resolve the dep path
			const realPath = dep;
			await graphFile(dep, opts);
			deps[dep] = realPath
		}));

		//return id
	}

	const graphToBundle = (graph, expose='name')=>{
		// Converts each dep in the graph to a object of ids and function
		// Should populate a global deps object
		// exposes access to root function by global name, (and module.exports if available)
	}

	const fileChanged = (id)=>{
		//delte from cache
		//re-graph
		//fire watch handler
	}

	//Returns the dep grpah
	// Write a simple 'require' function that uses a globally scoped dep graph and a root path to return values
	//	Or just a function that returns the root element. Stored in the dep graph, only if the given path was a string, not an array.



}