(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD.
        define(['react'], factory);
    } else {
        // Browser globals
        root.ReactBootstrap = factory(root.React);
    }
}(this, function (React) {



/**
 * almond 0.1.2 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var defined = {},
        waiting = {},
        config = {},
        defining = {},
        aps = [].slice,
        main, req;

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {},
            nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part;

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; (part = name[i]); i++) {
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            return true;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (waiting.hasOwnProperty(name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!defined.hasOwnProperty(name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    function makeMap(name, relName) {
        var prefix, plugin,
            index = name.indexOf('!');

        if (index !== -1) {
            prefix = normalize(name.slice(0, index), relName);
            name = name.slice(index + 1);
            plugin = callDep(prefix);

            //Normalize according
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            p: plugin
        };
    }

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    main = function (name, deps, callback, relName) {
        var args = [],
            usingExports,
            cjsModule, depName, ret, map, i;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i++) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = makeRequire(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = defined[name] = {};
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = {
                        id: name,
                        uri: '',
                        exports: defined[name],
                        config: makeConfig(name)
                    };
                } else if (defined.hasOwnProperty(depName) || waiting.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else if (!defining[depName]) {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                    cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync) {
        if (typeof deps === "string") {
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        waiting[name] = [name, deps, callback];
    };

    define.amd = {
        jQuery: true
    };
}());

define("almond", function(){});

define(
  '../amd/transpiled/react-es6',["exports", "react"],
  function(__exports__, React) {
    
    __exports__["default"] = React;
  });
define(
  '../amd/transpiled/react-es6/lib/cx',["exports"],
  function(__exports__) {
    
    /**
     * Copyright 2013 Facebook, Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     *
     * @providesModule cx
     */

    /**
     * This function is used to mark string literals representing CSS class names
     * so that they can be transformed statically. This allows for modularization
     * and minification of CSS class names.
     *
     * In static_upstream, this function is actually implemented, but it should
     * eventually be replaced with something more descriptive, and the transform
     * that is used in the main stack should be ported for use elsewhere.
     *
     * @param string|object className to modularize, or an object of key/values.
     *                      In the object case, the values are conditions that
     *                      determine if the className keys should be included.
     * @param [string ...]  Variable list of classNames in the string case.
     * @return string       Renderable space-separated CSS className.
     */
    function cx (classNames) {
      if (typeof classNames == 'object') {
        return Object.keys(classNames).map(function(className) {
          return classNames[className] ? className : '';
        }).join(' ');
      } else {
        return Array.prototype.join.call(arguments, ' ');
      }
    }

    __exports__["default"] = cx;
  });
define(
  '../amd/transpiled/constants',["exports"],
  function(__exports__) {
    
    __exports__["default"] = {
        CLASSES: {
            'column': 'col',
            'button': 'btn',
            'button-group': 'btn-group',
            'button-toolbar': 'btn-toolbar',
            'label': 'label',
            'alert': 'alert',
            'input-group': 'input-group',
            'form': 'form',
            'panel': 'panel',
            'panel-group': 'panel-group',
            'progress-bar': 'progress-bar',
            'nav': 'nav',
            'modal': 'modal'
        },
        STYLES: {
            'default': 'default',
            'primary': 'primary',
            'success': 'success',
            'info': 'info',
            'warning': 'warning',
            'danger': 'danger',
            'link': 'link',
            'inline': 'inline',
            'tabs': 'tabs',
            'pills': 'pills'
        },
        SIZES: {
            'large': 'lg',
            'medium': 'md',
            'small': 'sm',
            'xsmall': 'xs'
        }
    };
  });
define(
  '../amd/transpiled/BootstrapMixin',["./react-es6","./constants","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    var React = __dependency1__["default"];
    var constants = __dependency2__["default"];

    var BootstrapMixin = {
      propTypes: {
        bsClass: React.PropTypes.oneOf(Object.keys(constants.CLASSES)),
        bsStyle: React.PropTypes.oneOf(Object.keys(constants.STYLES)),
        bsSize: React.PropTypes.oneOf(Object.keys(constants.SIZES)),
        bsVariation: React.PropTypes.string
      },

      getBsClassSet: function () {
        var classes = {};

        var bsClass = this.props.bsClass && constants.CLASSES[this.props.bsClass];
        if (bsClass) {
          classes[bsClass] = true;

          var prefix = bsClass + '-';

          var bsSize = this.props.bsSize && constants.SIZES[this.props.bsSize];
          if (bsSize) {
            classes[prefix + bsSize] = true;
          }

          var bsStyle = this.props.bsStyle && constants.STYLES[this.props.bsStyle];
          if (this.props.bsStyle) {
            classes[prefix + bsStyle] = true;
          }

          if (this.props.bsVariation) {
            classes[prefix + this.props.bsVariation] = true;
          }
        }

        return classes;
      }
    };

    __exports__["default"] = BootstrapMixin;
  });
define(
  '../amd/transpiled/react-es6/lib/copyProperties',["exports"],
  function(__exports__) {
    
    /**
     * Copyright 2013 Facebook, Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     *
     * @providesModule copyProperties
     */

    /**
     * Copy properties from one or more objects (up to 5) into the first object.
     * This is a shallow copy. It mutates the first object and also returns it.
     *
     * NOTE: `arguments` has a very significant performance penalty, which is why
     * we don't support unlimited arguments.
     */
    function copyProperties(obj, a, b, c, d, e, f) {
      obj = obj || {};

      var args = [a, b, c, d, e];
      var ii = 0, v;
      while (args[ii]) {
        v = args[ii++];
        for (var k in v) {
          obj[k] = v[k];
        }

        // IE ignores toString in object iteration.. See:
        // webreflection.blogspot.com/2007/07/quick-fix-internet-explorer-and.html
        if (v.hasOwnProperty && v.hasOwnProperty('toString') &&
            (typeof v.toString != 'undefined') && (obj.toString !== v.toString)) {
          obj.toString = v.toString;
        }
      }

      return obj;
    }

    __exports__["default"] = copyProperties;
  });
define(
  '../amd/transpiled/react-es6/lib/emptyFunction',["./copyProperties","exports"],
  function(__dependency1__, __exports__) {
    
    /**
     * Copyright 2013 Facebook, Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     *
     * @providesModule emptyFunction
     */

    var copyProperties = __dependency1__["default"];

    function makeEmptyFunction (arg) {
      return function () {
        return arg;
      };
    }

    /**
     * This function accepts and discards inputs; it has no side effects. This is
     * primarily useful idiomatically for overridable function endpoints which
     * always need to be callable, since JS lacks a null-call idiom ala Cocoa.
     */
    function emptyFunction () {}

    copyProperties(emptyFunction, {
      thatReturns: makeEmptyFunction,
      thatReturnsFalse: makeEmptyFunction(false),
      thatReturnsTrue: makeEmptyFunction(true),
      thatReturnsNull: makeEmptyFunction(null),
      thatReturnsThis: function() { return this; },
      thatReturnsArgument: function(arg) { return arg; }
    });

    __exports__["default"] = emptyFunction;
  });
define(
  '../amd/transpiled/react-es6/lib/invariant',["exports"],
  function(__exports__) {
    
    /**
     * Copyright 2013 Facebook, Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     *
     * @providesModule invariant
     */

    /**
     * Use invariant() to assert state which your program assumes to be true.
     *
     * Provide sprintf-style format (only %s is supported) and arguments
     * to provide information about what broke and what you were
     * expecting.
     *
     * The invariant message will be stripped in production, but the invariant
     * will remain to ensure logic does not differ in production.
     */

    function invariant (condition) {
      if (!condition) {
        var error = new Error('Invariant Violation');
        error.framesToPop = 1;
        throw error;
      }
    }

    __exports__["default"] = invariant;
  });
define(
  '../amd/transpiled/react-es6/lib/joinClasses',["exports"],
  function(__exports__) {
    
    /**
     * Copyright 2013 Facebook, Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     *
     * @providesModule joinClasses
     * @typechecks static-only
     */

    

    /**
     * Combines multiple className strings into one.
     * http://jsperf.com/joinclasses-args-vs-array
     *
     * @param {...?string} classes
     * @return {string}
     */
    function joinClasses (className/*, ... */) {
      if (!className) {
        className = '';
      }
      var nextClass;
      var argLength = arguments.length;
      if (argLength > 1) {
        for (var ii = 1; ii < argLength; ii++) {
          nextClass = arguments[ii];
          nextClass && (className += ' ' + nextClass);
        }
      }
      return className;
    }

    __exports__["default"] = joinClasses;
  });
