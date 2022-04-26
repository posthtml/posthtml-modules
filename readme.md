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
npm i -D posthtml-modules
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

Type: `string`\
Default: `./`

Root path for modules lookup.

### `plugins`

Type: `array | function`\
Default: `[]`

PostHTML plugins to apply for every parsed module.

If a function provided, it will be called with module's file path.

### `from`

Type: `string`\
Default: `''`

Root filename for processing apply, needed for path resolving (it's better to always provide it).

### `initial`

Type: `boolean`\
Default: `false`

Apply plugins to root file after modules processing.

### `tag`

Type: `string`\
Default: `module`

Use a custom tag name.

### `attribute`

Type: `string`\
Default: `href`

Use a custom attribute name.

### `locals`

Type: `object`\
Default: `{}`

Pass data to the module.

If present, the JSON object from the `locals=""` attribute will be merged on top of this, overwriting any existing values.

### `attributeAsLocals`

Type: `boolean`\
Default: `false`

All attributes on `<module></module>` will be added to [locals](#locals)

### `parser`

Type: `object`\
Default: `{}`

Options for the PostHTML parser.

By default, [`posthtml-parser`](https://github.com/posthtml/posthtml-parser) is used.

### `expressions`

Type: `object`\
Default: `{}`

Options to forward to [posthtml-expressions](https://github.com/posthtml/posthtml-expressions), like custom delimiters for example. Available options can be found [here](https://github.com/posthtml/posthtml-expressions#options).


## Component options

### `locals`

You can pass data to a module using a `locals=""` attribute.

Must be a valid JSON object.

Example:

```handlebars
<!-- module.html -->
<p>The foo is {{ foo }} in this one.</p>
<content></content>
```

```handlebars
<!-- index.html -->
<module href="./module.html" locals='{"foo": "strong"}'>
  <p>Or so they say...</p>
</module>
```

### Result

```html
<p>The foo is strong in this one.</p>
<p>Or so they say...</p>
```

### `attributeAsLocals`

All attributes on `<module></module>` will be added to [locals](#locals)

Example:

```handlebars
<!-- module.html -->
<div class="{{ class }}" id="{{ id }}" style="{{ style }}">
  <content></content>
</div>
```

```handlebars
<!-- index.html -->
<module 
  href="module.html" 
  class="text-center uppercase" 
  id="example"
  style="display: flex; gap: 2;"
>
  Module content
</module>
```

### Result

```html
<div class="text-center uppercase" id="example" style="display: flex; gap: 2;">
  Module content
</div>
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
