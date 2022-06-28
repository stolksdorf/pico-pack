const Path = require('node:path');
const fs = require('node:fs');


module.exports.staticAsset = (assetDirectory)=>{
	return (code, fp)=>{
		const path = Path.relative(process.cwd(), fp).replaceAll('\\', '/');
		const newPath = Path.join(process.cwd(), assetDirectory, path);
		fs.mkdirSync(Path.dirname(newPath), {recursive: true});
		fs.copyFileSync(fp, newPath);
		return `module.exports='/${path}';`
	};
};

module.exports.base64Transform = (code, fp)=>{
	const Types = {'.ico':'image/x-icon','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.wav':'audio/wav','.mp3':'audio/mpeg','.svg':'image/svg+xml','.gif' :'image/gif'};
	const base64 = Buffer.from(fs.readFileSync(fp)).toString('base64');
	const type = Types[Path.extname(fp)] || 'text/plain';
	return `module.exports='data:${type};base64,${base64}';`;
};