define(
  '../amd/transpiled/react-es6/lib/keyMirror',["./invariant","exports"],
  function(__dependency1__, __exports__) {
    
    /**
     * Copyright 2013 Facebook, Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     *
     * @providesModule keyMirror
     * @typechecks static-only
     */

    

    var invariant = __dependency1__["default"];

    /**
     * Constructs an enumeration with keys equal to their value.
     *
     * For example:
     *
     *   var COLORS = keyMirror({blue: null, red: null});
     *   var myColor = COLORS.blue;
     *   var isColorValid = !!COLORS[myColor];
     *
     * The last line could not be performed if the values of the generated enum were
     * not equal to their keys.
     *
     *   Input:  {key1: val1, key2: val2}
     *   Output: {key1: key1, key2: key2}
     *
     * @param {object} obj
     * @return {object}
     */
    var keyMirror = function(obj) {
      var ret = {};
      var key;
      (invariant(obj instanceof Object && !Array.isArray(obj)));
      for (key in obj) {
        if (!obj.hasOwnProperty(key)) {
          continue;
        }
        ret[key] = key;
      }
      return ret;
    };

    __exports__["default"] = keyMirror;
  });
define(
  '../amd/transpiled/react-es6/lib/mergeHelpers',["./invariant","./keyMirror","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    /**
     * Copyright 2013 Facebook, Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     *
     * @providesModule mergeHelpers
     *
     * requiresPolyfills: Array.isArray
     */

    

    var invariant = __dependency1__["default"];
    var keyMirror = __dependency2__["default"];

    /**
     * Maximum number of levels to traverse. Will catch circular structures.
     * @const
     */
    var MAX_MERGE_DEPTH = 36;

    /**
     * We won't worry about edge cases like new String('x') or new Boolean(true).
     * Functions are considered terminals, and arrays are not.
     * @param {*} o The item/object/value to test.
     * @return {boolean} true iff the argument is a terminal.
     */
    var isTerminal = function (o) {
      return typeof o !== 'object' || o === null;
    };

    var mergeHelpers = {

      MAX_MERGE_DEPTH: MAX_MERGE_DEPTH,

      isTerminal: isTerminal,

      /**
       * Converts null/undefined values into empty object.
       *
       * @param {?Object=} arg Argument to be normalized (nullable optional)
       * @return {!Object}
       */
      normalizeMergeArg: function (arg) {
        return arg === undefined || arg === null ? {} : arg;
      },

      /**
       * If merging Arrays, a merge strategy *must* be supplied. If not, it is
       * likely the caller's fault. If this function is ever called with anything
       * but `one` and `two` being `Array`s, it is the fault of the merge utilities.
       *
       * @param {*} one Array to merge into.
       * @param {*} two Array to merge from.
       */
      checkMergeArrayArgs: function (one, two) {
        (invariant(Array.isArray(one) && Array.isArray(two)));
      },

      /**
       * @param {*} one Object to merge into.
       * @param {*} two Object to merge from.
       */
      checkMergeObjectArgs: function (one, two) {
        mergeHelpers.checkMergeObjectArg(one);
        mergeHelpers.checkMergeObjectArg(two);
      },

      /**
       * @param {*} arg
       */
      checkMergeObjectArg: function (arg) {
        (invariant(!isTerminal(arg) && !Array.isArray(arg)));
      },

      /**
       * Checks that a merge was not given a circular object or an object that had
       * too great of depth.
       *
       * @param {number} Level of recursion to validate against maximum.
       */
      checkMergeLevel: function (level) {
        (invariant(level < MAX_MERGE_DEPTH));
      },

      /**
       * Checks that the supplied merge strategy is valid.
       *
       * @param {string} Array merge strategy.
       */
      checkArrayStrategy: function (strategy) {
        (invariant(strategy === undefined || strategy in mergeHelpers.ArrayStrategies));
      },

      /**
       * Set of possible behaviors of merge algorithms when encountering two Arrays
       * that must be merged together.
       * - `clobber`: The left `Array` is ignored.
       * - `indexByIndex`: The result is achieved by recursively deep merging at
       *   each index. (not yet supported.)
       */
      ArrayStrategies: keyMirror({
        Clobber: true,
        IndexByIndex: true
      })

    };

    __exports__["default"] = mergeHelpers;
  });
define(
  '../amd/transpiled/react-es6/lib/mergeInto',["./mergeHelpers","exports"],
  function(__dependency1__, __exports__) {
    
    /**
     * Copyright 2013 Facebook, Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     *
     * @providesModule mergeInto
     * @typechecks static-only
     */

    

    var mergeHelpers = __dependency1__["default"];

    var checkMergeObjectArg = mergeHelpers.checkMergeObjectArg;

    /**
     * Shallow merges two structures by mutating the first parameter.
     *
     * @param {object} one Object to be merged into.
     * @param {?object} two Optional object with properties to merge from.
     */
    function mergeInto (one, two) {
      checkMergeObjectArg(one);
      if (two != null) {
        checkMergeObjectArg(two);
        for (var key in two) {
          if (!two.hasOwnProperty(key)) {
            continue;
          }
          one[key] = two[key];
        }
      }
    }

    __exports__["default"] = mergeInto;
  });
define(
  '../amd/transpiled/react-es6/lib/merge',["./mergeInto","exports"],
  function(__dependency1__, __exports__) {
    
    /**
     * Copyright 2013 Facebook, Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     *
     * @providesModule merge
     */

    

    var mergeInto = __dependency1__["default"];

    /**
     * Shallow merges two structures into a return value, without mutating either.
     *
     * @param {?object} one Optional object with properties to merge from.
     * @param {?object} two Optional object with properties to merge from.
     * @return {object} The shallow extension of one by two.
     */
    var merge = function (one, two) {
      var result = {};
      mergeInto(result, one);
      mergeInto(result, two);
      return result;
    };

    __exports__["default"] = merge;
  });
define(
  '../amd/transpiled/react-es6/lib/ReactPropTransferer',["./emptyFunction","./invariant","./joinClasses","./merge","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    
    /**
     * Copyright 2013 Facebook, Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     *
     * @providesModule ReactPropTransferer
     */

    

    var emptyFunction = __dependency1__["default"];
    var invariant = __dependency2__["default"];
    var joinClasses = __dependency3__["default"];
    var merge = __dependency4__["default"];

    /**
     * Creates a transfer strategy that will merge prop values using the supplied
     * `mergeStrategy`. If a prop was previously unset, this just sets it.
     *
     * @param {function} mergeStrategy
     * @return {function}
     */
    function createTransferStrategy (mergeStrategy) {
      return function (props, key, value) {
        if (!props.hasOwnProperty(key)) {
          props[key] = value;
        } else {
          props[key] = mergeStrategy(props[key], value);
        }
      };
    }

    /**
     * Transfer strategies dictate how props are transferred by `transferPropsTo`.
     */
    var TransferStrategies = {
      /**
       * Never transfer `children`.
       */
      children: emptyFunction,
      /**
       * Transfer the `className` prop by merging them.
       */
      className: createTransferStrategy(joinClasses),
      /**
       * Never transfer the `key` prop.
       */
      key: emptyFunction,
      /**
       * Never transfer the `ref` prop.
       */
      ref: emptyFunction,
      /**
       * Transfer the `style` prop (which is an object) by merging them.
       */
      style: createTransferStrategy(merge)
    };

    /**
     * ReactPropTransferer are capable of transferring props to another component
     * using a `transferPropsTo` method.
     *
     * @class ReactPropTransferer
     */
    var ReactPropTransferer = {

      TransferStrategies: TransferStrategies,

      /**
       * Merge two props objects using TransferStrategies.
       *
       * @param {object} oldProps original props (they take precedence)
       * @param {object} newProps new props to merge in
       * @return {object} a new object containing both sets of props merged.
       */
      mergeProps: function (oldProps, newProps) {
        var props = merge(oldProps);

        for (var thisKey in newProps) {
          if (!newProps.hasOwnProperty(thisKey)) {
            continue;
          }

          var transferStrategy = TransferStrategies[thisKey];

          if (transferStrategy) {
            transferStrategy(props, thisKey, newProps[thisKey]);
          } else if (!props.hasOwnProperty(thisKey)) {
            props[thisKey] = newProps[thisKey];
          }
        }

        return props;
      },

      /**
       * @lends {ReactPropTransferer.prototype}
       */
      Mixin: {

        /**
         * Transfer props from this component to a target component.
         *
         * Props that do not have an explicit transfer strategy will be transferred
         * only if the target component does not already have the prop set.
         *
         * This is usually used to pass down props to a returned root component.
         *
         * @param {ReactComponent} component Component receiving the properties.
         * @return {ReactComponent} The supplied `component`.
         * @final
         * @protected
         */
        transferPropsTo: function (component) {
          (invariant(component._owner === this));

          component.props = ReactPropTransferer.mergeProps(
            component.props,
            this.props
          );

          return component;
        }

      }
    };

    __exports__["default"] = ReactPropTransferer;
  });
define(
  '../amd/transpiled/react-es6/lib/keyOf',["exports"],
  function(__exports__) {
    
    /**
     * Allows extraction of a minified key. Let's the build system minify keys
     * without loosing the ability to dynamically use key strings as values
     * themselves. Pass in an object with a single key/val pair and it will return
     * you the string key of that single record. Suppose you want to grab the
     * value for a key 'className' inside of an object. Key/val minification may
     * have aliased that key to be 'xa12'. keyOf({className: null}) will return
     * 'xa12' in that case. Resolve keys you want to use once at startup time, then
     * reuse those resolutions.
     */
    var keyOf = function(oneKeyObj) {
      var key;
      for (key in oneKeyObj) {
        if (!oneKeyObj.hasOwnProperty(key)) {
          continue;
        }
        return key;
      }
      return null;
    };


    __exports__["default"] = keyOf;
  });
