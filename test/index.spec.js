import fs from 'fs';
import path from 'path';
import test from 'ava';
import posthtml from 'posthtml';
import plugin from '..';

const button = fs.readFileSync(path.resolve(__dirname, './test.spec.html'), 'utf8');

test('Must include html', async t => {
	const actual = `<div><module href="./test.spec.html"></module></div>`;
	const expected = `<div>${button}</div>`;
	const {html} = await posthtml().use(plugin()).process(actual);
	t.is(html, expected);
});

test('Must fail when module\'s href cannot be found', async t => {
	const actual = `<div><module href="./undefined.html"></module></div>`;
	t.throws(posthtml().use(plugin()).process(actual));
});
