const test = require('ava');
const plugin = require('..');
const posthtml = require('posthtml');

const clean = html => html.replace(/(\n|\t)/g, '').trim();

test('Must include html', async t => {
  const actual = `<div><module href="./test/test.spec.html"></module></div>`;
  const expected = `<div><button type="button">Button</button></div>`;
  const html = await posthtml().use(plugin()).process(actual).then(result => clean(result.html));
  t.is(html, expected);
});

test(`Must fail when module’s href cannot be found`, async t => {
  const actual = `<div><module href="./undefined.html"></module></div>`;
  await t.throwsAsync(async () => posthtml().use(plugin()).process(actual));
});

test(`Must replace <content/> with module’s content`, async t => {
  const actual = `<div><module href="./test/test.spec.html">Test</module></div>`;
  const expected = `<div><button type="button">ButtonTest</button></div>`;
  const html = await posthtml().use(plugin()).process(actual).then(result => clean(result.html));
  t.is(html, expected);
});

test('Must resolve href path correctly', async t => {
  const actual = '<div class="container"><module href="./tree.spec/header/index.html"></module></div>';
  const expected = '<div class="container"><header class="header"><nav class="nav"><button class="button"></button></nav></header></div>';
  const html = await posthtml().use(plugin({root: './test/tree.spec', from: __filename})).process(actual).then(result => clean(result.html));
  t.is(html, expected);
});

test('Must process nested modules', async t => {
  const actual = '<module href="./tree.spec/layout.html">Test<module href="./tree.spec/_/button.html">Button</module></module>';
  const expected = '<div class="container">Test<button class="button">Button</button></div>';
  const html = await posthtml().use(plugin({root: './test/tree.spec', from: __filename})).process(actual).then(result => clean(result.html));
  t.is(html, expected);
});

test('Must process nested modules with locals', async t => {
  const actual = `<module href="./tree.spec/layout.html" locals='{"foo": "bar"}'>Test<module href="./tree.spec/_/button.html">Button</module></module>`;
  const expected = '<div class="container">Test<button class="button">Button</button></div>';
  const html = await posthtml().use(plugin({root: './test/tree.spec', from: __filename})).process(actual).then(result => clean(result.html));
  t.is(html, expected);
});

test('Must process initial tree if initial prop is passed', async t => {
  const actual = `<div class="test"><module href="./test.spec.html">Test</module></div>`;
  const expected = `<div class="processed"><button type="button">ButtonTest</button></div>`;

  const html = await posthtml().use(plugin({
    root: './tree.spec',
    from: __filename,
    initial: true,
    plugins: [tree => tree.match({tag: 'div'}, node => Object.assign({}, node, {attrs: {class: 'processed'}}))]
  }))
    .process(actual)
    .then(result => clean(result.html));

  t.is(html, expected);
});

test('Must process initial tree if initial prop is passed and no modules found', async t => {
  const actual = `<div class="test"></div>`;
  const expected = `<div class="processed"></div>`;

  const {html} = await posthtml().use(plugin({
    root: './tree.spec',
    from: __filename,
    initial: true,
    plugins: [tree => tree.match({tag: 'div'}, node => Object.assign({}, node, {attrs: {class: 'processed'}}))]
  })).process(actual);

  t.is(html, expected);
});

test('Must call plugins option with from value if it is a function', async t => {
  await posthtml().use(plugin({
    root: './tree.spec',
    from: __filename,
    initial: true,
    plugins: _from => {
      t.is(_from, __filename);
      return [tree => tree];
    }
  })).process('<div class="test"></div>');
});

test('Must parse locals if locals prop is passed and it contains a valid JSON string', async t => {
  const actual = `<div class="test"><module href="./test/locals.spec.html" locals='{"foo": "bar"}'>Test</module></div>`;
  const expected = `<div class="test"><button type="button">foo is: bar - Test</button></div>`;

  const html = await posthtml().use(plugin()).process(actual).then(result => clean(result.html));

  t.is(html, expected);
});

test('Must not parse locals if locals prop is passed but is not a valid JSON string', async t => {
  const actual = `<div class="test"><module href="./test/locals.spec.html" locals="test">Test</module></div>`;
  const expected = `<div class="test"><button type="button">foo is: undefined - Test</button></div>`;

  const html = await posthtml().use(plugin()).process(actual).then(result => clean(result.html));

  t.is(html, expected);
});