define(
  '../amd/transpiled/react-es6/lib/cloneWithProps',["./ReactPropTransferer","./keyOf","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    

    var ReactPropTransferer = __dependency1__["default"];

    var keyOf = __dependency2__["default"];

    var CHILDREN_PROP = keyOf({children: null});

    /**
     * Sometimes you want to change the props of a child passed to you. Usually
     * this is to add a CSS class.
     *
     * @param {object} child child component you'd like to clone
     * @param {object} props props you'd like to modify. They will be merged
     * as if you used `transferPropsTo()`.
     * @return {object} a clone of child with props merged in.
     */
    function cloneWithProps (child, props) {
      var newProps = ReactPropTransferer.mergeProps(props, child.props);

      // Use `child.props.children` if it is provided.
      if (!newProps.hasOwnProperty(CHILDREN_PROP) &&
          child.props.hasOwnProperty(CHILDREN_PROP)) {
        newProps.children = child.props.children;
      }

      return child.constructor.ConvenienceConstructor(newProps);
    }

    __exports__["default"] = cloneWithProps;
  });
define(
  '../amd/transpiled/utils',["./react-es6/lib/cloneWithProps","exports"],
  function(__dependency1__, __exports__) {
    
    var cloneWithProps = __dependency1__["default"];

    // From https://www.npmjs.org/package/extend
    var hasOwn = Object.prototype.hasOwnProperty;
    var toString = Object.prototype.toString;

    function isPlainObject(obj) {
      if (!obj || toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval)
        return false;

      var has_own_constructor = hasOwn.call(obj, 'constructor');
      var has_is_property_of_method = hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
      // Not own constructor property must be Object
      if (obj.constructor && !has_own_constructor && !has_is_property_of_method)
        return false;

      // Own properties are enumerated firstly, so to speed up,
      // if last one is own, then all properties are own.
      var key;
      for ( key in obj ) {}

      return key === undefined || hasOwn.call( obj, key );
    };

    __exports__["default"] = {

      /**
       * Modify each item in a React children array without
       * unnecessarily allocating a new array.
       *
       * @param {array|object} children
       * @param {function} modifier
       * @returns {*}
       */
      modifyChildren: function (children, modifier) {
        if (children == null) {
          return children;
        }

        return Array.isArray(children) ? children.map(modifier) : modifier(children, 0);
      },

      /**
       * Filter each item in a React children array without
       * unnecessarily allocating a new array.
       *
       * @param {array|object} children
       * @param {function} filter
       * @returns {*}
       */
      filterChildren: function (children, filter) {
        if (children == null) {
          return children;
        }

        if (Array.isArray(children)) {
          return children.filter(filter);
        } else {
          return filter(children, 0) ? children : null;
        }
      },


      /**
       * Safe chained function
       *
       * Will only create a new function if needed,
       * otherwise will pass back existing functions or null.
       *
       * @param {function} one
       * @param {function} two
       * @returns {function|null}
       */
      createChainedFunction: function (one, two) {
        var hasOne = typeof one === 'function';
        var hasTwo = typeof two === 'function';

        if (!hasOne && !hasTwo) { return null; }
        if (!hasOne) { return two; }
        if (!hasTwo) { return one; }

        return function chainedFunction() {
          one.apply(this, arguments);
          two.apply(this, arguments);
        };
      },

      /**
       * Sometimes you want to change the props of a child passed to you. Usually
       * this is to add a CSS class.
       *
       * @param {object} child child component you'd like to clone
       * @param {object} props props you'd like to modify. They will be merged
       * as if you used `transferPropsTo()`.
       * @return {object} a clone of child with props merged in.
       */
      cloneWithProps: function (child, props) {
        return cloneWithProps(child, props);
      },

      /**
       * From https://www.npmjs.org/package/extend
       * node-extend is a port of the classic extend() method from jQuery.
       * It behaves as you expect. It is simple, tried and true.
       *
       * Extend one object with one or more others, returning the modified object.
       * Keep in mind that the target object will be modified, and will be returned from extend().
       *
       * If a boolean true is specified as the first argument, extend performs a deep copy,
       * recursively copying any objects it finds. Otherwise, the copy will share structure
       * with the original object(s). Undefined properties are not copied. However, properties
       * inherited from the object's prototype will be copied over.
       *
       * @example
       * extend([deep], target, object1, [objectN])
       *
       * @return {object}
       */
      extend: function () {
        var options, name, src, copy, copyIsArray, clone,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false;

        // Handle a deep copy situation
        if ( typeof target === "boolean" ) {
          deep = target;
          target = arguments[1] || {};
          // skip the boolean and the target
          i = 2;
        }

        // Handle case when target is a string or something (possible in deep copy)
        if ( typeof target !== "object" && typeof target !== "function") {
          target = {};
        }

        for ( ; i < length; i++ ) {
          // Only deal with non-null/undefined values
          if ( (options = arguments[ i ]) != null ) {
            // Extend the base object
            for ( name in options ) {
              src = target[ name ];
              copy = options[ name ];

              // Prevent never-ending loop
              if ( target === copy ) {
                continue;
              }

              // Recurse if we're merging plain objects or arrays
              if ( deep && copy && ( isPlainObject(copy) || (copyIsArray = Array.isArray(copy)) ) ) {
                if ( copyIsArray ) {
                  copyIsArray = false;
                  clone = src && Array.isArray(src) ? src : [];

                } else {
                  clone = src && isPlainObject(src) ? src : {};
                }

                // Never move original objects, clone them
                target[ name ] = extend( deep, clone, copy );

              // Don't bring in undefined values
              } else if ( copy !== undefined ) {
                target[ name ] = copy;
              }
            }
          }
        }

        // Return the modified object
        return target;
      }
    };
  });
define(
  '../amd/transpiled/PanelGroup',["./react-es6","./react-es6/lib/cx","./BootstrapMixin","./utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    
    /** @jsx React.DOM */

    var React = __dependency1__["default"];
    var classSet = __dependency2__["default"];
    var BootstrapMixin = __dependency3__["default"];
    var utils = __dependency4__["default"];

    var PanelGroup = React.createClass({displayName: 'PanelGroup',
      mixins: [BootstrapMixin],

      propTypes: {
        onSelect: React.PropTypes.func
      },

      getDefaultProps: function () {
        return {
          bsClass: 'panel-group'
        };
      },

      getInitialState: function () {
        var initialActiveKey = this.props.initialActiveKey;

        return {
          activeKey: initialActiveKey
        };
      },

      render: function () {
        return this.transferPropsTo(
          React.DOM.div( {className:classSet(this.getBsClassSet())}, 
              utils.modifyChildren(this.props.children, this.renderPanel)
          )
        );
      },

      renderPanel: function (child) {
        var activeKey =
          this.props.activeKey != null ? this.props.activeKey : this.state.activeKey;

        var props = {
          bsStyle: this.props.bsStyle,
          key: child.props.key,
          ref: child.props.ref
        };

        if (this.props.isAccordion) {
          props.isCollapsable = true;
          props.isOpen = (child.props.key === activeKey);
          props.onSelect = this.handleSelect;
        }

        return utils.cloneWithProps(
          child,
          props
        );
      },

      shouldComponentUpdate: function() {
        // Defer any updates to this component during the `onSelect` handler.
        return !this._isChanging;
      },

      handleSelect: function (key) {
        if (this.props.onSelect) {
          this._isChanging = true;
          this.props.onSelect(key);
          this._isChanging = false;
        }

        if (this.state.activeKey === key) {
          key = null;
        }

        this.setState({
          activeKey: key
        });
      }
    });

    __exports__["default"] = PanelGroup;
  });
define(
  '../amd/transpiled/Accordion',["./react-es6","./PanelGroup","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    /** @jsx React.DOM */

    var React = __dependency1__["default"];
    var PanelGroup = __dependency2__["default"];

    var Accordion = React.createClass({displayName: 'Accordion',

      render: function () {
        return this.transferPropsTo(
          PanelGroup( {isAccordion:true}, 
              this.props.children
          )
        );
      }

    });

    __exports__["default"] = Accordion;
  });
