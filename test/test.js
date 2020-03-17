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