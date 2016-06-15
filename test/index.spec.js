import path from 'path';
import test from 'ava';
import posthtml from 'posthtml';
import plugin from '..';

test('Must include html', async t => {
	const actual = `<div><module href="./test.spec.html"></module></div>`;
	const expected = `<div><button type="button">Button</button>\n</div>`;
	const {html} = await posthtml().use(plugin()).process(actual);
	t.is(html, expected);
});

test('Must fail when module\'s href cannot be found', async t => {
	const actual = `<div><module href="./undefined.html"></module></div>`;
	const lookups = [
		path.resolve(__dirname, './/undefined.html'),
		path.resolve(__dirname, './undefined/index.html')
	];

	t.throws(
		posthtml().use(plugin()).process(actual),
		'ENOENT: posthtml-modules module lookups failed. Was looking for a module here:\n' + lookups.join('\n')
	);
});

test('Must replace <content/> with module\'s content', async t => {
	const actual = `<div><module href="./test.spec.html">Test</module></div>`;
	const expected = `<div><button type="button">ButtonTest</button>\n</div>`;
	const {html} = await posthtml().use(plugin()).process(actual);
	t.is(html, expected);
});

test('Must resolve href\'s correctly', async t => {
	const actual = '<div class="container"><module href="./header"></module></div>';
	const expected = '<div class="container"><header class="header"><nav class="nav"><button class="button"></button></nav></header></div>';
	const {html} = await posthtml().use(plugin({root: path.resolve(__dirname, 'tree.spec')})).process(actual);
	t.is(html.replace(/(\n|\t)/g, ''), expected);
});
