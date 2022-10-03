'use strict';

const fs = require('fs');
const path = require('path');
const isJSON = require('is-json');
const posthtml = require('posthtml');
const {merge, isEmpty} = require('lodash');
const {render} = require('posthtml-render');
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
      parseLocals({options, node}, options.locals, node.attrs.locals)
    ]);
  };
}

/**
 *
 * @param   {String}    locals  [string to parse as locals object]
 * @return  {Function}          [Function containing evaluated locals, or empty object]
 */
function parseLocals({options, node}, optionLocals, attributeLocals) {
  const attrLocals = options.attributeAsLocals ? {...node.attrs} : {};
  if (options.attributeAsLocals) {
    delete attrLocals.href;
    delete attrLocals.locals;
  }

  try {
    const locals = merge({...optionLocals}, {...attrLocals}, JSON.parse(attributeLocals));
    return expressions({...options.expressions, locals});
  } catch {
    const locals = merge({...optionLocals}, {...attrLocals});

    return expressions({...options.expressions, locals});
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

    tree.match(match([`${options.tag}[${options.attribute}]`, {tag: options.customTagRegExp}]), node => {
      if (options.customTagRegExp.test(node.tag)) {
        setCustomTagHref(node, options);

        // When throw error when module not found by tag namespace or by tag path,
        //  then this condition will never occur
        // if (!node.attrs[options.attribute]) {
        //   return node;
        // }
      }

      promises.push(
        () => readFile(options, node.attrs[options.attribute])
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
                return parseLocals({options, node}, options.locals, node.attrs.locals)(node.content);
              }

              if (node.content && node.attrs && options.attributeAsLocals) {
                return parseLocals({options, node}, options.locals, {})(node.content);
              }

              if (node.content && !isEmpty(options.locals)) {
                return parseLocals({options, node}, options.locals)(node.content);
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

    return promises
      .reverse()
      .concat(() => tree)
      // eslint-disable-next-line unicorn/no-array-reduce
      .reduce((previous, task) => previous.then(task), Promise.resolve());
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

/**
 * Set href for custom tag
 *
 * @param  {Object} node [posthtml element object]
 * @param  {Object} options [posthtml options]
 * @return {void}
 */
function setCustomTagHref(node, options) {
  if (!node.attrs) {
    node.attrs = {};
  }

  let {tag} = node;

  let customTagRoot;
  let namespace;
  if (tag.includes('::')) {
    [namespace, tag] = tag.split('::');
    customTagRoot = options.customTagNamespaces[namespace.replace(options.customTagPrefix, '')];
  }

  // Get module filename from tag name by removing "x-"
  //  and replacing dot "." with slash "/" and appending extension
  const customTagFile = tag
    .replace(options.customTagPrefix, '')
    .split('.')
    .join('/')
    .concat('.', options.customTagExtension);

  if (!customTagRoot) {
    // Search for module file within all roots
    const customTagRoots = Array.isArray(options.customTagRoot) ? options.customTagRoot : [options.customTagRoot];
    customTagRoot = customTagRoots.find(root => fs.existsSync(`${options.root}${root}${customTagFile}`));
  } else if (!fs.existsSync(`${options.root}${customTagRoot}${customTagFile}`)) {
    // Module not found in defined namespace
    throw new Error(`The module ${namespace}::${tag} was not found in defined namespace's path ${customTagRoot}.`);
    // Or just set customTagRoot to null will return node as-is
    // customTagRoot = null;
  }

  if (customTagRoot) {
    // Set attrs "href" when file was found
    node.attrs[options.attribute] = `${customTagRoot}${customTagFile}`;
  } else {
    // Or just not throw error will return node as-is
    throw new Error(`The module ${tag} was not found in any defined path.`);
  }
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
  options.attributeAsLocals = options.attributeAsLocals || false;
  options.expressions = options.expressions || {};
  options.customTagRoot = options.customTagPaths || '/';
  options.customTagNamespaces = options.customTagNamespaces || {};
  options.customTagExtension = options.customTagExtension || 'html';
  options.customTagPrefix = options.customTagPrefix || 'x-';
  options.customTagRegExp = new RegExp(`^${options.customTagPrefix}`, 'i');

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
