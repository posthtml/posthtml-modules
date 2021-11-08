'use strict';

const fs = require('fs');
const path = require('path');
const isJSON = require('is-json');
const posthtml = require('posthtml');
const render = require('posthtml-render');
const {merge, isEmpty} = require('lodash');
const match = require('posthtml-match-helper');
const expressions = require('posthtml-expressions');

/**
* Process every node content with posthtml
* @param  {Object} node [posthtml element object]
* @param  {Object} options
* @return {Function}
*/
function processNodeContentWithPosthtml(node, options) {
  return function (content) {
    return processWithPostHtml(options.parser, options.plugins, path.join(path.dirname(options.from), node.attrs[options.attribute]), content, [
      parseLocals(options.locals, node.attrs.locals)
    ]);
  };
}

/**
 *
 * @param   {String}    locals  [string to parse as locals object]
 * @return  {Function}          [Function containing evaluated locals, or empty object]
 */
function parseLocals(optionLocals, attributeLocals) {
  try {
    const locals = merge({...optionLocals}, JSON.parse(attributeLocals));

    return expressions({locals});
  } catch {
    return expressions({locals: optionLocals});
  }
}

/**
* readFile
* @param  {Object} options  [plugin options object]
* @param  {String} href     [node's href attribute value]
* @return {Promise<String>} [Promise with file content's]
*/
function readFile(options, href) {
  const filePath = path.join(path.isAbsolute(href) ? options.root : path.dirname(options.from), href);

  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (error, response) => error ? reject(error) : resolve(response));
  });
}

/**
* @param  {Object} options   [plugin options]
* @return {Promise | Object} [posthtml tree or promise]
*/
function parse(options) {
  return function (tree) {
    const promises = [];

    tree.match(match(`${options.tag}[${options.attribute}]`), node => {
      promises.push(
        readFile(options, node.attrs[options.attribute])
          .then(processNodeContentWithPosthtml(node, options))
          .then(tree => { // Recursively call parse with node's content tree
            return parse(Object.assign({}, options, {
              from: path.join(path.dirname(options.from), node.attrs[options.attribute])
            }))(tree);
          })
          .then(tree => {
            // Remove <content> tags and replace them with node's content
            const content = tree.match(match('content'), () => {
              if (
                node.content &&
                node.attrs &&
                isJSON(node.attrs.locals)
              ) {
                return parseLocals(options.locals, node.attrs.locals)(node.content);
              }

              if (node.content && !isEmpty(options.locals)) {
                return parseLocals(options.locals)(node.content);
              }

              return node.content || '';
            });
            // Remove <module> tag and set inner content
            node.tag = false;
            node.content = content;
          })
      );

      return node;
    });

    return promises.length > 0 ? Promise.all(promises).then(() => tree) : tree;
  };
}

/**
* @param  {Object} 					 options [posthtml options]
* @param  {Array | Function} plugins [array of plugins to apply or function, which will be called with from option]
* @param  {String}           from    [path to the processing file]
* @param  {Object} 					 content [posthtml tree to process]
* @param  {Array}            prepend [array of plugins to process before plugins param]
* @return {Object}                   [processed poshtml tree]
*/
function processWithPostHtml(options, plugins, from, content, prepend) {
  return posthtml((prepend || []).concat(
    typeof plugins === 'function' ? plugins(from) : plugins
  )).process(render(content), options).then(result => result.tree);
}

module.exports = (options = {}) => {
  options.from = options.from || '';
  options.locals = options.locals || {};
  options.parser = options.parser || {};
  options.tag = options.tag || 'module';
  options.plugins = options.plugins || [];
  options.initial = options.initial || false;
  options.attribute = options.attribute || 'href';
  options.root = path.resolve(options.root || './');

  return function (tree) {
    if (options.initial) {
      const parsed = parse(options)(tree);

      if (parsed instanceof Promise) {
        return parsed.then(content => processWithPostHtml(options.parser, options.plugins, options.from, content));
      }

      return processWithPostHtml(options.parser, options.plugins, options.from, parsed);
    }

    return parse(options)(tree);
  };
};
