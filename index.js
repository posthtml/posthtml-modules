'use strict';

var fs = require('fs');
var path = require('path');
var posthtml = require('posthtml');
var match = require('posthtml-match-helper');

module.exports = function plugin(options) {
	options = options || {};
	options.ext = options.ext || '.html';
	options.plugins = options.plugins || [];
	options.context = path.resolve(options.context || './');

	return function parse(tree) {
		var promises = [];

		tree.match(match('module[href]'), function (module) {
			var name = path.parse(module.attrs.href).name;
			var dir = path.parse(module.attrs.href).dir;
			dir = dir === '.' ? '' : dir + '/';
			var prev = tree.prevModuleHref ? path.parse(tree.prevModuleHref).name + '/' : '';

			var lookups = [
				path.resolve(options.context, (dir.charAt(0) === '/' ? '' : prev) + (dir.charAt(0) === '/' ? dir.substr(1) : dir) + name + options.ext),
				path.resolve(options.context, (dir.charAt(0) === '/' ? '' : prev) + (dir.charAt(0) === '/' ? dir.substr(1) : dir) + name + '/index' + options.ext)
			];

			promises.push(new Promise(function (resolve, reject) {
				return Promise.all(lookups.map(function (path) {
					return new Promise(function (resolve) {
						return fs.readFile(path, 'utf8', function (err, res) {
							return resolve(err || res);
						});
					});
				})).then(function (res) {
					var result = res.reduce(function (prev, curr) {
						return prev instanceof Error ? curr : prev;
					});

					return result instanceof Error ?
						reject(new Error('ENOENT: posthtml-modules module lookups failed. Was looking for a module here:\n' + lookups.join('\n'))) :
						resolve(result);
				});
			}).then(function (content) {
				return posthtml([function (tree) {
					tree.match(match('content'), function () {
						return {
							tag: false,
							content: module.content || ''
						};
					});

					return tree;
				}].concat(options.plugins)).use(function (tree) {
					return tree;
				}).process(content);
			}).then(function (processed) {
				processed.tree.prevModuleHref = module.attrs.href;
				return parse(processed.tree);
			}).then(function (content) {
				module.tag = false;
				module.content = content;
			}));

			return module;
		});

		return Promise.all(promises).then(function () {
			return tree;
		});
	};
};