define('../amd/Accordion',['./transpiled/Accordion'], function (Accordion) {
  return Accordion.default;
});
define(
  '../amd/transpiled/Alert',["./react-es6","./react-es6/lib/cx","./BootstrapMixin","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    
    /** @jsx React.DOM */

    var React = __dependency1__["default"];
    var classSet = __dependency2__["default"];
    var BootstrapMixin = __dependency3__["default"];


    var Alert = React.createClass({displayName: 'Alert',
      mixins: [BootstrapMixin],

      propTypes: {
        onDismiss: React.PropTypes.func,
        dismissAfter: React.PropTypes.number
      },

      getDefaultProps: function () {
        return {
          bsClass: 'alert',
          bsStyle: 'info'
        };
      },

      renderDismissButton: function () {
        return (
          React.DOM.button(
            {type:"button",
            className:"close",
            onClick:this.props.onDismiss,
            'aria-hidden':"true"}, 
            " × "
          )
        );
      },

      render: function () {
        var classes = this.getBsClassSet();
        var isDismissable = !!this.props.onDismiss;

        classes['alert-dismissable'] = isDismissable;

        return this.transferPropsTo(
          React.DOM.div( {className:classSet(classes)}, 
            isDismissable ? this.renderDismissButton() : null,
            this.props.children
          )
        );
      },

      componentDidMount: function() {
        if (this.props.dismissAfter && this.props.onDismiss) {
          this.dismissTimer = setTimeout(this.props.onDismiss, this.props.dismissAfter);
        }
      },

      componentWillUnmount: function() {
        clearTimeout(this.dismissTimer);
      }
    });

    __exports__["default"] = Alert;
  });
define('../amd/Alert',['./transpiled/Alert'], function (Alert) {
  return Alert.default;
});
define('../amd/BootstrapMixin',['./transpiled/BootstrapMixin'], function (BootstrapMixin) {
  return BootstrapMixin.default;
});
define(
  '../amd/transpiled/Button',["./react-es6","./react-es6/lib/cx","./BootstrapMixin","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    
    /** @jsx React.DOM */

    var React = __dependency1__["default"];
    var classSet = __dependency2__["default"];
    var BootstrapMixin = __dependency3__["default"];

    var Button = React.createClass({displayName: 'Button',
      mixins: [BootstrapMixin],

      propTypes: {
        active:   React.PropTypes.bool,
        disabled: React.PropTypes.bool,
        block:    React.PropTypes.bool
      },

      getDefaultProps: function () {
        return {
          bsClass: 'button',
          bsStyle: 'default',
          type: 'button'
        };
      },

      render: function () {
        var classes = this.getBsClassSet();
        classes['active'] = this.props.active;
        classes['btn-block'] = this.props.block;

        var renderFuncName = this.props.href ?
          'renderAnchor' : 'renderButton';

        return this[renderFuncName](classes);
      },

      renderAnchor: function (classes) {
        classes['disabled'] = this.props.disabled;

        return this.transferPropsTo(
          React.DOM.a(
            {className:classSet(classes),
            role:"button"}, 
            this.props.children
          )
        );
      },

      renderButton: function (classes) {
        return this.transferPropsTo(
          React.DOM.button(
            {className:classSet(classes)}, 
            this.props.children
          )
        );
      }
    });

    __exports__["default"] = Button;
  });
define('../amd/Button',['./transpiled/Button'], function (Button) {
  return Button.default;
});
define(
  '../amd/transpiled/ButtonGroup',["./react-es6","./react-es6/lib/cx","./BootstrapMixin","./Button","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    
    /** @jsx React.DOM */

    var React = __dependency1__["default"];
    var classSet = __dependency2__["default"];
    var BootstrapMixin = __dependency3__["default"];
    var Button = __dependency4__["default"];

    var ButtonGroup = React.createClass({displayName: 'ButtonGroup',
      mixins: [BootstrapMixin],

      propTypes: {
        vertical:  React.PropTypes.bool,
        justified: React.PropTypes.bool
      },

      getDefaultProps: function () {
        return {
          bsClass: 'button-group'
        };
      },

      render: function () {
        var classes = this.getBsClassSet();
        classes['btn-group-vertical'] = this.props.vertical;
        classes['btn-group-justified'] = this.props.justified;

        return this.transferPropsTo(
          React.DOM.div(
            {className:classSet(classes)}, 
            this.props.children
          )
        );
      }
    });

    __exports__["default"] = ButtonGroup;
  });
define('../amd/ButtonGroup',['./transpiled/ButtonGroup'], function (ButtonGroup) {
  return ButtonGroup.default;
});
define(
  '../amd/transpiled/ButtonToolbar',["./react-es6","./react-es6/lib/cx","./BootstrapMixin","./Button","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    
    /** @jsx React.DOM */

    var React = __dependency1__["default"];
    var classSet = __dependency2__["default"];
    var BootstrapMixin = __dependency3__["default"];
    var Button = __dependency4__["default"];

    var ButtonGroup = React.createClass({displayName: 'ButtonGroup',
      mixins: [BootstrapMixin],

      getDefaultProps: function () {
        return {
          bsClass: 'button-toolbar'
        };
      },

      render: function () {
        var classes = this.getBsClassSet();

        return this.transferPropsTo(
          React.DOM.div(
            {role:"toolbar",
            className:classSet(classes)}, 
            this.props.children
          )
        );
      }
    });

    __exports__["default"] = ButtonGroup;
  });
define('../amd/ButtonToolbar',['./transpiled/ButtonToolbar'], function (ButtonToolbar) {
  return ButtonToolbar.default;
});
define(
  '../amd/transpiled/DangerMixin',["exports"],
  function(__exports__) {
    
    __exports__["default"] = {
        getDefaultProps: function () {
            return {
                bsStyle: 'danger'
            };
        }
    };
  });
define('../amd/DangerMixin',['./transpiled/DangerMixin'], function (DangerMixin) {
  return DangerMixin.default;
});
define(
  '../amd/transpiled/DefaultMixin',["exports"],
  function(__exports__) {
    
    __exports__["default"] = {
        getDefaultProps: function () {
            return {
                bsStyle: 'default'
            };
        }
    };
  });
define('../amd/DefaultMixin',['./transpiled/DefaultMixin'], function (DefaultMixin) {
  return DefaultMixin.default;
});
define(
  '../amd/transpiled/DropdownButton',["./react-es6","./react-es6/lib/cx","./Button","./BootstrapMixin","./utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    
    /** @jsx React.DOM */

    var React = __dependency1__["default"];
    var classSet = __dependency2__["default"];
    var Button = __dependency3__["default"];
    var BootstrapMixin = __dependency4__["default"];
    var utils = __dependency5__["default"];


    var DropdownButton = React.createClass({displayName: 'DropdownButton',
      mixins: [BootstrapMixin],

      getInitialState: function () {
        return {
          open: false
        };
      },

      getDefaultProps: function () {
        return {
          options: []
        };
      },

      toggle: function (open) {
        var newState = (open === undefined) ?
              !this.state.open : open;

        if (newState) {
          this.bindCloseHandlers();
        } else {
          this.unbindCloseHandlers();
        }

        this.setState({
          open: newState
        });
      },

      handleClick: function (e) {
        this.toggle();
      },

      handleOptionSelect: function (key) {
        if (typeof this.props.onSelect === 'function') {
          this.props.onSelect(key);
        }

        this.toggle(false);
      },

      handleKeyUp: function (e) {
        if (e.keyCode === 27) {
          this.toggle(false);
        }
      },

      handleClickOutside: function (e) {
        if (!this._clickedInside) {
          this.toggle(false);
        }
        delete this._clickedInside;
      },

      killClick: function (e) {
        // e.stopPropagation() doesn't prevent `handleClickOutside` from being called
        this._clickedInside = true;
      },

      bindCloseHandlers: function () {
        document.addEventListener('click', this.handleClickOutside);
        document.addEventListener('keyup', this.handleKeyUp);
      },

      unbindCloseHandlers: function () {
        document.removeEventListener('click', this.handleClickOutside);
        document.removeEventListener('keyup', this.handleKeyUp);
      },

      componentWillUnmount: function () {
        this.unbindCloseHandlers();
      },

      render: function () {
        var groupClassName = classSet({
            'btn-group': true,
            'open': this.state.open
          });

        var button = this.transferPropsTo(
            Button(
              {ref:"button",
              className:"dropdown-toggle",
              onClick:this.handleClick}, 
              this.props.title + ' ',React.DOM.span( {className:"caret"} )
            )
        );

        return (
          React.DOM.div( {className:groupClassName}, 
            button,
            React.DOM.ul(
              {className:"dropdown-menu",
              role:"menu",
              ref:"menu",
              'aria-labelledby':this.props.id,
              onClick:this.killClick}, 
              utils.modifyChildren(this.props.children, this.renderMenuItem)
            )
          )
        );
      },

      renderMenuItem: function (child, i) {
        return utils.cloneWithProps(
            child,
            {
              ref: child.props.ref || 'menuItem' + (i + 1),
              key: child.props.key,
              onSelect: this.handleOptionSelect.bind(this, child.props.key)
            }
          );
      }
    });

    __exports__["default"] = DropdownButton;
  });
