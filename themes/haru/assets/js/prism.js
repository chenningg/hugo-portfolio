/* PrismJS 1.21.0
https://prismjs.com/download.html#themes=prism-tomorrow&languages=markup+css+clike+javascript+bash+css-extras+diff+docker+git+go+graphql+json+python+jsx+tsx+regex+sql+toml+typescript+yaml&plugins=line-highlight+autolinker+inline-color+command-line+normalize-whitespace+toolbar+copy-to-clipboard+diff-highlight+treeview */
/// <reference lib="WebWorker"/>

var _self =
  typeof window !== "undefined"
    ? window // if in browser
    : typeof WorkerGlobalScope !== "undefined" &&
      self instanceof WorkerGlobalScope
    ? self // if in worker
    : {}; // if in node js

/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Lea Verou <https://lea.verou.me>
 * @namespace
 * @public
 */
var Prism = (function (_self) {
  // Private helper vars
  var lang = /\blang(?:uage)?-([\w-]+)\b/i;
  var uniqueId = 0;

  var _ = {
    /**
     * By default, Prism will attempt to highlight all code elements (by calling {@link Prism.highlightAll}) on the
     * current page after the page finished loading. This might be a problem if e.g. you wanted to asynchronously load
     * additional languages or plugins yourself.
     *
     * By setting this value to `true`, Prism will not automatically highlight all code elements on the page.
     *
     * You obviously have to change this value before the automatic highlighting started. To do this, you can add an
     * empty Prism object into the global scope before loading the Prism script like this:
     *
     * ```js
     * window.Prism = window.Prism || {};
     * Prism.manual = true;
     * // add a new <script> to load Prism's script
     * ```
     *
     * @default false
     * @type {boolean}
     * @memberof Prism
     * @public
     */
    manual: _self.Prism && _self.Prism.manual,
    disableWorkerMessageHandler:
      _self.Prism && _self.Prism.disableWorkerMessageHandler,

    /**
     * A namespace for utility methods.
     *
     * All function in this namespace that are not explicitly marked as _public_ are for __internal use only__ and may
     * change or disappear at any time.
     *
     * @namespace
     * @memberof Prism
     */
    util: {
      encode: function encode(tokens) {
        if (tokens instanceof Token) {
          return new Token(tokens.type, encode(tokens.content), tokens.alias);
        } else if (Array.isArray(tokens)) {
          return tokens.map(encode);
        } else {
          return tokens
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/\u00a0/g, " ");
        }
      },

      /**
       * Returns the name of the type of the given value.
       *
       * @param {any} o
       * @returns {string}
       * @example
       * type(null)      === 'Null'
       * type(undefined) === 'Undefined'
       * type(123)       === 'Number'
       * type('foo')     === 'String'
       * type(true)      === 'Boolean'
       * type([1, 2])    === 'Array'
       * type({})        === 'Object'
       * type(String)    === 'Function'
       * type(/abc+/)    === 'RegExp'
       */
      type: function (o) {
        return Object.prototype.toString.call(o).slice(8, -1);
      },

      /**
       * Returns a unique number for the given object. Later calls will still return the same number.
       *
       * @param {Object} obj
       * @returns {number}
       */
      objId: function (obj) {
        if (!obj["__id"]) {
          Object.defineProperty(obj, "__id", { value: ++uniqueId });
        }
        return obj["__id"];
      },

      /**
       * Creates a deep clone of the given object.
       *
       * The main intended use of this function is to clone language definitions.
       *
       * @param {T} o
       * @param {Record<number, any>} [visited]
       * @returns {T}
       * @template T
       */
      clone: function deepClone(o, visited) {
        visited = visited || {};

        var clone, id;
        switch (_.util.type(o)) {
          case "Object":
            id = _.util.objId(o);
            if (visited[id]) {
              return visited[id];
            }
            clone = /** @type {Record<string, any>} */ ({});
            visited[id] = clone;

            for (var key in o) {
              if (o.hasOwnProperty(key)) {
                clone[key] = deepClone(o[key], visited);
              }
            }

            return /** @type {any} */ (clone);

          case "Array":
            id = _.util.objId(o);
            if (visited[id]) {
              return visited[id];
            }
            clone = [];
            visited[id] = clone;

            /** @type {Array} */ (/** @type {any} */ (o)).forEach(function (
              v,
              i
            ) {
              clone[i] = deepClone(v, visited);
            });

            return /** @type {any} */ (clone);

          default:
            return o;
        }
      },

      /**
       * Returns the Prism language of the given element set by a `language-xxxx` or `lang-xxxx` class.
       *
       * If no language is set for the element or the element is `null` or `undefined`, `none` will be returned.
       *
       * @param {Element} element
       * @returns {string}
       */
      getLanguage: function (element) {
        while (element && !lang.test(element.className)) {
          element = element.parentElement;
        }
        if (element) {
          return (element.className.match(lang) || [, "none"])[1].toLowerCase();
        }
        return "none";
      },

      /**
       * Returns the script element that is currently executing.
       *
       * This does __not__ work for line script element.
       *
       * @returns {HTMLScriptElement | null}
       */
      currentScript: function () {
        if (typeof document === "undefined") {
          return null;
        }
        if (
          "currentScript" in document &&
          1 < 2 /* hack to trip TS' flow analysis */
        ) {
          return /** @type {any} */ (document.currentScript);
        }

        // IE11 workaround
        // we'll get the src of the current script by parsing IE11's error stack trace
        // this will not work for inline scripts

        try {
          throw new Error();
        } catch (err) {
          // Get file src url from stack. Specifically works with the format of stack traces in IE.
          // A stack will look like this:
          //
          // Error
          //    at _.util.currentScript (http://localhost/components/prism-core.js:119:5)
          //    at Global code (http://localhost/components/prism-core.js:606:1)

          var src = (/at [^(\r\n]*\((.*):.+:.+\)$/i.exec(err.stack) || [])[1];
          if (src) {
            var scripts = document.getElementsByTagName("script");
            for (var i in scripts) {
              if (scripts[i].src == src) {
                return scripts[i];
              }
            }
          }
          return null;
        }
      },

      /**
       * Returns whether a given class is active for `element`.
       *
       * The class can be activated if `element` or one of its ancestors has the given class and it can be deactivated
       * if `element` or one of its ancestors has the negated version of the given class. The _negated version_ of the
       * given class is just the given class with a `no-` prefix.
       *
       * Whether the class is active is determined by the closest ancestor of `element` (where `element` itself is
       * closest ancestor) that has the given class or the negated version of it. If neither `element` nor any of its
       * ancestors have the given class or the negated version of it, then the default activation will be returned.
       *
       * In the paradoxical situation where the closest ancestor contains __both__ the given class and the negated
       * version of it, the class is considered active.
       *
       * @param {Element} element
       * @param {string} className
       * @param {boolean} [defaultActivation=false]
       * @returns {boolean}
       */
      isActive: function (element, className, defaultActivation) {
        var no = "no-" + className;

        while (element) {
          var classList = element.classList;
          if (classList.contains(className)) {
            return true;
          }
          if (classList.contains(no)) {
            return false;
          }
          element = element.parentElement;
        }
        return !!defaultActivation;
      },
    },

    /**
     * This namespace contains all currently loaded languages and the some helper functions to create and modify languages.
     *
     * @namespace
     * @memberof Prism
     * @public
     */
    languages: {
      /**
       * Creates a deep copy of the language with the given id and appends the given tokens.
       *
       * If a token in `redef` also appears in the copied language, then the existing token in the copied language
       * will be overwritten at its original position.
       *
       * ## Best practices
       *
       * Since the position of overwriting tokens (token in `redef` that overwrite tokens in the copied language)
       * doesn't matter, they can technically be in any order. However, this can be confusing to others that trying to
       * understand the language definition because, normally, the order of tokens matters in Prism grammars.
       *
       * Therefore, it is encouraged to order overwriting tokens according to the positions of the overwritten tokens.
       * Furthermore, all non-overwriting tokens should be placed after the overwriting ones.
       *
       * @param {string} id The id of the language to extend. This has to be a key in `Prism.languages`.
       * @param {Grammar} redef The new tokens to append.
       * @returns {Grammar} The new language created.
       * @public
       * @example
       * Prism.languages['css-with-colors'] = Prism.languages.extend('css', {
       *     // Prism.languages.css already has a 'comment' token, so this token will overwrite CSS' 'comment' token
       *     // at its original position
       *     'comment': { ... },
       *     // CSS doesn't have a 'color' token, so this token will be appended
       *     'color': /\b(?:red|green|blue)\b/
       * });
       */
      extend: function (id, redef) {
        var lang = _.util.clone(_.languages[id]);

        for (var key in redef) {
          lang[key] = redef[key];
        }

        return lang;
      },

      /**
       * Inserts tokens _before_ another token in a language definition or any other grammar.
       *
       * ## Usage
       *
       * This helper method makes it easy to modify existing languages. For example, the CSS language definition
       * not only defines CSS highlighting for CSS documents, but also needs to define highlighting for CSS embedded
       * in HTML through `<style>` elements. To do this, it needs to modify `Prism.languages.markup` and add the
       * appropriate tokens. However, `Prism.languages.markup` is a regular JavaScript object literal, so if you do
       * this:
       *
       * ```js
       * Prism.languages.markup.style = {
       *     // token
       * };
       * ```
       *
       * then the `style` token will be added (and processed) at the end. `insertBefore` allows you to insert tokens
       * before existing tokens. For the CSS example above, you would use it like this:
       *
       * ```js
       * Prism.languages.insertBefore('markup', 'cdata', {
       *     'style': {
       *         // token
       *     }
       * });
       * ```
       *
       * ## Special cases
       *
       * If the grammars of `inside` and `insert` have tokens with the same name, the tokens in `inside`'s grammar
       * will be ignored.
       *
       * This behavior can be used to insert tokens after `before`:
       *
       * ```js
       * Prism.languages.insertBefore('markup', 'comment', {
       *     'comment': Prism.languages.markup.comment,
       *     // tokens after 'comment'
       * });
       * ```
       *
       * ## Limitations
       *
       * The main problem `insertBefore` has to solve is iteration order. Since ES2015, the iteration order for object
       * properties is guaranteed to be the insertion order (except for integer keys) but some browsers behave
       * differently when keys are deleted and re-inserted. So `insertBefore` can't be implemented by temporarily
       * deleting properties which is necessary to insert at arbitrary positions.
       *
       * To solve this problem, `insertBefore` doesn't actually insert the given tokens into the target object.
       * Instead, it will create a new object and replace all references to the target object with the new one. This
       * can be done without temporarily deleting properties, so the iteration order is well-defined.
       *
       * However, only references that can be reached from `Prism.languages` or `insert` will be replaced. I.e. if
       * you hold the target object in a variable, then the value of the variable will not change.
       *
       * ```js
       * var oldMarkup = Prism.languages.markup;
       * var newMarkup = Prism.languages.insertBefore('markup', 'comment', { ... });
       *
       * assert(oldMarkup !== Prism.languages.markup);
       * assert(newMarkup === Prism.languages.markup);
       * ```
       *
       * @param {string} inside The property of `root` (e.g. a language id in `Prism.languages`) that contains the
       * object to be modified.
       * @param {string} before The key to insert before.
       * @param {Grammar} insert An object containing the key-value pairs to be inserted.
       * @param {Object<string, any>} [root] The object containing `inside`, i.e. the object that contains the
       * object to be modified.
       *
       * Defaults to `Prism.languages`.
       * @returns {Grammar} The new grammar object.
       * @public
       */
      insertBefore: function (inside, before, insert, root) {
        root = root || /** @type {any} */ (_.languages);
        var grammar = root[inside];
        /** @type {Grammar} */
        var ret = {};

        for (var token in grammar) {
          if (grammar.hasOwnProperty(token)) {
            if (token == before) {
              for (var newToken in insert) {
                if (insert.hasOwnProperty(newToken)) {
                  ret[newToken] = insert[newToken];
                }
              }
            }

            // Do not insert token which also occur in insert. See #1525
            if (!insert.hasOwnProperty(token)) {
              ret[token] = grammar[token];
            }
          }
        }

        var old = root[inside];
        root[inside] = ret;

        // Update references in other language definitions
        _.languages.DFS(_.languages, function (key, value) {
          if (value === old && key != inside) {
            this[key] = ret;
          }
        });

        return ret;
      },

      // Traverse a language definition with Depth First Search
      DFS: function DFS(o, callback, type, visited) {
        visited = visited || {};

        var objId = _.util.objId;

        for (var i in o) {
          if (o.hasOwnProperty(i)) {
            callback.call(o, i, o[i], type || i);

            var property = o[i],
              propertyType = _.util.type(property);

            if (propertyType === "Object" && !visited[objId(property)]) {
              visited[objId(property)] = true;
              DFS(property, callback, null, visited);
            } else if (propertyType === "Array" && !visited[objId(property)]) {
              visited[objId(property)] = true;
              DFS(property, callback, i, visited);
            }
          }
        }
      },
    },

    plugins: {},

    /**
     * This is the most high-level function in Prism’s API.
     * It fetches all the elements that have a `.language-xxxx` class and then calls {@link Prism.highlightElement} on
     * each one of them.
     *
     * This is equivalent to `Prism.highlightAllUnder(document, async, callback)`.
     *
     * @param {boolean} [async=false] Same as in {@link Prism.highlightAllUnder}.
     * @param {HighlightCallback} [callback] Same as in {@link Prism.highlightAllUnder}.
     * @memberof Prism
     * @public
     */
    highlightAll: function (async, callback) {
      _.highlightAllUnder(document, async, callback);
    },

    /**
     * Fetches all the descendants of `container` that have a `.language-xxxx` class and then calls
     * {@link Prism.highlightElement} on each one of them.
     *
     * The following hooks will be run:
     * 1. `before-highlightall`
     * 2. `before-all-elements-highlight`
     * 3. All hooks of {@link Prism.highlightElement} for each element.
     *
     * @param {ParentNode} container The root element, whose descendants that have a `.language-xxxx` class will be highlighted.
     * @param {boolean} [async=false] Whether each element is to be highlighted asynchronously using Web Workers.
     * @param {HighlightCallback} [callback] An optional callback to be invoked on each element after its highlighting is done.
     * @memberof Prism
     * @public
     */
    highlightAllUnder: function (container, async, callback) {
      var env = {
        callback: callback,
        container: container,
        selector:
          'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code',
      };

      _.hooks.run("before-highlightall", env);

      env.elements = Array.prototype.slice.apply(
        env.container.querySelectorAll(env.selector)
      );

      _.hooks.run("before-all-elements-highlight", env);

      for (var i = 0, element; (element = env.elements[i++]); ) {
        _.highlightElement(element, async === true, env.callback);
      }
    },

    /**
     * Highlights the code inside a single element.
     *
     * The following hooks will be run:
     * 1. `before-sanity-check`
     * 2. `before-highlight`
     * 3. All hooks of {@link Prism.highlight}. These hooks will be run by an asynchronous worker if `async` is `true`.
     * 4. `before-insert`
     * 5. `after-highlight`
     * 6. `complete`
     *
     * Some the above hooks will be skipped if the element doesn't contain any text or there is no grammar loaded for
     * the element's language.
     *
     * @param {Element} element The element containing the code.
     * It must have a class of `language-xxxx` to be processed, where `xxxx` is a valid language identifier.
     * @param {boolean} [async=false] Whether the element is to be highlighted asynchronously using Web Workers
     * to improve performance and avoid blocking the UI when highlighting very large chunks of code. This option is
     * [disabled by default](https://prismjs.com/faq.html#why-is-asynchronous-highlighting-disabled-by-default).
     *
     * Note: All language definitions required to highlight the code must be included in the main `prism.js` file for
     * asynchronous highlighting to work. You can build your own bundle on the
     * [Download page](https://prismjs.com/download.html).
     * @param {HighlightCallback} [callback] An optional callback to be invoked after the highlighting is done.
     * Mostly useful when `async` is `true`, since in that case, the highlighting is done asynchronously.
     * @memberof Prism
     * @public
     */
    highlightElement: function (element, async, callback) {
      // Find language
      var language = _.util.getLanguage(element);
      var grammar = _.languages[language];

      // Set language on the element, if not present
      element.className =
        element.className.replace(lang, "").replace(/\s+/g, " ") +
        " language-" +
        language;

      // Set language on the parent, for styling
      var parent = element.parentElement;
      if (parent && parent.nodeName.toLowerCase() === "pre") {
        parent.className =
          parent.className.replace(lang, "").replace(/\s+/g, " ") +
          " language-" +
          language;
      }

      var code = element.textContent;

      var env = {
        element: element,
        language: language,
        grammar: grammar,
        code: code,
      };

      function insertHighlightedCode(highlightedCode) {
        env.highlightedCode = highlightedCode;

        _.hooks.run("before-insert", env);

        env.element.innerHTML = env.highlightedCode;

        _.hooks.run("after-highlight", env);
        _.hooks.run("complete", env);
        callback && callback.call(env.element);
      }

      _.hooks.run("before-sanity-check", env);

      if (!env.code) {
        _.hooks.run("complete", env);
        callback && callback.call(env.element);
        return;
      }

      _.hooks.run("before-highlight", env);

      if (!env.grammar) {
        insertHighlightedCode(_.util.encode(env.code));
        return;
      }

      if (async && _self.Worker) {
        var worker = new Worker(_.filename);

        worker.onmessage = function (evt) {
          insertHighlightedCode(evt.data);
        };

        worker.postMessage(
          JSON.stringify({
            language: env.language,
            code: env.code,
            immediateClose: true,
          })
        );
      } else {
        insertHighlightedCode(_.highlight(env.code, env.grammar, env.language));
      }
    },

    /**
     * Low-level function, only use if you know what you’re doing. It accepts a string of text as input
     * and the language definitions to use, and returns a string with the HTML produced.
     *
     * The following hooks will be run:
     * 1. `before-tokenize`
     * 2. `after-tokenize`
     * 3. `wrap`: On each {@link Token}.
     *
     * @param {string} text A string with the code to be highlighted.
     * @param {Grammar} grammar An object containing the tokens to use.
     *
     * Usually a language definition like `Prism.languages.markup`.
     * @param {string} language The name of the language definition passed to `grammar`.
     * @returns {string} The highlighted HTML.
     * @memberof Prism
     * @public
     * @example
     * Prism.highlight('var foo = true;', Prism.languages.javascript, 'javascript');
     */
    highlight: function (text, grammar, language) {
      var env = {
        code: text,
        grammar: grammar,
        language: language,
      };
      _.hooks.run("before-tokenize", env);
      env.tokens = _.tokenize(env.code, env.grammar);
      _.hooks.run("after-tokenize", env);
      return Token.stringify(_.util.encode(env.tokens), env.language);
    },

    /**
     * This is the heart of Prism, and the most low-level function you can use. It accepts a string of text as input
     * and the language definitions to use, and returns an array with the tokenized code.
     *
     * When the language definition includes nested tokens, the function is called recursively on each of these tokens.
     *
     * This method could be useful in other contexts as well, as a very crude parser.
     *
     * @param {string} text A string with the code to be highlighted.
     * @param {Grammar} grammar An object containing the tokens to use.
     *
     * Usually a language definition like `Prism.languages.markup`.
     * @returns {TokenStream} An array of strings and tokens, a token stream.
     * @memberof Prism
     * @public
     * @example
     * let code = `var foo = 0;`;
     * let tokens = Prism.tokenize(code, Prism.languages.javascript);
     * tokens.forEach(token => {
     *     if (token instanceof Prism.Token && token.type === 'number') {
     *         console.log(`Found numeric literal: ${token.content}`);
     *     }
     * });
     */
    tokenize: function (text, grammar) {
      var rest = grammar.rest;
      if (rest) {
        for (var token in rest) {
          grammar[token] = rest[token];
        }

        delete grammar.rest;
      }

      var tokenList = new LinkedList();
      addAfter(tokenList, tokenList.head, text);

      matchGrammar(text, tokenList, grammar, tokenList.head, 0);

      return toArray(tokenList);
    },

    /**
     * @namespace
     * @memberof Prism
     * @public
     */
    hooks: {
      all: {},

      /**
       * Adds the given callback to the list of callbacks for the given hook.
       *
       * The callback will be invoked when the hook it is registered for is run.
       * Hooks are usually directly run by a highlight function but you can also run hooks yourself.
       *
       * One callback function can be registered to multiple hooks and the same hook multiple times.
       *
       * @param {string} name The name of the hook.
       * @param {HookCallback} callback The callback function which is given environment variables.
       * @public
       */
      add: function (name, callback) {
        var hooks = _.hooks.all;

        hooks[name] = hooks[name] || [];

        hooks[name].push(callback);
      },

      /**
       * Runs a hook invoking all registered callbacks with the given environment variables.
       *
       * Callbacks will be invoked synchronously and in the order in which they were registered.
       *
       * @param {string} name The name of the hook.
       * @param {Object<string, any>} env The environment variables of the hook passed to all callbacks registered.
       * @public
       */
      run: function (name, env) {
        var callbacks = _.hooks.all[name];

        if (!callbacks || !callbacks.length) {
          return;
        }

        for (var i = 0, callback; (callback = callbacks[i++]); ) {
          callback(env);
        }
      },
    },

    Token: Token,
  };
  _self.Prism = _;

  // Typescript note:
  // The following can be used to import the Token type in JSDoc:
  //
  //   @typedef {InstanceType<import("./prism-core")["Token"]>} Token

  /**
   * Creates a new token.
   *
   * @param {string} type See {@link Token#type type}
   * @param {string | TokenStream} content See {@link Token#content content}
   * @param {string|string[]} [alias] The alias(es) of the token.
   * @param {string} [matchedStr=""] A copy of the full string this token was created from.
   * @class
   * @global
   * @public
   */
  function Token(type, content, alias, matchedStr) {
    /**
     * The type of the token.
     *
     * This is usually the key of a pattern in a {@link Grammar}.
     *
     * @type {string}
     * @see GrammarToken
     * @public
     */
    this.type = type;
    /**
     * The strings or tokens contained by this token.
     *
     * This will be a token stream if the pattern matched also defined an `inside` grammar.
     *
     * @type {string | TokenStream}
     * @public
     */
    this.content = content;
    /**
     * The alias(es) of the token.
     *
     * @type {string|string[]}
     * @see GrammarToken
     * @public
     */
    this.alias = alias;
    // Copy of the full string this token was created from
    this.length = (matchedStr || "").length | 0;
  }

  /**
   * A token stream is an array of strings and {@link Token Token} objects.
   *
   * Token streams have to fulfill a few properties that are assumed by most functions (mostly internal ones) that process
   * them.
   *
   * 1. No adjacent strings.
   * 2. No empty strings.
   *
   *    The only exception here is the token stream that only contains the empty string and nothing else.
   *
   * @typedef {Array<string | Token>} TokenStream
   * @global
   * @public
   */

  /**
   * Converts the given token or token stream to an HTML representation.
   *
   * The following hooks will be run:
   * 1. `wrap`: On each {@link Token}.
   *
   * @param {string | Token | TokenStream} o The token or token stream to be converted.
   * @param {string} language The name of current language.
   * @returns {string} The HTML representation of the token or token stream.
   * @memberof Token
   * @static
   */
  Token.stringify = function stringify(o, language) {
    if (typeof o == "string") {
      return o;
    }
    if (Array.isArray(o)) {
      var s = "";
      o.forEach(function (e) {
        s += stringify(e, language);
      });
      return s;
    }

    var env = {
      type: o.type,
      content: stringify(o.content, language),
      tag: "span",
      classes: ["token", o.type],
      attributes: {},
      language: language,
    };

    var aliases = o.alias;
    if (aliases) {
      if (Array.isArray(aliases)) {
        Array.prototype.push.apply(env.classes, aliases);
      } else {
        env.classes.push(aliases);
      }
    }

    _.hooks.run("wrap", env);

    var attributes = "";
    for (var name in env.attributes) {
      attributes +=
        " " +
        name +
        '="' +
        (env.attributes[name] || "").replace(/"/g, "&quot;") +
        '"';
    }

    return (
      "<" +
      env.tag +
      ' class="' +
      env.classes.join(" ") +
      '"' +
      attributes +
      ">" +
      env.content +
      "</" +
      env.tag +
      ">"
    );
  };

  /**
   * @param {string} text
   * @param {LinkedList<string | Token>} tokenList
   * @param {any} grammar
   * @param {LinkedListNode<string | Token>} startNode
   * @param {number} startPos
   * @param {RematchOptions} [rematch]
   * @returns {void}
   * @private
   *
   * @typedef RematchOptions
   * @property {string} cause
   * @property {number} reach
   */
  function matchGrammar(
    text,
    tokenList,
    grammar,
    startNode,
    startPos,
    rematch
  ) {
    for (var token in grammar) {
      if (!grammar.hasOwnProperty(token) || !grammar[token]) {
        continue;
      }

      var patterns = grammar[token];
      patterns = Array.isArray(patterns) ? patterns : [patterns];

      for (var j = 0; j < patterns.length; ++j) {
        if (rematch && rematch.cause == token + "," + j) {
          return;
        }

        var patternObj = patterns[j],
          inside = patternObj.inside,
          lookbehind = !!patternObj.lookbehind,
          greedy = !!patternObj.greedy,
          lookbehindLength = 0,
          alias = patternObj.alias;

        if (greedy && !patternObj.pattern.global) {
          // Without the global flag, lastIndex won't work
          var flags = patternObj.pattern.toString().match(/[imsuy]*$/)[0];
          patternObj.pattern = RegExp(patternObj.pattern.source, flags + "g");
        }

        /** @type {RegExp} */
        var pattern = patternObj.pattern || patternObj;

        for (
          // iterate the token list and keep track of the current token/string position
          var currentNode = startNode.next, pos = startPos;
          currentNode !== tokenList.tail;
          pos += currentNode.value.length, currentNode = currentNode.next
        ) {
          if (rematch && pos >= rematch.reach) {
            break;
          }

          var str = currentNode.value;

          if (tokenList.length > text.length) {
            // Something went terribly wrong, ABORT, ABORT!
            return;
          }

          if (str instanceof Token) {
            continue;
          }

          var removeCount = 1; // this is the to parameter of removeBetween

          if (greedy && currentNode != tokenList.tail.prev) {
            pattern.lastIndex = pos;
            var match = pattern.exec(text);
            if (!match) {
              break;
            }

            var from =
              match.index + (lookbehind && match[1] ? match[1].length : 0);
            var to = match.index + match[0].length;
            var p = pos;

            // find the node that contains the match
            p += currentNode.value.length;
            while (from >= p) {
              currentNode = currentNode.next;
              p += currentNode.value.length;
            }
            // adjust pos (and p)
            p -= currentNode.value.length;
            pos = p;

            // the current node is a Token, then the match starts inside another Token, which is invalid
            if (currentNode.value instanceof Token) {
              continue;
            }

            // find the last node which is affected by this match
            for (
              var k = currentNode;
              k !== tokenList.tail && (p < to || typeof k.value === "string");
              k = k.next
            ) {
              removeCount++;
              p += k.value.length;
            }
            removeCount--;

            // replace with the new match
            str = text.slice(pos, p);
            match.index -= pos;
          } else {
            pattern.lastIndex = 0;

            var match = pattern.exec(str);
          }

          if (!match) {
            continue;
          }

          if (lookbehind) {
            lookbehindLength = match[1] ? match[1].length : 0;
          }

          var from = match.index + lookbehindLength,
            matchStr = match[0].slice(lookbehindLength),
            to = from + matchStr.length,
            before = str.slice(0, from),
            after = str.slice(to);

          var reach = pos + str.length;
          if (rematch && reach > rematch.reach) {
            rematch.reach = reach;
          }

          var removeFrom = currentNode.prev;

          if (before) {
            removeFrom = addAfter(tokenList, removeFrom, before);
            pos += before.length;
          }

          removeRange(tokenList, removeFrom, removeCount);

          var wrapped = new Token(
            token,
            inside ? _.tokenize(matchStr, inside) : matchStr,
            alias,
            matchStr
          );
          currentNode = addAfter(tokenList, removeFrom, wrapped);

          if (after) {
            addAfter(tokenList, currentNode, after);
          }

          if (removeCount > 1) {
            // at least one Token object was removed, so we have to do some rematching
            // this can only happen if the current pattern is greedy
            matchGrammar(text, tokenList, grammar, currentNode.prev, pos, {
              cause: token + "," + j,
              reach: reach,
            });
          }
        }
      }
    }
  }

  /**
   * @typedef LinkedListNode
   * @property {T} value
   * @property {LinkedListNode<T> | null} prev The previous node.
   * @property {LinkedListNode<T> | null} next The next node.
   * @template T
   * @private
   */

  /**
   * @template T
   * @private
   */
  function LinkedList() {
    /** @type {LinkedListNode<T>} */
    var head = { value: null, prev: null, next: null };
    /** @type {LinkedListNode<T>} */
    var tail = { value: null, prev: head, next: null };
    head.next = tail;

    /** @type {LinkedListNode<T>} */
    this.head = head;
    /** @type {LinkedListNode<T>} */
    this.tail = tail;
    this.length = 0;
  }

  /**
   * Adds a new node with the given value to the list.
   * @param {LinkedList<T>} list
   * @param {LinkedListNode<T>} node
   * @param {T} value
   * @returns {LinkedListNode<T>} The added node.
   * @template T
   */
  function addAfter(list, node, value) {
    // assumes that node != list.tail && values.length >= 0
    var next = node.next;

    var newNode = { value: value, prev: node, next: next };
    node.next = newNode;
    next.prev = newNode;
    list.length++;

    return newNode;
  }
  /**
   * Removes `count` nodes after the given node. The given node will not be removed.
   * @param {LinkedList<T>} list
   * @param {LinkedListNode<T>} node
   * @param {number} count
   * @template T
   */
  function removeRange(list, node, count) {
    var next = node.next;
    for (var i = 0; i < count && next !== list.tail; i++) {
      next = next.next;
    }
    node.next = next;
    next.prev = node;
    list.length -= i;
  }
  /**
   * @param {LinkedList<T>} list
   * @returns {T[]}
   * @template T
   */
  function toArray(list) {
    var array = [];
    var node = list.head.next;
    while (node !== list.tail) {
      array.push(node.value);
      node = node.next;
    }
    return array;
  }

  if (!_self.document) {
    if (!_self.addEventListener) {
      // in Node.js
      return _;
    }

    if (!_.disableWorkerMessageHandler) {
      // In worker
      _self.addEventListener(
        "message",
        function (evt) {
          var message = JSON.parse(evt.data),
            lang = message.language,
            code = message.code,
            immediateClose = message.immediateClose;

          _self.postMessage(_.highlight(code, _.languages[lang], lang));
          if (immediateClose) {
            _self.close();
          }
        },
        false
      );
    }

    return _;
  }

  // Get current script and highlight
  var script = _.util.currentScript();

  if (script) {
    _.filename = script.src;

    if (script.hasAttribute("data-manual")) {
      _.manual = true;
    }
  }

  function highlightAutomaticallyCallback() {
    if (!_.manual) {
      _.highlightAll();
    }
  }

  if (!_.manual) {
    // If the document state is "loading", then we'll use DOMContentLoaded.
    // If the document state is "interactive" and the prism.js script is deferred, then we'll also use the
    // DOMContentLoaded event because there might be some plugins or languages which have also been deferred and they
    // might take longer one animation frame to execute which can create a race condition where only some plugins have
    // been loaded when Prism.highlightAll() is executed, depending on how fast resources are loaded.
    // See https://github.com/PrismJS/prism/issues/2102
    var readyState = document.readyState;
    if (
      readyState === "loading" ||
      (readyState === "interactive" && script && script.defer)
    ) {
      document.addEventListener(
        "DOMContentLoaded",
        highlightAutomaticallyCallback
      );
    } else {
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(highlightAutomaticallyCallback);
      } else {
        window.setTimeout(highlightAutomaticallyCallback, 16);
      }
    }
  }

  return _;
})(_self);

