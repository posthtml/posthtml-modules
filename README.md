# Posthtml-modules <img align="right" width="220" height="200" title="PostHTML logo" src="http://posthtml.github.io/posthtml/logo.svg">

[![NPM version](http://img.shields.io/npm/v/posthtml-modules.svg)](https://www.npmjs.org/package/posthtml-modules)
[![Travis Build Status](https://travis-ci.org/canvaskisa/posthtml-modules.svg)](https://travis-ci.org/canvaskisa/posthtml-modules)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

## Installation
```console
$ npm i --save posthtml-modules
```

## Usage
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
/* index.js */
var fs = require('fs');
var posthtml = require('posthtml');

posthtml()
  .use(require('posthtml-modules')())
  .process(fs.readFileSync('index.html', 'utf8'))
  .then(function(result) {
    return result; 

    /**
     * <html>
     *  <body>
     *    <header>
     *      <h1>Test title</h1>
     *    </header>
     *  </body>
     * </html>
     */
  });
```

## Api
```js
options = {
  root: './', // root path for modules lookup,
  plugins: [] // posthtml plugins to apply for every parsed module
};
```

## License
MIT © [Aleksandr Yakunichev](https://github.com/canvaskisa)