define('../amd/DropdownButton',['./transpiled/DropdownButton'], function (DropdownButton) {
  return DropdownButton.default;
});
define(
  '../amd/transpiled/FadeMixin',["./react-es6","exports"],
  function(__dependency1__, __exports__) {
    
    var React = __dependency1__["default"];

    // TODO: listen for onTransitionEnd to remove el
    __exports__["default"] = {
      _fadeIn: function () {
        var els;

        if (this.isMounted()) {
          els = this.getDOMNode().querySelectorAll('.fade');
          if (els.length) {
            Array.prototype.forEach.call(els, function (el) {
              el.className += ' in';
            });
          }
        }
      },

      _fadeOut: function () {
        var els = this._fadeOutEl.querySelectorAll('.fade.in');

        if (els.length) {
          Array.prototype.forEach.call(els, function (el) {
            el.className = el.className.replace(/\bin\b/, '');
          });
        }

        setTimeout(this._handleFadeOutEnd, 300);
      },

      _handleFadeOutEnd: function () {
        this._fadeOutEl.parentNode.removeChild(this._fadeOutEl);
      },

      componentDidMount: function () {
        if (document.querySelectorAll) {
          // Firefox needs delay for transition to be triggered
          setTimeout(this._fadeIn, 20);
        }
      },

      componentWillUnmount: function () {
        var els = this.getDOMNode().querySelectorAll('.fade');
        if (els.length) {
          this._fadeOutEl = document.createElement('div');
          document.body.appendChild(this._fadeOutEl);
          this._fadeOutEl.innerHTML = this.getDOMNode().innerHTML;
          // Firefox needs delay for transition to be triggered
          setTimeout(this._fadeOut, 20);
        }
      }
    };
  });
define('../amd/FadeMixin',['./transpiled/FadeMixin'], function (FadeMixin) {
  return FadeMixin.default;
});
define(
  '../amd/transpiled/InfoMixin',["exports"],
  function(__exports__) {
    
    __exports__["default"] = {
        getDefaultProps: function () {
            return {
                bsStyle: 'info'
            };
        }
    };
  });
define('../amd/InfoMixin',['./transpiled/InfoMixin'], function (InfoMixin) {
  return InfoMixin.default;
});
define(
  '../amd/transpiled/InlineMixin',["exports"],
  function(__exports__) {
    
    __exports__["default"] = {
        getDefaultProps: function () {
            return {
                bsStyle: 'inline'
            };
        }
    };
  });
define('../amd/InlineMixin',['./transpiled/InlineMixin'], function (InlineMixin) {
  return InlineMixin.default;
});
define(
  '../amd/transpiled/Input',["./react-es6","./react-es6/lib/cx","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    /** @jsx React.DOM */

    var React = __dependency1__["default"];
    var classSet = __dependency2__["default"];

    var INPUT_TYPES = [
      'text',
      'password',
      'datetime',
      'datetime-local',
      'date',
      'month',
      'time',
      'week',
      'number',
      'email',
      'url',
      'search',
      'tel',
      'color'
    ];

    var Input = React.createClass({displayName: 'Input',
      propTypes: {
        name: React.PropTypes.string.isRequired,
        type: React.PropTypes.oneOf(INPUT_TYPES).isRequired,
        id: React.PropTypes.string,
        className: React.PropTypes.string,
        placeholder: React.PropTypes.string,
        label: React.PropTypes.string,
        required: React.PropTypes.bool,
        oneOf: React.PropTypes.array
        //minLength: React.PropTypes.int
      },

      getValue: function () {
        return this.refs.input.getDOMNode().value;
      },

      renderInput: function () {
        var classes = {
          'form-control': true,
          'input-md': true
        };

        return (
          React.DOM.input(
            {id:this.props.id,
            type:this.props.type,
            className:classSet(classes),
            placeholder:this.props.placeholder,
            ref:"input"}
          )
        );
      },

      renderLabel: function () {
        return this.props.label ? React.DOM.label( {for:this.props.id}, this.props.label) : null;
      },

      render: function () {
        var classes = {
          'form-group': true,
          'has-error': !!this.state.error
        };

        return (
          React.DOM.div( {className:classSet(classes), onBlur:this.handleBlur, onFocus:this.handleFocus}, 
            this.renderInput(),
            this.renderLabel()
          )
        );
      },

      handleBlur: function (e) {
        var value = this.getValue();
        var error;

        if (this.props.required && !value) {
          error = 'required';
        } else if (this.props.oneOf && !(value in this.props.oneOf)) {
          error = 'oneOf';
        } else if (this.props.minLength && value.length < this.props.minLength) {
          error = 'minLength';
        }

        this.setState({
          error: error
        });
      },

      handleFocus: function(e) {
        this.setState({
          error: false
        });

        e.stopPropagation();
      }
    });

    __exports__["default"] = Input;
  });
define('../amd/Input',['./transpiled/Input'], function (Input) {
  return Input.default;
});
define(
  '../amd/transpiled/LargeMixin',["exports"],
  function(__exports__) {
    
    __exports__["default"] = {
        getDefaultProps: function () {
            return {
                bsSize: 'large'
            };
        }
    };
  });
define('../amd/LargeMixin',['./transpiled/LargeMixin'], function (LargeMixin) {
  return LargeMixin.default;
});
define(
  '../amd/transpiled/MediumMixin',["exports"],
  function(__exports__) {
    
    __exports__["default"] = {
        getDefaultProps: function () {
            return {
                bsSize: 'medium'
            };
        }
    };
  });
define('../amd/MediumMixin',['./transpiled/MediumMixin'], function (MediumMixin) {
  return MediumMixin.default;
});
define(
  '../amd/transpiled/MenuItem',["./react-es6","exports"],
  function(__dependency1__, __exports__) {
    
    /** @jsx React.DOM */

    var React = __dependency1__["default"];

    var MenuItem = React.createClass({displayName: 'MenuItem',
      propTypes: {
        header: React.PropTypes.bool,
        divider: React.PropTypes.bool
      },

      handleClick: function () {
        if (typeof this.props.onSelect === 'function') {
          this.props.onSelect(this.props.key);
        }
      },

      renderAnchor: function () {
        return (
          React.DOM.a( {onClick:this.handleClick, href:"#", tabIndex:"-1", ref:"anchor"}, 
            this.props.children
          )
        );
      },

      render: function () {
        var className = null;
        var children = null;

        if (this.props.header) {
          children = this.props.children;
          className = 'dropdown-header';
        } else if (this.props.divider) {
          className = 'divider';
        } else {
          children = this.renderAnchor();
        }

        return this.transferPropsTo(
          React.DOM.li( {role:"presentation", className:className}, 
            children
          )
        );
      }
    });

    __exports__["default"] = MenuItem;
  });
define('../amd/MenuItem',['./transpiled/MenuItem'], function (MenuItem) {
  return MenuItem.default;
});
define(
  '../amd/transpiled/Modal',["./react-es6","./react-es6/lib/cx","./BootstrapMixin","./FadeMixin","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    
    /** @jsx React.DOM */

    var React = __dependency1__["default"];
    var classSet = __dependency2__["default"];
    var BootstrapMixin = __dependency3__["default"];
    var FadeMixin = __dependency4__["default"];


    // TODO:
    // - aria-labelledby
    // - Add `modal-body` div if only one child passed in that doesn't already have it
    // - Tests

    var Modal = React.createClass({displayName: 'Modal',
      mixins: [BootstrapMixin, FadeMixin],

      getDefaultProps: function () {
        return {
          bsClass: 'modal',
          backdrop: true,
          keyboard: true,
          animation: true
        };
      },

      componentDidMount: function () {
        document.addEventListener('keyup', this.handleKeyUp);
      },

      componentWillUnmount: function () {
        document.removeEventListener('keyup', this.handleKeyUp);
      },

      killClick: function (e) {
        e.stopPropagation();
      },

      handleBackdropClick: function () {
        this.props.onRequestHide();
      },

      handleKeyUp: function (e) {
        if (this.props.keyboard && e.keyCode === 27) {
          this.props.onRequestHide();
        }
      },

      render: function () {
        var classes = this.getBsClassSet();

        classes['fade'] = this.props.animation;
        classes['in'] = !this.props.animation || !document.querySelectorAll;

        var modal = this.transferPropsTo(
          React.DOM.div(
            {bsClass:"modal",
            tabIndex:"-1",
            role:"dialog",
            style:{display: 'block'},
            className:classSet(classes),
            onClick:this.handleBackdropClick,
            ref:"modal"}
          , 
            React.DOM.div( {className:"modal-dialog"}, 
              React.DOM.div( {className:"modal-content", onClick:this.killClick}, 
                this.props.title ? this.renderHeader() : null,
                this.props.children
              )
            )
          )
        );

        return this.props.backdrop ?
          this.renderBackdrop(modal) : modal;
      },

      renderBackdrop: function (modal) {
        var classes = {
          'modal-backdrop': true,
          'fade': this.props.animation
        };

        classes['in'] = !this.props.animation || !document.querySelectorAll;

        return (
          React.DOM.div(null, 
            React.DOM.div( {className:classSet(classes), ref:"backdrop"} ),
            modal
          )
        );
      },

      renderHeader: function () {
        return (
          React.DOM.div( {className:"modal-header"}, 
            React.DOM.button( {type:"button", className:"close", 'aria-hidden':"true", onClick:this.props.onRequestHide}, "×"),
            this.renderTitle()
          )
        );
      },

      renderTitle: function () {
        return (
          React.isValidComponent(this.props.title) ?
            this.props.title : React.DOM.h4( {className:"modal-title"}, this.props.title)
        );
      }
    });

    __exports__["default"] = Modal;
  });
