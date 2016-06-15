'use strict';

var fs = require('fs');
var path = require('path');
var posthtml = require('posthtml');
var match = require('posthtml-match-helper');

/**
 * replaces tag and content of provided module
 * @param  {Object} module [posthtml element object]
 * @return {Function}
 */
function replaceModuleTagWithContent(module) {
	return function (content) {
		module.tag = false;
		module.content = content;
	};
}

/**
 * replaces <content> tag with <module> content
 * @param  {Object} module [posthtml element object]
 * @return {Function}
 */
function replaceContentTagsWithModuleContent(module) {
	return function (tree) {
		return tree.match(match('content'), function () {
			return {
				tag: false,
				content: module.content || ''
			};
		});
	};
}

/**
 * process every module content with posthtml
 * @param  {Object} module [posthtml element object]
 * @param  {Array}  plugins [posthtml plugins]
 * @return {Function}
 */
function processModuleContentWithPosthtml(module, plugins) {
	return function (content) {
		return posthtml(
			[replaceContentTagsWithModuleContent(module)].concat(plugins)
		).process(content);
	};
}

/**
 * reads files and resolves errors or file's contents
 * @param  {Array} files [array of paths' to files]
 * @return {Promise}
 */
function readFiles(files) {
	return Promise.all(files.map(function (path) {
		return new Promise(function (resolve) {
			return fs.readFile(path, 'utf8', function (err, res) {
				return resolve(err || res);
			});
		});
	}));
}

/**
 * finds truthy values in array of errors and file contents
 * @param  {Array} lookups [array of paths' to files, needed for error messaging]
 * @return {Function}
 */
function getModuleContentFromFiles(lookups) {
	return function (files) {
		return new Promise(function (resolve, reject) {
			var result = files.reduce(function (prev, curr) {
				return prev instanceof Error ? curr : prev;
			});

			return result instanceof Error ?
				reject(new Error('ENOENT: posthtml-modules module lookups failed. Was looking for a module here:\n' + lookups.join('\n'))) :
				resolve(result);
		});
	};
}

/**
 * resolves array of paths to read
 * @param  {Object} options            [plugin options]
 * @param  {String} href               [href attribute of module tag]
 * @param  {String} previousModulePath [path of previous parsed module]
 * @return {Array}                     [array of paths' to files]
 */
function getModuleLookups(options, href, previousModulePath) {
	var name = path.parse(href).name;
	var dir = path.parse(href).dir;
	dir = dir === '.' ? '' : dir + '/';
	var prev = previousModulePath ? path.parse(previousModulePath).name + '/' : '';

	return [
		path.resolve(options.root, (dir.charAt(0) === '/' ? '' : prev) + (dir.charAt(0) === '/' ? dir.substr(1) : dir) + name + options.ext),
		path.resolve(options.root, (dir.charAt(0) === '/' ? '' : prev) + (dir.charAt(0) === '/' ? dir.substr(1) : dir) + name + '/index' + options.ext)
	];
}

/**
 * @param  {Object} options   [plugin options]
 * @return {Promise | Object} [posthtml tree or promise]
 */
function parse(options) {
	return function (tree) {
		var promises = [];

		tree.match(match('module[href]'), function (module) {
			var lookups = getModuleLookups(options, module.attrs.href, tree.previousModulePath);

			promises.push(
				readFiles(lookups)
					.then(getModuleContentFromFiles(lookups))
					.then(processModuleContentWithPosthtml(module, options.plugins))
					.then(processSubTree(module, options))
					.then(replaceModuleTagWithContent(module))
			);

			return module;
		});

		return promises.length ? Promise.all(promises).then(function () {
			return tree;
		}) : tree;
	};
}

/**
 * recursively parse contents' of module
 * @param  {Object} module
 * @param  {Object} options [plugin options]
 * @return {Function}
 */
function processSubTree(module, options) {
	return function (processed) {
		processed.tree.previousModulePath = module.attrs.href;
		return parse(options)(processed.tree);
	};
}

module.exports = function plugin(options) {
	options = options || {};

	return parse({
		ext: options.ext || '.html',
		plugins: options.plugins || [],
		root: path.resolve(options.root || './'),
		context: []
	});
};