if (typeof module !== "undefined" && module.exports) {
  module.exports = Prism;
}

// hack for components to work correctly in node.js
if (typeof global !== "undefined") {
  global.Prism = Prism;
}

// some additional documentation/types

/**
 * The expansion of a simple `RegExp` literal to support additional properties.
 *
 * @typedef GrammarToken
 * @property {RegExp} pattern The regular expression of the token.
 * @property {boolean} [lookbehind=false] If `true`, then the first capturing group of `pattern` will (effectively)
 * behave as a lookbehind group meaning that the captured text will not be part of the matched text of the new token.
 * @property {boolean} [greedy=false] Whether the token is greedy.
 * @property {string|string[]} [alias] An optional alias or list of aliases.
 * @property {Grammar} [inside] The nested grammar of this token.
 *
 * The `inside` grammar will be used to tokenize the text value of each token of this kind.
 *
 * This can be used to make nested and even recursive language definitions.
 *
 * Note: This can cause infinite recursion. Be careful when you embed different languages or even the same language into
 * each another.
 * @global
 * @public
 */

/**
 * @typedef Grammar
 * @type {Object<string, RegExp | GrammarToken | Array<RegExp | GrammarToken>>}
 * @property {Grammar} [rest] An optional grammar object that will be appended to this grammar.
 * @global
 * @public
 */