define('../amd/Modal',['./transpiled/Modal'], function (Modal) {
  return Modal.default;
});
define(
  '../amd/transpiled/Nav',["./react-es6","./react-es6/lib/cx","./BootstrapMixin","./utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    
    /** @jsx React.DOM */

    var React = __dependency1__["default"];
    var classSet = __dependency2__["default"];
    var BootstrapMixin = __dependency3__["default"];
    var utils = __dependency4__["default"];


    var Nav = React.createClass({displayName: 'Nav',
      mixins: [BootstrapMixin],

      propTypes: {
        bsStyle: React.PropTypes.oneOf(['tabs','pills']).isRequired,
        bsVariation: React.PropTypes.oneOf(['stacked','justified']),
        onSelect: React.PropTypes.func
      },

      getDefaultProps: function () {
        return {
          bsClass: 'nav'
        };
      },

      render: function () {
        var classes = this.getBsClassSet();

        return this.transferPropsTo(
          React.DOM.nav(null, 
            React.DOM.ul( {className:classSet(classes)}, 
              utils.modifyChildren(this.props.children, this.renderNavItem)
            )
          )
        );
      },

      renderNavItem: function (child) {
        return utils.cloneWithProps(
          child,
          {
            isActive: this.props.activeKey != null ? child.props.key === this.props.activeKey : null,
            onSelect: utils.createChainedFunction(child.onSelect, this.props.onSelect),
            ref: child.props.ref,
            key: child.props.key
          }
        );
      }
    });

    __exports__["default"] = Nav;
  });
define('../amd/Nav',['./transpiled/Nav'], function (Nav) {
  return Nav.default;
});
define(
  '../amd/transpiled/NavItem',["./react-es6","./react-es6/lib/cx","./BootstrapMixin","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    
    /** @jsx React.DOM */

    var React = __dependency1__["default"];
    var classSet = __dependency2__["default"];
    var BootstrapMixin = __dependency3__["default"];

    var NavItem = React.createClass({displayName: 'NavItem',
      mixins: [BootstrapMixin],

      propTypes: {
        onSelect: React.PropTypes.func,
        isActive: React.PropTypes.bool,
        disabled: React.PropTypes.bool,
        href: React.PropTypes.string,
        title: React.PropTypes.string
      },

      getDefaultProps: function () {
        return {
          href: '#'
        };
      },

      render: function () {
        var classes = {
          'active': this.props.isActive,
          'disabled': this.props.disabled
        };

        return this.transferPropsTo(
          React.DOM.li( {className:classSet(classes)}, 
            React.DOM.a(
              {href:this.props.href,
              title:this.props.title,
              onClick:this.handleClick,
              ref:"anchor"}, 
              this.props.children
            )
          )
        );
      },

      handleClick: function (e) {
        if (this.props.onSelect) {
          e.preventDefault();

          if (!this.props.disabled) {
            this.props.onSelect(this.props.key);
          }
        }
      }
    });

    __exports__["default"] = NavItem;
  });
define('../amd/NavItem',['./transpiled/NavItem'], function (NavItem) {
  return NavItem.default;
});
define(
  '../amd/transpiled/OverlayTriggerMixin',["./react-es6","exports"],
  function(__dependency1__, __exports__) {
    
    var React = __dependency1__["default"];

    __exports__["default"] = {
      componentWillUnmount: function () {
        this._unrenderOverlay();
        document.body.removeChild(this._overlayTarget);
      },

      componentDidUpdate: function () {
        this._renderOverlay();
      },

      componentDidMount: function () {
        this._overlayTarget = document.createElement('div');
        document.body.appendChild(this._overlayTarget);
        this._renderOverlay();
      },

      _renderOverlay: function () {
        React.renderComponent(this.renderOverlay(), this._overlayTarget);
      },

      _unrenderOverlay: function () {
        React.unmountComponentAtNode(this._overlayTarget);
      }
    };
  });
define(
  '../amd/transpiled/OverlayTrigger',["./react-es6","./react-es6/lib/cloneWithProps","./OverlayTriggerMixin","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    
    /** @jsx React.DOM */

    var React = __dependency1__["default"];
    var cloneWithProps = __dependency2__["default"];
    var OverlayTriggerMixin = __dependency3__["default"];

    var OverlayTrigger = React.createClass({displayName: 'OverlayTrigger',
        mixins: [OverlayTriggerMixin],

        getDefaultProps: function () {
            return {
                trigger: 'click'
            };
        },

        getInitialState: function() {
            return {
                isOverlayShown: (this.props.defaultOverlayShown == null) ?
                    false : this.props.defaultOverlayShown
            };
        },

        show: function () {
            this.setState({
                isOverlayShown: true
            });
        },

        hide: function () {
            this.setState({
                isOverlayShown: false
            });
        },

        toggle: function () {
            this.setState({
                isOverlayShown: !this.state.isOverlayShown
            });
        },

        _trigger: function () {
            var propName = 'delay' + (this.state.isOverlayShown ? 'Hide' : 'Show'),
                delay = this.props[propName] || this.props.delay;

            clearTimeout(this._triggerTimeout);
            if (delay) {
                this._triggerTimeout = setTimeout(this.toggle, parseInt(delay, 10));
            } else {
                this.toggle();
            }
        },

        renderOverlay: function() {
            var props;

            if (!this.state.isOverlayShown || !this.props.overlay) {
                return React.DOM.span(null );
            }

            props = {
                onRequestHide: this._trigger
            };

            if (this.props.animation != null) {
                props.animation = this.props.animation;
            }

            return cloneWithProps(
                this.props.overlay,
                props
            );
        },

        render: function() {
            return (this.props.children) ?
                this.renderTrigger() : React.DOM.span(null );
        },

        renderTrigger: function () {
            var props = {},
                trigger = this.props.trigger,
                propName;

            if (trigger !== 'manual') {
                if (trigger === 'hover') {
                    trigger = 'mouseOver';
                }
                propName = 'on' + trigger.substr(0, 1).toUpperCase() +
                    trigger.substr(1);
                props[propName] = this._trigger;
            }

            return React.DOM.span(
                props,
                this.props.children
            );
        }
    });

    __exports__["default"] = OverlayTrigger;
  });
define('../amd/OverlayTrigger',['./transpiled/OverlayTrigger'], function (OverlayTrigger) {
  return OverlayTrigger.default;
});
define('../amd/OverlayTriggerMixin',['./transpiled/OverlayTriggerMixin'], function (OverlayTriggerMixin) {
  return OverlayTriggerMixin.default;
});
define(
  '../amd/transpiled/Panel',["./react-es6","./react-es6/lib/cx","./BootstrapMixin","./utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    
    /** @jsx React.DOM */

    var React = __dependency1__["default"];
    var classSet = __dependency2__["default"];
    var BootstrapMixin = __dependency3__["default"];
    var utils = __dependency4__["default"];

    var Panel = React.createClass({displayName: 'Panel',
      mixins: [BootstrapMixin],

      propTypes: {
        //header: React.PropTypes.renderable,
        //footer: React.PropTypes.renderable,
        isCollapsable: React.PropTypes.bool,
        isOpen: React.PropTypes.bool,
        onClick: React.PropTypes.func
      },

      getDefaultProps: function () {
        return {
          bsClass: 'panel'
        };
      },

      getInitialState: function() {
        return {
          isOpen: this.props.defaultOpen != null ? this.props.defaultOpen : null
        };
      },

      handleSelect: function (e) {
        if (this.props.onSelect) {
          this._isChanging = true;
          this.props.onSelect(this.props.key);
          this._isChanging = false;
        }

        e.preventDefault();

        this.setState({
          isOpen: !this.state.isOpen
        });
      },

      shouldComponentUpdate: function () {
        return !this._isChanging;
      },

      isOpen: function () {
        return (this.props.isOpen != null) ? this.props.isOpen : this.state.isOpen;
      },

      render: function () {
        var classes = this.getBsClassSet();
        classes['panel'] = true;

        return this.transferPropsTo(
          React.DOM.div( {className:classSet(classes), id:this.props.isCollapsable ? null : this.props.id}, 
            this.renderHeading(),
            this.props.isCollapsable ? this.renderCollapsableBody() : this.renderBody(),
            this.renderFooter()
          )
        );
      },

      renderCollapsableBody: function () {
        var classes = {
          'panel-collapse': true,
          'collapse': true,
          'in': this.isOpen()
        };

        return (
          React.DOM.div( {className:classSet(classes), id:this.props.id}, 
            this.renderBody()
          )
        );
      },

      renderBody: function () {
        return (
          React.DOM.div( {className:"panel-body"}, 
            this.props.children
          )
        );
      },

      renderHeading: function () {
        var header = this.props.header;

        if (!header) {
          return null;
        }

        if (!React.isValidComponent(header) || Array.isArray(header)) {
          header = this.props.isCollapsable ?
            this.renderCollapsableTitle(header) : header;
        } else if (this.props.isCollapsable) {
          header = utils.cloneWithProps(header, {
            className: 'panel-title',
            children: this.renderAnchor(header.props.children)
          });
        } else {
          header = utils.cloneWithProps(header, {
            className: 'panel-title'
          });
        }

        return (
          React.DOM.div( {className:"panel-heading"}, 
            header
          )
        );
      },

      renderAnchor: function (header) {
        return (
          React.DOM.a(
            {href:'#' + (this.props.id || ''),
            className:this.isOpen() ? null : 'collapsed',
            onClick:this.handleSelect}, 
            header
          )
        );
      },

      renderCollapsableTitle: function (header) {
        return (
          React.DOM.h4( {className:"panel-title"}, 
            this.renderAnchor(header)
          )
        );
      },

      renderFooter: function () {
        if (!this.props.footer) {
          return null;
        }

        return (
          React.DOM.div( {className:"panel-footer"}, 
            this.props.footer
          )
        );
      }
    });

    __exports__["default"] = Panel;
  });
