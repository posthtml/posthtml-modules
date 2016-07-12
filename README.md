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

<h2 align="center">Install</h2>

```bash
npm i -D posthtml-modules
```

<h2 align="center">Usage</h2>

```js
options = {
  root: './', // (String) root path for modules lookup,
  plugins: [], // (Array || Function) posthtml plugins to apply for every parsed module, if a function provided – it will be called with module's file path
  from: '' // (String) root filename for processing apply, needed for path resolving (it's better to always provide it),
  initial: false // (Boolean) apply plugins to root file after modules processing
};
```

<h2 align="center">Example</h2>

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

posthtml()
  .use(require('posthtml-modules')())
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

<h2 align="center">LICENSE</h2>

> MIT License (MIT)

> Copyright (c) 2016 [Aleksandr Yakunichev](https://github.com/canvaskisa)

> Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

> The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


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