/**
 * A function which will invoked after an element was successfully highlighted.
 *
 * @callback HighlightCallback
 * @param {Element} element The element successfully highlighted.
 * @returns {void}
 * @global
 * @public
 */

/**
 * @callback HookCallback
 * @param {Object<string, any>} env The environment variables of the hook.
 * @returns {void}
 * @global
 * @public
 */
Prism.languages.markup = {
  comment: /<!--[\s\S]*?-->/,
  prolog: /<\?[\s\S]+?\?>/,
  doctype: {
    // https://www.w3.org/TR/xml/#NT-doctypedecl
    pattern: /<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,
    greedy: true,
    inside: {
      "internal-subset": {
        pattern: /(\[)[\s\S]+(?=\]>$)/,
        lookbehind: true,
        greedy: true,
        inside: null, // see below
      },
      string: {
        pattern: /"[^"]*"|'[^']*'/,
        greedy: true,
      },
      punctuation: /^<!|>$|[[\]]/,
      "doctype-tag": /^DOCTYPE/,
      name: /[^\s<>'"]+/,
    },
  },
  cdata: /<!\[CDATA\[[\s\S]*?]]>/i,
  tag: {
    pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,
    greedy: true,
    inside: {
      tag: {
        pattern: /^<\/?[^\s>\/]+/,
        inside: {
          punctuation: /^<\/?/,
          namespace: /^[^\s>\/:]+:/,
        },
      },
      "attr-value": {
        pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,
        inside: {
          punctuation: [
            {
              pattern: /^=/,
              alias: "attr-equals",
            },
            /"|'/,
          ],
        },
      },
      punctuation: /\/?>/,
      "attr-name": {
        pattern: /[^\s>\/]+/,
        inside: {
          namespace: /^[^\s>\/:]+:/,
        },
      },
    },
  },
  entity: [
    {
      pattern: /&[\da-z]{1,8};/i,
      alias: "named-entity",
    },
    /&#x?[\da-f]{1,8};/i,
  ],
};

Prism.languages.markup["tag"].inside["attr-value"].inside["entity"] =
  Prism.languages.markup["entity"];
Prism.languages.markup["doctype"].inside["internal-subset"].inside =
  Prism.languages.markup;

// Plugin to make entity title show the real entity, idea by Roman Komarov
Prism.hooks.add("wrap", function (env) {
  if (env.type === "entity") {
    env.attributes["title"] = env.content.replace(/&amp;/, "&");
  }
});