define('../amd/Panel',['./transpiled/Panel'], function (Panel) {
  return Panel.default;
});
define('../amd/PanelGroup',['./transpiled/PanelGroup'], function (PanelGroup) {
  return PanelGroup.default;
});
define(
  '../amd/transpiled/PrimaryMixin',["exports"],
  function(__exports__) {
    
    __exports__["default"] = {
        getDefaultProps: function () {
            return {
                bsStyle: 'primary'
            };
        }
    };
  });
define('../amd/PrimaryMixin',['./transpiled/PrimaryMixin'], function (PrimaryMixin) {
  return PrimaryMixin.default;
});
define(
  '../amd/transpiled/Interpolate',["./react-es6","./react-es6/lib/invariant","./utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    
    // https://www.npmjs.org/package/react-interpolate-component
    

    var React = __dependency1__["default"];
    var invariant = __dependency2__["default"];
    var utils = __dependency3__["default"];

    function isString(object) {
      return Object.prototype.toString.call(object) === '[object String]';
    }

    var REGEXP = /\%\((.+?)\)s/;

    var Interpolate = React.createClass({
      displayName: 'Interpolate',

      getDefaultProps: function() {
        return { component: React.DOM.span };
      },

      render: function() {
        var format = this.props.children || this.props.format;
        var parent = this.props.component;
        var unsafe = this.props.unsafe === true;
        var props  = utils.extend({}, this.props);

        delete props.children;
        delete props.format;
        delete props.component;
        delete props.unsafe;

        invariant(isString(format), 'Interpolate expects either a format string as only child or a `format` prop with a string value');

        if (unsafe) {
          var content = format.split(REGEXP).reduce(function(memo, match, index) {
            var html;

            if (index % 2 === 0) {
              html = match;
            } else {
              html = props[match];
              delete props[match];
            }

            if (React.isValidComponent(html)) {
              throw new Error('cannot interpolate a React component into unsafe text');
            }

            memo += html;

            return memo;
          }, '');

          props.dangerouslySetInnerHTML = { __html: content };

          return parent(props);
        } else {
          var args = format.split(REGEXP).reduce(function(memo, match, index) {
            var child;

            if (index % 2 === 0) {
              if (match.length === 0) {
                return memo;
              }

              child = match;
            } else {
              child = props[match];
              delete props[match];
            }

            memo.push(child);

            return memo;
          }, [props]);

          return parent.apply(null, args);
        }
      }
    });

    __exports__["default"] = Interpolate;
  });
define(
  '../amd/transpiled/ProgressBar',["./react-es6","./react-es6/lib/cx","./Interpolate","./BootstrapMixin","./utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    
    /** @jsx React.DOM */

    var React = __dependency1__["default"];
    var classSet = __dependency2__["default"];
    var Interpolate = __dependency3__["default"];
    var BootstrapMixin = __dependency4__["default"];
    var utils = __dependency5__["default"];


    var ProgressBar = React.createClass({displayName: 'ProgressBar',
        propTypes: {
            min: React.PropTypes.number,
            now: React.PropTypes.number,
            max: React.PropTypes.number,
            text: React.PropTypes.string,
            striped: React.PropTypes.bool,
            active: React.PropTypes.bool
        },

        mixins: [BootstrapMixin],

        getDefaultProps: function () {
            return {
                bsClass: 'progress-bar',
                min: 0,
                max: 100
            };
        },

        getPercentage: function (now, min, max) {
            return Math.ceil((now - min) / (max - min) * 100);
        },

        render: function () {
            var classes = {
                    progress: true
                };

            if (this.props.active) {
                classes['progress-striped'] = true;
                classes['active'] = true;
            } else if (this.props.striped) {
                classes['progress-striped'] = true;
            }

            if (!this.props.children) {
                if (!this.props.isChild) {
                    return this.transferPropsTo(
                        React.DOM.div( {className:classSet(classes)}, 
                            this.renderProgressBar()
                        )
                    );
                } else {
                    return this.transferPropsTo(
                        this.renderProgressBar()
                    );
                }
            } else {
                return this.transferPropsTo(
                    React.DOM.div( {className:classSet(classes)}, 
                        utils.modifyChildren(this.props.children, this.renderChildBar)
                    )
                );
            }
        },

        renderChildBar: function (child) {
            return utils.cloneWithProps(child, {
                isChild: true,
                key: child.props.key,
                ref: child.props.ref
            });
        },

        renderProgressBar: function () {
            var percentage = this.getPercentage(
                    this.props.now,
                    this.props.min,
                    this.props.max
                );

            return (
                React.DOM.div( {className:classSet(this.getBsClassSet()), role:"progressbar",
                    style:{width: percentage + '%'},
                    'aria-valuenow':this.props.now,
                    'aria-valuemin':this.props.min,
                    'aria-valuemax':this.props.max}, 
                    this.props.text ? this.renderScreenReaderText(percentage) : null
                )
            );
        },

        renderScreenReaderText: function (percentage) {
            var InterpolateClass = this.props.interpolateClass || Interpolate;

            return (
                React.DOM.span( {className:"sr-only"}, 
                    InterpolateClass(
                        {now:this.props.now,
                        min:this.props.min,
                        max:this.props.max,
                        percent:percentage,
                        bsStyle:this.props.bsStyle}, 
                        this.props.text
                    )
                )
            );
        }
    });

    __exports__["default"] = ProgressBar;
  });
define('../amd/ProgressBar',['./transpiled/ProgressBar'], function (ProgressBar) {
  return ProgressBar.default;
});
define(
  '../amd/transpiled/SmallMixin',["exports"],
  function(__exports__) {
    
    __exports__["default"] = {
        getDefaultProps: function () {
            return {
                bsSize: 'small'
            };
        }
    };
  });
define('../amd/SmallMixin',['./transpiled/SmallMixin'], function (SmallMixin) {
  return SmallMixin.default;
});
define(
  '../amd/transpiled/SplitButton',["./react-es6","./react-es6/lib/cx","./Button","./BootstrapMixin","./utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    
    /** @jsx React.DOM */

    var React = __dependency1__["default"];
    var classSet = __dependency2__["default"];
    var Button = __dependency3__["default"];
    var BootstrapMixin = __dependency4__["default"];
    var utils = __dependency5__["default"];


    var SplitButton = React.createClass({displayName: 'SplitButton',
      mixins: [BootstrapMixin],

      getInitialState: function () {
        return {
          open: false
        };
      },

      getDefaultProps: function () {
        return {
          options: [],
          dropdownTitle: 'Toggle dropdown'
        };
      },

      toggle: function (open) {
        var newState = (open === undefined) ?
              !this.state.open : open;

        if (newState) {
          this.bindCloseHandlers();
        } else {
          this.unbindCloseHandlers();
        }

        this.setState({
          open: newState
        });
      },

      handleClick: function (e) {
        if (this.props.onClick) {
          this.props.onClick(e);
        }
      },

      handleDropdownClick: function (e) {
        this.toggle();
      },

      handleOptionSelect: function (key) {
        if (typeof this.props.onSelect === 'function') {
          this.props.onSelect(key);
        }

        this.toggle(false);
      },

      handleKeyUp: function (e) {
        if (e.keyCode === 27) {
          this.toggle(false);
        }
      },

      handleClickOutside: function (e) {
        if (!this._clickedInside) {
          this.toggle(false);
        }

        delete this._clickedInside;
      },

      killClick: function (e) {
        // e.stopPropagation() doesn't prevent `handleClickOutside` from being called
        this._clickedInside = true;
      },

      bindCloseHandlers: function () {
        document.addEventListener('click', this.handleClickOutside);
        document.addEventListener('keyup', this.handleKeyUp);
      },

      unbindCloseHandlers: function () {
        document.removeEventListener('click', this.handleClickOutside);
        document.removeEventListener('keyup', this.handleKeyUp);
      },

      componentWillUnmount: function () {
        this.unbindCloseHandlers();
      },

      render: function () {
        var groupClassName = classSet({
            'btn-group': true,
            'open': this.state.open
          });

        var button = this.transferPropsTo(
            Button(
              {ref:"button",
              onClick:this.handleClick}, 
              this.props.title
            )
        );

        var dropdownButton = this.transferPropsTo(
            Button(
              {ref:"dropdownButton",
              className:"dropdown-toggle",
              onClick:this.handleDropdownClick}, 
              React.DOM.span( {className:"sr-only"}, this.props.dropdownTitle),React.DOM.span( {className:"caret"} )
            )
        );

        return (
          React.DOM.div( {className:groupClassName}, 
            button,
            dropdownButton,
            React.DOM.ul(
              {className:"dropdown-menu",
              role:"menu",
              ref:"menu",
              'aria-labelledby':this.props.id,
              onClick:this.killClick}
            , 
              utils.modifyChildren(this.props.children, this.renderMenuItem)
            )
          )
        );
      },

      renderMenuItem: function (child, i) {
        return utils.cloneWithProps(
            child,
            {
              ref: child.props.ref || 'menuItem' + (i + 1),
              key: child.props.key,
              onSelect: this.handleOptionSelect.bind(this, child.props.key)
            }
          );
      }
    });

    __exports__["default"] = SplitButton;
  });
