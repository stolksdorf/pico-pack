const transforms = {
	'.json' : (code, filename)=>`module.exports=${code};`,
	'.js' : (code, filename)=>code,
	'*' : (code, filename)=>`module.exports=\`${code}\`;`
};

module.exports = transforms;