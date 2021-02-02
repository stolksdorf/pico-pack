const getArgs = (processArr = process.argv.slice(2))=>{
	return processArr.reduce((acc, arg)=>{
		if(arg[0]=='-'){
			let [key,val] = arg.replace(/-(-)?/, '').split('=');
			acc[key] = typeof val == 'undefined' ? true : val;
			return acc;
		}
		acc.args.push(arg);
		return acc;
	}, {args:[]});
};


module.exports = getArgs