test('Must not try to parse locals if locals prop is missing', async t => {
  const actual = `<div class="test"><module href="./test/locals.spec.html">Test</module></div>`;
  const expected = `<div class="test"><button type="button">foo is: undefined - Test</button></div>`;

  const html = await posthtml().use(plugin()).process(actual).then(result => clean(result.html));

  t.is(html, expected);
});

test('Must not parse locals if locals prop is passed but is empty', async t => {
  const actual = `<div class="test"><module href="./test/locals.spec.html" locals="">Test</module></div>`;
  const expected = `<div class="test"><button type="button">foo is: undefined - Test</button></div>`;

  const html = await posthtml().use(plugin()).process(actual).then(result => clean(result.html));

  t.is(html, expected);
});

test('Must use custom tag name if it was provided in options', async t => {
  const actual = `<div><component href="./test/test.spec.html">Test</component></div>`;
  const expected = `<div><button type="button">ButtonTest</button></div>`;

  const html = await posthtml().use(plugin({tag: 'component'})).process(actual).then(result => clean(result.html));

  t.is(html, expected);
});

test('Must use custom attribute name if it was provided in options', async t => {
  const actual = `<div><module src="./test/test.spec.html">Test</module></div>`;
  const expected = `<div><button type="button">ButtonTest</button></div>`;

  const html = await posthtml().use(plugin({attribute: 'src'})).process(actual).then(result => clean(result.html));

  t.is(html, expected);
});

test('Must parse attribute locals passed to <content>', async t => {
  const actual = `<module href="./test/locals.option.spec.html" locals='{"inlineFoo": "bar"}'>{{ optionFoo }}</module>`;
  const expected = `<div>    Locals attribute: bar    Locals option: undefined    undefined</div>`;

  const html = await posthtml().use(plugin()).process(actual).then(result => clean(result.html));

  t.is(html, expected);
});

test('Must parse options locals passed to <content>', async t => {
  const actual = `<module href="./test/locals.option.spec.html">{{ optionFoo }}</module>`;
  const expected = `<div>    Locals attribute: undefined    Locals option: optionBar    optionBar</div>`;

  const html = await posthtml().use(plugin({locals: {optionFoo: 'optionBar'}})).process(actual).then(result => clean(result.html));

  t.is(html, expected);
});

test('Must parse all locals', async t => {
  const actual = `<module href="./test/locals.option.spec.html" locals='{"inlineFoo": "inlineBar"}'>{{ optionFoo }}</module>`;
  const expected = `<div>    Locals attribute: inlineBar    Locals option: optionBar    optionBar</div>`;

  const html = await posthtml().use(plugin({locals: {optionFoo: 'optionBar'}})).process(actual).then(result => clean(result.html));

  t.is(html, expected);
});

test('Must work with locals provided in options but no content passed', async t => {
  const actual = `<module href="./test/locals.option.spec.html"></module>`;
  const expected = `<div>    Locals attribute: undefined    Locals option: optionBar    </div>`;

  const html = await posthtml().use(plugin({locals: {optionFoo: 'optionBar'}})).process(actual).then(result => clean(result.html));

  t.is(html, expected);
});

test('Must use parser options', async t => {
  const actual = `PHP code in parent: <?php echo $foo; ?> <module href="./test/posthtml.spec.html"></module>`;
  const expected = `PHP code in parent: <?php echo $foo; ?> PHP code in module: <?php echo $bar; ?>`;

  const posthtmlOptions = {directives: [{name: '?php', start: '<', end: '>'}]};

  const html = await posthtml().use(plugin({parser: posthtmlOptions})).process(actual, posthtmlOptions).then(result => clean(result.html));

  t.is(html, expected);
});

test('Must parse attribute as locals', async t => {
  const actual = `<module href="./test/attribute.as.locals.spec.html" class="text-center uppercase" id="example" style="display: flex; gap: 2;">Module content</module>`;
  const expected = `<div class="text-center uppercase" id="example" style="display: flex; gap: 2;">Module content</div>`;

  const html = await posthtml().use(plugin({attributeAsLocals: true})).process(actual).then(result => clean(result.html));

  t.is(html, expected);
});

test('Must use posthtml-expressions options', async t => {
  const actual = `<module href="./test/locals.expressions.spec.html" locals='{"foo":"bar"}'></module>`;
  const expected = `<div><i>bar</i><b>{{ ignored }}</b></div>`;

  const html = await posthtml().use(plugin({expressions: {delimiters: ['%[', ']%']}})).process(actual).then(result => clean(result.html));

  t.is(html, expected);
});

