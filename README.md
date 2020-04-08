[![NPM][npm]][npm-url]
[![Deps][deps]][deps-url]
[![Tests][travis]][travis-url]
[![Coverage][cover]][cover-url]
[![XO Code Style][style]][style-url]

<div align="center">
  <img width="220" height="150" title="PostHTML" src="http://posthtml.github.io/posthtml/logo.svg">
  <h1>Modules Plugin</h1>
  <p>Import and process HTML Modules with PostHTML</p>
</div>

## Install

```bash
npm i posthtml-modules
```

## Example

```html
<!-- index.html -->
<html>
<body>
  <module href="./module.html">
    title
  </module>
</body>
</html>
```

```html
<!-- module.html -->
<header>
  <h1>
    Test <content></content>
  </h1>
</header>
```

```js
const { readFileSync } = require('fs')
const posthtml = require('posthtml')
const options = { /* see available options below */ }

posthtml()
  .use(require('posthtml-modules')(options))
  .process(readFileSync('index.html', 'utf8'))
  .then((result) => result)
  });
```

```html
<html>
 <body>
   <header>
     <h1>Test title</h1>
   </header>
  </body>
</html>
```

## Options

### `root`

Default: `'./'`

(String) root path for modules lookup.

### `plugins`

Default: `[]`

(Array|Function) posthtml plugins to apply for every parsed module. 

If a function provided, it will be called with module's file path.

### `from`

Default `''`

(String) root filename for processing apply, needed for path resolving (it's better to always provide it).

### `initial`

Default: `false`

(Boolean) apply plugins to root file after modules processing.

### `tag`

Default: `'module'`

(String) use a custom tag name.

### `attribute`

Default: `'href'`

(String) use a custom attribute name.

## Component options

#### `locals`

You can pass data to a module using a `locals=""` attribute.

Must be a valid JSON object.

Example:

```handlebars
<!-- index.html -->
<module href="./module.html" locals='{"foo": "strong"}'>
  <p>Or so they say...</p>
</module>
```

```handlebars
<!-- module.html -->
<p>The foo is {{ foo }} in this one.</p>
<content></content>
```

### Result

```html
<p>The foo is strong in this one.</p>
<p>Or so they say...</p>
```

[npm]: https://img.shields.io/npm/v/posthtml-modules.svg
[npm-url]: https://npmjs.com/package/posthtml-modules

[deps]: https://david-dm.org/posthtml/posthtml-modules.svg
[deps-url]: https://david-dm.org/posthtml/posthtml-modules

[style]: https://img.shields.io/badge/code_style-XO-5ed9c7.svg
[style-url]: https://github.com/sindresorhus/xo

[travis]: http://img.shields.io/travis/posthtml/posthtml-modules.svg
[travis-url]: https://travis-ci.org/posthtml/posthtml-modules

[cover]: https://coveralls.io/repos/github/posthtml/posthtml-modules/badge.svg?branch=master
[cover-url]: https://coveralls.io/github/posthtml/posthtml-modules?branch=master