define('../amd/SplitButton',['./transpiled/SplitButton'], function (SplitButton) {
  return SplitButton.default;
});
define(
  '../amd/transpiled/SuccessMixin',["exports"],
  function(__exports__) {
    
    __exports__["default"] = {
        getDefaultProps: function () {
            return {
                bsStyle: 'success'
            };
        }
    };
  });
define('../amd/SuccessMixin',['./transpiled/SuccessMixin'], function (SuccessMixin) {
  return SuccessMixin.default;
});
define(
  '../amd/transpiled/TabbedArea',["./react-es6","./BootstrapMixin","./utils","./Nav","./NavItem","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    
    /** @jsx React.DOM */

    var React = __dependency1__["default"];
    var BootstrapMixin = __dependency2__["default"];
    var utils = __dependency3__["default"];
    var Nav = __dependency4__["default"];
    var NavItem = __dependency5__["default"];

    var TabbedArea = React.createClass({displayName: 'TabbedArea',
      mixins: [BootstrapMixin],

      propTypes: {
        onSelect: React.PropTypes.func
      },

      getInitialState: function () {
        var initialActiveKey = this.props.initialActiveKey;

        if (initialActiveKey == null) {
          var children = this.props.children;
          initialActiveKey =
            Array.isArray(children) ? children[0].props.key : children.props.key;
        }

        return {
          activeKey: initialActiveKey
        };
      },

      render: function () {
        var activeKey =
          this.props.activeKey != null ? this.props.activeKey : this.state.activeKey;

        function hasTab (child) {
          return !!child.props.tab;
        }

        return this.transferPropsTo(
          React.DOM.div(null, 
            Nav( {bsStyle:"tabs", activeKey:activeKey, onSelect:this.handleSelect, ref:"tabs"}, 
              utils.modifyChildren(utils.filterChildren(this.props.children, hasTab), this.renderTab)
            ),
            React.DOM.div( {id:this.props.id, className:"tab-content", ref:"panes"}, 
              utils.modifyChildren(this.props.children, this.renderPane)
            )
          )
        );
      },

      renderPane: function (child) {
        var activeKey =
          this.props.activeKey != null ? this.props.activeKey : this.state.activeKey;
        return utils.cloneWithProps(
            child,
            {
              isActive: (child.props.key === activeKey),
              ref: child.props.ref,
              key: child.props.key
            }
          );
      },

      renderTab: function (child) {
        var key = child.props.key;
        return (
          NavItem(
            {ref:'tab' + key,
            key:key}, 
            child.props.tab
          )
        );
      },

      shouldComponentUpdate: function() {
        // Defer any updates to this component during the `onSelect` handler.
        return !this._isChanging;
      },

      handleSelect: function (key) {
        if (this.props.onSelect) {
          this._isChanging = true;
          this.props.onSelect(key);
          this._isChanging = false;
        }

        this.setState({
          activeKey: key
        });
      }
    });

    __exports__["default"] = TabbedArea;
  });
define('../amd/TabbedArea',['./transpiled/TabbedArea'], function (TabbedArea) {
  return TabbedArea.default;
});
define(
  '../amd/transpiled/TabPane',["./react-es6","./react-es6/lib/cx","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    /** @jsx React.DOM */

    var React = __dependency1__["default"];
    var classSet = __dependency2__["default"];

    var TabPane = React.createClass({displayName: 'TabPane',
      render: function () {
        var classes = {
          'tab-pane': true,
          'active': this.props.isActive
        };

        return this.transferPropsTo(
          React.DOM.div( {className:classSet(classes)}, 
            this.props.children
          )
        );
      }
    });

    __exports__["default"] = TabPane;
  });
define('../amd/TabPane',['./transpiled/TabPane'], function (TabPane) {
  return TabPane.default;
});
define(
  '../amd/transpiled/WarningMixin',["exports"],
  function(__exports__) {
    
    __exports__["default"] = {
        getDefaultProps: function () {
            return {
                bsStyle: 'warning'
            };
        }
    };
  });
define('../amd/WarningMixin',['./transpiled/WarningMixin'], function (WarningMixin) {
  return WarningMixin.default;
});
define(
  '../amd/transpiled/XSmallMixin',["exports"],
  function(__exports__) {
    
    __exports__["default"] = {
        getDefaultProps: function () {
            return {
                bsSize: 'xsmall'
            };
        }
    };
  });
define('../amd/XSmallMixin',['./transpiled/XSmallMixin'], function (XSmallMixin) {
  return XSmallMixin.default;
});
/*global define */

define('react-bootstrap',['require','../amd/Accordion','../amd/Alert','../amd/BootstrapMixin','../amd/Button','../amd/ButtonGroup','../amd/ButtonToolbar','../amd/DangerMixin','../amd/DefaultMixin','../amd/DropdownButton','../amd/FadeMixin','../amd/InfoMixin','../amd/InlineMixin','../amd/Input','../amd/LargeMixin','../amd/MediumMixin','../amd/MenuItem','../amd/Modal','../amd/Nav','../amd/NavItem','../amd/OverlayTrigger','../amd/OverlayTriggerMixin','../amd/Panel','../amd/PanelGroup','../amd/PrimaryMixin','../amd/ProgressBar','../amd/SmallMixin','../amd/SplitButton','../amd/SuccessMixin','../amd/TabbedArea','../amd/TabPane','../amd/WarningMixin','../amd/XSmallMixin'],function (require) {
    

    return {
        Accordion: require('../amd/Accordion'),
        Alert: require('../amd/Alert'),
        BootstrapMixin: require('../amd/BootstrapMixin'),
        Button: require('../amd/Button'),
        ButtonGroup: require('../amd/ButtonGroup'),
        ButtonToolbar: require('../amd/ButtonToolbar'),
        DangerMixin: require('../amd/DangerMixin'),
        DefaultMixin: require('../amd/DefaultMixin'),
        DropdownButton: require('../amd/DropdownButton'),
        FadeMixin: require('../amd/FadeMixin'),
        InfoMixin: require('../amd/InfoMixin'),
        InlineMixin: require('../amd/InlineMixin'),
        Input: require('../amd/Input'),
        LargeMixin: require('../amd/LargeMixin'),
        MediumMixin: require('../amd/MediumMixin'),
        MenuItem: require('../amd/MenuItem'),
        Modal: require('../amd/Modal'),
        Nav: require('../amd/Nav'),
        NavItem: require('../amd/NavItem'),
        OverlayTrigger: require('../amd/OverlayTrigger'),
        OverlayTriggerMixin: require('../amd/OverlayTriggerMixin'),
        Panel: require('../amd/Panel'),
        PanelGroup: require('../amd/PanelGroup'),
        PrimaryMixin: require('../amd/PrimaryMixin'),
        ProgressBar: require('../amd/ProgressBar'),
        SmallMixin: require('../amd/SmallMixin'),
        SplitButton: require('../amd/SplitButton'),
        SuccessMixin: require('../amd/SuccessMixin'),
        TabbedArea: require('../amd/TabbedArea'),
        TabPane: require('../amd/TabPane'),
        WarningMixin: require('../amd/WarningMixin'),
        XSmallMixin: require('../amd/XSmallMixin')
    };
});    //Register in the values from the outer closure for common dependencies
    //as local almond modules
    define('react', function () {
        return React;
    });

    //Use almond's special top-level, synchronous require to trigger factory
    //functions, get the final module value, and export it as the public
    //value.
    return require('react-bootstrap');
}));

//# sourceMappingURL=react-bootstrap.js.map