test('Must include html using custom tag without href inside specified tag path', async t => {
  const actual = `<div><x-button class="btn btn-primary">Submit</x-button></div>`;
  const expected = `<div><button class="btn btn-primary">Submit</button></div>`;

  const html = await posthtml().use(plugin({attributeAsLocals: true, customTagPaths: '/test/tree.spec/custom-tag/'})).process(actual).then(result => clean(result.html));

  t.is(html, expected);
});

test('Must use custom folder using namespaced tag', async t => {
  let actual = `<div><x-theme-dark::button>Submit</x-theme-dark::button></div>`;
  let expected = `<div><button class="bg-dark text-light">Submit</button></div>`;

  let html = await posthtml().use(plugin({customTagNamespaces: {'theme-dark': './test/tree.spec/custom-tag/theme-dark/', 'theme-light': './test/tree.spec/custom-tag/theme-light/'}}))
    .process(actual)
    .then(result => clean(result.html));

  t.is(html, expected);

  actual = `<div><x-theme-light::button>Submit</x-theme-light::button></div>`;
  expected = `<div><button class="bg-light text-dark">Submit</button></div>`;

  html = await posthtml().use(plugin({customTagNamespaces: {'theme-dark': './test/tree.spec/custom-tag/theme-dark/', 'theme-light': './test/tree.spec/custom-tag/theme-light/'}}))
    .process(actual)
    .then(result => clean(result.html));

  t.is(html, expected);
});

test(`Must fail when module’s doesn't exist in specified namespace`, async t => {
  const actual = `<div><x-namespace::nonexisting>Non-existing namespace</x-namespace::nonexisting></div>`;
  await t.throwsAsync(async () => posthtml().use(plugin({customTagNamespaces: {namespace: './test/tree.spec/custom-tag/theme-dark/'}})).process(actual));
});

test('Must use custom tag prefix if it was provided in options', async t => {
  const actual = `<div><m-button class="btn btn-primary">Submit</m-button></div>`;
  const expected = `<div><button class="btn btn-primary">Submit</button></div>`;

  const html = await posthtml().use(plugin({attributeAsLocals: true, customTagPrefix: 'm-', customTagPaths: '/test/tree.spec/custom-tag/'})).process(actual).then(result => clean(result.html));

  t.is(html, expected);
});

test('Must find file inside multiple specified tag paths', async t => {
  const actual = `<div><x-label>My label</x-label></div>`;
  const expected = `<div><label>My label</label></div>`;

  const html = await posthtml().use(plugin({customTagPaths: ['/test/tree.spec/custom-tag/', '/test/tree.spec/custom-tag2/']})).process(actual).then(result => clean(result.html));

  t.is(html, expected);
});

test(`Must fail when module’s doesn't exist in any custom tag paths`, async t => {
  const actual = `<div><x-nonexisting>Non-existing namespace</x-nonexisting></div>`;
  await t.throwsAsync(async () => posthtml().use(plugin({customTagPaths: ['/test/tree.spec/custom-tag/', '/test/tree.spec/custom-tag2/']})).process(actual));
});

test(`Must find module file index.html when the tag has only module folder name.`, async t => {
  const actual = `<x-modal title="My modal title">My modal content</x-modal>`;
  const expected = `<div><h1>My modal title</h1>My modal content</div>`;

  const html = await posthtml().use(plugin({attributeAsLocals: true, customTagPaths: ['/test/tree.spec/custom-tag/', '/test/tree.spec/custom-tag2/']})).process(actual).then(result => clean(result.html));

  t.is(html, expected);
});

test(`Must find module file index.html when the tag has only module folder name using namespace.`, async t => {
  const actual = `<x-ui::modal>My modal content</x-ui::modal>`;
  const expected = `<div>My modal content</div>`;

  const html = await posthtml().use(plugin({attributeAsLocals: true, customTagNamespaces: {ui: './test/tree.spec/custom-tag/'}})).process(actual).then(result => clean(result.html));

  t.is(html, expected);
});

test(`Must find namespaced module by using custom namespace separator.`, async t => {
  const actual = `<x-ui__modal>My modal content</x-ui__modal>`;
  const expected = `<div>My modal content</div>`;

  const html = await posthtml().use(plugin({attributeAsLocals: true, customTagNamespaceSeparator: '__', customTagNamespaces: {ui: './test/tree.spec/custom-tag/'}})).process(actual).then(result => clean(result.html));

  t.is(html, expected);
});

test(`Must fail when module’s namespace is not defined`, async t => {
  const actual = `<div><x-nonexisting::button>Non-existing namespace</x-nonexisting::button></div>`;
  await t.throwsAsync(async () => posthtml().use(plugin()).process(actual));
});
