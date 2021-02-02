# pico-pack

Experiments in creating my own lightweight bundler


features:
- Really simple interface
- Returns bundled code and the runnable exported result of the bundle (allowing you to implement serverside rendering for react and what not)
- Implements some pretty smart cacheing and de-cacheing, making rebundles insanely quick.
- Has dev builds, aka sets up file watchers and rebundles when a file has changed
- Supports custom file transforms, including babel



anti-features: (things I removed for simplicity)
- Simply just returns the bundle text
- No file streams
- Fully syncronous
- No bundle splitting
- libs will be transformed (although could write a custom transform to check for that)
- No tree-shaking or anything




### Custom transforms with Cache example

```js

const {bundle, cache, export} = pack('/path/to/component.js', {
	transforms : {
		'.css' : (code, fp, cache)=>{
			cache.css = cache.css || {}
			cache.css[fp] = parseCSS(code);
			return '';
		}
	}
});

const resultHTML = `
<html>
	<head>
		<style>${genCSS(cache.css)}</style>
		<script>${bundle}</script>
	</head>
	<body>
		${render(export())}
	</body>
</html>
`

```