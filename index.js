'use strict';

var fs = require('fs');
var path = require('path');
var posthtml = require('posthtml');
var match = require('posthtml-match-helper');

/**
 * process every node content with posthtml
 * @param  {Object} node [posthtml element object]
 * @param  {Object} options
 * @return {Function}
 */
function processNodeContentWithPosthtml(node, options) {
	return function (content) {
		return posthtml(
			[function (tree) { // remove <content> tags and replace them with node's content
				return tree.match(match('content'), function () {
					return {
						tag: false,
						content: node.content || ''
					};
				});
			}].concat(
				typeof options.plugins === 'function' ? // apply plugins to posthtml subprocessing
					/* istanbul ignore next */
					options.plugins(path.join(path.dirname(options.from), node.attrs.href)) :
					options.plugins
			)
		).process(content);
	};
}

/**
 * readFile
 * @param  {Object} options  [plugin options object]
 * @param  {String} href     [node's href attribute value]
 * @return {Promise<String>} [Promise with file content's]
 */
function readFile(options, href) {
	const filePath = path.join(path.isAbsolute(href) ? options.root : path.dirname(options.from), href);

	return new Promise(function (resolve, reject) {
		return fs.readFile(filePath, 'utf8', function (err, res) {
			return err ? reject(err) : resolve(res);
		});
	});
}

/**
 * @param  {Object} options   [plugin options]
 * @return {Promise | Object} [posthtml tree or promise]
 */
function parse(options) {
	return function (tree) {
		var promises = [];

		tree.match(match('module[href]'), function (node) {
			promises.push(
				readFile(options, node.attrs.href)
					.then(processNodeContentWithPosthtml(node, options))
					.then(function (processed) { // Recursively call parse with node's content tree
						return parse(Object.assign({}, options, {
							from: path.join(path.dirname(options.from), node.attrs.href)
						}))(processed.tree);
					}).then(function (content) { // remove <module> tag and set inner content
						node.tag = false;
						node.content = content;
					})
			);

			return node;
		});

		return promises.length ? Promise.all(promises).then(function () {
			return tree;
		}) : tree;
	};
}

module.exports = function plugin(options) {
	options = options || {};

	return parse({
		plugins: options.plugins || [],
		root: path.resolve(options.root || './'),
		from: options.from || ''
	});
};
