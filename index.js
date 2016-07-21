'use strict';

var fs = require('fs');
var path = require('path');
var posthtml = require('posthtml');
var match = require('posthtml-match-helper');
var render = require('posthtml-render');

/**
 * process every node content with posthtml
 * @param  {Object} node [posthtml element object]
 * @param  {Object} options
 * @return {Function}
 */
function processNodeContentWithPosthtml(node, options) {
	return function (content) {
		return processWithPostHtml(options.plugins, path.join(path.dirname(options.from), node.attrs.href), content, [function (tree) {
			// remove <content> tags and replace them with node's content
			return tree.match(match('content'), function () {
				return node.content || '';
			});
		}]);
	};
}

/**
 * readFile
 * @param  {Object} options  [plugin options object]
 * @param  {String} href     [node's href attribute value]
 * @return {Promise<String>} [Promise with file content's]
 */
function readFile(options, href) {
	var filePath = path.join(path.isAbsolute(href) ? options.root : path.dirname(options.from), href);

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
					.then(function (tree) { // Recursively call parse with node's content tree
						return parse(Object.assign({}, options, {
							from: path.join(path.dirname(options.from), node.attrs.href)
						}))(tree);
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

/**
 * @param  {Array | Function} plugins [array of plugins to apply or function, which will be called with from option]
 * @param  {String}           from    [path to the processing file]
 * @param  {Object} 					content [posthtml tree to process]
 * @param  {Array}            prepend [array of plugins to process before plugins param]
 * @return {Object}                   [processed poshtml tree]
 */
function processWithPostHtml(plugins, from, content, prepend) {
	return posthtml((prepend || []).concat(
		typeof plugins === 'function' ? plugins(from) : plugins
	)).process(render(content)).then(function (result) {
		return result.tree;
	});
}

module.exports = function plugin(options) {
	options = options || {};
	options.initial = options.initial || false;
	options.plugins = options.plugins || [];
	options.root = path.resolve(options.root || './');
	options.from = options.from || '';

	return function (tree) {
		if (options.initial) {
			var parsed = parse(options)(tree);

			if (parsed instanceof Promise) {
				return parsed.then(function (content) {
					return processWithPostHtml(options.plugins, options.from, content);
				});
			}

			return processWithPostHtml(options.plugins, options.from, parsed);
		}

		return parse(options)(tree);
	};
};