Object.defineProperty(Prism.languages.markup.tag, "addInlined", {
  /**
   * Adds an inlined language to markup.
   *
   * An example of an inlined language is CSS with `<style>` tags.
   *
   * @param {string} tagName The name of the tag that contains the inlined language. This name will be treated as
   * case insensitive.
   * @param {string} lang The language key.
   * @example
   * addInlined('style', 'css');
   */
  value: function addInlined(tagName, lang) {
    var includedCdataInside = {};
    includedCdataInside["language-" + lang] = {
      pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
      lookbehind: true,
      inside: Prism.languages[lang],
    };
    includedCdataInside["cdata"] = /^<!\[CDATA\[|\]\]>$/i;

    var inside = {
      "included-cdata": {
        pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
        inside: includedCdataInside,
      },
    };
    inside["language-" + lang] = {
      pattern: /[\s\S]+/,
      inside: Prism.languages[lang],
    };

    var def = {};
    def[tagName] = {
      pattern: RegExp(
        /(<__[\s\S]*?>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(
          /__/g,
          function () {
            return tagName;
          }
        ),
        "i"
      ),
      lookbehind: true,
      greedy: true,
      inside: inside,
    };

    Prism.languages.insertBefore("markup", "cdata", def);
  },
});

Prism.languages.html = Prism.languages.markup;
Prism.languages.mathml = Prism.languages.markup;
Prism.languages.svg = Prism.languages.markup;

Prism.languages.xml = Prism.languages.extend("markup", {});
Prism.languages.ssml = Prism.languages.xml;
Prism.languages.atom = Prism.languages.xml;
Prism.languages.rss = Prism.languages.xml;

(function (Prism) {
  var string = /("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/;

  Prism.languages.css = {
    comment: /\/\*[\s\S]*?\*\//,
    atrule: {
      pattern: /@[\w-]+[\s\S]*?(?:;|(?=\s*\{))/,
      inside: {
        rule: /^@[\w-]+/,
        "selector-function-argument": {
          pattern: /(\bselector\s*\((?!\s*\))\s*)(?:[^()]|\((?:[^()]|\([^()]*\))*\))+?(?=\s*\))/,
          lookbehind: true,
          alias: "selector",
        },
        keyword: {
          pattern: /(^|[^\w-])(?:and|not|only|or)(?![\w-])/,
          lookbehind: true,
        },
        // See rest below
      },
    },
    url: {
      // https://drafts.csswg.org/css-values-3/#urls
      pattern: RegExp(
        "\\burl\\((?:" +
          string.source +
          "|" +
          /(?:[^\\\r\n()"']|\\[\s\S])*/.source +
          ")\\)",
        "i"
      ),
      greedy: true,
      inside: {
        function: /^url/i,
        punctuation: /^\(|\)$/,
        string: {
          pattern: RegExp("^" + string.source + "$"),
          alias: "url",
        },
      },
    },
    selector: RegExp(
      "[^{}\\s](?:[^{};\"']|" + string.source + ")*?(?=\\s*\\{)"
    ),
    string: {
      pattern: string,
      greedy: true,
    },
    property: /[-_a-z\xA0-\uFFFF][-\w\xA0-\uFFFF]*(?=\s*:)/i,
    important: /!important\b/i,
    function: /[-a-z0-9]+(?=\()/i,
    punctuation: /[(){};:,]/,
  };

  Prism.languages.css["atrule"].inside.rest = Prism.languages.css;

  var markup = Prism.languages.markup;
  if (markup) {
    markup.tag.addInlined("style", "css");

    Prism.languages.insertBefore(
      "inside",
      "attr-value",
      {
        "style-attr": {
          pattern: /\s*style=("|')(?:\\[\s\S]|(?!\1)[^\\])*\1/i,
          inside: {
            "attr-name": {
              pattern: /^\s*style/i,
              inside: markup.tag.inside,
            },
            punctuation: /^\s*=\s*['"]|['"]\s*$/,
            "attr-value": {
              pattern: /.+/i,
              inside: Prism.languages.css,
            },
          },
          alias: "language-css",
        },
      },
      markup.tag
    );
  }
})(Prism);

Prism.languages.clike = {
  comment: [
    {
      pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
      lookbehind: true,
    },
    {
      pattern: /(^|[^\\:])\/\/.*/,
      lookbehind: true,
      greedy: true,
    },
  ],
  string: {
    pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
    greedy: true,
  },
  "class-name": {
    pattern: /(\b(?:class|interface|extends|implements|trait|instanceof|new)\s+|\bcatch\s+\()[\w.\\]+/i,
    lookbehind: true,
    inside: {
      punctuation: /[.\\]/,
    },
  },
  keyword: /\b(?:if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
  boolean: /\b(?:true|false)\b/,
  function: /\w+(?=\()/,
  number: /\b0x[\da-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:e[+-]?\d+)?/i,
  operator: /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
  punctuation: /[{}[\];(),.:]/,
};

Prism.languages.javascript = Prism.languages.extend("clike", {
  "class-name": [
    Prism.languages.clike["class-name"],
    {
      pattern: /(^|[^$\w\xA0-\uFFFF])[_$A-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\.(?:prototype|constructor))/,
      lookbehind: true,
    },
  ],
  keyword: [
    {
      pattern: /((?:^|})\s*)(?:catch|finally)\b/,
      lookbehind: true,
    },
    {
      pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|for|from|function|(?:get|set)(?=\s*[\[$\w\xA0-\uFFFF])|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
      lookbehind: true,
    },
  ],
  number: /\b(?:(?:0[xX](?:[\dA-Fa-f](?:_[\dA-Fa-f])?)+|0[bB](?:[01](?:_[01])?)+|0[oO](?:[0-7](?:_[0-7])?)+)n?|(?:\d(?:_\d)?)+n|NaN|Infinity)\b|(?:\b(?:\d(?:_\d)?)+\.?(?:\d(?:_\d)?)*|\B\.(?:\d(?:_\d)?)+)(?:[Ee][+-]?(?:\d(?:_\d)?)+)?/,
  // Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
  function: /#?[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
  operator: /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/,
});

Prism.languages.javascript[
  "class-name"
][0].pattern = /(\b(?:class|interface|extends|implements|instanceof|new)\s+)[\w.\\]+/;

Prism.languages.insertBefore("javascript", "keyword", {
  regex: {
    pattern: /((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)\/(?:\[(?:[^\]\\\r\n]|\\.)*]|\\.|[^/\\\[\r\n])+\/[gimyus]{0,6}(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/,
    lookbehind: true,
    greedy: true,
    inside: {
      "regex-source": {
        pattern: /^(\/)[\s\S]+(?=\/[a-z]*$)/,
        lookbehind: true,
        alias: "language-regex",
        inside: Prism.languages.regex,
      },
      "regex-flags": /[a-z]+$/,
      "regex-delimiter": /^\/|\/$/,
    },
  },
  // This must be declared before keyword because we use "function" inside the look-forward
  "function-variable": {
    pattern: /#?[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)\s*=>))/,
    alias: "function",
  },
  parameter: [
    {
      pattern: /(function(?:\s+[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)?\s*\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\))/,
      lookbehind: true,
      inside: Prism.languages.javascript,
    },
    {
      pattern: /[_$a-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*=>)/i,
      inside: Prism.languages.javascript,
    },
    {
      pattern: /(\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*=>)/,
      lookbehind: true,
      inside: Prism.languages.javascript,
    },
    {
      pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*\{)/,
      lookbehind: true,
      inside: Prism.languages.javascript,
    },
  ],
  constant: /\b[A-Z](?:[A-Z_]|\dx?)*\b/,
});

Prism.languages.insertBefore("javascript", "string", {
  "template-string": {
    pattern: /`(?:\\[\s\S]|\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})+}|(?!\${)[^\\`])*`/,
    greedy: true,
    inside: {
      "template-punctuation": {
        pattern: /^`|`$/,
        alias: "string",
      },
      interpolation: {
        pattern: /((?:^|[^\\])(?:\\{2})*)\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})+}/,
        lookbehind: true,
        inside: {
          "interpolation-punctuation": {
            pattern: /^\${|}$/,
            alias: "punctuation",
          },
          rest: Prism.languages.javascript,
        },
      },
      string: /[\s\S]+/,
    },
  },
});

if (Prism.languages.markup) {
  Prism.languages.markup.tag.addInlined("script", "javascript");
}

Prism.languages.js = Prism.languages.javascript;

(function (Prism) {
  // $ set | grep '^[A-Z][^[:space:]]*=' | cut -d= -f1 | tr '\n' '|'
  // + LC_ALL, RANDOM, REPLY, SECONDS.
  // + make sure PS1..4 are here as they are not always set,
  // - some useless things.
  var envVars =
    "\\b(?:BASH|BASHOPTS|BASH_ALIASES|BASH_ARGC|BASH_ARGV|BASH_CMDS|BASH_COMPLETION_COMPAT_DIR|BASH_LINENO|BASH_REMATCH|BASH_SOURCE|BASH_VERSINFO|BASH_VERSION|COLORTERM|COLUMNS|COMP_WORDBREAKS|DBUS_SESSION_BUS_ADDRESS|DEFAULTS_PATH|DESKTOP_SESSION|DIRSTACK|DISPLAY|EUID|GDMSESSION|GDM_LANG|GNOME_KEYRING_CONTROL|GNOME_KEYRING_PID|GPG_AGENT_INFO|GROUPS|HISTCONTROL|HISTFILE|HISTFILESIZE|HISTSIZE|HOME|HOSTNAME|HOSTTYPE|IFS|INSTANCE|JOB|LANG|LANGUAGE|LC_ADDRESS|LC_ALL|LC_IDENTIFICATION|LC_MEASUREMENT|LC_MONETARY|LC_NAME|LC_NUMERIC|LC_PAPER|LC_TELEPHONE|LC_TIME|LESSCLOSE|LESSOPEN|LINES|LOGNAME|LS_COLORS|MACHTYPE|MAILCHECK|MANDATORY_PATH|NO_AT_BRIDGE|OLDPWD|OPTERR|OPTIND|ORBIT_SOCKETDIR|OSTYPE|PAPERSIZE|PATH|PIPESTATUS|PPID|PS1|PS2|PS3|PS4|PWD|RANDOM|REPLY|SECONDS|SELINUX_INIT|SESSION|SESSIONTYPE|SESSION_MANAGER|SHELL|SHELLOPTS|SHLVL|SSH_AUTH_SOCK|TERM|UID|UPSTART_EVENTS|UPSTART_INSTANCE|UPSTART_JOB|UPSTART_SESSION|USER|WINDOWID|XAUTHORITY|XDG_CONFIG_DIRS|XDG_CURRENT_DESKTOP|XDG_DATA_DIRS|XDG_GREETER_DATA_DIR|XDG_MENU_PREFIX|XDG_RUNTIME_DIR|XDG_SEAT|XDG_SEAT_PATH|XDG_SESSION_DESKTOP|XDG_SESSION_ID|XDG_SESSION_PATH|XDG_SESSION_TYPE|XDG_VTNR|XMODIFIERS)\\b";

  var commandAfterHeredoc = {
    pattern: /(^(["']?)\w+\2)[ \t]+\S.*/,
    lookbehind: true,
    alias: "punctuation", // this looks reasonably well in all themes
    inside: null, // see below
  };

  var insideString = {
    bash: commandAfterHeredoc,
    environment: {
      pattern: RegExp("\\$" + envVars),
      alias: "constant",
    },
    variable: [
      // [0]: Arithmetic Environment
      {
        pattern: /\$?\(\([\s\S]+?\)\)/,
        greedy: true,
        inside: {
          // If there is a $ sign at the beginning highlight $(( and )) as variable
          variable: [
            {
              pattern: /(^\$\(\([\s\S]+)\)\)/,
              lookbehind: true,
            },
            /^\$\(\(/,
          ],
          number: /\b0x[\dA-Fa-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:[Ee]-?\d+)?/,
          // Operators according to https://www.gnu.org/software/bash/manual/bashref.html#Shell-Arithmetic
          operator: /--?|-=|\+\+?|\+=|!=?|~|\*\*?|\*=|\/=?|%=?|<<=?|>>=?|<=?|>=?|==?|&&?|&=|\^=?|\|\|?|\|=|\?|:/,
          // If there is no $ sign at the beginning highlight (( and )) as punctuation
          punctuation: /\(\(?|\)\)?|,|;/,
        },
      },
      // [1]: Command Substitution
      {
        pattern: /\$\((?:\([^)]+\)|[^()])+\)|`[^`]+`/,
        greedy: true,
        inside: {
          variable: /^\$\(|^`|\)$|`$/,
        },
      },
      // [2]: Brace expansion
      {
        pattern: /\$\{[^}]+\}/,
        greedy: true,
        inside: {
          operator: /:[-=?+]?|[!\/]|##?|%%?|\^\^?|,,?/,
          punctuation: /[\[\]]/,
          environment: {
            pattern: RegExp("(\\{)" + envVars),
            lookbehind: true,
            alias: "constant",
          },
        },
      },
      /\$(?:\w+|[#?*!@$])/,
    ],
    // Escape sequences from echo and printf's manuals, and escaped quotes.
    entity: /\\(?:[abceEfnrtv\\"]|O?[0-7]{1,3}|x[0-9a-fA-F]{1,2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})/,
  };

  Prism.languages.bash = {
    shebang: {
      pattern: /^#!\s*\/.*/,
      alias: "important",
    },
    comment: {
      pattern: /(^|[^"{\\$])#.*/,
      lookbehind: true,
    },
    "function-name": [
      // a) function foo {
      // b) foo() {
      // c) function foo() {
      // but not “foo {”
      {
        // a) and c)
        pattern: /(\bfunction\s+)\w+(?=(?:\s*\(?:\s*\))?\s*\{)/,
        lookbehind: true,
        alias: "function",
      },
      {
        // b)
        pattern: /\b\w+(?=\s*\(\s*\)\s*\{)/,
        alias: "function",
      },
    ],
    // Highlight variable names as variables in for and select beginnings.
    "for-or-select": {
      pattern: /(\b(?:for|select)\s+)\w+(?=\s+in\s)/,
      alias: "variable",
      lookbehind: true,
    },
    // Highlight variable names as variables in the left-hand part
    // of assignments (“=” and “+=”).
    "assign-left": {
      pattern: /(^|[\s;|&]|[<>]\()\w+(?=\+?=)/,
      inside: {
        environment: {
          pattern: RegExp("(^|[\\s;|&]|[<>]\\()" + envVars),
          lookbehind: true,
          alias: "constant",
        },
      },
      alias: "variable",
      lookbehind: true,
    },
    string: [
      // Support for Here-documents https://en.wikipedia.org/wiki/Here_document
      {
        pattern: /((?:^|[^<])<<-?\s*)(\w+?)\s[\s\S]*?(?:\r?\n|\r)\2/,
        lookbehind: true,
        greedy: true,
        inside: insideString,
      },
      // Here-document with quotes around the tag
      // → No expansion (so no “inside”).
      {
        pattern: /((?:^|[^<])<<-?\s*)(["'])(\w+)\2\s[\s\S]*?(?:\r?\n|\r)\3/,
        lookbehind: true,
        greedy: true,
        inside: {
          bash: commandAfterHeredoc,
        },
      },
      // “Normal” string
      {
        pattern: /(^|[^\\](?:\\\\)*)(["'])(?:\\[\s\S]|\$\([^)]+\)|`[^`]+`|(?!\2)[^\\])*\2/,
        lookbehind: true,
        greedy: true,
        inside: insideString,
      },
    ],
    environment: {
      pattern: RegExp("\\$?" + envVars),
      alias: "constant",
    },
    variable: insideString.variable,
    function: {
      pattern: /(^|[\s;|&]|[<>]\()(?:add|apropos|apt|aptitude|apt-cache|apt-get|aspell|automysqlbackup|awk|basename|bash|bc|bconsole|bg|bzip2|cal|cat|cfdisk|chgrp|chkconfig|chmod|chown|chroot|cksum|clear|cmp|column|comm|composer|cp|cron|crontab|csplit|curl|cut|date|dc|dd|ddrescue|debootstrap|df|diff|diff3|dig|dir|dircolors|dirname|dirs|dmesg|du|egrep|eject|env|ethtool|expand|expect|expr|fdformat|fdisk|fg|fgrep|file|find|fmt|fold|format|free|fsck|ftp|fuser|gawk|git|gparted|grep|groupadd|groupdel|groupmod|groups|grub-mkconfig|gzip|halt|head|hg|history|host|hostname|htop|iconv|id|ifconfig|ifdown|ifup|import|install|ip|jobs|join|kill|killall|less|link|ln|locate|logname|logrotate|look|lpc|lpr|lprint|lprintd|lprintq|lprm|ls|lsof|lynx|make|man|mc|mdadm|mkconfig|mkdir|mke2fs|mkfifo|mkfs|mkisofs|mknod|mkswap|mmv|more|most|mount|mtools|mtr|mutt|mv|nano|nc|netstat|nice|nl|nohup|notify-send|npm|nslookup|op|open|parted|passwd|paste|pathchk|ping|pkill|pnpm|popd|pr|printcap|printenv|ps|pushd|pv|quota|quotacheck|quotactl|ram|rar|rcp|reboot|remsync|rename|renice|rev|rm|rmdir|rpm|rsync|scp|screen|sdiff|sed|sendmail|seq|service|sftp|sh|shellcheck|shuf|shutdown|sleep|slocate|sort|split|ssh|stat|strace|su|sudo|sum|suspend|swapon|sync|tac|tail|tar|tee|time|timeout|top|touch|tr|traceroute|tsort|tty|umount|uname|unexpand|uniq|units|unrar|unshar|unzip|update-grub|uptime|useradd|userdel|usermod|users|uudecode|uuencode|v|vdir|vi|vim|virsh|vmstat|wait|watch|wc|wget|whereis|which|who|whoami|write|xargs|xdg-open|yarn|yes|zenity|zip|zsh|zypper)(?=$|[)\s;|&])/,
      lookbehind: true,
    },
    keyword: {
      pattern: /(^|[\s;|&]|[<>]\()(?:if|then|else|elif|fi|for|while|in|case|esac|function|select|do|done|until)(?=$|[)\s;|&])/,
      lookbehind: true,
    },
    // https://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
    builtin: {
      pattern: /(^|[\s;|&]|[<>]\()(?:\.|:|break|cd|continue|eval|exec|exit|export|getopts|hash|pwd|readonly|return|shift|test|times|trap|umask|unset|alias|bind|builtin|caller|command|declare|echo|enable|help|let|local|logout|mapfile|printf|read|readarray|source|type|typeset|ulimit|unalias|set|shopt)(?=$|[)\s;|&])/,
      lookbehind: true,
      // Alias added to make those easier to distinguish from strings.
      alias: "class-name",
    },
    boolean: {
      pattern: /(^|[\s;|&]|[<>]\()(?:true|false)(?=$|[)\s;|&])/,
      lookbehind: true,
    },
    "file-descriptor": {
      pattern: /\B&\d\b/,
      alias: "important",
    },
    operator: {
      // Lots of redirections here, but not just that.
      pattern: /\d?<>|>\||\+=|==?|!=?|=~|<<[<-]?|[&\d]?>>|\d?[<>]&?|&[>&]?|\|[&|]?|<=?|>=?/,
      inside: {
        "file-descriptor": {
          pattern: /^\d/,
          alias: "important",
        },
      },
    },
    punctuation: /\$?\(\(?|\)\)?|\.\.|[{}[\];\\]/,
    number: {
      pattern: /(^|\s)(?:[1-9]\d*|0)(?:[.,]\d+)?\b/,
      lookbehind: true,
    },
  };

  commandAfterHeredoc.inside = Prism.languages.bash;

  /* Patterns in command substitution. */
  var toBeCopied = [
    "comment",
    "function-name",
    "for-or-select",
    "assign-left",
    "string",
    "environment",
    "function",
    "keyword",
    "builtin",
    "boolean",
    "file-descriptor",
    "operator",
    "punctuation",
    "number",
  ];
  var inside = insideString.variable[1].inside;
  for (var i = 0; i < toBeCopied.length; i++) {
    inside[toBeCopied[i]] = Prism.languages.bash[toBeCopied[i]];
  }

  Prism.languages.shell = Prism.languages.bash;
})(Prism);

(function (Prism) {
  var string = /("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/;
  var selectorInside;

  Prism.languages.css.selector = {
    pattern: Prism.languages.css.selector,
    inside: (selectorInside = {
      "pseudo-element": /:(?:after|before|first-letter|first-line|selection)|::[-\w]+/,
      "pseudo-class": /:[-\w]+/,
      class: /\.[-\w]+/,
      id: /#[-\w]+/,
      attribute: {
        pattern: RegExp("\\[(?:[^[\\]\"']|" + string.source + ")*\\]"),
        greedy: true,
        inside: {
          punctuation: /^\[|\]$/,
          "case-sensitivity": {
            pattern: /(\s)[si]$/i,
            lookbehind: true,
            alias: "keyword",
          },
          namespace: {
            pattern: /^(\s*)[-*\w\xA0-\uFFFF]*\|(?!=)/,
            lookbehind: true,
            inside: {
              punctuation: /\|$/,
            },
          },
          "attr-name": {
            pattern: /^(\s*)[-\w\xA0-\uFFFF]+/,
            lookbehind: true,
          },
          "attr-value": [
            string,
            {
              pattern: /(=\s*)[-\w\xA0-\uFFFF]+(?=\s*$)/,
              lookbehind: true,
            },
          ],
          operator: /[|~*^$]?=/,
        },
      },
      "n-th": [
        {
          pattern: /(\(\s*)[+-]?\d*[\dn](?:\s*[+-]\s*\d+)?(?=\s*\))/,
          lookbehind: true,
          inside: {
            number: /[\dn]+/,
            operator: /[+-]/,
          },
        },
        {
          pattern: /(\(\s*)(?:even|odd)(?=\s*\))/i,
          lookbehind: true,
        },
      ],
      combinator: />|\+|~|\|\|/,

      // the `tag` token has been existed and removed.
      // because we can't find a perfect tokenize to match it.
      // if you want to add it, please read https://github.com/PrismJS/prism/pull/2373 first.

      punctuation: /[(),]/,
    }),
  };

  Prism.languages.css["atrule"].inside[
    "selector-function-argument"
  ].inside = selectorInside;

  Prism.languages.insertBefore("css", "property", {
    variable: {
      pattern: /(^|[^-\w\xA0-\uFFFF])--[-_a-z\xA0-\uFFFF][-\w\xA0-\uFFFF]*/i,
      lookbehind: true,
    },
  });

  var unit = {
    pattern: /(\b\d+)(?:%|[a-z]+\b)/,
    lookbehind: true,
  };
  // 123 -123 .123 -.123 12.3 -12.3
  var number = {
    pattern: /(^|[^\w.-])-?\d*\.?\d+/,
    lookbehind: true,
  };

  Prism.languages.insertBefore("css", "function", {
    operator: {
      pattern: /(\s)[+\-*\/](?=\s)/,
      lookbehind: true,
    },
    // CAREFUL!
    // Previewers and Inline color use hexcode and color.
    hexcode: {
      pattern: /\B#(?:[\da-f]{1,2}){3,4}\b/i,
      alias: "color",
    },
    color: [
      /\b(?:AliceBlue|AntiqueWhite|Aqua|Aquamarine|Azure|Beige|Bisque|Black|BlanchedAlmond|Blue|BlueViolet|Brown|BurlyWood|CadetBlue|Chartreuse|Chocolate|Coral|CornflowerBlue|Cornsilk|Crimson|Cyan|DarkBlue|DarkCyan|DarkGoldenRod|DarkGr[ae]y|DarkGreen|DarkKhaki|DarkMagenta|DarkOliveGreen|DarkOrange|DarkOrchid|DarkRed|DarkSalmon|DarkSeaGreen|DarkSlateBlue|DarkSlateGr[ae]y|DarkTurquoise|DarkViolet|DeepPink|DeepSkyBlue|DimGr[ae]y|DodgerBlue|FireBrick|FloralWhite|ForestGreen|Fuchsia|Gainsboro|GhostWhite|Gold|GoldenRod|Gr[ae]y|Green|GreenYellow|HoneyDew|HotPink|IndianRed|Indigo|Ivory|Khaki|Lavender|LavenderBlush|LawnGreen|LemonChiffon|LightBlue|LightCoral|LightCyan|LightGoldenRodYellow|LightGr[ae]y|LightGreen|LightPink|LightSalmon|LightSeaGreen|LightSkyBlue|LightSlateGr[ae]y|LightSteelBlue|LightYellow|Lime|LimeGreen|Linen|Magenta|Maroon|MediumAquaMarine|MediumBlue|MediumOrchid|MediumPurple|MediumSeaGreen|MediumSlateBlue|MediumSpringGreen|MediumTurquoise|MediumVioletRed|MidnightBlue|MintCream|MistyRose|Moccasin|NavajoWhite|Navy|OldLace|Olive|OliveDrab|Orange|OrangeRed|Orchid|PaleGoldenRod|PaleGreen|PaleTurquoise|PaleVioletRed|PapayaWhip|PeachPuff|Peru|Pink|Plum|PowderBlue|Purple|Red|RosyBrown|RoyalBlue|SaddleBrown|Salmon|SandyBrown|SeaGreen|SeaShell|Sienna|Silver|SkyBlue|SlateBlue|SlateGr[ae]y|Snow|SpringGreen|SteelBlue|Tan|Teal|Thistle|Tomato|Transparent|Turquoise|Violet|Wheat|White|WhiteSmoke|Yellow|YellowGreen)\b/i,
      {
        pattern: /\b(?:rgb|hsl)\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*\)\B|\b(?:rgb|hsl)a\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*(?:0|0?\.\d+|1)\s*\)\B/i,
        inside: {
          unit: unit,
          number: number,
          function: /[\w-]+(?=\()/,
          punctuation: /[(),]/,
        },
      },
    ],
    // it's important that there is no boundary assertion after the hex digits
    entity: /\\[\da-f]{1,8}/i,
    unit: unit,
    number: number,
  });
})(Prism);

(function (Prism) {
  Prism.languages.diff = {
    coord: [
      // Match all kinds of coord lines (prefixed by "+++", "---" or "***").
      /^(?:\*{3}|-{3}|\+{3}).*$/m,
      // Match "@@ ... @@" coord lines in unified diff.
      /^@@.*@@$/m,
      // Match coord lines in normal diff (starts with a number).
      /^\d+.*$/m,
    ],

    // deleted, inserted, unchanged, diff
  };

  /**
   * A map from the name of a block to its line prefix.
   *
   * @type {Object<string, string>}
   */
  var PREFIXES = {
    "deleted-sign": "-",
    "deleted-arrow": "<",
    "inserted-sign": "+",
    "inserted-arrow": ">",
    unchanged: " ",
    diff: "!",
  };

  // add a token for each prefix
  Object.keys(PREFIXES).forEach(function (name) {
    var prefix = PREFIXES[name];

    var alias = [];
    if (!/^\w+$/.test(name)) {
      // "deleted-sign" -> "deleted"
      alias.push(/\w+/.exec(name)[0]);
    }
    if (name === "diff") {
      alias.push("bold");
    }

    Prism.languages.diff[name] = {
      pattern: RegExp("^(?:[" + prefix + "].*(?:\r\n?|\n|(?![\\s\\S])))+", "m"),
      alias: alias,
      inside: {
        line: {
          pattern: /(.)(?=[\s\S]).*(?:\r\n?|\n)?/,
          lookbehind: true,
        },
        prefix: {
          pattern: /[\s\S]/,
          alias: /\w+/.exec(name)[0],
        },
      },
    };
  });

  // make prefixes available to Diff plugin
  Object.defineProperty(Prism.languages.diff, "PREFIXES", {
    value: PREFIXES,
  });
})(Prism);

Prism.languages.docker = {
  keyword: {
    pattern: /(^\s*)(?:ADD|ARG|CMD|COPY|ENTRYPOINT|ENV|EXPOSE|FROM|HEALTHCHECK|LABEL|MAINTAINER|ONBUILD|RUN|SHELL|STOPSIGNAL|USER|VOLUME|WORKDIR)(?=\s)/im,
    lookbehind: true,
  },
  string: /("|')(?:(?!\1)[^\\\r\n]|\\(?:\r\n|[\s\S]))*\1/,
  comment: {
    pattern: /#.*/,
    greedy: true,
  },
  punctuation: /---|\.\.\.|[:[\]{}\-,|>?]/,
};

Prism.languages.dockerfile = Prism.languages.docker;

Prism.languages.git = {
  /*
   * A simple one line comment like in a git status command
   * For instance:
   * $ git status
   * # On branch infinite-scroll
   * # Your branch and 'origin/sharedBranches/frontendTeam/infinite-scroll' have diverged,
   * # and have 1 and 2 different commits each, respectively.
   * nothing to commit (working directory clean)
   */
  comment: /^#.*/m,

  /*
   * Regexp to match the changed lines in a git diff output. Check the example below.
   */
  deleted: /^[-–].*/m,
  inserted: /^\+.*/m,

  /*
   * a string (double and simple quote)
   */
  string: /("|')(?:\\.|(?!\1)[^\\\r\n])*\1/m,

  /*
   * a git command. It starts with a random prompt finishing by a $, then "git" then some other parameters
   * For instance:
   * $ git add file.txt
   */
  command: {
    pattern: /^.*\$ git .*$/m,
    inside: {
      /*
       * A git command can contain a parameter starting by a single or a double dash followed by a string
       * For instance:
       * $ git diff --cached
       * $ git log -p
       */
      parameter: /\s--?\w+/m,
    },
  },

  /*
   * Coordinates displayed in a git diff command
   * For instance:
   * $ git diff
   * diff --git file.txt file.txt
   * index 6214953..1d54a52 100644
   * --- file.txt
   * +++ file.txt
   * @@ -1 +1,2 @@
   * -Here's my tetx file
   * +Here's my text file
   * +And this is the second line
   */
  coord: /^@@.*@@$/m,

  /*
   * Match a "commit [SHA1]" line in a git log output.
   * For instance:
   * $ git log
   * commit a11a14ef7e26f2ca62d4b35eac455ce636d0dc09
   * Author: lgiraudel
   * Date:   Mon Feb 17 11:18:34 2014 +0100
   *
   *     Add of a new line
   */
  commit_sha1: /^commit \w{40}$/m,
};

Prism.languages.go = Prism.languages.extend("clike", {
  keyword: /\b(?:break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go(?:to)?|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/,
  builtin: /\b(?:bool|byte|complex(?:64|128)|error|float(?:32|64)|rune|string|u?int(?:8|16|32|64)?|uintptr|append|cap|close|complex|copy|delete|imag|len|make|new|panic|print(?:ln)?|real|recover)\b/,
  boolean: /\b(?:_|iota|nil|true|false)\b/,
  operator: /[*\/%^!=]=?|\+[=+]?|-[=-]?|\|[=|]?|&(?:=|&|\^=?)?|>(?:>=?|=)?|<(?:<=?|=|-)?|:=|\.\.\./,
  number: /(?:\b0x[a-f\d]+|(?:\b\d+\.?\d*|\B\.\d+)(?:e[-+]?\d+)?)i?/i,
  string: {
    pattern: /(["'`])(?:\\[\s\S]|(?!\1)[^\\])*\1/,
    greedy: true,
  },
});
delete Prism.languages.go["class-name"];

Prism.languages.graphql = {
  comment: /#.*/,
  description: {
    pattern: /(?:"""(?:[^"]|(?!""")")*"""|"(?:\\.|[^\\"\r\n])*")(?=\s*[a-z_])/i,
    greedy: true,
    alias: "string",
    inside: {
      "language-markdown": {
        pattern: /(^"(?:"")?)(?!\1)[\s\S]+(?=\1$)/,
        lookbehind: true,
        inside: Prism.languages.markdown,
      },
    },
  },
  string: {
    pattern: /"""(?:[^"]|(?!""")")*"""|"(?:\\.|[^\\"\r\n])*"/,
    greedy: true,
  },
  number: /(?:\B-|\b)\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,
  boolean: /\b(?:true|false)\b/,
  variable: /\$[a-z_]\w*/i,
  directive: {
    pattern: /@[a-z_]\w*/i,
    alias: "function",
  },
  "attr-name": {
    pattern: /[a-z_]\w*(?=\s*(?:\((?:[^()"]|"(?:\\.|[^\\"\r\n])*")*\))?:)/i,
    greedy: true,
  },
  "class-name": {
    pattern: /(\b(?:enum|implements|interface|on|scalar|type|union)\s+|&\s*)[a-zA-Z_]\w*/,
    lookbehind: true,
  },
  fragment: {
    pattern: /(\bfragment\s+|\.{3}\s*(?!on\b))[a-zA-Z_]\w*/,
    lookbehind: true,
    alias: "function",
  },
  keyword: /\b(?:directive|enum|extend|fragment|implements|input|interface|mutation|on|query|repeatable|scalar|schema|subscription|type|union)\b/,
  operator: /[!=|&]|\.{3}/,
  punctuation: /[!(){}\[\]:=,]/,
  constant: /\b(?!ID\b)[A-Z][A-Z_\d]*\b/,
};

// https://www.json.org/json-en.html
Prism.languages.json = {
  property: {
    pattern: /"(?:\\.|[^\\"\r\n])*"(?=\s*:)/,
    greedy: true,
  },
  string: {
    pattern: /"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
    greedy: true,
  },
  comment: {
    pattern: /\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/,
    greedy: true,
  },
  number: /-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,
  punctuation: /[{}[\],]/,
  operator: /:/,
  boolean: /\b(?:true|false)\b/,
  null: {
    pattern: /\bnull\b/,
    alias: "keyword",
  },
};

Prism.languages.webmanifest = Prism.languages.json;

Prism.languages.python = {
  comment: {
    pattern: /(^|[^\\])#.*/,
    lookbehind: true,
  },
  "string-interpolation": {
    pattern: /(?:f|rf|fr)(?:("""|''')[\s\S]*?\1|("|')(?:\\.|(?!\2)[^\\\r\n])*\2)/i,
    greedy: true,
    inside: {
      interpolation: {
        // "{" <expression> <optional "!s", "!r", or "!a"> <optional ":" format specifier> "}"
        pattern: /((?:^|[^{])(?:{{)*){(?!{)(?:[^{}]|{(?!{)(?:[^{}]|{(?!{)(?:[^{}])+})+})+}/,
        lookbehind: true,
        inside: {
          "format-spec": {
            pattern: /(:)[^:(){}]+(?=}$)/,
            lookbehind: true,
          },
          "conversion-option": {
            pattern: /![sra](?=[:}]$)/,
            alias: "punctuation",
          },
          rest: null,
        },
      },
      string: /[\s\S]+/,
    },
  },
  "triple-quoted-string": {
    pattern: /(?:[rub]|rb|br)?("""|''')[\s\S]*?\1/i,
    greedy: true,
    alias: "string",
  },
  string: {
    pattern: /(?:[rub]|rb|br)?("|')(?:\\.|(?!\1)[^\\\r\n])*\1/i,
    greedy: true,
  },
  function: {
    pattern: /((?:^|\s)def[ \t]+)[a-zA-Z_]\w*(?=\s*\()/g,
    lookbehind: true,
  },
  "class-name": {
    pattern: /(\bclass\s+)\w+/i,
    lookbehind: true,
  },
  decorator: {
    pattern: /(^\s*)@\w+(?:\.\w+)*/im,
    lookbehind: true,
    alias: ["annotation", "punctuation"],
    inside: {
      punctuation: /\./,
    },
  },
  keyword: /\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|print|raise|return|try|while|with|yield)\b/,
  builtin: /\b(?:__import__|abs|all|any|apply|ascii|basestring|bin|bool|buffer|bytearray|bytes|callable|chr|classmethod|cmp|coerce|compile|complex|delattr|dict|dir|divmod|enumerate|eval|execfile|file|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|intern|isinstance|issubclass|iter|len|list|locals|long|map|max|memoryview|min|next|object|oct|open|ord|pow|property|range|raw_input|reduce|reload|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|unichr|unicode|vars|xrange|zip)\b/,
  boolean: /\b(?:True|False|None)\b/,
  number: /(?:\b(?=\d)|\B(?=\.))(?:0[bo])?(?:(?:\d|0x[\da-f])[\da-f]*\.?\d*|\.\d+)(?:e[+-]?\d+)?j?\b/i,
  operator: /[-+%=]=?|!=|\*\*?=?|\/\/?=?|<[<=>]?|>[=>]?|[&|^~]/,
  punctuation: /[{}[\];(),.:]/,
};

Prism.languages.python["string-interpolation"].inside[
  "interpolation"
].inside.rest = Prism.languages.python;

Prism.languages.py = Prism.languages.python;

(function (Prism) {
  var javascript = Prism.util.clone(Prism.languages.javascript);

  Prism.languages.jsx = Prism.languages.extend("markup", javascript);
  Prism.languages.jsx.tag.pattern = /<\/?(?:[\w.:-]+\s*(?:\s+(?:[\w.:$-]+(?:=(?:("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|[^\s{'">=]+|\{(?:\{(?:\{[^{}]*\}|[^{}])*\}|[^{}])+\}))?|\{\s*\.{3}\s*[a-z_$][\w$]*(?:\.[a-z_$][\w$]*)*\s*\}))*\s*\/?)?>/i;

  Prism.languages.jsx.tag.inside["tag"].pattern = /^<\/?[^\s>\/]*/i;
  Prism.languages.jsx.tag.inside[
    "attr-value"
  ].pattern = /=(?!\{)(?:("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|[^\s'">]+)/i;
  Prism.languages.jsx.tag.inside["tag"].inside[
    "class-name"
  ] = /^[A-Z]\w*(?:\.[A-Z]\w*)*$/;

  Prism.languages.insertBefore(
    "inside",
    "attr-name",
    {
      spread: {
        pattern: /\{\s*\.{3}\s*[a-z_$][\w$]*(?:\.[a-z_$][\w$]*)*\s*\}/,
        inside: {
          punctuation: /\.{3}|[{}.]/,
          "attr-value": /\w+/,
        },
      },
    },
    Prism.languages.jsx.tag
  );

  Prism.languages.insertBefore(
    "inside",
    "attr-value",
    {
      script: {
        // Allow for two levels of nesting
        pattern: /=(?:\{(?:\{(?:\{[^{}]*\}|[^{}])*\}|[^{}])+\})/i,
        inside: {
          "script-punctuation": {
            pattern: /^=(?={)/,
            alias: "punctuation",
          },
          rest: Prism.languages.jsx,
        },
        alias: "language-javascript",
      },
    },
    Prism.languages.jsx.tag
  );

  // The following will handle plain text inside tags
  var stringifyToken = function (token) {
    if (!token) {
      return "";
    }
    if (typeof token === "string") {
      return token;
    }
    if (typeof token.content === "string") {
      return token.content;
    }
    return token.content.map(stringifyToken).join("");
  };

  var walkTokens = function (tokens) {
    var openedTags = [];
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      var notTagNorBrace = false;

      if (typeof token !== "string") {
        if (
          token.type === "tag" &&
          token.content[0] &&
          token.content[0].type === "tag"
        ) {
          // We found a tag, now find its kind

          if (token.content[0].content[0].content === "</") {
            // Closing tag
            if (
              openedTags.length > 0 &&
              openedTags[openedTags.length - 1].tagName ===
                stringifyToken(token.content[0].content[1])
            ) {
              // Pop matching opening tag
              openedTags.pop();
            }
          } else {
            if (token.content[token.content.length - 1].content === "/>") {
              // Autoclosed tag, ignore
            } else {
              // Opening tag
              openedTags.push({
                tagName: stringifyToken(token.content[0].content[1]),
                openedBraces: 0,
              });
            }
          }
        } else if (
          openedTags.length > 0 &&
          token.type === "punctuation" &&
          token.content === "{"
        ) {
          // Here we might have entered a JSX context inside a tag
          openedTags[openedTags.length - 1].openedBraces++;
        } else if (
          openedTags.length > 0 &&
          openedTags[openedTags.length - 1].openedBraces > 0 &&
          token.type === "punctuation" &&
          token.content === "}"
        ) {
          // Here we might have left a JSX context inside a tag
          openedTags[openedTags.length - 1].openedBraces--;
        } else {
          notTagNorBrace = true;
        }
      }
      if (notTagNorBrace || typeof token === "string") {
        if (
          openedTags.length > 0 &&
          openedTags[openedTags.length - 1].openedBraces === 0
        ) {
          // Here we are inside a tag, and not inside a JSX context.
          // That's plain text: drop any tokens matched.
          var plainText = stringifyToken(token);

          // And merge text with adjacent text
          if (
            i < tokens.length - 1 &&
            (typeof tokens[i + 1] === "string" ||
              tokens[i + 1].type === "plain-text")
          ) {
            plainText += stringifyToken(tokens[i + 1]);
            tokens.splice(i + 1, 1);
          }
          if (
            i > 0 &&
            (typeof tokens[i - 1] === "string" ||
              tokens[i - 1].type === "plain-text")
          ) {
            plainText = stringifyToken(tokens[i - 1]) + plainText;
            tokens.splice(i - 1, 1);
            i--;
          }

          tokens[i] = new Prism.Token("plain-text", plainText, null, plainText);
        }
      }

      if (token.content && typeof token.content !== "string") {
        walkTokens(token.content);
      }
    }
  };

  Prism.hooks.add("after-tokenize", function (env) {
    if (env.language !== "jsx" && env.language !== "tsx") {
      return;
    }
    walkTokens(env.tokens);
  });
})(Prism);

(function (Prism) {
  Prism.languages.typescript = Prism.languages.extend("javascript", {
    "class-name": {
      pattern: /(\b(?:class|extends|implements|instanceof|interface|new|type)\s+)(?!keyof\b)[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?:\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>)?/,
      lookbehind: true,
      greedy: true,
      inside: null, // see below
    },
    // From JavaScript Prism keyword list and TypeScript language spec: https://github.com/Microsoft/TypeScript/blob/master/doc/spec.md#221-reserved-words
    keyword: /\b(?:abstract|as|asserts|async|await|break|case|catch|class|const|constructor|continue|debugger|declare|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|is|keyof|let|module|namespace|new|null|of|package|private|protected|public|readonly|return|require|set|static|super|switch|this|throw|try|type|typeof|undefined|var|void|while|with|yield)\b/,
    builtin: /\b(?:string|Function|any|number|boolean|Array|symbol|console|Promise|unknown|never)\b/,
  });

  // doesn't work with TS because TS is too complex
  delete Prism.languages.typescript["parameter"];

  // a version of typescript specifically for highlighting types
  var typeInside = Prism.languages.extend("typescript", {});
  delete typeInside["class-name"];

  Prism.languages.typescript["class-name"].inside = typeInside;

  Prism.languages.insertBefore("typescript", "function", {
    "generic-function": {
      // e.g. foo<T extends "bar" | "baz">( ...
      pattern: /#?[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>(?=\s*\()/,
      greedy: true,
      inside: {
        function: /^#?[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*/,
        generic: {
          pattern: /<[\s\S]+/, // everything after the first <
          alias: "class-name",
          inside: typeInside,
        },
      },
    },
  });

  Prism.languages.ts = Prism.languages.typescript;
})(Prism);

var typescript = Prism.util.clone(Prism.languages.typescript);
Prism.languages.tsx = Prism.languages.extend("jsx", typescript);
(function (Prism) {
  var specialEscape = {
    pattern: /\\[\\(){}[\]^$+*?|.]/,
    alias: "escape",
  };
  var escape = /\\(?:x[\da-fA-F]{2}|u[\da-fA-F]{4}|u\{[\da-fA-F]+\}|c[a-zA-Z]|0[0-7]{0,2}|[123][0-7]{2}|.)/;
  var charClass = {
    pattern: /\.|\\[wsd]|\\p{[^{}]+}/i,
    alias: "class-name",
  };
  var charClassWithoutDot = {
    pattern: /\\[wsd]|\\p{[^{}]+}/i,
    alias: "class-name",
  };

  var rangeChar = "(?:[^\\\\-]|" + escape.source + ")";
  var range = RegExp(rangeChar + "-" + rangeChar);

  // the name of a capturing group
  var groupName = {
    pattern: /(<|')[^<>']+(?=[>']$)/,
    lookbehind: true,
    alias: "variable",
  };

  Prism.languages.regex = {
    charset: {
      pattern: /((?:^|[^\\])(?:\\\\)*)\[(?:[^\\\]]|\\[\s\S])*\]/,
      lookbehind: true,
      inside: {
        "charset-negation": {
          pattern: /(^\[)\^/,
          lookbehind: true,
          alias: "operator",
        },
        "charset-punctuation": {
          pattern: /^\[|\]$/,
          alias: "punctuation",
        },
        range: {
          pattern: range,
          inside: {
            escape: escape,
            "range-punctuation": {
              pattern: /-/,
              alias: "operator",
            },
          },
        },
        "special-escape": specialEscape,
        charclass: charClassWithoutDot,
        escape: escape,
      },
    },
    "special-escape": specialEscape,
    charclass: charClass,
    backreference: [
      {
        // a backreference which is not an octal escape
        pattern: /\\(?![123][0-7]{2})[1-9]/,
        alias: "keyword",
      },
      {
        pattern: /\\k<[^<>']+>/,
        alias: "keyword",
        inside: {
          "group-name": groupName,
        },
      },
    ],
    anchor: {
      pattern: /[$^]|\\[ABbGZz]/,
      alias: "function",
    },
    escape: escape,
    group: [
      {
        // https://docs.oracle.com/javase/10/docs/api/java/util/regex/Pattern.html
        // https://docs.microsoft.com/en-us/dotnet/standard/base-types/regular-expression-language-quick-reference?view=netframework-4.7.2#grouping-constructs

        // (), (?<name>), (?'name'), (?>), (?:), (?=), (?!), (?<=), (?<!), (?is-m), (?i-m:)
        pattern: /\((?:\?(?:<[^<>']+>|'[^<>']+'|[>:]|<?[=!]|[idmnsuxU]+(?:-[idmnsuxU]+)?:?))?/,
        alias: "punctuation",
        inside: {
          "group-name": groupName,
        },
      },
      {
        pattern: /\)/,
        alias: "punctuation",
      },
    ],
    quantifier: {
      pattern: /(?:[+*?]|\{(?:\d+,?\d*)\})[?+]?/,
      alias: "number",
    },
    alternation: {
      pattern: /\|/,
      alias: "keyword",
    },
  };
})(Prism);
Prism.languages.sql = {
  comment: {
    pattern: /(^|[^\\])(?:\/\*[\s\S]*?\*\/|(?:--|\/\/|#).*)/,
    lookbehind: true,
  },
  variable: [
    {
      pattern: /@(["'`])(?:\\[\s\S]|(?!\1)[^\\])+\1/,
      greedy: true,
    },
    /@[\w.$]+/,
  ],
  string: {
    pattern: /(^|[^@\\])("|')(?:\\[\s\S]|(?!\2)[^\\]|\2\2)*\2/,
    greedy: true,
    lookbehind: true,
  },
  function: /\b(?:AVG|COUNT|FIRST|FORMAT|LAST|LCASE|LEN|MAX|MID|MIN|MOD|NOW|ROUND|SUM|UCASE)(?=\s*\()/i, // Should we highlight user defined functions too?
  keyword: /\b(?:ACTION|ADD|AFTER|ALGORITHM|ALL|ALTER|ANALYZE|ANY|APPLY|AS|ASC|AUTHORIZATION|AUTO_INCREMENT|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADED?|CASE|CHAIN|CHAR(?:ACTER|SET)?|CHECK(?:POINT)?|CLOSE|CLUSTERED|COALESCE|COLLATE|COLUMNS?|COMMENT|COMMIT(?:TED)?|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS(?:TABLE)?|CONTINUE|CONVERT|CREATE|CROSS|CURRENT(?:_DATE|_TIME|_TIMESTAMP|_USER)?|CURSOR|CYCLE|DATA(?:BASES?)?|DATE(?:TIME)?|DAY|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DELIMITERS?|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE|DROP|DUMMY|DUMP(?:FILE)?|DUPLICATE|ELSE(?:IF)?|ENABLE|ENCLOSED|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPED?|EXCEPT|EXEC(?:UTE)?|EXISTS|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR(?: EACH ROW)?|FORCE|FOREIGN|FREETEXT(?:TABLE)?|FROM|FULL|FUNCTION|GEOMETRY(?:COLLECTION)?|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|HOUR|IDENTITY(?:_INSERT|COL)?|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTERVAL|INTO|INVOKER|ISOLATION|ITERATE|JOIN|KEYS?|KILL|LANGUAGE|LAST|LEAVE|LEFT|LEVEL|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONG(?:BLOB|TEXT)|LOOP|MATCH(?:ED)?|MEDIUM(?:BLOB|INT|TEXT)|MERGE|MIDDLEINT|MINUTE|MODE|MODIFIES|MODIFY|MONTH|MULTI(?:LINESTRING|POINT|POLYGON)|NATIONAL|NATURAL|NCHAR|NEXT|NO|NONCLUSTERED|NULLIF|NUMERIC|OFF?|OFFSETS?|ON|OPEN(?:DATASOURCE|QUERY|ROWSET)?|OPTIMIZE|OPTION(?:ALLY)?|ORDER|OUT(?:ER|FILE)?|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREPARE|PREV|PRIMARY|PRINT|PRIVILEGES|PROC(?:EDURE)?|PUBLIC|PURGE|QUICK|RAISERROR|READS?|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEAT(?:ABLE)?|REPLACE|REPLICATION|REQUIRE|RESIGNAL|RESTORE|RESTRICT|RETURN(?:S|ING)?|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROW(?:COUNT|GUIDCOL|S)?|RTREE|RULE|SAVE(?:POINT)?|SCHEMA|SECOND|SELECT|SERIAL(?:IZABLE)?|SESSION(?:_USER)?|SET(?:USER)?|SHARE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|SQL|START(?:ING)?|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLES?|TABLESPACE|TEMP(?:ORARY|TABLE)?|TERMINATED|TEXT(?:SIZE)?|THEN|TIME(?:STAMP)?|TINY(?:BLOB|INT|TEXT)|TOP?|TRAN(?:SACTIONS?)?|TRIGGER|TRUNCATE|TSEQUAL|TYPES?|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNIQUE|UNLOCK|UNPIVOT|UNSIGNED|UPDATE(?:TEXT)?|USAGE|USE|USER|USING|VALUES?|VAR(?:BINARY|CHAR|CHARACTER|YING)|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH(?: ROLLUP|IN)?|WORK|WRITE(?:TEXT)?|YEAR)\b/i,
  boolean: /\b(?:TRUE|FALSE|NULL)\b/i,
  number: /\b0x[\da-f]+\b|\b\d+\.?\d*|\B\.\d+\b/i,
  operator: /[-+*\/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?|\b(?:AND|BETWEEN|IN|LIKE|NOT|OR|IS|DIV|REGEXP|RLIKE|SOUNDS LIKE|XOR)\b/i,
  punctuation: /[;[\]()`,.]/,
};

(function (Prism) {
  var key = /(?:[\w-]+|'[^'\n\r]*'|"(?:\\.|[^\\"\r\n])*")/.source;

  /**
   * @param {string} pattern
   */
  function insertKey(pattern) {
    return pattern.replace(/__/g, function () {
      return key;
    });
  }

  Prism.languages.toml = {
    comment: {
      pattern: /#.*/,
      greedy: true,
    },
    table: {
      pattern: RegExp(
        insertKey(/(^\s*\[\s*(?:\[\s*)?)__(?:\s*\.\s*__)*(?=\s*\])/.source),
        "m"
      ),
      lookbehind: true,
      greedy: true,
      alias: "class-name",
    },
    key: {
      pattern: RegExp(
        insertKey(/(^\s*|[{,]\s*)__(?:\s*\.\s*__)*(?=\s*=)/.source),
        "m"
      ),
      lookbehind: true,
      greedy: true,
      alias: "property",
    },
    string: {
      pattern: /"""(?:\\[\s\S]|[^\\])*?"""|'''[\s\S]*?'''|'[^'\n\r]*'|"(?:\\.|[^\\"\r\n])*"/,
      greedy: true,
    },
    date: [
      {
        // Offset Date-Time, Local Date-Time, Local Date
        pattern: /\b\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?\b/i,
        alias: "number",
      },
      {
        // Local Time
        pattern: /\b\d{2}:\d{2}:\d{2}(?:\.\d+)?\b/,
        alias: "number",
      },
    ],
    number: /(?:\b0(?:x[\da-zA-Z]+(?:_[\da-zA-Z]+)*|o[0-7]+(?:_[0-7]+)*|b[10]+(?:_[10]+)*))\b|[-+]?\b\d+(?:_\d+)*(?:\.\d+(?:_\d+)*)?(?:[eE][+-]?\d+(?:_\d+)*)?\b|[-+]?\b(?:inf|nan)\b/,
    boolean: /\b(?:true|false)\b/,
    punctuation: /[.,=[\]{}]/,
  };
})(Prism);

(function (Prism) {
  // https://yaml.org/spec/1.2/spec.html#c-ns-anchor-property
  // https://yaml.org/spec/1.2/spec.html#c-ns-alias-node
  var anchorOrAlias = /[*&][^\s[\]{},]+/;
  // https://yaml.org/spec/1.2/spec.html#c-ns-tag-property
  var tag = /!(?:<[\w\-%#;/?:@&=+$,.!~*'()[\]]+>|(?:[a-zA-Z\d-]*!)?[\w\-%#;/?:@&=+$.~*'()]+)?/;
  // https://yaml.org/spec/1.2/spec.html#c-ns-properties(n,c)
  var properties =
    "(?:" +
    tag.source +
    "(?:[ \t]+" +
    anchorOrAlias.source +
    ")?|" +
    anchorOrAlias.source +
    "(?:[ \t]+" +
    tag.source +
    ")?)";

  /**
   *
   * @param {string} value
   * @param {string} [flags]
   * @returns {RegExp}
   */
  function createValuePattern(value, flags) {
    flags = (flags || "").replace(/m/g, "") + "m"; // add m flag
    var pattern = /([:\-,[{]\s*(?:\s<<prop>>[ \t]+)?)(?:<<value>>)(?=[ \t]*(?:$|,|]|}|\s*#))/.source
      .replace(/<<prop>>/g, function () {
        return properties;
      })
      .replace(/<<value>>/g, function () {
        return value;
      });
    return RegExp(pattern, flags);
  }

  Prism.languages.yaml = {
    scalar: {
      pattern: RegExp(
        /([\-:]\s*(?:\s<<prop>>[ \t]+)?[|>])[ \t]*(?:((?:\r?\n|\r)[ \t]+)[^\r\n]+(?:\2[^\r\n]+)*)/.source.replace(
          /<<prop>>/g,
          function () {
            return properties;
          }
        )
      ),
      lookbehind: true,
      alias: "string",
    },
    comment: /#.*/,
    key: {
      pattern: RegExp(
        /((?:^|[:\-,[{\r\n?])[ \t]*(?:<<prop>>[ \t]+)?)[^\r\n{[\]},#\s]+?(?=\s*:\s)/.source.replace(
          /<<prop>>/g,
          function () {
            return properties;
          }
        )
      ),
      lookbehind: true,
      alias: "atrule",
    },
    directive: {
      pattern: /(^[ \t]*)%.+/m,
      lookbehind: true,
      alias: "important",
    },
    datetime: {
      pattern: createValuePattern(
        /\d{4}-\d\d?-\d\d?(?:[tT]|[ \t]+)\d\d?:\d{2}:\d{2}(?:\.\d*)?[ \t]*(?:Z|[-+]\d\d?(?::\d{2})?)?|\d{4}-\d{2}-\d{2}|\d\d?:\d{2}(?::\d{2}(?:\.\d*)?)?/
          .source
      ),
      lookbehind: true,
      alias: "number",
    },
    boolean: {
      pattern: createValuePattern(/true|false/.source, "i"),
      lookbehind: true,
      alias: "important",
    },
    null: {
      pattern: createValuePattern(/null|~/.source, "i"),
      lookbehind: true,
      alias: "important",
    },
    string: {
      // \2 because of the lookbehind group
      pattern: createValuePattern(/("|')(?:(?!\2)[^\\\r\n]|\\.)*\2/.source),
      lookbehind: true,
      greedy: true,
    },
    number: {
      pattern: createValuePattern(
        /[+-]?(?:0x[\da-f]+|0o[0-7]+|(?:\d+\.?\d*|\.?\d+)(?:e[+-]?\d+)?|\.inf|\.nan)/
          .source,
        "i"
      ),
      lookbehind: true,
    },
    tag: tag,
    important: anchorOrAlias,
    punctuation: /---|[:[\]{}\-,|>?]|\.\.\./,
  };

  Prism.languages.yml = Prism.languages.yaml;
})(Prism);

(function () {
  if (
    typeof self === "undefined" ||
    !self.Prism ||
    !self.document ||
    !document.querySelector
  ) {
    return;
  }

  /**
   * @param {string} selector
   * @param {ParentNode} [container]
   * @returns {HTMLElement[]}
   */
  function $$(selector, container) {
    return Array.prototype.slice.call(
      (container || document).querySelectorAll(selector)
    );
  }

  /**
   * Returns whether the given element has the given class.
   *
   * @param {Element} element
   * @param {string} className
   * @returns {boolean}
   */
  function hasClass(element, className) {
    className = " " + className + " ";
    return (
      (" " + element.className + " ")
        .replace(/[\n\t]/g, " ")
        .indexOf(className) > -1
    );
  }

  /**
   * Calls the given function.
   *
   * @param {() => any} func
   * @returns {void}
   */
  function callFunction(func) {
    func();
  }

  // Some browsers round the line-height, others don't.
  // We need to test for it to position the elements properly.
  var isLineHeightRounded = (function () {
    var res;
    return function () {
      if (typeof res === "undefined") {
        var d = document.createElement("div");
        d.style.fontSize = "13px";
        d.style.lineHeight = "1.5";
        d.style.padding = "0";
        d.style.border = "0";
        d.innerHTML = "&nbsp;<br />&nbsp;";
        document.body.appendChild(d);
        // Browsers that round the line-height should have offsetHeight === 38
        // The others should have 39.
        res = d.offsetHeight === 38;
        document.body.removeChild(d);
      }
      return res;
    };
  })();

  /**
   * Highlights the lines of the given pre.
   *
   * This function is split into a DOM measuring and mutate phase to improve performance.
   * The returned function mutates the DOM when called.
   *
   * @param {HTMLElement} pre
   * @param {string} [lines]
   * @param {string} [classes='']
   * @returns {() => void}
   */
  function highlightLines(pre, lines, classes) {
    lines = typeof lines === "string" ? lines : pre.getAttribute("data-line");

    var ranges = lines.replace(/\s+/g, "").split(",").filter(Boolean);
    var offset = +pre.getAttribute("data-line-offset") || 0;

    var parseMethod = isLineHeightRounded() ? parseInt : parseFloat;
    var lineHeight = parseMethod(getComputedStyle(pre).lineHeight);
    var hasLineNumbers = hasClass(pre, "line-numbers");
    var parentElement = hasLineNumbers ? pre : pre.querySelector("code") || pre;
    var mutateActions = /** @type {(() => void)[]} */ ([]);

    ranges.forEach(function (currentRange) {
      var range = currentRange.split("-");

      var start = +range[0];
      var end = +range[1] || start;

      /** @type {HTMLElement} */
      var line =
        pre.querySelector(
          '.line-highlight[data-range="' + currentRange + '"]'
        ) || document.createElement("div");

      mutateActions.push(function () {
        line.setAttribute("aria-hidden", "true");
        line.setAttribute("data-range", currentRange);
        line.className = (classes || "") + " line-highlight";

        // Make line stretch to whole width
        line.style.width = pre.scrollWidth + "px";
      });

      // if the line-numbers plugin is enabled, then there is no reason for this plugin to display the line numbers
      if (hasLineNumbers && Prism.plugins.lineNumbers) {
        var startNode = Prism.plugins.lineNumbers.getLine(pre, start);
        var endNode = Prism.plugins.lineNumbers.getLine(pre, end);

        if (startNode) {
          var top = startNode.offsetTop + "px";
          mutateActions.push(function () {
            line.style.top = top;
          });
        }

        if (endNode) {
          var height =
            endNode.offsetTop -
            startNode.offsetTop +
            endNode.offsetHeight +
            "px";
          mutateActions.push(function () {
            line.style.height = height;
          });
        }
      } else {
        mutateActions.push(function () {
          line.setAttribute("data-start", start);

          if (end > start) {
            line.setAttribute("data-end", end);
          }

          line.style.top = (start - offset - 1) * lineHeight + "px";

          line.textContent = new Array(end - start + 2).join(" \n");
        });
      }

      mutateActions.push(function () {
        // allow this to play nicely with the line-numbers plugin
        // need to attack to pre as when line-numbers is enabled, the code tag is relatively which screws up the positioning
        parentElement.appendChild(line);
      });
    });

    var id = pre.id;
    if (hasLineNumbers && id) {
      // This implements linkable line numbers. Linkable line numbers use Line Highlight to create a link to a
      // specific line. For this to work, the pre element has to:
      //  1) have line numbers,
      //  2) have the `linkable-line-numbers` class or an ascendant that has that class, and
      //  3) have an id.

      var linkableLineNumbersClass = "linkable-line-numbers";
      var linkableLineNumbers = false;
      var node = pre;
      while (node) {
        if (hasClass(node, linkableLineNumbersClass)) {
          linkableLineNumbers = true;
          break;
        }
        node = node.parentElement;
      }

      if (linkableLineNumbers) {
        if (!hasClass(pre, linkableLineNumbersClass)) {
          // add class to pre
          mutateActions.push(function () {
            pre.className = (
              pre.className +
              " " +
              linkableLineNumbersClass
            ).trim();
          });
        }

        var start = parseInt(pre.getAttribute("data-start") || "1");

        // iterate all line number spans
        $$(".line-numbers-rows > span", pre).forEach(function (lineSpan, i) {
          var lineNumber = i + start;
          lineSpan.onclick = function () {
            var hash = id + "." + lineNumber;

            // this will prevent scrolling since the span is obviously in view
            scrollIntoView = false;
            location.hash = hash;
            setTimeout(function () {
              scrollIntoView = true;
            }, 1);
          };
        });
      }
    }

    return function () {
      mutateActions.forEach(callFunction);
    };
  }

  var scrollIntoView = true;
  function applyHash() {
    var hash = location.hash.slice(1);

    // Remove pre-existing temporary lines
    $$(".temporary.line-highlight").forEach(function (line) {
      line.parentNode.removeChild(line);
    });

    var range = (hash.match(/\.([\d,-]+)$/) || [, ""])[1];

    if (!range || document.getElementById(hash)) {
      return;
    }

    var id = hash.slice(0, hash.lastIndexOf(".")),
      pre = document.getElementById(id);

    if (!pre) {
      return;
    }

    if (!pre.hasAttribute("data-line")) {
      pre.setAttribute("data-line", "");
    }

    var mutateDom = highlightLines(pre, range, "temporary ");
    mutateDom();

    if (scrollIntoView) {
      document.querySelector(".temporary.line-highlight").scrollIntoView();
    }
  }

  var fakeTimer = 0; // Hack to limit the number of times applyHash() runs

  Prism.hooks.add("before-sanity-check", function (env) {
    var pre = env.element.parentNode;
    var lines = pre && pre.getAttribute("data-line");

    if (!pre || !lines || !/pre/i.test(pre.nodeName)) {
      return;
    }

    /*
     * Cleanup for other plugins (e.g. autoloader).
     *
     * Sometimes <code> blocks are highlighted multiple times. It is necessary
     * to cleanup any left-over tags, because the whitespace inside of the <div>
     * tags change the content of the <code> tag.
     */
    var num = 0;
    $$(".line-highlight", pre).forEach(function (line) {
      num += line.textContent.length;
      line.parentNode.removeChild(line);
    });
    // Remove extra whitespace
    if (num && /^( \n)+$/.test(env.code.slice(-num))) {
      env.code = env.code.slice(0, -num);
    }
  });

  Prism.hooks.add("complete", function completeHook(env) {
    var pre = env.element.parentNode;
    var lines = pre && pre.getAttribute("data-line");

    if (!pre || !lines || !/pre/i.test(pre.nodeName)) {
      return;
    }

    clearTimeout(fakeTimer);

    var hasLineNumbers = Prism.plugins.lineNumbers;
    var isLineNumbersLoaded = env.plugins && env.plugins.lineNumbers;

    if (
      hasClass(pre, "line-numbers") &&
      hasLineNumbers &&
      !isLineNumbersLoaded
    ) {
      Prism.hooks.add("line-numbers", completeHook);
    } else {
      var mutateDom = highlightLines(pre, lines);
      mutateDom();
      fakeTimer = setTimeout(applyHash, 1);
    }
  });

  window.addEventListener("hashchange", applyHash);
  window.addEventListener("resize", function () {
    var actions = $$("pre[data-line]").map(function (pre) {
      return highlightLines(pre);
    });
    actions.forEach(callFunction);
  });
})();

(function () {
  if (
    (typeof self !== "undefined" && !self.Prism) ||
    (typeof global !== "undefined" && !global.Prism)
  ) {
    return;
  }

  var url = /\b([a-z]{3,7}:\/\/|tel:)[\w\-+%~/.:=&@]+(?:\?[\w\-+%~/.:=?&!$'()*,;@]*)?(?:#[\w\-+%~/.:#=?&!$'()*,;@]*)?/,
    email = /\b\S+@[\w.]+[a-z]{2}/,
    linkMd = /\[([^\]]+)]\(([^)]+)\)/,
    // Tokens that may contain URLs and emails
    candidates = ["comment", "url", "attr-value", "string"];

  Prism.plugins.autolinker = {
    processGrammar: function (grammar) {
      // Abort if grammar has already been processed
      if (!grammar || grammar["url-link"]) {
        return;
      }
      Prism.languages.DFS(grammar, function (key, def, type) {
        if (candidates.indexOf(type) > -1 && !Array.isArray(def)) {
          if (!def.pattern) {
            def = this[key] = {
              pattern: def,
            };
          }

          def.inside = def.inside || {};

          if (type == "comment") {
            def.inside["md-link"] = linkMd;
          }
          if (type == "attr-value") {
            Prism.languages.insertBefore(
              "inside",
              "punctuation",
              { "url-link": url },
              def
            );
          } else {
            def.inside["url-link"] = url;
          }

          def.inside["email-link"] = email;
        }
      });
      grammar["url-link"] = url;
      grammar["email-link"] = email;
    },
  };

  Prism.hooks.add("before-highlight", function (env) {
    Prism.plugins.autolinker.processGrammar(env.grammar);
  });

  Prism.hooks.add("wrap", function (env) {
    if (/-link$/.test(env.type)) {
      env.tag = "a";

      var href = env.content;

      if (env.type == "email-link" && href.indexOf("mailto:") != 0) {
        href = "mailto:" + href;
      } else if (env.type == "md-link") {
        // Markdown
        var match = env.content.match(linkMd);

        href = match[2];
        env.content = match[1];
      }

      env.attributes.href = href;

      // Silently catch any error thrown by decodeURIComponent (#1186)
      try {
        env.content = decodeURIComponent(env.content);
      } catch (e) {}
    }
  });
})();

(function () {
  if (
    typeof self === "undefined" ||
    typeof Prism === "undefined" ||
    typeof document === "undefined"
  ) {
    return;
  }

  // Copied from the markup language definition
  var HTML_TAG = /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/g;

  // a regex to validate hexadecimal colors
  var HEX_COLOR = /^#?((?:[\da-f]){3,4}|(?:[\da-f]{2}){3,4})$/i;

  /**
   * Parses the given hexadecimal representation and returns the parsed RGBA color.
   *
   * If the format of the given string is invalid, `undefined` will be returned.
   * Valid formats are: `RGB`, `RGBA`, `RRGGBB`, and `RRGGBBAA`.
   *
   * Hexadecimal colors are parsed because they are not fully supported by older browsers, so converting them to
   * `rgba` functions improves browser compatibility.
   *
   * @param {string} hex
   * @returns {string | undefined}
   */
  function parseHexColor(hex) {
    var match = HEX_COLOR.exec(hex);
    if (!match) {
      return undefined;
    }
    hex = match[1]; // removes the leading "#"

    // the width and number of channels
    var channelWidth = hex.length >= 6 ? 2 : 1;
    var channelCount = hex.length / channelWidth;

    // the scale used to normalize 4bit and 8bit values
    var scale = channelWidth == 1 ? 1 / 15 : 1 / 255;

    // normalized RGBA channels
    var channels = [];
    for (var i = 0; i < channelCount; i++) {
      var int = parseInt(hex.substr(i * channelWidth, channelWidth), 16);
      channels.push(int * scale);
    }
    if (channelCount == 3) {
      channels.push(1); // add alpha of 100%
    }

    // output
    var rgb = channels
      .slice(0, 3)
      .map(function (x) {
        return String(Math.round(x * 255));
      })
      .join(",");
    var alpha = String(Number(channels[3].toFixed(3))); // easy way to round 3 decimal places

    return "rgba(" + rgb + "," + alpha + ")";
  }

  /**
   * Validates the given Color using the current browser's internal implementation.
   *
   * @param {string} color
   * @returns {string | undefined}
   */
  function validateColor(color) {
    var s = new Option().style;
    s.color = color;
    return s.color ? color : undefined;
  }

  /**
   * An array of function which parse a given string representation of a color.
   *
   * These parser serve as validators and as a layer of compatibility to support color formats which the browser
   * might not support natively.
   *
   * @type {((value: string) => (string|undefined))[]}
   */
  var parsers = [parseHexColor, validateColor];

  Prism.hooks.add("wrap", function (env) {
    if (env.type === "color" || env.classes.indexOf("color") >= 0) {
      var content = env.content;

      // remove all HTML tags inside
      var rawText = content.split(HTML_TAG).join("");

      var color;
      for (var i = 0, l = parsers.length; i < l && !color; i++) {
        color = parsers[i](rawText);
      }

      if (!color) {
        return;
      }

      var previewElement =
        '<span class="inline-color-wrapper"><span class="inline-color" style="background-color:' +
        color +
        ';"></span></span>';
      env.content = previewElement + content;
    }
  });
})();

(function () {
  if (typeof self === "undefined" || !self.Prism || !self.document) {
    return;
  }

  var CLASS_PATTERN = /(?:^|\s)command-line(?:\s|$)/;
  var PROMPT_CLASS = "command-line-prompt";

  /** @type {(str: string, prefix: string) => boolean} */
  var startsWith = "".startsWith
    ? function (s, p) {
        return s.startsWith(p);
      }
    : function (s, p) {
        return s.indexOf(p) === 0;
      };

  /**
   * Repeats the given string some number of times.
   *
   * This is just a polyfill for `String.prototype.repeat`.
   *
   * @param {string} str
   * @param {number} times
   * @returns {string}
   */
  function repeat(str, times) {
    var s = "";
    for (var i = 0; i < times; i++) {
      s += str;
    }
    return s;
  }

  /**
   * Returns the command line info object from the given hook environment.
   *
   * @param {any} env
   * @returns {CommandLineInfo}
   *
   * @typedef CommandLineInfo
   * @property {boolean} [complete]
   * @property {number} [numberOfLines]
   * @property {string[]} [outputLines]
   */
  function getCommandLineInfo(env) {
    var vars = (env.vars = env.vars || {});
    return (vars["command-line"] = vars["command-line"] || {});
  }

  Prism.hooks.add("before-highlight", function (env) {
    var commandLine = getCommandLineInfo(env);

    if (commandLine.complete || !env.code) {
      commandLine.complete = true;
      return;
    }

    // Works only for <code> wrapped inside <pre> (not inline).
    var pre = env.element.parentElement;
    if (
      !pre ||
      !/pre/i.test(pre.nodeName) || // Abort only if neither the <pre> nor the <code> have the class
      (!CLASS_PATTERN.test(pre.className) &&
        !CLASS_PATTERN.test(env.element.className))
    ) {
      commandLine.complete = true;
      return;
    }

    // The element might be highlighted multiple times, so we just remove the previous prompt
    var existingPrompt = env.element.querySelector("." + PROMPT_CLASS);
    if (existingPrompt) {
      existingPrompt.remove();
    }

    var codeLines = env.code.split("\n");
    commandLine.numberOfLines = codeLines.length;
    /** @type {string[]} */
    var outputLines = (commandLine.outputLines = []);

    var outputSections = pre.getAttribute("data-output");
    var outputFilter = pre.getAttribute("data-filter-output");
    if (outputSections !== null) {
      // The user specified the output lines. -- cwells
      outputSections.split(",").forEach(function (section) {
        var range = section.split("-");
        var outputStart = parseInt(range[0], 10);
        var outputEnd =
          range.length === 2 ? parseInt(range[1], 10) : outputStart;

        if (!isNaN(outputStart) && !isNaN(outputEnd)) {
          if (outputStart < 1) {
            outputStart = 1;
          }
          if (outputEnd > codeLines.length) {
            outputEnd = codeLines.length;
          }
          // Convert start and end to 0-based to simplify the arrays. -- cwells
          outputStart--;
          outputEnd--;
          // Save the output line in an array and clear it in the code so it's not highlighted. -- cwells
          for (var j = outputStart; j <= outputEnd; j++) {
            outputLines[j] = codeLines[j];
            codeLines[j] = "";
          }
        }
      });
    } else if (outputFilter) {
      // Treat lines beginning with this string as output. -- cwells
      for (var i = 0; i < codeLines.length; i++) {
        if (startsWith(codeLines[i], outputFilter)) {
          // This line is output. -- cwells
          outputLines[i] = codeLines[i].slice(outputFilter.length);
          codeLines[i] = "";
        }
      }
    }

    env.code = codeLines.join("\n");
  });

  Prism.hooks.add("before-insert", function (env) {
    var commandLine = getCommandLineInfo(env);

    if (commandLine.complete) {
      return;
    }

    // Reinsert the output lines into the highlighted code. -- cwells
    var codeLines = env.highlightedCode.split("\n");
    var outputLines = commandLine.outputLines || [];
    for (var i = 0, l = outputLines.length; i < l; i++) {
      if (outputLines.hasOwnProperty(i)) {
        codeLines[i] = outputLines[i];
      }
    }
    env.highlightedCode = codeLines.join("\n");
  });

  Prism.hooks.add("complete", function (env) {
    var commandLine = getCommandLineInfo(env);

    if (commandLine.complete) {
      return;
    }

    var pre = env.element.parentElement;
    if (CLASS_PATTERN.test(env.element.className)) {
      // Remove the class "command-line" from the <code>
      env.element.className = env.element.className.replace(CLASS_PATTERN, " ");
    }
    if (!CLASS_PATTERN.test(pre.className)) {
      // Add the class "command-line" to the <pre>
      pre.className += " command-line";
    }

    function getAttribute(key, defaultValue) {
      return (pre.getAttribute(key) || defaultValue).replace(/"/g, "&quot");
    }

    // Create the "rows" that will become the command-line prompts. -- cwells
    var promptLines;
    var rowCount = commandLine.numberOfLines || 0;
    var promptText = getAttribute("data-prompt", "");
    if (promptText !== "") {
      promptLines = repeat(
        '<span data-prompt="' + promptText + '"></span>',
        rowCount
      );
    } else {
      var user = getAttribute("data-user", "user");
      var host = getAttribute("data-host", "localhost");
      promptLines = repeat(
        '<span data-user="' + user + '" data-host="' + host + '"></span>',
        rowCount
      );
    }

    // Create the wrapper element. -- cwells
    var prompt = document.createElement("span");
    prompt.className = PROMPT_CLASS;
    prompt.innerHTML = promptLines;

    // Remove the prompt from the output lines. -- cwells
    var outputLines = commandLine.outputLines || [];
    for (var i = 0, l = outputLines.length; i < l; i++) {
      if (outputLines.hasOwnProperty(i)) {
        var node = prompt.children[i];
        node.removeAttribute("data-user");
        node.removeAttribute("data-host");
        node.removeAttribute("data-prompt");
      }
    }

    env.element.insertBefore(prompt, env.element.firstChild);
    commandLine.complete = true;
  });
})();

(function () {
  var assign =
    Object.assign ||
    function (obj1, obj2) {
      for (var name in obj2) {
        if (obj2.hasOwnProperty(name)) obj1[name] = obj2[name];
      }
      return obj1;
    };

  function NormalizeWhitespace(defaults) {
    this.defaults = assign({}, defaults);
  }

  function toCamelCase(value) {
    return value.replace(/-(\w)/g, function (match, firstChar) {
      return firstChar.toUpperCase();
    });
  }

  function tabLen(str) {
    var res = 0;
    for (var i = 0; i < str.length; ++i) {
      if (str.charCodeAt(i) == "\t".charCodeAt(0)) res += 3;
    }
    return str.length + res;
  }

  NormalizeWhitespace.prototype = {
    setDefaults: function (defaults) {
      this.defaults = assign(this.defaults, defaults);
    },
    normalize: function (input, settings) {
      settings = assign(this.defaults, settings);

      for (var name in settings) {
        var methodName = toCamelCase(name);
        if (
          name !== "normalize" &&
          methodName !== "setDefaults" &&
          settings[name] &&
          this[methodName]
        ) {
          input = this[methodName].call(this, input, settings[name]);
        }
      }

      return input;
    },

    /*
     * Normalization methods
     */
    leftTrim: function (input) {
      return input.replace(/^\s+/, "");
    },
    rightTrim: function (input) {
      return input.replace(/\s+$/, "");
    },
    tabsToSpaces: function (input, spaces) {
      spaces = spaces | 0 || 4;
      return input.replace(/\t/g, new Array(++spaces).join(" "));
    },
    spacesToTabs: function (input, spaces) {
      spaces = spaces | 0 || 4;
      return input.replace(RegExp(" {" + spaces + "}", "g"), "\t");
    },
    removeTrailing: function (input) {
      return input.replace(/\s*?$/gm, "");
    },
    // Support for deprecated plugin remove-initial-line-feed
    removeInitialLineFeed: function (input) {
      return input.replace(/^(?:\r?\n|\r)/, "");
    },
    removeIndent: function (input) {
      var indents = input.match(/^[^\S\n\r]*(?=\S)/gm);

      if (!indents || !indents[0].length) return input;

      indents.sort(function (a, b) {
        return a.length - b.length;
      });

      if (!indents[0].length) return input;

      return input.replace(RegExp("^" + indents[0], "gm"), "");
    },
    indent: function (input, tabs) {
      return input.replace(
        /^[^\S\n\r]*(?=\S)/gm,
        new Array(++tabs).join("\t") + "$&"
      );
    },
    breakLines: function (input, characters) {
      characters = characters === true ? 80 : characters | 0 || 80;

      var lines = input.split("\n");
      for (var i = 0; i < lines.length; ++i) {
        if (tabLen(lines[i]) <= characters) continue;

        var line = lines[i].split(/(\s+)/g),
          len = 0;

        for (var j = 0; j < line.length; ++j) {
          var tl = tabLen(line[j]);
          len += tl;
          if (len > characters) {
            line[j] = "\n" + line[j];
            len = tl;
          }
        }
        lines[i] = line.join("");
      }
      return lines.join("\n");
    },
  };

  // Support node modules
  if (typeof module !== "undefined" && module.exports) {
    module.exports = NormalizeWhitespace;
  }

  // Exit if prism is not loaded
  if (typeof Prism === "undefined") {
    return;
  }

  Prism.plugins.NormalizeWhitespace = new NormalizeWhitespace({
    "remove-trailing": true,
    "remove-indent": true,
    "left-trim": true,
    "right-trim": true,
    /*'break-lines': 80,
    'indent': 2,
    'remove-initial-line-feed': false,
    'tabs-to-spaces': 4,
    'spaces-to-tabs': 4*/
  });

  Prism.hooks.add("before-sanity-check", function (env) {
    var Normalizer = Prism.plugins.NormalizeWhitespace;

    // Check settings
    if (env.settings && env.settings["whitespace-normalization"] === false) {
      return;
    }

    // Check classes
    if (!Prism.util.isActive(env.element, "whitespace-normalization", true)) {
      return;
    }

    // Simple mode if there is no env.element
    if ((!env.element || !env.element.parentNode) && env.code) {
      env.code = Normalizer.normalize(env.code, env.settings);
      return;
    }

    // Normal mode
    var pre = env.element.parentNode;
    if (!env.code || !pre || pre.nodeName.toLowerCase() !== "pre") {
      return;
    }

    var children = pre.childNodes,
      before = "",
      after = "",
      codeFound = false;

    // Move surrounding whitespace from the <pre> tag into the <code> tag
    for (var i = 0; i < children.length; ++i) {
      var node = children[i];

      if (node == env.element) {
        codeFound = true;
      } else if (node.nodeName === "#text") {
        if (codeFound) {
          after += node.nodeValue;
        } else {
          before += node.nodeValue;
        }

        pre.removeChild(node);
        --i;
      }
    }

    if (!env.element.children.length || !Prism.plugins.KeepMarkup) {
      env.code = before + env.code + after;
      env.code = Normalizer.normalize(env.code, env.settings);
    } else {
      // Preserve markup for keep-markup plugin
      var html = before + env.element.innerHTML + after;
      env.element.innerHTML = Normalizer.normalize(html, env.settings);
      env.code = env.element.textContent;
    }
  });
})();

(function () {
  if (typeof self === "undefined" || !self.Prism || !self.document) {
    return;
  }

  var callbacks = [];
  var map = {};
  var noop = function () {};

  Prism.plugins.toolbar = {};

  /**
   * @typedef ButtonOptions
   * @property {string} text The text displayed.
   * @property {string} [url] The URL of the link which will be created.
   * @property {Function} [onClick] The event listener for the `click` event of the created button.
   * @property {string} [className] The class attribute to include with element.
   */

  /**
   * Register a button callback with the toolbar.
   *
   * @param {string} key
   * @param {ButtonOptions|Function} opts
   */
  var registerButton = (Prism.plugins.toolbar.registerButton = function (
    key,
    opts
  ) {
    var callback;

    if (typeof opts === "function") {
      callback = opts;
    } else {
      callback = function (env) {
        var element;

        if (typeof opts.onClick === "function") {
          element = document.createElement("button");
          element.type = "button";
          element.addEventListener("click", function () {
            opts.onClick.call(this, env);
          });
        } else if (typeof opts.url === "string") {
          element = document.createElement("a");
          element.href = opts.url;
        } else {
          element = document.createElement("span");
        }

        if (opts.className) {
          element.classList.add(opts.className);
        }

        element.textContent = opts.text;

        return element;
      };
    }

    if (key in map) {
      console.warn(
        'There is a button with the key "' + key + '" registered already.'
      );
      return;
    }

    callbacks.push((map[key] = callback));
  });

  /**
   * Returns the callback order of the given element.
   *
   * @param {HTMLElement} element
   * @returns {string[] | undefined}
   */
  function getOrder(element) {
    while (element) {
      var order = element.getAttribute("data-toolbar-order");
      if (order != null) {
        order = order.trim();
        if (order.length) {
          return order.split(/\s*,\s*/g);
        } else {
          return [];
        }
      }
      element = element.parentElement;
    }
  }

  /**
   * Post-highlight Prism hook callback.
   *
   * @param env
   */
  var hook = (Prism.plugins.toolbar.hook = function (env) {
    // Check if inline or actual code block (credit to line-numbers plugin)
    var pre = env.element.parentNode;
    if (!pre || !/pre/i.test(pre.nodeName)) {
      return;
    }

    // Autoloader rehighlights, so only do this once.
    if (pre.parentNode.classList.contains("code-toolbar")) {
      return;
    }

    // Create wrapper for <pre> to prevent scrolling toolbar with content
    var wrapper = document.createElement("div");
    wrapper.classList.add("code-toolbar");
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    // Setup the toolbar
    var toolbar = document.createElement("div");
    toolbar.classList.add("toolbar");

    // order callbacks
    var elementCallbacks = callbacks;
    var order = getOrder(env.element);
    if (order) {
      elementCallbacks = order.map(function (key) {
        return map[key] || noop;
      });
    }

    elementCallbacks.forEach(function (callback) {
      var element = callback(env);

      if (!element) {
        return;
      }

      var item = document.createElement("div");
      item.classList.add("toolbar-item");

      item.appendChild(element);
      toolbar.appendChild(item);
    });

    // Add our toolbar to the currently created wrapper of <pre> tag
    wrapper.appendChild(toolbar);
  });

  registerButton("label", function (env) {
    var pre = env.element.parentNode;
    if (!pre || !/pre/i.test(pre.nodeName)) {
      return;
    }

    if (!pre.hasAttribute("data-label")) {
      return;
    }

    var element, template;
    var text = pre.getAttribute("data-label");
    try {
      // Any normal text will blow up this selector.
      template = document.querySelector("template#" + text);
    } catch (e) {}

    if (template) {
      element = template.content;
    } else {
      if (pre.hasAttribute("data-url")) {
        element = document.createElement("a");
        element.href = pre.getAttribute("data-url");
      } else {
        element = document.createElement("span");
      }

      element.textContent = text;
    }

    return element;
  });

  /**
   * Register the toolbar with Prism.
   */
  Prism.hooks.add("complete", hook);
})();

(function () {
  if (typeof self === "undefined" || !self.Prism || !self.document) {
    return;
  }

  if (!Prism.plugins.toolbar) {
    console.warn("Copy to Clipboard plugin loaded before Toolbar plugin.");

    return;
  }

  var ClipboardJS = window.ClipboardJS || undefined;

  if (!ClipboardJS && typeof require === "function") {
    ClipboardJS = require("clipboard");
  }

  var callbacks = [];

  if (!ClipboardJS) {
    var script = document.createElement("script");
    var head = document.querySelector("head");

    script.onload = function () {
      ClipboardJS = window.ClipboardJS;

      if (ClipboardJS) {
        while (callbacks.length) {
          callbacks.pop()();
        }
      }
    };

    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/2.0.0/clipboard.min.js";
    head.appendChild(script);
  }

  Prism.plugins.toolbar.registerButton("copy-to-clipboard", function (env) {
    var linkCopy = document.createElement("button");
    linkCopy.textContent = "Copy";

    var element = env.element;

    if (!ClipboardJS) {
      callbacks.push(registerClipboard);
    } else {
      registerClipboard();
    }

    return linkCopy;

    function registerClipboard() {
      var clip = new ClipboardJS(linkCopy, {
        text: function () {
          return element.textContent;
        },
      });

      clip.on("success", function () {
        linkCopy.textContent = "Copied!";

        resetText();
      });
      clip.on("error", function () {
        linkCopy.textContent = "Press Ctrl+C to copy";

        resetText();
      });
    }

    function resetText() {
      setTimeout(function () {
        linkCopy.textContent = "Copy";
      }, 5000);
    }
  });
})();

(function () {
  if (typeof Prism === "undefined" || !Prism.languages["diff"]) {
    return;
  }

  var LANGUAGE_REGEX = /diff-([\w-]+)/i;
  var HTML_TAG = /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/gi;
  //this will match a line plus the line break while ignoring the line breaks HTML tags may contain.
  var HTML_LINE = RegExp(
    /(?:__|[^\r\n<])*(?:\r\n?|\n|(?:__|[^\r\n<])(?![^\r\n]))/.source.replace(
      /__/g,
      function () {
        return HTML_TAG.source;
      }
    ),
    "gi"
  );

  var PREFIXES = Prism.languages.diff.PREFIXES;

  Prism.hooks.add("before-sanity-check", function (env) {
    var lang = env.language;
    if (LANGUAGE_REGEX.test(lang) && !env.grammar) {
      env.grammar = Prism.languages[lang] = Prism.languages["diff"];
    }
  });
  Prism.hooks.add("before-tokenize", function (env) {
    var lang = env.language;
    if (LANGUAGE_REGEX.test(lang) && !Prism.languages[lang]) {
      Prism.languages[lang] = Prism.languages["diff"];
    }
  });

  Prism.hooks.add("wrap", function (env) {
    var diffLanguage, diffGrammar;

    if (env.language !== "diff") {
      var langMatch = LANGUAGE_REGEX.exec(env.language);
      if (!langMatch) {
        return; // not a language specific diff
      }

      diffLanguage = langMatch[1];
      diffGrammar = Prism.languages[diffLanguage];
    }

    // one of the diff tokens without any nested tokens
    if (env.type in PREFIXES) {
      /** @type {string} */
      var content = env.content.replace(HTML_TAG, ""); // remove all HTML tags

      /** @type {string} */
      var decoded = content.replace(/&lt;/g, "<").replace(/&amp;/g, "&");

      // remove any one-character prefix
      var code = decoded.replace(/(^|[\r\n])./g, "$1");

      // highlight, if possible
      var highlighted;
      if (diffGrammar) {
        highlighted = Prism.highlight(code, diffGrammar, diffLanguage);
      } else {
        highlighted = Prism.util.encode(code);
      }

      // get the HTML source of the prefix token
      var prefixToken = new Prism.Token("prefix", PREFIXES[env.type], [
        /\w+/.exec(env.type)[0],
      ]);
      var prefix = Prism.Token.stringify(prefixToken, env.language);

      // add prefix
      var lines = [],
        m;
      HTML_LINE.lastIndex = 0;
      while ((m = HTML_LINE.exec(highlighted))) {
        lines.push(prefix + m[0]);
      }
      if (/(?:^|[\r\n]).$/.test(decoded)) {
        // because both "+a\n+" and "+a\n" will map to "a\n" after the line prefixes are removed
        lines.push(prefix);
      }
      env.content = lines.join("");

      if (diffGrammar) {
        env.classes.push("language-" + diffLanguage);
      }
    }
  });
})();

Prism.languages.treeview = {
  "treeview-part": {
    pattern: /^.+/m,
    inside: {
      "entry-line": [
        {
          pattern: /\|-- |├── /,
          alias: "line-h",
        },
        {
          pattern: /\|   |│   /,
          alias: "line-v",
        },
        {
          pattern: /`-- |└── /,
          alias: "line-v-last",
        },
        {
          pattern: / {4}/,
          alias: "line-v-gap",
        },
      ],
      "entry-name": {
        pattern: /.*\S.*/,
        inside: {
          // symlink
          operator: / -> /,
        },
      },
    },
  },
};

Prism.hooks.add("wrap", function (env) {
  if (env.language === "treeview" && env.type === "entry-name") {
    var classes = env.classes;

    var folderPattern = /(^|[^\\])\/\s*$/;
    if (folderPattern.test(env.content)) {
      // folder

      // remove trailing /
      env.content = env.content.replace(folderPattern, "$1");
      classes.push("dir");
    } else {
      // file

      // remove trailing file marker
      env.content = env.content.replace(/(^|[^\\])[=*|]\s*$/, "$1");

      var parts = env.content.toLowerCase().replace(/\s+/g, "").split(".");
      while (parts.length > 1) {
        parts.shift();
        // Ex. 'foo.min.js' would become '<span class="token keyword ext-min-js ext-js">foo.min.js</span>'
        classes.push("ext-" + parts.join("-"));
      }
    }

    if (env.content[0] === ".") {
      classes.push("dotfile");
    }
  }
});