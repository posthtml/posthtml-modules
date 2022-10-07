'use strict';

const fs = require('fs');
const path = require('path');
const isJSON = require('is-json');
const posthtml = require('posthtml');
const {merge, isEmpty} = require('lodash');
const {render} = require('posthtml-render');
const match = require('posthtml-match-helper');
const expressions = require('posthtml-expressions');
const customTagFolderSeparator = '.';

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

  const {tag} = node;

  // Get module filename from tag name by removing "x-"
  //  and replacing dot "." with slash "/" and appending extension
  const customTagFile = tag
    .replace(options.customTagPrefix, '')
    .split(customTagFolderSeparator)
    .join(path.sep)
    .concat(customTagFolderSeparator, options.customTagExtension);

  // Find module by defined namespace in options.customTagNamespaces
  //  or by defined roots in options.customTagRoot
  //  and set the returned path
  node.attrs[options.attribute] = tag.includes(options.customTagNamespaceSeparator) ?
    findModuleByNamespace(tag, customTagFile.split(options.customTagNamespaceSeparator), options) :
    findModuleByRoot(tag, customTagFile, options);
}

/**
 * Search for module file within namespace path
 *
 * @param  {String} tag [tag name with namespace]
 * @param  {String} namespace [tag's namespace]
 * @param  {String} customTagFile [filename converted from tag name]
 * @param  {Object} options [posthtml options]
 * @return {String} [custom tag root where the module is found]
 */
function findModuleByNamespace(tag, [namespace, customTagFile], options) {
  const customTagNamespace = options.customTagNamespaces.find(n => n.name === namespace.replace(options.customTagPrefix, ''));

  if (!customTagNamespace) {
    throw new Error(`Unknown module namespace ${namespace}.`);
  }

  // Used to check module by index.html
  const customTagIndexFile = customTagFile
    .replace(`.${options.customTagExtension}`, '')
    .concat(path.sep, 'index.', options.customTagExtension);

  // First check in defined namespace's custom root if module was overridden
  let foundByIndexFile = false;
  if (customTagNamespace.custom && (fs.existsSync(path.join(customTagNamespace.custom, customTagFile)) || (foundByIndexFile = fs.existsSync(path.join(customTagNamespace.custom, customTagIndexFile))))) {
    customTagNamespace.root = customTagNamespace.custom;
    if (foundByIndexFile) {
      customTagFile = customTagIndexFile;
    }
    // else check in defined namespace's root
  } else if (!fs.existsSync(path.join(customTagNamespace.root, customTagFile))) {
    if (fs.existsSync(path.join(customTagNamespace.root, customTagIndexFile))) {
      // Module found in folder `tag-name/index.html`
      customTagFile = customTagIndexFile;
    } else if (customTagNamespace.fallback && (fs.existsSync(path.join(customTagNamespace.fallback, customTagFile)) || (foundByIndexFile = fs.existsSync(path.join(customTagNamespace.fallback, customTagIndexFile))))) {
      // Module found in defined namespace fallback
      customTagNamespace.root = customTagNamespace.fallback;
      if (foundByIndexFile) {
        customTagFile = customTagIndexFile;
      }
    } else if (options.customTagNamespaceFallback) {
      // Last resort: try to find module by defined roots as fallback
      try {
        // Passing tag name without namespace, although it's only used
        // for error message which in this case it's not even used.
        // But passing it correctly in case in future we do something
        // with tag name inside findModuleByRoot()
        return findModuleByRoot(tag.replace(namespace, '').replace(options.customTagNamespaceSeparator, ''), customTagFile, options);
      } catch {
        throw new Error(`The module ${tag} was not found in the defined namespace's root ${customTagNamespace.root} nor in any defined custom tag roots.`);
      }
    } else {
      throw new Error(`The module ${tag} was not found in the defined namespace's path ${customTagNamespace.root}.`);
    }
  }

  // Setting options.from to bypass root
  options.from = customTagNamespace.root;

  // Convert the href to relative path,
  //  so that in readFile options.from it's used and not options.root
  return customTagNamespace.root
    .replace(path.dirname(options.from), '')
    .replace(path.sep, '')
    .concat(path.sep, customTagFile);
}

/**
 * Search for module file within all roots
 *
 * @param  {String} tag [tag name]
 * @param  {String} customTagFile [filename converted from tag name]
 * @param  {Object} options [posthtml options]
 * @return {String} [custom tag root where the module is found]
 */
function findModuleByRoot(tag, customTagFile, options) {
  const customTagRoots = Array.isArray(options.customTagRoot) ? options.customTagRoot : [options.customTagRoot || ''];

  let customTagRoot = customTagRoots.find(customTagRoot => fs.existsSync(`${options.root}${customTagRoot}${customTagFile}`));

  if (!customTagRoot) {
    // Check if module exist in folder `tag-name/index.html`
    customTagFile = customTagFile
      .replace(`.${options.customTagExtension}`, '')
      .concat('/index.', options.customTagExtension);

    customTagRoot = customTagRoots.find(customTagRoot => fs.existsSync(`${options.root}${customTagRoot}${customTagFile}`));
  }

  if (!customTagRoot) {
    throw new Error(`The module ${tag} was not found in any defined root path ${customTagRoots.join(', ')}`);
  }

  return `${customTagRoot}${customTagFile}`;
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
  options.customTagNamespaces = options.customTagNamespaces || [];
  options.customTagNamespaceSeparator = options.customTagNamespaceSeparator || '::';
  options.customTagNamespaceFallback = options.customTagNamespaceFallback || false;
  options.customTagExtension = options.customTagExtension || 'html';
  options.customTagPrefix = options.customTagPrefix || 'x-';
  options.customTagRegExp = new RegExp(`^${options.customTagPrefix}`, 'i');

  options.customTagNamespaces.forEach((namespace, index) => {
    options.customTagNamespaces[index].root = path.resolve(namespace.root);

    if (namespace.fallback) {
      options.customTagNamespaces[index].fallback = path.resolve(namespace.fallback);
    }

    if (namespace.custom) {
      options.customTagNamespaces[index].custom = path.resolve(namespace.custom);
    }
  });

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
