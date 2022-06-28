# 📦 pico-pack

> Incredibly light-weight javascript bundler



### Features:
- Really simple interface
- Uses Node's `require.cache` for dependency introspection
- `.watch` allows for rebundling when dependencies change
- Supports custom file transforms
- 115 lines of code, no external dependencies



### How it Works

- `pico-pack` proxies the `require` function in order to add needed information about each module. When you bundle a module, it packs up each of it's dependencies into a stand-alone ready-to-run string.
- When you watch a module, when any of it's dependencies change, `pico-pack` de-caches all modules that depend on the changed file, then it runs the watch function.
- Transforms update Nodes internal `Module` library for handling imports of specific extensions. It caches the transform onto the module instance, so if a transformed module gets bundled, it bundles the transformed version instead of the raw file.



### Custom transform Example

```js
const fs = require('node:fs');
const { pack, addTransform } = require('pico-pack');

/* Transforms any require'd .png file into a base64 string */
addTransform('.png', (code, filepath)=>{
	const base64 = Buffer.from(fs.readFileSync(filepath)).toString('base64');
	return `module.exports='data:image/png;base64,${base64}';`;
})

const bundle = pack('./src/index.js');

fs.writeFileSync('./build/bundle.js', bundle, 'utf8');
```


### Watch Example

```js
const fs = require('node:fs');
const { pack, watch } = require('pico-pack');


watch('./src/index.js', (changedFile)=>{
	console.log(`${changedFile} file has changed`);
	const bundle = pack('./src/index.js');
	fs.writeFileSync('./build/bundle.js', bundle, 'utf8');
});
```