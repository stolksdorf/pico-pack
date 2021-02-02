const {parse} = require('@babel/parser');
const fs = require('fs');
const path = require('path');

const getDeps = (code)=>{
	let deps = [], ast;
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




const getDepGraph = (entrypoint)=>{

}

/*
[
{
	filename : '',
	code : '',
	deps : {
		<req> : <filename>
	}
	exports : //
}

]


*/



module.exports = getDeps;