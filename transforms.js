
const AssetTransform = (code, fp, global)=>{
	const staticDirectory = 'bundled_assets';
	const _path = path.relative(process.cwd(), fp).replaceAll('\\', '/');
	const newPath = path.join(process.cwd(), staticDirectory, _path);
	fs.mkdirSync(path.dirname(newPath), {recursive: true});
	fs.copyFileSync(fp, newPath);
	return `module.exports='/${_path}';`
};

const Base64Transform = (code, fp, global)=>{
	const Types = {'.ico':'image/x-icon','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.wav':'audio/wav','.mp3':'audio/mpeg','.svg':'image/svg+xml','.gif' :'image/gif'};
	const base64 = Buffer.from(require('fs').readFileSync(fp)).toString('base64');
	const type = Types[require('path').extname(fp)] || 'text/plain';
	return `module.exports='data:${type};base64,${base64}';`;
};
