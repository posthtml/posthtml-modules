'use strict';

var fs = require('fs');
var path = require('path');
var posthtml = require('posthtml');
var match = require('posthtml-match-helper');

module.exports = function plugin(options) {
	options = options || {};
	options.context = options.context || './';
	options.plugins = options.plugins || [];

	return function parse(tree) {
		const promises = [];

		tree.match(match('module[href]'), function (module) {
			promises.push(new Promise(function (resolve, reject) {
				return fs.readFile(path.resolve(options.context, module.attrs.href), 'utf8', function (err, res) {
					return err ? reject(err) : resolve(res);
				});
			}).then(function (content) {
				return posthtml(options.plugins).use(function (tree) {
					return tree; // Must return tree here, so the next `then` can match it
				}).process(content);
			}).then(function (processed) {
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
