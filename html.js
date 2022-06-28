const pack = require('../pico-pack.js');

/* Returns a function that creates a HTML string */
module.exports = (path, watchFunc=false)=>{
	path = pack.resolveFromCaller(path);
	let mod, bundle;
	if(watchFunc){
		pack.watch(path, (changedFile, _mod)=>{
			mod = _mod;
			bundle = pack(path);
			watchFunc(changedFile);
		})
	}else{
		mod = require(path);
		bundle = pack(path);
	}

	return (...args)=>{
		const str_args = args.map(p=>JSON.stringify(p)).join(',');
		global.head={}; global.css={};
		const html = mod(...args);
		return `<html>
			<head>
				<script>window.css={};window.head={};</script>
				${Object.values(global.head).join('\n')}
				${Object.entries(global.css)
					.map(([id, style])=>`<style id='${id}'>${style}</style>`)
					.join('\n')
				}
			</head>
			<body>${html}</body>
			<script>
				${bundle}
				main(${str_args});
			</script>
		</html>`
	}
};