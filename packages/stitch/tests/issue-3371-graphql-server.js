/* eslint-disable */
var __webpack_modules__ = {
  '../../node_modules/dataloader/index.js': module => {
    var DataLoader = (function () {
      function DataLoader(batchLoadFn, options) {
        if ('function' != typeof batchLoadFn)
          throw new TypeError(
            'DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but got: ' +
              batchLoadFn +
              '.'
          );
        this._batchLoadFn = batchLoadFn;
        this._maxBatchSize = getValidMaxBatchSize(options);
        this._batchScheduleFn = getValidBatchScheduleFn(options);
        this._cacheKeyFn = getValidCacheKeyFn(options);
        this._cacheMap = getValidCacheMap(options);
        this._batch = null;
      }
      var _proto = DataLoader.prototype;
      _proto.load = function (key) {
        if (null == key)
          throw new TypeError('The loader.load() function must be called with a value,but got: ' + String(key) + '.');
        var batch = getCurrentBatch(this);
        var cacheMap = this._cacheMap;
        var cacheKey = this._cacheKeyFn(key);
        if (cacheMap) {
          var cachedPromise = cacheMap.get(cacheKey);
          if (cachedPromise) {
            var cacheHits = batch.cacheHits || (batch.cacheHits = []);
            return new Promise(function (resolve) {
              cacheHits.push(function () {
                return resolve(cachedPromise);
              });
            });
          }
        }
        batch.keys.push(key);
        var promise = new Promise(function (resolve, reject) {
          batch.callbacks.push({
            resolve,
            reject,
          });
        });
        if (cacheMap) cacheMap.set(cacheKey, promise);
        return promise;
      };
      _proto.loadMany = function (keys) {
        if (!isArrayLike(keys))
          throw new TypeError('The loader.loadMany() function must be called with Array<key> but got: ' + keys + '.');
        var loadPromises = [];
        for (var i = 0; i < keys.length; i++)
          loadPromises.push(
            this.load(keys[i])['catch'](function (error) {
              return error;
            })
          );
        return Promise.all(loadPromises);
      };
      _proto.clear = function (key) {
        var cacheMap = this._cacheMap;
        if (cacheMap) {
          var cacheKey = this._cacheKeyFn(key);
          cacheMap['delete'](cacheKey);
        }
        return this;
      };
      _proto.clearAll = function () {
        var cacheMap = this._cacheMap;
        if (cacheMap) cacheMap.clear();
        return this;
      };
      _proto.prime = function (key, value) {
        var cacheMap = this._cacheMap;
        if (cacheMap) {
          var cacheKey = this._cacheKeyFn(key);
          if (void 0 === cacheMap.get(cacheKey)) {
            var promise;
            if (value instanceof Error) (promise = Promise.reject(value))['catch'](function () {});
            else promise = Promise.resolve(value);
            cacheMap.set(cacheKey, promise);
          }
        }
        return this;
      };
      return DataLoader;
    })();
    var enqueuePostPromiseJob =
      'object' == typeof process && 'function' == typeof process.nextTick
        ? function (fn) {
            if (!resolvedPromise) resolvedPromise = Promise.resolve();
            resolvedPromise.then(function () {
              return process.nextTick(fn);
            });
          }
        : setImmediate || setTimeout;
    var resolvedPromise;
    function getCurrentBatch(loader) {
      var existingBatch = loader._batch;
      if (
        null !== existingBatch &&
        !existingBatch.hasDispatched &&
        existingBatch.keys.length < loader._maxBatchSize &&
        (!existingBatch.cacheHits || existingBatch.cacheHits.length < loader._maxBatchSize)
      )
        return existingBatch;
      var newBatch = {
        hasDispatched: false,
        keys: [],
        callbacks: [],
      };
      loader._batch = newBatch;
      loader._batchScheduleFn(function () {
        return dispatchBatch(loader, newBatch);
      });
      return newBatch;
    }
    function dispatchBatch(loader, batch) {
      batch.hasDispatched = true;
      if (0 === batch.keys.length) {
        resolveCacheHits(batch);
        return;
      }
      var batchPromise = loader._batchLoadFn(batch.keys);
      if (!batchPromise || 'function' != typeof batchPromise.then)
        return failedDispatch(
          loader,
          batch,
          new TypeError(
            'DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but the function did not return a Promise: ' +
              String(batchPromise) +
              '.'
          )
        );
      batchPromise
        .then(function (values) {
          if (!isArrayLike(values))
            throw new TypeError(
              'DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but the function did not return a Promise of an Array: ' +
                String(values) +
                '.'
            );
          if (values.length !== batch.keys.length)
            throw new TypeError(
              'DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but the function did not return a Promise of an Array of the same length as the Array of keys.\n\nKeys:\n' +
                String(batch.keys) +
                '\n\nValues:\n' +
                String(values)
            );
          resolveCacheHits(batch);
          for (var i = 0; i < batch.callbacks.length; i++) {
            var value = values[i];
            if (value instanceof Error) batch.callbacks[i].reject(value);
            else batch.callbacks[i].resolve(value);
          }
        })
        ['catch'](function (error) {
          return failedDispatch(loader, batch, error);
        });
    }
    function failedDispatch(loader, batch, error) {
      resolveCacheHits(batch);
      for (var i = 0; i < batch.keys.length; i++) {
        loader.clear(batch.keys[i]);
        batch.callbacks[i].reject(error);
      }
    }
    function resolveCacheHits(batch) {
      if (batch.cacheHits) for (var i = 0; i < batch.cacheHits.length; i++) batch.cacheHits[i]();
    }
    function getValidMaxBatchSize(options) {
      if (!(!options || false !== options.batch)) return 1;
      var maxBatchSize = options && options.maxBatchSize;
      if (void 0 === maxBatchSize) return 1 / 0;
      if ('number' != typeof maxBatchSize || maxBatchSize < 1)
        throw new TypeError('maxBatchSize must be a positive number: ' + maxBatchSize);
      return maxBatchSize;
    }
    function getValidBatchScheduleFn(options) {
      var batchScheduleFn = options && options.batchScheduleFn;
      if (void 0 === batchScheduleFn) return enqueuePostPromiseJob;
      if ('function' != typeof batchScheduleFn)
        throw new TypeError('batchScheduleFn must be a function: ' + batchScheduleFn);
      return batchScheduleFn;
    }
    function getValidCacheKeyFn(options) {
      var cacheKeyFn = options && options.cacheKeyFn;
      if (void 0 === cacheKeyFn)
        return function (key) {
          return key;
        };
      if ('function' != typeof cacheKeyFn) throw new TypeError('cacheKeyFn must be a function: ' + cacheKeyFn);
      return cacheKeyFn;
    }
    function getValidCacheMap(options) {
      if (!(!options || false !== options.cache)) return null;
      var cacheMap = options && options.cacheMap;
      if (void 0 === cacheMap) return new Map();
      if (null !== cacheMap) {
        var missingFunctions = ['get', 'set', 'delete', 'clear'].filter(function (fnName) {
          return cacheMap && 'function' != typeof cacheMap[fnName];
        });
        if (0 !== missingFunctions.length)
          throw new TypeError('Custom cacheMap missing methods: ' + missingFunctions.join(', '));
      }
      return cacheMap;
    }
    function isArrayLike(x) {
      return (
        'object' == typeof x &&
        null !== x &&
        'number' == typeof x.length &&
        (0 === x.length || (x.length > 0 && Object.prototype.hasOwnProperty.call(x, x.length - 1)))
      );
    }
    module.exports = DataLoader;
  },
  '../../node_modules/graphql/error/GraphQLError.js': (__unused_webpack_module, exports, __webpack_require__) => {
    function _typeof(obj) {
      if ('function' == typeof Symbol && 'symbol' == typeof Symbol.iterator)
        _typeof = function (obj) {
          return typeof obj;
        };
      else
        _typeof = function (obj) {
          return obj && 'function' == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype
            ? 'symbol'
            : typeof obj;
        };
      return _typeof(obj);
    }
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.printError = printError;
    exports.GraphQLError = void 0;
    var _isObjectLike = (function (obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    })(__webpack_require__('../../node_modules/graphql/jsutils/isObjectLike.js'));
    var _symbols = __webpack_require__('../../node_modules/graphql/polyfills/symbols.js');
    var _location = __webpack_require__('../../node_modules/graphql/language/location.js');
    var _printLocation = __webpack_require__('../../node_modules/graphql/language/printLocation.js');
    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) throw new TypeError('Cannot call a class as a function');
    }
    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ('value' in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }
    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      return Constructor;
    }
    function _inherits(subClass, superClass) {
      if ('function' != typeof superClass && null !== superClass)
        throw new TypeError('Super expression must either be null or a function');
      subClass.prototype = Object.create(superClass && superClass.prototype, {
        constructor: {
          value: subClass,
          writable: true,
          configurable: true,
        },
      });
      if (superClass) _setPrototypeOf(subClass, superClass);
    }
    function _createSuper(Derived) {
      var hasNativeReflectConstruct = _isNativeReflectConstruct();
      return function () {
        var result,
          Super = _getPrototypeOf(Derived);
        if (hasNativeReflectConstruct) {
          var NewTarget = _getPrototypeOf(this).constructor;
          result = Reflect.construct(Super, arguments, NewTarget);
        } else result = Super.apply(this, arguments);
        return _possibleConstructorReturn(this, result);
      };
    }
    function _possibleConstructorReturn(self, call) {
      if (call && ('object' === _typeof(call) || 'function' == typeof call)) return call;
      return _assertThisInitialized(self);
    }
    function _assertThisInitialized(self) {
      if (void 0 === self) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      return self;
    }
    function _wrapNativeSuper(Class) {
      var _cache = 'function' == typeof Map ? new Map() : void 0;
      return (_wrapNativeSuper = function (Class) {
        if (null === Class || !_isNativeFunction(Class)) return Class;
        if ('function' != typeof Class) throw new TypeError('Super expression must either be null or a function');
        if ('undefined' != typeof _cache) {
          if (_cache.has(Class)) return _cache.get(Class);
          _cache.set(Class, Wrapper);
        }
        function Wrapper() {
          return _construct(Class, arguments, _getPrototypeOf(this).constructor);
        }
        Wrapper.prototype = Object.create(Class.prototype, {
          constructor: {
            value: Wrapper,
            enumerable: false,
            writable: true,
            configurable: true,
          },
        });
        return _setPrototypeOf(Wrapper, Class);
      })(Class);
    }
    function _construct(Parent, args, Class) {
      if (_isNativeReflectConstruct()) _construct = Reflect.construct;
      else
        _construct = function (Parent, args, Class) {
          var a = [null];
          a.push.apply(a, args);
          var instance = new (Function.bind.apply(Parent, a))();
          if (Class) _setPrototypeOf(instance, Class.prototype);
          return instance;
        };
      return _construct.apply(null, arguments);
    }
    function _isNativeReflectConstruct() {
      if ('undefined' == typeof Reflect || !Reflect.construct) return false;
      if (Reflect.construct.sham) return false;
      if ('function' == typeof Proxy) return true;
      try {
        Date.prototype.toString.call(Reflect.construct(Date, [], function () {}));
        return true;
      } catch (e) {
        return false;
      }
    }
    function _isNativeFunction(fn) {
      return -1 !== Function.toString.call(fn).indexOf('[native code]');
    }
    function _setPrototypeOf(o, p) {
      return (_setPrototypeOf =
        Object.setPrototypeOf ||
        function (o, p) {
          o.__proto__ = p;
          return o;
        })(o, p);
    }
    function _getPrototypeOf(o) {
      return (_getPrototypeOf = Object.setPrototypeOf
        ? Object.getPrototypeOf
        : function (o) {
            return o.__proto__ || Object.getPrototypeOf(o);
          })(o);
    }
    var GraphQLError = (function (_Error) {
      _inherits(GraphQLError, _Error);
      var _super = _createSuper(GraphQLError);
      function GraphQLError(message, nodes, source, positions, path, originalError, extensions) {
        var _locations2, _source2, _positions2, _extensions2;
        var _this;
        _classCallCheck(this, GraphQLError);
        _this = _super.call(this, message);
        var _nodes = Array.isArray(nodes) ? (0 !== nodes.length ? nodes : void 0) : nodes ? [nodes] : void 0;
        var _source = source;
        if (!_source && _nodes) {
          var _nodes$0$loc;
          _source = null === (_nodes$0$loc = _nodes[0].loc) || void 0 === _nodes$0$loc ? void 0 : _nodes$0$loc.source;
        }
        var _positions = positions;
        if (!_positions && _nodes)
          _positions = _nodes.reduce(function (list, node) {
            if (node.loc) list.push(node.loc.start);
            return list;
          }, []);
        if (_positions && 0 === _positions.length) _positions = void 0;
        var _locations;
        if (positions && source)
          _locations = positions.map(function (pos) {
            return (0, _location.getLocation)(source, pos);
          });
        else if (_nodes)
          _locations = _nodes.reduce(function (list, node) {
            if (node.loc) list.push((0, _location.getLocation)(node.loc.source, node.loc.start));
            return list;
          }, []);
        var _extensions = extensions;
        if (null == _extensions && null != originalError) {
          var originalExtensions = originalError.extensions;
          if ((0, _isObjectLike.default)(originalExtensions)) _extensions = originalExtensions;
        }
        Object.defineProperties(_assertThisInitialized(_this), {
          name: {
            value: 'GraphQLError',
          },
          message: {
            value: message,
            enumerable: true,
            writable: true,
          },
          locations: {
            value: null !== (_locations2 = _locations) && void 0 !== _locations2 ? _locations2 : void 0,
            enumerable: null != _locations,
          },
          path: {
            value: null != path ? path : void 0,
            enumerable: null != path,
          },
          nodes: {
            value: null != _nodes ? _nodes : void 0,
          },
          source: {
            value: null !== (_source2 = _source) && void 0 !== _source2 ? _source2 : void 0,
          },
          positions: {
            value: null !== (_positions2 = _positions) && void 0 !== _positions2 ? _positions2 : void 0,
          },
          originalError: {
            value: originalError,
          },
          extensions: {
            value: null !== (_extensions2 = _extensions) && void 0 !== _extensions2 ? _extensions2 : void 0,
            enumerable: null != _extensions,
          },
        });
        if (null != originalError && originalError.stack) {
          Object.defineProperty(_assertThisInitialized(_this), 'stack', {
            value: originalError.stack,
            writable: true,
            configurable: true,
          });
          return _possibleConstructorReturn(_this);
        }
        if (Error.captureStackTrace) Error.captureStackTrace(_assertThisInitialized(_this), GraphQLError);
        else
          Object.defineProperty(_assertThisInitialized(_this), 'stack', {
            value: Error().stack,
            writable: true,
            configurable: true,
          });
        return _this;
      }
      _createClass(GraphQLError, [
        {
          key: 'toString',
          value: function () {
            return printError(this);
          },
        },
        {
          key: _symbols.SYMBOL_TO_STRING_TAG,
          get: function () {
            return 'Object';
          },
        },
      ]);
      return GraphQLError;
    })(_wrapNativeSuper(Error));
    exports.GraphQLError = GraphQLError;
    function printError(error) {
      var output = error.message;
      if (error.nodes)
        for (var _i2 = 0, _error$nodes2 = error.nodes; _i2 < _error$nodes2.length; _i2++) {
          var node = _error$nodes2[_i2];
          if (node.loc) output += '\n\n' + (0, _printLocation.printLocation)(node.loc);
        }
      else if (error.source && error.locations)
        for (var _i4 = 0, _error$locations2 = error.locations; _i4 < _error$locations2.length; _i4++) {
          var location = _error$locations2[_i4];
          output += '\n\n' + (0, _printLocation.printSourceLocation)(error.source, location);
        }
      return output;
    }
  },
  '../../node_modules/graphql/error/locatedError.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.locatedError = function (rawOriginalError, nodes, path) {
      var _nodes;
      var originalError =
        rawOriginalError instanceof Error
          ? rawOriginalError
          : new Error('Unexpected error value: ' + (0, _inspect.default)(rawOriginalError));
      if (Array.isArray(originalError.path)) return originalError;
      return new _GraphQLError.GraphQLError(
        originalError.message,
        null !== (_nodes = originalError.nodes) && void 0 !== _nodes ? _nodes : nodes,
        originalError.source,
        originalError.positions,
        path,
        originalError
      );
    };
    var _inspect = (function (obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    })(__webpack_require__('../../node_modules/graphql/jsutils/inspect.js'));
    var _GraphQLError = __webpack_require__('../../node_modules/graphql/error/GraphQLError.js');
  },
  '../../node_modules/graphql/execution/execute.js': (__unused_webpack_module, exports, __webpack_require__) => {
    exports.gd = collectFields;
    _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/inspect.js'));
    var _memoize = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/memoize3.js'));
    _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/invariant.js'));
    _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/devAssert.js'));
    _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/isPromise.js'));
    _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/isObjectLike.js'));
    _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/safeArrayFrom.js'));
    _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/promiseReduce.js'));
    _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/promiseForObject.js'));
    __webpack_require__('../../node_modules/graphql/jsutils/Path.js');
    __webpack_require__('../../node_modules/graphql/error/GraphQLError.js');
    __webpack_require__('../../node_modules/graphql/error/locatedError.js');
    var _kinds = __webpack_require__('../../node_modules/graphql/language/kinds.js');
    __webpack_require__('../../node_modules/graphql/type/validate.js');
    __webpack_require__('../../node_modules/graphql/type/introspection.js');
    var _directives = __webpack_require__('../../node_modules/graphql/type/directives.js');
    var _definition = __webpack_require__('../../node_modules/graphql/type/definition.js');
    var _typeFromAST = __webpack_require__('../../node_modules/graphql/utilities/typeFromAST.js');
    __webpack_require__('../../node_modules/graphql/utilities/getOperationRootType.js');
    var _values = __webpack_require__('../../node_modules/graphql/execution/values.js');
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    }
    function collectFields(exeContext, runtimeType, selectionSet, fields, visitedFragmentNames) {
      for (var _i6 = 0, _selectionSet$selecti2 = selectionSet.selections; _i6 < _selectionSet$selecti2.length; _i6++) {
        var selection = _selectionSet$selecti2[_i6];
        switch (selection.kind) {
          case _kinds.Kind.FIELD:
            if (!shouldIncludeNode(exeContext, selection)) continue;
            var name = getFieldEntryKey(selection);
            if (!fields[name]) fields[name] = [];
            fields[name].push(selection);
            break;

          case _kinds.Kind.INLINE_FRAGMENT:
            if (
              !shouldIncludeNode(exeContext, selection) ||
              !doesFragmentConditionMatch(exeContext, selection, runtimeType)
            )
              continue;
            collectFields(exeContext, runtimeType, selection.selectionSet, fields, visitedFragmentNames);
            break;

          case _kinds.Kind.FRAGMENT_SPREAD:
            var fragName = selection.name.value;
            if (visitedFragmentNames[fragName] || !shouldIncludeNode(exeContext, selection)) continue;
            visitedFragmentNames[fragName] = true;
            var fragment = exeContext.fragments[fragName];
            if (!fragment || !doesFragmentConditionMatch(exeContext, fragment, runtimeType)) continue;
            collectFields(exeContext, runtimeType, fragment.selectionSet, fields, visitedFragmentNames);
            break;
        }
      }
      return fields;
    }
    function shouldIncludeNode(exeContext, node) {
      var skip = (0, _values.getDirectiveValues)(_directives.GraphQLSkipDirective, node, exeContext.variableValues);
      if (true === (null == skip ? void 0 : skip.if)) return false;
      var include = (0, _values.getDirectiveValues)(
        _directives.GraphQLIncludeDirective,
        node,
        exeContext.variableValues
      );
      if (false === (null == include ? void 0 : include.if)) return false;
      return true;
    }
    function doesFragmentConditionMatch(exeContext, fragment, type) {
      var typeConditionNode = fragment.typeCondition;
      if (!typeConditionNode) return true;
      var conditionalType = (0, _typeFromAST.typeFromAST)(exeContext.schema, typeConditionNode);
      if (conditionalType === type) return true;
      if ((0, _definition.isAbstractType)(conditionalType)) return exeContext.schema.isSubType(conditionalType, type);
      return false;
    }
    function getFieldEntryKey(node) {
      return node.alias ? node.alias.value : node.name.value;
    }
    (0, _memoize.default)(function (exeContext, returnType, fieldNodes) {
      var subFieldNodes = Object.create(null);
      var visitedFragmentNames = Object.create(null);
      for (var _i8 = 0; _i8 < fieldNodes.length; _i8++) {
        var node = fieldNodes[_i8];
        if (node.selectionSet)
          subFieldNodes = collectFields(exeContext, returnType, node.selectionSet, subFieldNodes, visitedFragmentNames);
      }
      return subFieldNodes;
    });
  },
  '../../node_modules/graphql/execution/values.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.getVariableValues = function (schema, varDefNodes, inputs, options) {
      var errors = [];
      var maxErrors = null == options ? void 0 : options.maxErrors;
      try {
        var coerced = coerceVariableValues(schema, varDefNodes, inputs, function (error) {
          if (null != maxErrors && errors.length >= maxErrors)
            throw new _GraphQLError.GraphQLError(
              'Too many errors processing variables, error limit reached. Execution aborted.'
            );
          errors.push(error);
        });
        if (0 === errors.length)
          return {
            coerced,
          };
      } catch (error) {
        errors.push(error);
      }
      return {
        errors,
      };
    };
    exports.getArgumentValues = getArgumentValues;
    exports.getDirectiveValues = function (directiveDef, node, variableValues) {
      var directiveNode =
        node.directives &&
        (0, _find.default)(node.directives, function (directive) {
          return directive.name.value === directiveDef.name;
        });
      if (directiveNode) return getArgumentValues(directiveDef, directiveNode, variableValues);
    };
    var _find = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/polyfills/find.js'));
    var _keyMap = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/keyMap.js'));
    var _inspect = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/inspect.js'));
    var _printPathArray = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/jsutils/printPathArray.js')
    );
    var _GraphQLError = __webpack_require__('../../node_modules/graphql/error/GraphQLError.js');
    var _kinds = __webpack_require__('../../node_modules/graphql/language/kinds.js');
    var _printer = __webpack_require__('../../node_modules/graphql/language/printer.js');
    var _definition = __webpack_require__('../../node_modules/graphql/type/definition.js');
    var _typeFromAST = __webpack_require__('../../node_modules/graphql/utilities/typeFromAST.js');
    var _valueFromAST = __webpack_require__('../../node_modules/graphql/utilities/valueFromAST.js');
    var _coerceInputValue = __webpack_require__('../../node_modules/graphql/utilities/coerceInputValue.js');
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    }
    function coerceVariableValues(schema, varDefNodes, inputs, onError) {
      var coercedValues = {};
      var _loop = function (_i2) {
        var varDefNode = varDefNodes[_i2];
        var varName = varDefNode.variable.name.value;
        var varType = (0, _typeFromAST.typeFromAST)(schema, varDefNode.type);
        if (!(0, _definition.isInputType)(varType)) {
          var varTypeStr = (0, _printer.print)(varDefNode.type);
          onError(
            new _GraphQLError.GraphQLError(
              'Variable "$'
                .concat(varName, '" expected value of type "')
                .concat(varTypeStr, '" which cannot be used as an input type.'),
              varDefNode.type
            )
          );
          return 'continue';
        }
        if (!hasOwnProperty(inputs, varName)) {
          if (varDefNode.defaultValue)
            coercedValues[varName] = (0, _valueFromAST.valueFromAST)(varDefNode.defaultValue, varType);
          else if ((0, _definition.isNonNullType)(varType)) {
            var _varTypeStr = (0, _inspect.default)(varType);
            onError(
              new _GraphQLError.GraphQLError(
                'Variable "$'.concat(varName, '" of required type "').concat(_varTypeStr, '" was not provided.'),
                varDefNode
              )
            );
          }
          return 'continue';
        }
        var value = inputs[varName];
        if (null === value && (0, _definition.isNonNullType)(varType)) {
          var _varTypeStr2 = (0, _inspect.default)(varType);
          onError(
            new _GraphQLError.GraphQLError(
              'Variable "$'.concat(varName, '" of non-null type "').concat(_varTypeStr2, '" must not be null.'),
              varDefNode
            )
          );
          return 'continue';
        }
        coercedValues[varName] = (0, _coerceInputValue.coerceInputValue)(
          value,
          varType,
          function (path, invalidValue, error) {
            var prefix = 'Variable "$'.concat(varName, '" got invalid value ') + (0, _inspect.default)(invalidValue);
            if (path.length > 0) prefix += ' at "'.concat(varName).concat((0, _printPathArray.default)(path), '"');
            onError(
              new _GraphQLError.GraphQLError(
                prefix + '; ' + error.message,
                varDefNode,
                void 0,
                void 0,
                void 0,
                error.originalError
              )
            );
          }
        );
      };
      for (var _i2 = 0; _i2 < varDefNodes.length; _i2++) if ('continue' === _loop(_i2)) continue;
      return coercedValues;
    }
    function getArgumentValues(def, node, variableValues) {
      var _node$arguments;
      var coercedValues = {};
      var argumentNodes =
        null !== (_node$arguments = node.arguments) && void 0 !== _node$arguments ? _node$arguments : [];
      var argNodeMap = (0, _keyMap.default)(argumentNodes, function (arg) {
        return arg.name.value;
      });
      for (var _i4 = 0, _def$args2 = def.args; _i4 < _def$args2.length; _i4++) {
        var argDef = _def$args2[_i4];
        var name = argDef.name;
        var argType = argDef.type;
        var argumentNode = argNodeMap[name];
        if (!argumentNode) {
          if (void 0 !== argDef.defaultValue) coercedValues[name] = argDef.defaultValue;
          else if ((0, _definition.isNonNullType)(argType))
            throw new _GraphQLError.GraphQLError(
              'Argument "'.concat(name, '" of required type "').concat((0, _inspect.default)(argType), '" ') +
                'was not provided.',
              node
            );
          continue;
        }
        var valueNode = argumentNode.value;
        var isNull = valueNode.kind === _kinds.Kind.NULL;
        if (valueNode.kind === _kinds.Kind.VARIABLE) {
          var variableName = valueNode.name.value;
          if (null == variableValues || !hasOwnProperty(variableValues, variableName)) {
            if (void 0 !== argDef.defaultValue) coercedValues[name] = argDef.defaultValue;
            else if ((0, _definition.isNonNullType)(argType))
              throw new _GraphQLError.GraphQLError(
                'Argument "'.concat(name, '" of required type "').concat((0, _inspect.default)(argType), '" ') +
                  'was provided the variable "$'.concat(variableName, '" which was not provided a runtime value.'),
                valueNode
              );
            continue;
          }
          isNull = null == variableValues[variableName];
        }
        if (isNull && (0, _definition.isNonNullType)(argType))
          throw new _GraphQLError.GraphQLError(
            'Argument "'.concat(name, '" of non-null type "').concat((0, _inspect.default)(argType), '" ') +
              'must not be null.',
            valueNode
          );
        var coercedValue = (0, _valueFromAST.valueFromAST)(valueNode, argType, variableValues);
        if (void 0 === coercedValue)
          throw new _GraphQLError.GraphQLError(
            'Argument "'.concat(name, '" has invalid value ').concat((0, _printer.print)(valueNode), '.'),
            valueNode
          );
        coercedValues[name] = coercedValue;
      }
      return coercedValues;
    }
    function hasOwnProperty(obj, prop) {
      return Object.prototype.hasOwnProperty.call(obj, prop);
    }
  },
  '../../node_modules/graphql/jsutils/Path.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.addPath = function (prev, key, typename) {
      return {
        prev,
        key,
        typename,
      };
    };
    exports.pathToArray = function (path) {
      var flattened = [];
      var curr = path;
      while (curr) {
        flattened.push(curr.key);
        curr = curr.prev;
      }
      return flattened.reverse();
    };
  },
  '../../node_modules/graphql/jsutils/defineInspect.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = function (classObject) {
      var fn = classObject.prototype.toJSON;
      'function' == typeof fn || (0, _invariant.default)(0);
      classObject.prototype.inspect = fn;
      if (_nodejsCustomInspectSymbol.default) classObject.prototype[_nodejsCustomInspectSymbol.default] = fn;
    };
    var _invariant = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/invariant.js'));
    var _nodejsCustomInspectSymbol = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/jsutils/nodejsCustomInspectSymbol.js')
    );
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    }
  },
  '../../node_modules/graphql/jsutils/devAssert.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = function (condition, message) {
      if (!Boolean(condition)) throw new Error(message);
    };
  },
  '../../node_modules/graphql/jsutils/didYouMean.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = function (firstArg, secondArg) {
      var _ref = 'string' == typeof firstArg ? [firstArg, secondArg] : [void 0, firstArg],
        subMessage = _ref[0];
      var message = ' Did you mean ';
      if (subMessage) message += subMessage + ' ';
      var suggestions = _ref[1].map(function (x) {
        return '"'.concat(x, '"');
      });
      switch (suggestions.length) {
        case 0:
          return '';

        case 1:
          return message + suggestions[0] + '?';

        case 2:
          return message + suggestions[0] + ' or ' + suggestions[1] + '?';
      }
      var selected = suggestions.slice(0, 5);
      var lastItem = selected.pop();
      return message + selected.join(', ') + ', or ' + lastItem + '?';
    };
  },
  '../../node_modules/graphql/jsutils/identityFunc.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = function (x) {
      return x;
    };
  },
  '../../node_modules/graphql/jsutils/inspect.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = function (value) {
      return formatValue(value, []);
    };
    var _nodejsCustomInspectSymbol = (function (obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    })(__webpack_require__('../../node_modules/graphql/jsutils/nodejsCustomInspectSymbol.js'));
    function _typeof(obj) {
      if ('function' == typeof Symbol && 'symbol' == typeof Symbol.iterator)
        _typeof = function (obj) {
          return typeof obj;
        };
      else
        _typeof = function (obj) {
          return obj && 'function' == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype
            ? 'symbol'
            : typeof obj;
        };
      return _typeof(obj);
    }
    function formatValue(value, seenValues) {
      switch (_typeof(value)) {
        case 'string':
          return JSON.stringify(value);

        case 'function':
          return value.name ? '[function '.concat(value.name, ']') : '[function]';

        case 'object':
          if (null === value) return 'null';
          return formatObjectValue(value, seenValues);

        default:
          return String(value);
      }
    }
    function formatObjectValue(value, previouslySeenValues) {
      if (-1 !== previouslySeenValues.indexOf(value)) return '[Circular]';
      var seenValues = [].concat(previouslySeenValues, [value]);
      var customInspectFn = getCustomFn(value);
      if (void 0 !== customInspectFn) {
        var customValue = customInspectFn.call(value);
        if (customValue !== value)
          return 'string' == typeof customValue ? customValue : formatValue(customValue, seenValues);
      } else if (Array.isArray(value)) return formatArray(value, seenValues);
      return formatObject(value, seenValues);
    }
    function formatObject(object, seenValues) {
      var keys = Object.keys(object);
      if (0 === keys.length) return '{}';
      if (seenValues.length > 2) return '[' + getObjectTag(object) + ']';
      return (
        '{ ' +
        keys
          .map(function (key) {
            return key + ': ' + formatValue(object[key], seenValues);
          })
          .join(', ') +
        ' }'
      );
    }
    function formatArray(array, seenValues) {
      if (0 === array.length) return '[]';
      if (seenValues.length > 2) return '[Array]';
      var len = Math.min(10, array.length);
      var remaining = array.length - len;
      var items = [];
      for (var i = 0; i < len; ++i) items.push(formatValue(array[i], seenValues));
      if (1 === remaining) items.push('... 1 more item');
      else if (remaining > 1) items.push('... '.concat(remaining, ' more items'));
      return '[' + items.join(', ') + ']';
    }
    function getCustomFn(object) {
      var customInspectFn = object[String(_nodejsCustomInspectSymbol.default)];
      if ('function' == typeof customInspectFn) return customInspectFn;
      if ('function' == typeof object.inspect) return object.inspect;
    }
    function getObjectTag(object) {
      var tag = Object.prototype.toString
        .call(object)
        .replace(/^\[object /, '')
        .replace(/]$/, '');
      if ('Object' === tag && 'function' == typeof object.constructor) {
        var name = object.constructor.name;
        if ('string' == typeof name && '' !== name) return name;
      }
      return tag;
    }
  },
  '../../node_modules/graphql/jsutils/instanceOf.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = void 0;
    (function (obj) {
      obj && obj.__esModule;
    })(__webpack_require__('../../node_modules/graphql/jsutils/inspect.js'));
    var _default = function (value, constructor) {
      return value instanceof constructor;
    };
    exports.default = _default;
  },
  '../../node_modules/graphql/jsutils/invariant.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = function (condition, message) {
      if (!Boolean(condition)) throw new Error(null != message ? message : 'Unexpected invariant triggered.');
    };
  },
  '../../node_modules/graphql/jsutils/isObjectLike.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = function (value) {
      return 'object' == _typeof(value) && null !== value;
    };
    function _typeof(obj) {
      if ('function' == typeof Symbol && 'symbol' == typeof Symbol.iterator)
        _typeof = function (obj) {
          return typeof obj;
        };
      else
        _typeof = function (obj) {
          return obj && 'function' == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype
            ? 'symbol'
            : typeof obj;
        };
      return _typeof(obj);
    }
  },
  '../../node_modules/graphql/jsutils/isPromise.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = function (value) {
      return 'function' == typeof (null == value ? void 0 : value.then);
    };
  },
  '../../node_modules/graphql/jsutils/keyMap.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = function (list, keyFn) {
      return list.reduce(function (map, item) {
        map[keyFn(item)] = item;
        return map;
      }, Object.create(null));
    };
  },
  '../../node_modules/graphql/jsutils/keyValMap.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = function (list, keyFn, valFn) {
      return list.reduce(function (map, item) {
        map[keyFn(item)] = valFn(item);
        return map;
      }, Object.create(null));
    };
  },
  '../../node_modules/graphql/jsutils/mapValue.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = function (map, fn) {
      var result = Object.create(null);
      for (var _i2 = 0, _objectEntries2 = (0, _objectEntries3.default)(map); _i2 < _objectEntries2.length; _i2++) {
        var _ref2 = _objectEntries2[_i2];
        var _key = _ref2[0];
        var _value = _ref2[1];
        result[_key] = fn(_value, _key);
      }
      return result;
    };
    var _objectEntries3 = (function (obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    })(__webpack_require__('../../node_modules/graphql/polyfills/objectEntries.js'));
  },
  '../../node_modules/graphql/jsutils/memoize3.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = function (fn) {
      var cache0;
      return function (a1, a2, a3) {
        if (!cache0) cache0 = new WeakMap();
        var cache1 = cache0.get(a1);
        var cache2;
        if (cache1) {
          if ((cache2 = cache1.get(a2))) {
            var cachedValue = cache2.get(a3);
            if (void 0 !== cachedValue) return cachedValue;
          }
        } else {
          cache1 = new WeakMap();
          cache0.set(a1, cache1);
        }
        if (!cache2) {
          cache2 = new WeakMap();
          cache1.set(a2, cache2);
        }
        var newValue = fn(a1, a2, a3);
        cache2.set(a3, newValue);
        return newValue;
      };
    };
  },
  '../../node_modules/graphql/jsutils/naturalCompare.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = function (aStr, bStr) {
      var aIdx = 0;
      var bIdx = 0;
      while (aIdx < aStr.length && bIdx < bStr.length) {
        var aChar = aStr.charCodeAt(aIdx);
        var bChar = bStr.charCodeAt(bIdx);
        if (isDigit(aChar) && isDigit(bChar)) {
          var aNum = 0;
          do {
            ++aIdx;
            aNum = 10 * aNum + aChar - DIGIT_0;
            aChar = aStr.charCodeAt(aIdx);
          } while (isDigit(aChar) && aNum > 0);
          var bNum = 0;
          do {
            ++bIdx;
            bNum = 10 * bNum + bChar - DIGIT_0;
            bChar = bStr.charCodeAt(bIdx);
          } while (isDigit(bChar) && bNum > 0);
          if (aNum < bNum) return -1;
          if (aNum > bNum) return 1;
        } else {
          if (aChar < bChar) return -1;
          if (aChar > bChar) return 1;
          ++aIdx;
          ++bIdx;
        }
      }
      return aStr.length - bStr.length;
    };
    var DIGIT_0 = 48;
    function isDigit(code) {
      return !isNaN(code) && DIGIT_0 <= code && code <= 57;
    }
  },
  '../../node_modules/graphql/jsutils/nodejsCustomInspectSymbol.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = void 0;
    var _default =
      'function' == typeof Symbol && 'function' == typeof Symbol.for
        ? Symbol.for('nodejs.util.inspect.custom')
        : void 0;
    exports.default = _default;
  },
  '../../node_modules/graphql/jsutils/printPathArray.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = function (path) {
      return path
        .map(function (key) {
          return 'number' == typeof key ? '[' + key.toString() + ']' : '.' + key;
        })
        .join('');
    };
  },
  '../../node_modules/graphql/jsutils/promiseForObject.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = function (object) {
      var keys = Object.keys(object);
      var valuesAndPromises = keys.map(function (name) {
        return object[name];
      });
      return Promise.all(valuesAndPromises).then(function (values) {
        return values.reduce(function (resolvedObject, value, i) {
          resolvedObject[keys[i]] = value;
          return resolvedObject;
        }, Object.create(null));
      });
    };
  },
  '../../node_modules/graphql/jsutils/promiseReduce.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = function (values, callback, initialValue) {
      return values.reduce(function (previous, value) {
        return (0, _isPromise.default)(previous)
          ? previous.then(function (resolved) {
              return callback(resolved, value);
            })
          : callback(previous, value);
      }, initialValue);
    };
    var _isPromise = (function (obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    })(__webpack_require__('../../node_modules/graphql/jsutils/isPromise.js'));
  },
  '../../node_modules/graphql/jsutils/safeArrayFrom.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = function (collection) {
      var mapFn =
        arguments.length > 1 && void 0 !== arguments[1]
          ? arguments[1]
          : function (item) {
              return item;
            };
      if (null == collection || 'object' !== _typeof(collection)) return null;
      if (Array.isArray(collection)) return collection.map(mapFn);
      var iteratorMethod = collection[_symbols.SYMBOL_ITERATOR];
      if ('function' == typeof iteratorMethod) {
        var iterator = iteratorMethod.call(collection);
        var result = [];
        var step;
        for (var i = 0; !(step = iterator.next()).done; ++i) result.push(mapFn(step.value, i));
        return result;
      }
      var length = collection.length;
      if ('number' == typeof length && length >= 0 && length % 1 == 0) {
        var _result = [];
        for (var _i = 0; _i < length; ++_i) {
          if (!Object.prototype.hasOwnProperty.call(collection, _i)) return null;
          _result.push(mapFn(collection[String(_i)], _i));
        }
        return _result;
      }
      return null;
    };
    var _symbols = __webpack_require__('../../node_modules/graphql/polyfills/symbols.js');
    function _typeof(obj) {
      if ('function' == typeof Symbol && 'symbol' == typeof Symbol.iterator)
        _typeof = function (obj) {
          return typeof obj;
        };
      else
        _typeof = function (obj) {
          return obj && 'function' == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype
            ? 'symbol'
            : typeof obj;
        };
      return _typeof(obj);
    }
  },
  '../../node_modules/graphql/jsutils/suggestionList.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = function (input, options) {
      var optionsByDistance = Object.create(null);
      var lexicalDistance = new LexicalDistance(input);
      var threshold = Math.floor(0.4 * input.length) + 1;
      for (var _i2 = 0; _i2 < options.length; _i2++) {
        var option = options[_i2];
        var distance = lexicalDistance.measure(option, threshold);
        if (void 0 !== distance) optionsByDistance[option] = distance;
      }
      return Object.keys(optionsByDistance).sort(function (a, b) {
        var distanceDiff = optionsByDistance[a] - optionsByDistance[b];
        return 0 !== distanceDiff ? distanceDiff : (0, _naturalCompare.default)(a, b);
      });
    };
    var _naturalCompare = (function (obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    })(__webpack_require__('../../node_modules/graphql/jsutils/naturalCompare.js'));
    var LexicalDistance = (function () {
      function LexicalDistance(input) {
        this._input = input;
        this._inputLowerCase = input.toLowerCase();
        this._inputArray = stringToArray(this._inputLowerCase);
        this._rows = [
          new Array(input.length + 1).fill(0),
          new Array(input.length + 1).fill(0),
          new Array(input.length + 1).fill(0),
        ];
      }
      LexicalDistance.prototype.measure = function (option, threshold) {
        if (this._input === option) return 0;
        var optionLowerCase = option.toLowerCase();
        if (this._inputLowerCase === optionLowerCase) return 1;
        var a = stringToArray(optionLowerCase);
        var b = this._inputArray;
        if (a.length < b.length) {
          var tmp = a;
          a = b;
          b = tmp;
        }
        var aLength = a.length;
        var bLength = b.length;
        if (aLength - bLength > threshold) return;
        var rows = this._rows;
        for (var j = 0; j <= bLength; j++) rows[0][j] = j;
        for (var i = 1; i <= aLength; i++) {
          var upRow = rows[(i - 1) % 3];
          var currentRow = rows[i % 3];
          var smallestCell = (currentRow[0] = i);
          for (var _j = 1; _j <= bLength; _j++) {
            var cost = a[i - 1] === b[_j - 1] ? 0 : 1;
            var currentCell = Math.min(upRow[_j] + 1, currentRow[_j - 1] + 1, upRow[_j - 1] + cost);
            if (i > 1 && _j > 1 && a[i - 1] === b[_j - 2] && a[i - 2] === b[_j - 1]) {
              var doubleDiagonalCell = rows[(i - 2) % 3][_j - 2];
              currentCell = Math.min(currentCell, doubleDiagonalCell + 1);
            }
            if (currentCell < smallestCell) smallestCell = currentCell;
            currentRow[_j] = currentCell;
          }
          if (smallestCell > threshold) return;
        }
        var distance = rows[aLength % 3][bLength];
        return distance <= threshold ? distance : void 0;
      };
      return LexicalDistance;
    })();
    function stringToArray(str) {
      var strLength = str.length;
      var array = new Array(strLength);
      for (var i = 0; i < strLength; ++i) array[i] = str.charCodeAt(i);
      return array;
    }
  },
  '../../node_modules/graphql/jsutils/toObjMap.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = function (obj) {
      if (null === Object.getPrototypeOf(obj)) return obj;
      var map = Object.create(null);
      for (var _i2 = 0, _objectEntries2 = (0, _objectEntries3.default)(obj); _i2 < _objectEntries2.length; _i2++) {
        var _ref2 = _objectEntries2[_i2];
        var key = _ref2[0];
        var value = _ref2[1];
        map[key] = value;
      }
      return map;
    };
    var _objectEntries3 = (function (obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    })(__webpack_require__('../../node_modules/graphql/polyfills/objectEntries.js'));
  },
  '../../node_modules/graphql/language/ast.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.isNode = function (maybeNode) {
      return null != maybeNode && 'string' == typeof maybeNode.kind;
    };
    exports.Token = exports.Location = void 0;
    var _defineInspect = (function (obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    })(__webpack_require__('../../node_modules/graphql/jsutils/defineInspect.js'));
    var Location = (function () {
      function Location(startToken, endToken, source) {
        this.start = startToken.start;
        this.end = endToken.end;
        this.startToken = startToken;
        this.endToken = endToken;
        this.source = source;
      }
      Location.prototype.toJSON = function () {
        return {
          start: this.start,
          end: this.end,
        };
      };
      return Location;
    })();
    exports.Location = Location;
    (0, _defineInspect.default)(Location);
    var Token = (function () {
      function Token(kind, start, end, line, column, prev, value) {
        this.kind = kind;
        this.start = start;
        this.end = end;
        this.line = line;
        this.column = column;
        this.value = value;
        this.prev = prev;
        this.next = null;
      }
      Token.prototype.toJSON = function () {
        return {
          kind: this.kind,
          value: this.value,
          line: this.line,
          column: this.column,
        };
      };
      return Token;
    })();
    exports.Token = Token;
    (0, _defineInspect.default)(Token);
  },
  '../../node_modules/graphql/language/blockString.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.dedentBlockStringValue = function (rawString) {
      var lines = rawString.split(/\r\n|[\n\r]/g);
      var commonIndent = getBlockStringIndentation(rawString);
      if (0 !== commonIndent) for (var i = 1; i < lines.length; i++) lines[i] = lines[i].slice(commonIndent);
      var startLine = 0;
      while (startLine < lines.length && isBlank(lines[startLine])) ++startLine;
      var endLine = lines.length;
      while (endLine > startLine && isBlank(lines[endLine - 1])) --endLine;
      return lines.slice(startLine, endLine).join('\n');
    };
    exports.getBlockStringIndentation = getBlockStringIndentation;
    exports.printBlockString = function (value) {
      var indentation = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : '';
      var preferMultipleLines = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : false;
      var isSingleLine = -1 === value.indexOf('\n');
      var hasLeadingSpace = ' ' === value[0] || '\t' === value[0];
      var hasTrailingQuote = '"' === value[value.length - 1];
      var hasTrailingSlash = '\\' === value[value.length - 1];
      var printAsMultipleLines = !isSingleLine || hasTrailingQuote || hasTrailingSlash || preferMultipleLines;
      var result = '';
      if (printAsMultipleLines && !(isSingleLine && hasLeadingSpace)) result += '\n' + indentation;
      result += indentation ? value.replace(/\n/g, '\n' + indentation) : value;
      if (printAsMultipleLines) result += '\n';
      return '"""' + result.replace(/"""/g, '\\"""') + '"""';
    };
    function isBlank(str) {
      for (var i = 0; i < str.length; ++i) if (' ' !== str[i] && '\t' !== str[i]) return false;
      return true;
    }
    function getBlockStringIndentation(value) {
      var _commonIndent;
      var isFirstLine = true;
      var isEmptyLine = true;
      var indent = 0;
      var commonIndent = null;
      for (var i = 0; i < value.length; ++i)
        switch (value.charCodeAt(i)) {
          case 13:
            if (10 === value.charCodeAt(i + 1)) ++i;

          case 10:
            isFirstLine = false;
            isEmptyLine = true;
            indent = 0;
            break;

          case 9:
          case 32:
            ++indent;
            break;

          default:
            if (isEmptyLine && !isFirstLine && (null === commonIndent || indent < commonIndent)) commonIndent = indent;
            isEmptyLine = false;
        }
      return null !== (_commonIndent = commonIndent) && void 0 !== _commonIndent ? _commonIndent : 0;
    }
  },
  '../../node_modules/graphql/language/directiveLocation.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.DirectiveLocation = void 0;
    var DirectiveLocation = Object.freeze({
      QUERY: 'QUERY',
      MUTATION: 'MUTATION',
      SUBSCRIPTION: 'SUBSCRIPTION',
      FIELD: 'FIELD',
      FRAGMENT_DEFINITION: 'FRAGMENT_DEFINITION',
      FRAGMENT_SPREAD: 'FRAGMENT_SPREAD',
      INLINE_FRAGMENT: 'INLINE_FRAGMENT',
      VARIABLE_DEFINITION: 'VARIABLE_DEFINITION',
      SCHEMA: 'SCHEMA',
      SCALAR: 'SCALAR',
      OBJECT: 'OBJECT',
      FIELD_DEFINITION: 'FIELD_DEFINITION',
      ARGUMENT_DEFINITION: 'ARGUMENT_DEFINITION',
      INTERFACE: 'INTERFACE',
      UNION: 'UNION',
      ENUM: 'ENUM',
      ENUM_VALUE: 'ENUM_VALUE',
      INPUT_OBJECT: 'INPUT_OBJECT',
      INPUT_FIELD_DEFINITION: 'INPUT_FIELD_DEFINITION',
    });
    exports.DirectiveLocation = DirectiveLocation;
  },
  '../../node_modules/graphql/language/kinds.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.Kind = void 0;
    var Kind = Object.freeze({
      NAME: 'Name',
      DOCUMENT: 'Document',
      OPERATION_DEFINITION: 'OperationDefinition',
      VARIABLE_DEFINITION: 'VariableDefinition',
      SELECTION_SET: 'SelectionSet',
      FIELD: 'Field',
      ARGUMENT: 'Argument',
      FRAGMENT_SPREAD: 'FragmentSpread',
      INLINE_FRAGMENT: 'InlineFragment',
      FRAGMENT_DEFINITION: 'FragmentDefinition',
      VARIABLE: 'Variable',
      INT: 'IntValue',
      FLOAT: 'FloatValue',
      STRING: 'StringValue',
      BOOLEAN: 'BooleanValue',
      NULL: 'NullValue',
      ENUM: 'EnumValue',
      LIST: 'ListValue',
      OBJECT: 'ObjectValue',
      OBJECT_FIELD: 'ObjectField',
      DIRECTIVE: 'Directive',
      NAMED_TYPE: 'NamedType',
      LIST_TYPE: 'ListType',
      NON_NULL_TYPE: 'NonNullType',
      SCHEMA_DEFINITION: 'SchemaDefinition',
      OPERATION_TYPE_DEFINITION: 'OperationTypeDefinition',
      SCALAR_TYPE_DEFINITION: 'ScalarTypeDefinition',
      OBJECT_TYPE_DEFINITION: 'ObjectTypeDefinition',
      FIELD_DEFINITION: 'FieldDefinition',
      INPUT_VALUE_DEFINITION: 'InputValueDefinition',
      INTERFACE_TYPE_DEFINITION: 'InterfaceTypeDefinition',
      UNION_TYPE_DEFINITION: 'UnionTypeDefinition',
      ENUM_TYPE_DEFINITION: 'EnumTypeDefinition',
      ENUM_VALUE_DEFINITION: 'EnumValueDefinition',
      INPUT_OBJECT_TYPE_DEFINITION: 'InputObjectTypeDefinition',
      DIRECTIVE_DEFINITION: 'DirectiveDefinition',
      SCHEMA_EXTENSION: 'SchemaExtension',
      SCALAR_TYPE_EXTENSION: 'ScalarTypeExtension',
      OBJECT_TYPE_EXTENSION: 'ObjectTypeExtension',
      INTERFACE_TYPE_EXTENSION: 'InterfaceTypeExtension',
      UNION_TYPE_EXTENSION: 'UnionTypeExtension',
      ENUM_TYPE_EXTENSION: 'EnumTypeExtension',
      INPUT_OBJECT_TYPE_EXTENSION: 'InputObjectTypeExtension',
    });
    exports.Kind = Kind;
  },
  '../../node_modules/graphql/language/location.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.getLocation = function (source, position) {
      var lineRegexp = /\r\n|[\n\r]/g;
      var line = 1;
      var column = position + 1;
      var match;
      while ((match = lineRegexp.exec(source.body)) && match.index < position) {
        line += 1;
        column = position + 1 - (match.index + match[0].length);
      }
      return {
        line,
        column,
      };
    };
  },
  '../../node_modules/graphql/language/printLocation.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.printLocation = function (location) {
      return printSourceLocation(location.source, (0, _location.getLocation)(location.source, location.start));
    };
    exports.printSourceLocation = printSourceLocation;
    var _location = __webpack_require__('../../node_modules/graphql/language/location.js');
    function printSourceLocation(source, sourceLocation) {
      var firstLineColumnOffset = source.locationOffset.column - 1;
      var body = whitespace(firstLineColumnOffset) + source.body;
      var lineIndex = sourceLocation.line - 1;
      var lineOffset = source.locationOffset.line - 1;
      var lineNum = sourceLocation.line + lineOffset;
      var columnOffset = 1 === sourceLocation.line ? firstLineColumnOffset : 0;
      var columnNum = sourceLocation.column + columnOffset;
      var locationStr = ''.concat(source.name, ':').concat(lineNum, ':').concat(columnNum, '\n');
      var lines = body.split(/\r\n|[\n\r]/g);
      var locationLine = lines[lineIndex];
      if (locationLine.length > 120) {
        var subLineIndex = Math.floor(columnNum / 80);
        var subLineColumnNum = columnNum % 80;
        var subLines = [];
        for (var i = 0; i < locationLine.length; i += 80) subLines.push(locationLine.slice(i, i + 80));
        return (
          locationStr +
          printPrefixedLines(
            [[''.concat(lineNum), subLines[0]]].concat(
              subLines.slice(1, subLineIndex + 1).map(function (subLine) {
                return ['', subLine];
              }),
              [
                [' ', whitespace(subLineColumnNum - 1) + '^'],
                ['', subLines[subLineIndex + 1]],
              ]
            )
          )
        );
      }
      return (
        locationStr +
        printPrefixedLines([
          [''.concat(lineNum - 1), lines[lineIndex - 1]],
          [''.concat(lineNum), locationLine],
          ['', whitespace(columnNum - 1) + '^'],
          [''.concat(lineNum + 1), lines[lineIndex + 1]],
        ])
      );
    }
    function printPrefixedLines(lines) {
      var existingLines = lines.filter(function (_ref) {
        _ref[0];
        return void 0 !== _ref[1];
      });
      var padLen = Math.max.apply(
        Math,
        existingLines.map(function (_ref2) {
          return _ref2[0].length;
        })
      );
      return existingLines
        .map(function (_ref3) {
          var prefix = _ref3[0],
            line = _ref3[1];
          return leftPad(padLen, prefix) + (line ? ' | ' + line : ' |');
        })
        .join('\n');
    }
    function whitespace(len) {
      return Array(len + 1).join(' ');
    }
    function leftPad(len, str) {
      return whitespace(len - str.length) + str;
    }
  },
  '../../node_modules/graphql/language/printer.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.print = function (ast) {
      return (0, _visitor.visit)(ast, {
        leave: printDocASTReducer,
      });
    };
    var _visitor = __webpack_require__('../../node_modules/graphql/language/visitor.js');
    var _blockString = __webpack_require__('../../node_modules/graphql/language/blockString.js');
    var printDocASTReducer = {
      Name: function (node) {
        return node.value;
      },
      Variable: function (node) {
        return '$' + node.name;
      },
      Document: function (node) {
        return join(node.definitions, '\n\n') + '\n';
      },
      OperationDefinition: function (node) {
        var op = node.operation;
        var name = node.name;
        var varDefs = wrap('(', join(node.variableDefinitions, ', '), ')');
        var directives = join(node.directives, ' ');
        var selectionSet = node.selectionSet;
        return !name && !directives && !varDefs && 'query' === op
          ? selectionSet
          : join([op, join([name, varDefs]), directives, selectionSet], ' ');
      },
      VariableDefinition: function (_ref) {
        var variable = _ref.variable,
          type = _ref.type,
          defaultValue = _ref.defaultValue,
          directives = _ref.directives;
        return variable + ': ' + type + wrap(' = ', defaultValue) + wrap(' ', join(directives, ' '));
      },
      SelectionSet: function (_ref2) {
        return block(_ref2.selections);
      },
      Field: function (_ref3) {
        var alias = _ref3.alias,
          name = _ref3.name,
          args = _ref3.arguments,
          directives = _ref3.directives,
          selectionSet = _ref3.selectionSet;
        var prefix = wrap('', alias, ': ') + name;
        var argsLine = prefix + wrap('(', join(args, ', '), ')');
        if (argsLine.length > 80) argsLine = prefix + wrap('(\n', indent(join(args, '\n')), '\n)');
        return join([argsLine, join(directives, ' '), selectionSet], ' ');
      },
      Argument: function (_ref4) {
        return _ref4.name + ': ' + _ref4.value;
      },
      FragmentSpread: function (_ref5) {
        return '...' + _ref5.name + wrap(' ', join(_ref5.directives, ' '));
      },
      InlineFragment: function (_ref6) {
        var typeCondition = _ref6.typeCondition,
          directives = _ref6.directives,
          selectionSet = _ref6.selectionSet;
        return join(['...', wrap('on ', typeCondition), join(directives, ' '), selectionSet], ' ');
      },
      FragmentDefinition: function (_ref7) {
        var name = _ref7.name,
          typeCondition = _ref7.typeCondition,
          variableDefinitions = _ref7.variableDefinitions,
          directives = _ref7.directives,
          selectionSet = _ref7.selectionSet;
        return (
          'fragment '.concat(name).concat(wrap('(', join(variableDefinitions, ', '), ')'), ' ') +
          'on '.concat(typeCondition, ' ').concat(wrap('', join(directives, ' '), ' ')) +
          selectionSet
        );
      },
      IntValue: function (_ref8) {
        return _ref8.value;
      },
      FloatValue: function (_ref9) {
        return _ref9.value;
      },
      StringValue: function (_ref10, key) {
        var value = _ref10.value;
        return _ref10.block
          ? (0, _blockString.printBlockString)(value, 'description' === key ? '' : '  ')
          : JSON.stringify(value);
      },
      BooleanValue: function (_ref11) {
        return _ref11.value ? 'true' : 'false';
      },
      NullValue: function () {
        return 'null';
      },
      EnumValue: function (_ref12) {
        return _ref12.value;
      },
      ListValue: function (_ref13) {
        return '[' + join(_ref13.values, ', ') + ']';
      },
      ObjectValue: function (_ref14) {
        return '{' + join(_ref14.fields, ', ') + '}';
      },
      ObjectField: function (_ref15) {
        return _ref15.name + ': ' + _ref15.value;
      },
      Directive: function (_ref16) {
        return '@' + _ref16.name + wrap('(', join(_ref16.arguments, ', '), ')');
      },
      NamedType: function (_ref17) {
        return _ref17.name;
      },
      ListType: function (_ref18) {
        return '[' + _ref18.type + ']';
      },
      NonNullType: function (_ref19) {
        return _ref19.type + '!';
      },
      SchemaDefinition: addDescription(function (_ref20) {
        var directives = _ref20.directives,
          operationTypes = _ref20.operationTypes;
        return join(['schema', join(directives, ' '), block(operationTypes)], ' ');
      }),
      OperationTypeDefinition: function (_ref21) {
        return _ref21.operation + ': ' + _ref21.type;
      },
      ScalarTypeDefinition: addDescription(function (_ref22) {
        return join(['scalar', _ref22.name, join(_ref22.directives, ' ')], ' ');
      }),
      ObjectTypeDefinition: addDescription(function (_ref23) {
        var name = _ref23.name,
          interfaces = _ref23.interfaces,
          directives = _ref23.directives,
          fields = _ref23.fields;
        return join(
          ['type', name, wrap('implements ', join(interfaces, ' & ')), join(directives, ' '), block(fields)],
          ' '
        );
      }),
      FieldDefinition: addDescription(function (_ref24) {
        var name = _ref24.name,
          args = _ref24.arguments,
          type = _ref24.type,
          directives = _ref24.directives;
        return (
          name +
          (hasMultilineItems(args) ? wrap('(\n', indent(join(args, '\n')), '\n)') : wrap('(', join(args, ', '), ')')) +
          ': ' +
          type +
          wrap(' ', join(directives, ' '))
        );
      }),
      InputValueDefinition: addDescription(function (_ref25) {
        var name = _ref25.name,
          type = _ref25.type,
          defaultValue = _ref25.defaultValue,
          directives = _ref25.directives;
        return join([name + ': ' + type, wrap('= ', defaultValue), join(directives, ' ')], ' ');
      }),
      InterfaceTypeDefinition: addDescription(function (_ref26) {
        var name = _ref26.name,
          interfaces = _ref26.interfaces,
          directives = _ref26.directives,
          fields = _ref26.fields;
        return join(
          ['interface', name, wrap('implements ', join(interfaces, ' & ')), join(directives, ' '), block(fields)],
          ' '
        );
      }),
      UnionTypeDefinition: addDescription(function (_ref27) {
        var name = _ref27.name,
          directives = _ref27.directives,
          types = _ref27.types;
        return join(
          ['union', name, join(directives, ' '), types && 0 !== types.length ? '= ' + join(types, ' | ') : ''],
          ' '
        );
      }),
      EnumTypeDefinition: addDescription(function (_ref28) {
        var name = _ref28.name,
          directives = _ref28.directives,
          values = _ref28.values;
        return join(['enum', name, join(directives, ' '), block(values)], ' ');
      }),
      EnumValueDefinition: addDescription(function (_ref29) {
        return join([_ref29.name, join(_ref29.directives, ' ')], ' ');
      }),
      InputObjectTypeDefinition: addDescription(function (_ref30) {
        var name = _ref30.name,
          directives = _ref30.directives,
          fields = _ref30.fields;
        return join(['input', name, join(directives, ' '), block(fields)], ' ');
      }),
      DirectiveDefinition: addDescription(function (_ref31) {
        var name = _ref31.name,
          args = _ref31.arguments,
          repeatable = _ref31.repeatable,
          locations = _ref31.locations;
        return (
          'directive @' +
          name +
          (hasMultilineItems(args) ? wrap('(\n', indent(join(args, '\n')), '\n)') : wrap('(', join(args, ', '), ')')) +
          (repeatable ? ' repeatable' : '') +
          ' on ' +
          join(locations, ' | ')
        );
      }),
      SchemaExtension: function (_ref32) {
        var directives = _ref32.directives,
          operationTypes = _ref32.operationTypes;
        return join(['extend schema', join(directives, ' '), block(operationTypes)], ' ');
      },
      ScalarTypeExtension: function (_ref33) {
        return join(['extend scalar', _ref33.name, join(_ref33.directives, ' ')], ' ');
      },
      ObjectTypeExtension: function (_ref34) {
        var name = _ref34.name,
          interfaces = _ref34.interfaces,
          directives = _ref34.directives,
          fields = _ref34.fields;
        return join(
          ['extend type', name, wrap('implements ', join(interfaces, ' & ')), join(directives, ' '), block(fields)],
          ' '
        );
      },
      InterfaceTypeExtension: function (_ref35) {
        var name = _ref35.name,
          interfaces = _ref35.interfaces,
          directives = _ref35.directives,
          fields = _ref35.fields;
        return join(
          [
            'extend interface',
            name,
            wrap('implements ', join(interfaces, ' & ')),
            join(directives, ' '),
            block(fields),
          ],
          ' '
        );
      },
      UnionTypeExtension: function (_ref36) {
        var name = _ref36.name,
          directives = _ref36.directives,
          types = _ref36.types;
        return join(
          ['extend union', name, join(directives, ' '), types && 0 !== types.length ? '= ' + join(types, ' | ') : ''],
          ' '
        );
      },
      EnumTypeExtension: function (_ref37) {
        var name = _ref37.name,
          directives = _ref37.directives,
          values = _ref37.values;
        return join(['extend enum', name, join(directives, ' '), block(values)], ' ');
      },
      InputObjectTypeExtension: function (_ref38) {
        var name = _ref38.name,
          directives = _ref38.directives,
          fields = _ref38.fields;
        return join(['extend input', name, join(directives, ' '), block(fields)], ' ');
      },
    };
    function addDescription(cb) {
      return function (node) {
        return join([node.description, cb(node)], '\n');
      };
    }
    function join(maybeArray) {
      var _maybeArray$filter$jo;
      var separator = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : '';
      return null !==
        (_maybeArray$filter$jo =
          null == maybeArray
            ? void 0
            : maybeArray
                .filter(function (x) {
                  return x;
                })
                .join(separator)) && void 0 !== _maybeArray$filter$jo
        ? _maybeArray$filter$jo
        : '';
    }
    function block(array) {
      return wrap('{\n', indent(join(array, '\n')), '\n}');
    }
    function wrap(start, maybeString) {
      var end = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : '';
      return null != maybeString && '' !== maybeString ? start + maybeString + end : '';
    }
    function indent(str) {
      return wrap('  ', str.replace(/\n/g, '\n  '));
    }
    function isMultiline(str) {
      return -1 !== str.indexOf('\n');
    }
    function hasMultilineItems(maybeArray) {
      return null != maybeArray && maybeArray.some(isMultiline);
    }
  },
  '../../node_modules/graphql/language/visitor.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.visit = function (root, visitor) {
      var visitorKeys = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : QueryDocumentKeys;
      var stack = void 0;
      var inArray = Array.isArray(root);
      var keys = [root];
      var index = -1;
      var edits = [];
      var node = void 0;
      var key = void 0;
      var parent = void 0;
      var path = [];
      var ancestors = [];
      var newRoot = root;
      do {
        var isLeaving = ++index === keys.length;
        var isEdited = isLeaving && 0 !== edits.length;
        if (isLeaving) {
          key = 0 === ancestors.length ? void 0 : path[path.length - 1];
          node = parent;
          parent = ancestors.pop();
          if (isEdited) {
            if (inArray) node = node.slice();
            else {
              var clone = {};
              for (var _i2 = 0, _Object$keys2 = Object.keys(node); _i2 < _Object$keys2.length; _i2++) {
                var k = _Object$keys2[_i2];
                clone[k] = node[k];
              }
              node = clone;
            }
            var editOffset = 0;
            for (var ii = 0; ii < edits.length; ii++) {
              var editKey = edits[ii][0];
              var editValue = edits[ii][1];
              if (inArray) editKey -= editOffset;
              if (inArray && null === editValue) {
                node.splice(editKey, 1);
                editOffset++;
              } else node[editKey] = editValue;
            }
          }
          index = stack.index;
          keys = stack.keys;
          edits = stack.edits;
          inArray = stack.inArray;
          stack = stack.prev;
        } else {
          key = parent ? (inArray ? index : keys[index]) : void 0;
          if (null == (node = parent ? parent[key] : newRoot)) continue;
          if (parent) path.push(key);
        }
        var result = void 0;
        if (!Array.isArray(node)) {
          if (!(0, _ast.isNode)(node)) throw new Error('Invalid AST Node: '.concat((0, _inspect.default)(node), '.'));
          var visitFn = getVisitFn(visitor, node.kind, isLeaving);
          if (visitFn) {
            if ((result = visitFn.call(visitor, node, key, parent, path, ancestors)) === BREAK) break;
            if (false === result) {
              if (!isLeaving) {
                path.pop();
                continue;
              }
            } else if (void 0 !== result) {
              edits.push([key, result]);
              if (!isLeaving)
                if ((0, _ast.isNode)(result)) node = result;
                else {
                  path.pop();
                  continue;
                }
            }
          }
        }
        if (void 0 === result && isEdited) edits.push([key, node]);
        if (isLeaving) path.pop();
        else {
          var _visitorKeys$node$kin;
          stack = {
            inArray,
            index,
            keys,
            edits,
            prev: stack,
          };
          keys = (inArray = Array.isArray(node))
            ? node
            : null !== (_visitorKeys$node$kin = visitorKeys[node.kind]) && void 0 !== _visitorKeys$node$kin
            ? _visitorKeys$node$kin
            : [];
          index = -1;
          edits = [];
          if (parent) ancestors.push(parent);
          parent = node;
        }
      } while (void 0 !== stack);
      if (0 !== edits.length) newRoot = edits[edits.length - 1][1];
      return newRoot;
    };
    exports.visitInParallel = function (visitors) {
      var skipping = new Array(visitors.length);
      return {
        enter: function (node) {
          for (var i = 0; i < visitors.length; i++)
            if (null == skipping[i]) {
              var fn = getVisitFn(visitors[i], node.kind, false);
              if (fn) {
                var result = fn.apply(visitors[i], arguments);
                if (false === result) skipping[i] = node;
                else if (result === BREAK) skipping[i] = BREAK;
                else if (void 0 !== result) return result;
              }
            }
        },
        leave: function (node) {
          for (var i = 0; i < visitors.length; i++)
            if (null == skipping[i]) {
              var fn = getVisitFn(visitors[i], node.kind, true);
              if (fn) {
                var result = fn.apply(visitors[i], arguments);
                if (result === BREAK) skipping[i] = BREAK;
                else if (void 0 !== result && false !== result) return result;
              }
            } else if (skipping[i] === node) skipping[i] = null;
        },
      };
    };
    exports.getVisitFn = getVisitFn;
    exports.BREAK = exports.QueryDocumentKeys = void 0;
    var _inspect = (function (obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    })(__webpack_require__('../../node_modules/graphql/jsutils/inspect.js'));
    var _ast = __webpack_require__('../../node_modules/graphql/language/ast.js');
    var QueryDocumentKeys = {
      Name: [],
      Document: ['definitions'],
      OperationDefinition: ['name', 'variableDefinitions', 'directives', 'selectionSet'],
      VariableDefinition: ['variable', 'type', 'defaultValue', 'directives'],
      Variable: ['name'],
      SelectionSet: ['selections'],
      Field: ['alias', 'name', 'arguments', 'directives', 'selectionSet'],
      Argument: ['name', 'value'],
      FragmentSpread: ['name', 'directives'],
      InlineFragment: ['typeCondition', 'directives', 'selectionSet'],
      FragmentDefinition: ['name', 'variableDefinitions', 'typeCondition', 'directives', 'selectionSet'],
      IntValue: [],
      FloatValue: [],
      StringValue: [],
      BooleanValue: [],
      NullValue: [],
      EnumValue: [],
      ListValue: ['values'],
      ObjectValue: ['fields'],
      ObjectField: ['name', 'value'],
      Directive: ['name', 'arguments'],
      NamedType: ['name'],
      ListType: ['type'],
      NonNullType: ['type'],
      SchemaDefinition: ['description', 'directives', 'operationTypes'],
      OperationTypeDefinition: ['type'],
      ScalarTypeDefinition: ['description', 'name', 'directives'],
      ObjectTypeDefinition: ['description', 'name', 'interfaces', 'directives', 'fields'],
      FieldDefinition: ['description', 'name', 'arguments', 'type', 'directives'],
      InputValueDefinition: ['description', 'name', 'type', 'defaultValue', 'directives'],
      InterfaceTypeDefinition: ['description', 'name', 'interfaces', 'directives', 'fields'],
      UnionTypeDefinition: ['description', 'name', 'directives', 'types'],
      EnumTypeDefinition: ['description', 'name', 'directives', 'values'],
      EnumValueDefinition: ['description', 'name', 'directives'],
      InputObjectTypeDefinition: ['description', 'name', 'directives', 'fields'],
      DirectiveDefinition: ['description', 'name', 'arguments', 'locations'],
      SchemaExtension: ['directives', 'operationTypes'],
      ScalarTypeExtension: ['name', 'directives'],
      ObjectTypeExtension: ['name', 'interfaces', 'directives', 'fields'],
      InterfaceTypeExtension: ['name', 'interfaces', 'directives', 'fields'],
      UnionTypeExtension: ['name', 'directives', 'types'],
      EnumTypeExtension: ['name', 'directives', 'values'],
      InputObjectTypeExtension: ['name', 'directives', 'fields'],
    };
    exports.QueryDocumentKeys = QueryDocumentKeys;
    var BREAK = Object.freeze({});
    exports.BREAK = BREAK;
    function getVisitFn(visitor, kind, isLeaving) {
      var kindVisitor = visitor[kind];
      if (kindVisitor) {
        if (!isLeaving && 'function' == typeof kindVisitor) return kindVisitor;
        var kindSpecificVisitor = isLeaving ? kindVisitor.leave : kindVisitor.enter;
        if ('function' == typeof kindSpecificVisitor) return kindSpecificVisitor;
      } else {
        var specificVisitor = isLeaving ? visitor.leave : visitor.enter;
        if (specificVisitor) {
          if ('function' == typeof specificVisitor) return specificVisitor;
          var specificKindVisitor = specificVisitor[kind];
          if ('function' == typeof specificKindVisitor) return specificKindVisitor;
        }
      }
    }
  },
  '../../node_modules/graphql/polyfills/arrayFrom.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = void 0;
    var _symbols = __webpack_require__('../../node_modules/graphql/polyfills/symbols.js');
    var _default =
      Array.from ||
      function (obj, mapFn, thisArg) {
        if (null == obj) throw new TypeError('Array.from requires an array-like object - not null or undefined');
        var iteratorMethod = obj[_symbols.SYMBOL_ITERATOR];
        if ('function' == typeof iteratorMethod) {
          var iterator = iteratorMethod.call(obj);
          var result = [];
          var step;
          for (var i = 0; !(step = iterator.next()).done; ++i) {
            result.push(mapFn.call(thisArg, step.value, i));
            if (i > 9999999) throw new TypeError('Near-infinite iteration.');
          }
          return result;
        }
        var length = obj.length;
        if ('number' == typeof length && length >= 0 && length % 1 == 0) {
          var _result = [];
          for (var _i = 0; _i < length; ++_i)
            if (Object.prototype.hasOwnProperty.call(obj, _i)) _result.push(mapFn.call(thisArg, obj[_i], _i));
          return _result;
        }
        return [];
      };
    exports.default = _default;
  },
  '../../node_modules/graphql/polyfills/find.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = void 0;
    var _default = Array.prototype.find
      ? function (list, predicate) {
          return Array.prototype.find.call(list, predicate);
        }
      : function (list, predicate) {
          for (var _i2 = 0; _i2 < list.length; _i2++) {
            var value = list[_i2];
            if (predicate(value)) return value;
          }
        };
    exports.default = _default;
  },
  '../../node_modules/graphql/polyfills/isFinite.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = void 0;
    var _default =
      Number.isFinite ||
      function (value) {
        return 'number' == typeof value && isFinite(value);
      };
    exports.default = _default;
  },
  '../../node_modules/graphql/polyfills/isInteger.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = void 0;
    var _default =
      Number.isInteger ||
      function (value) {
        return 'number' == typeof value && isFinite(value) && Math.floor(value) === value;
      };
    exports.default = _default;
  },
  '../../node_modules/graphql/polyfills/objectEntries.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = void 0;
    var _default =
      Object.entries ||
      function (obj) {
        return Object.keys(obj).map(function (key) {
          return [key, obj[key]];
        });
      };
    exports.default = _default;
  },
  '../../node_modules/graphql/polyfills/objectValues.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.default = void 0;
    var _default =
      Object.values ||
      function (obj) {
        return Object.keys(obj).map(function (key) {
          return obj[key];
        });
      };
    exports.default = _default;
  },
  '../../node_modules/graphql/polyfills/symbols.js': (__unused_webpack_module, exports) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.SYMBOL_TO_STRING_TAG = exports.SYMBOL_ASYNC_ITERATOR = exports.SYMBOL_ITERATOR = void 0;
    var SYMBOL_ITERATOR = 'function' == typeof Symbol && null != Symbol.iterator ? Symbol.iterator : '@@iterator';
    exports.SYMBOL_ITERATOR = SYMBOL_ITERATOR;
    var SYMBOL_ASYNC_ITERATOR =
      'function' == typeof Symbol && null != Symbol.asyncIterator ? Symbol.asyncIterator : '@@asyncIterator';
    exports.SYMBOL_ASYNC_ITERATOR = SYMBOL_ASYNC_ITERATOR;
    var SYMBOL_TO_STRING_TAG =
      'function' == typeof Symbol && null != Symbol.toStringTag ? Symbol.toStringTag : '@@toStringTag';
    exports.SYMBOL_TO_STRING_TAG = SYMBOL_TO_STRING_TAG;
  },
  '../../node_modules/graphql/type/definition.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.isType = isType;
    exports.assertType = assertType;
    exports.isScalarType = isScalarType;
    exports.assertScalarType = function (type) {
      if (!isScalarType(type))
        throw new Error('Expected '.concat((0, _inspect.default)(type), ' to be a GraphQL Scalar type.'));
      return type;
    };
    exports.isObjectType = isObjectType;
    exports.assertObjectType = function (type) {
      if (!isObjectType(type))
        throw new Error('Expected '.concat((0, _inspect.default)(type), ' to be a GraphQL Object type.'));
      return type;
    };
    exports.isInterfaceType = isInterfaceType;
    exports.assertInterfaceType = function (type) {
      if (!isInterfaceType(type))
        throw new Error('Expected '.concat((0, _inspect.default)(type), ' to be a GraphQL Interface type.'));
      return type;
    };
    exports.isUnionType = isUnionType;
    exports.assertUnionType = function (type) {
      if (!isUnionType(type))
        throw new Error('Expected '.concat((0, _inspect.default)(type), ' to be a GraphQL Union type.'));
      return type;
    };
    exports.isEnumType = isEnumType;
    exports.assertEnumType = function (type) {
      if (!isEnumType(type))
        throw new Error('Expected '.concat((0, _inspect.default)(type), ' to be a GraphQL Enum type.'));
      return type;
    };
    exports.isInputObjectType = isInputObjectType;
    exports.assertInputObjectType = function (type) {
      if (!isInputObjectType(type))
        throw new Error('Expected '.concat((0, _inspect.default)(type), ' to be a GraphQL Input Object type.'));
      return type;
    };
    exports.isListType = isListType;
    exports.assertListType = function (type) {
      if (!isListType(type))
        throw new Error('Expected '.concat((0, _inspect.default)(type), ' to be a GraphQL List type.'));
      return type;
    };
    exports.isNonNullType = isNonNullType;
    exports.assertNonNullType = function (type) {
      if (!isNonNullType(type))
        throw new Error('Expected '.concat((0, _inspect.default)(type), ' to be a GraphQL Non-Null type.'));
      return type;
    };
    exports.isInputType = isInputType;
    exports.assertInputType = function (type) {
      if (!isInputType(type))
        throw new Error('Expected '.concat((0, _inspect.default)(type), ' to be a GraphQL input type.'));
      return type;
    };
    exports.isOutputType = isOutputType;
    exports.assertOutputType = function (type) {
      if (!isOutputType(type))
        throw new Error('Expected '.concat((0, _inspect.default)(type), ' to be a GraphQL output type.'));
      return type;
    };
    exports.isLeafType = isLeafType;
    exports.assertLeafType = function (type) {
      if (!isLeafType(type))
        throw new Error('Expected '.concat((0, _inspect.default)(type), ' to be a GraphQL leaf type.'));
      return type;
    };
    exports.isCompositeType = isCompositeType;
    exports.assertCompositeType = function (type) {
      if (!isCompositeType(type))
        throw new Error('Expected '.concat((0, _inspect.default)(type), ' to be a GraphQL composite type.'));
      return type;
    };
    exports.isAbstractType = isAbstractType;
    exports.assertAbstractType = function (type) {
      if (!isAbstractType(type))
        throw new Error('Expected '.concat((0, _inspect.default)(type), ' to be a GraphQL abstract type.'));
      return type;
    };
    exports.GraphQLList = GraphQLList;
    exports.GraphQLNonNull = GraphQLNonNull;
    exports.isWrappingType = isWrappingType;
    exports.assertWrappingType = function (type) {
      if (!isWrappingType(type))
        throw new Error('Expected '.concat((0, _inspect.default)(type), ' to be a GraphQL wrapping type.'));
      return type;
    };
    exports.isNullableType = isNullableType;
    exports.assertNullableType = assertNullableType;
    exports.getNullableType = function (type) {
      if (type) return isNonNullType(type) ? type.ofType : type;
    };
    exports.isNamedType = isNamedType;
    exports.assertNamedType = function (type) {
      if (!isNamedType(type))
        throw new Error('Expected '.concat((0, _inspect.default)(type), ' to be a GraphQL named type.'));
      return type;
    };
    exports.getNamedType = function (type) {
      if (type) {
        var unwrappedType = type;
        while (isWrappingType(unwrappedType)) unwrappedType = unwrappedType.ofType;
        return unwrappedType;
      }
    };
    exports.argsToArgsConfig = argsToArgsConfig;
    exports.isRequiredArgument = function (arg) {
      return isNonNullType(arg.type) && void 0 === arg.defaultValue;
    };
    exports.isRequiredInputField = function (field) {
      return isNonNullType(field.type) && void 0 === field.defaultValue;
    };
    exports.GraphQLInputObjectType =
      exports.GraphQLEnumType =
      exports.GraphQLUnionType =
      exports.GraphQLInterfaceType =
      exports.GraphQLObjectType =
      exports.GraphQLScalarType =
        void 0;
    var _objectEntries = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/polyfills/objectEntries.js')
    );
    var _symbols = __webpack_require__('../../node_modules/graphql/polyfills/symbols.js');
    var _inspect = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/inspect.js'));
    var _keyMap = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/keyMap.js'));
    var _mapValue = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/mapValue.js'));
    var _toObjMap = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/toObjMap.js'));
    var _devAssert = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/devAssert.js'));
    var _keyValMap = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/keyValMap.js'));
    var _instanceOf = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/instanceOf.js'));
    var _didYouMean = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/didYouMean.js'));
    var _isObjectLike = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/jsutils/isObjectLike.js')
    );
    var _identityFunc = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/jsutils/identityFunc.js')
    );
    var _defineInspect = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/jsutils/defineInspect.js')
    );
    var _suggestionList = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/jsutils/suggestionList.js')
    );
    var _GraphQLError = __webpack_require__('../../node_modules/graphql/error/GraphQLError.js');
    var _kinds = __webpack_require__('../../node_modules/graphql/language/kinds.js');
    var _printer = __webpack_require__('../../node_modules/graphql/language/printer.js');
    var _valueFromASTUntyped = __webpack_require__('../../node_modules/graphql/utilities/valueFromASTUntyped.js');
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    }
    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ('value' in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }
    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      return Constructor;
    }
    function isType(type) {
      return (
        isScalarType(type) ||
        isObjectType(type) ||
        isInterfaceType(type) ||
        isUnionType(type) ||
        isEnumType(type) ||
        isInputObjectType(type) ||
        isListType(type) ||
        isNonNullType(type)
      );
    }
    function assertType(type) {
      if (!isType(type)) throw new Error('Expected '.concat((0, _inspect.default)(type), ' to be a GraphQL type.'));
      return type;
    }
    function isScalarType(type) {
      return (0, _instanceOf.default)(type, GraphQLScalarType);
    }
    function isObjectType(type) {
      return (0, _instanceOf.default)(type, GraphQLObjectType);
    }
    function isInterfaceType(type) {
      return (0, _instanceOf.default)(type, GraphQLInterfaceType);
    }
    function isUnionType(type) {
      return (0, _instanceOf.default)(type, GraphQLUnionType);
    }
    function isEnumType(type) {
      return (0, _instanceOf.default)(type, GraphQLEnumType);
    }
    function isInputObjectType(type) {
      return (0, _instanceOf.default)(type, GraphQLInputObjectType);
    }
    function isListType(type) {
      return (0, _instanceOf.default)(type, GraphQLList);
    }
    function isNonNullType(type) {
      return (0, _instanceOf.default)(type, GraphQLNonNull);
    }
    function isInputType(type) {
      return (
        isScalarType(type) ||
        isEnumType(type) ||
        isInputObjectType(type) ||
        (isWrappingType(type) && isInputType(type.ofType))
      );
    }
    function isOutputType(type) {
      return (
        isScalarType(type) ||
        isObjectType(type) ||
        isInterfaceType(type) ||
        isUnionType(type) ||
        isEnumType(type) ||
        (isWrappingType(type) && isOutputType(type.ofType))
      );
    }
    function isLeafType(type) {
      return isScalarType(type) || isEnumType(type);
    }
    function isCompositeType(type) {
      return isObjectType(type) || isInterfaceType(type) || isUnionType(type);
    }
    function isAbstractType(type) {
      return isInterfaceType(type) || isUnionType(type);
    }
    function GraphQLList(ofType) {
      if (this instanceof GraphQLList) this.ofType = assertType(ofType);
      else return new GraphQLList(ofType);
    }
    GraphQLList.prototype.toString = function () {
      return '[' + String(this.ofType) + ']';
    };
    GraphQLList.prototype.toJSON = function () {
      return this.toString();
    };
    Object.defineProperty(GraphQLList.prototype, _symbols.SYMBOL_TO_STRING_TAG, {
      get: function () {
        return 'GraphQLList';
      },
    });
    (0, _defineInspect.default)(GraphQLList);
    function GraphQLNonNull(ofType) {
      if (this instanceof GraphQLNonNull) this.ofType = assertNullableType(ofType);
      else return new GraphQLNonNull(ofType);
    }
    GraphQLNonNull.prototype.toString = function () {
      return String(this.ofType) + '!';
    };
    GraphQLNonNull.prototype.toJSON = function () {
      return this.toString();
    };
    Object.defineProperty(GraphQLNonNull.prototype, _symbols.SYMBOL_TO_STRING_TAG, {
      get: function () {
        return 'GraphQLNonNull';
      },
    });
    (0, _defineInspect.default)(GraphQLNonNull);
    function isWrappingType(type) {
      return isListType(type) || isNonNullType(type);
    }
    function isNullableType(type) {
      return isType(type) && !isNonNullType(type);
    }
    function assertNullableType(type) {
      if (!isNullableType(type))
        throw new Error('Expected '.concat((0, _inspect.default)(type), ' to be a GraphQL nullable type.'));
      return type;
    }
    function isNamedType(type) {
      return (
        isScalarType(type) ||
        isObjectType(type) ||
        isInterfaceType(type) ||
        isUnionType(type) ||
        isEnumType(type) ||
        isInputObjectType(type)
      );
    }
    function resolveThunk(thunk) {
      return 'function' == typeof thunk ? thunk() : thunk;
    }
    function undefineIfEmpty(arr) {
      return arr && arr.length > 0 ? arr : void 0;
    }
    var GraphQLScalarType = (function () {
      function GraphQLScalarType(config) {
        var _config$parseValue, _config$serialize, _config$parseLiteral;
        var parseValue =
          null !== (_config$parseValue = config.parseValue) && void 0 !== _config$parseValue
            ? _config$parseValue
            : _identityFunc.default;
        this.name = config.name;
        this.description = config.description;
        this.specifiedByUrl = config.specifiedByUrl;
        this.serialize =
          null !== (_config$serialize = config.serialize) && void 0 !== _config$serialize
            ? _config$serialize
            : _identityFunc.default;
        this.parseValue = parseValue;
        this.parseLiteral =
          null !== (_config$parseLiteral = config.parseLiteral) && void 0 !== _config$parseLiteral
            ? _config$parseLiteral
            : function (node, variables) {
                return parseValue((0, _valueFromASTUntyped.valueFromASTUntyped)(node, variables));
              };
        this.extensions = config.extensions && (0, _toObjMap.default)(config.extensions);
        this.astNode = config.astNode;
        this.extensionASTNodes = undefineIfEmpty(config.extensionASTNodes);
        'string' == typeof config.name || (0, _devAssert.default)(0, 'Must provide name.');
        null == config.specifiedByUrl ||
          'string' == typeof config.specifiedByUrl ||
          (0, _devAssert.default)(
            0,
            ''.concat(this.name, ' must provide "specifiedByUrl" as a string, ') +
              'but got: '.concat((0, _inspect.default)(config.specifiedByUrl), '.')
          );
        null == config.serialize ||
          'function' == typeof config.serialize ||
          (0, _devAssert.default)(
            0,
            ''.concat(
              this.name,
              ' must provide "serialize" function. If this custom Scalar is also used as an input type, ensure "parseValue" and "parseLiteral" functions are also provided.'
            )
          );
        if (config.parseLiteral)
          ('function' == typeof config.parseValue && 'function' == typeof config.parseLiteral) ||
            (0, _devAssert.default)(
              0,
              ''.concat(this.name, ' must provide both "parseValue" and "parseLiteral" functions.')
            );
      }
      var _proto = GraphQLScalarType.prototype;
      _proto.toConfig = function () {
        var _this$extensionASTNod;
        return {
          name: this.name,
          description: this.description,
          specifiedByUrl: this.specifiedByUrl,
          serialize: this.serialize,
          parseValue: this.parseValue,
          parseLiteral: this.parseLiteral,
          extensions: this.extensions,
          astNode: this.astNode,
          extensionASTNodes:
            null !== (_this$extensionASTNod = this.extensionASTNodes) && void 0 !== _this$extensionASTNod
              ? _this$extensionASTNod
              : [],
        };
      };
      _proto.toString = function () {
        return this.name;
      };
      _proto.toJSON = function () {
        return this.toString();
      };
      _createClass(GraphQLScalarType, [
        {
          key: _symbols.SYMBOL_TO_STRING_TAG,
          get: function () {
            return 'GraphQLScalarType';
          },
        },
      ]);
      return GraphQLScalarType;
    })();
    exports.GraphQLScalarType = GraphQLScalarType;
    (0, _defineInspect.default)(GraphQLScalarType);
    var GraphQLObjectType = (function () {
      function GraphQLObjectType(config) {
        this.name = config.name;
        this.description = config.description;
        this.isTypeOf = config.isTypeOf;
        this.extensions = config.extensions && (0, _toObjMap.default)(config.extensions);
        this.astNode = config.astNode;
        this.extensionASTNodes = undefineIfEmpty(config.extensionASTNodes);
        this._fields = defineFieldMap.bind(void 0, config);
        this._interfaces = defineInterfaces.bind(void 0, config);
        'string' == typeof config.name || (0, _devAssert.default)(0, 'Must provide name.');
        null == config.isTypeOf ||
          'function' == typeof config.isTypeOf ||
          (0, _devAssert.default)(
            0,
            ''.concat(this.name, ' must provide "isTypeOf" as a function, ') +
              'but got: '.concat((0, _inspect.default)(config.isTypeOf), '.')
          );
      }
      var _proto2 = GraphQLObjectType.prototype;
      _proto2.getFields = function () {
        if ('function' == typeof this._fields) this._fields = this._fields();
        return this._fields;
      };
      _proto2.getInterfaces = function () {
        if ('function' == typeof this._interfaces) this._interfaces = this._interfaces();
        return this._interfaces;
      };
      _proto2.toConfig = function () {
        return {
          name: this.name,
          description: this.description,
          interfaces: this.getInterfaces(),
          fields: fieldsToFieldsConfig(this.getFields()),
          isTypeOf: this.isTypeOf,
          extensions: this.extensions,
          astNode: this.astNode,
          extensionASTNodes: this.extensionASTNodes || [],
        };
      };
      _proto2.toString = function () {
        return this.name;
      };
      _proto2.toJSON = function () {
        return this.toString();
      };
      _createClass(GraphQLObjectType, [
        {
          key: _symbols.SYMBOL_TO_STRING_TAG,
          get: function () {
            return 'GraphQLObjectType';
          },
        },
      ]);
      return GraphQLObjectType;
    })();
    exports.GraphQLObjectType = GraphQLObjectType;
    (0, _defineInspect.default)(GraphQLObjectType);
    function defineInterfaces(config) {
      var _resolveThunk;
      var interfaces =
        null !== (_resolveThunk = resolveThunk(config.interfaces)) && void 0 !== _resolveThunk ? _resolveThunk : [];
      Array.isArray(interfaces) ||
        (0, _devAssert.default)(
          0,
          ''.concat(config.name, ' interfaces must be an Array or a function which returns an Array.')
        );
      return interfaces;
    }
    function defineFieldMap(config) {
      var fieldMap = resolveThunk(config.fields);
      isPlainObj(fieldMap) ||
        (0, _devAssert.default)(
          0,
          ''.concat(
            config.name,
            ' fields must be an object with field names as keys or a function which returns such an object.'
          )
        );
      return (0, _mapValue.default)(fieldMap, function (fieldConfig, fieldName) {
        var _fieldConfig$args;
        isPlainObj(fieldConfig) ||
          (0, _devAssert.default)(0, ''.concat(config.name, '.').concat(fieldName, ' field config must be an object.'));
        !('isDeprecated' in fieldConfig) ||
          (0, _devAssert.default)(
            0,
            ''
              .concat(config.name, '.')
              .concat(fieldName, ' should provide "deprecationReason" instead of "isDeprecated".')
          );
        null == fieldConfig.resolve ||
          'function' == typeof fieldConfig.resolve ||
          (0, _devAssert.default)(
            0,
            ''.concat(config.name, '.').concat(fieldName, ' field resolver must be a function if ') +
              'provided, but got: '.concat((0, _inspect.default)(fieldConfig.resolve), '.')
          );
        var argsConfig =
          null !== (_fieldConfig$args = fieldConfig.args) && void 0 !== _fieldConfig$args ? _fieldConfig$args : {};
        isPlainObj(argsConfig) ||
          (0, _devAssert.default)(
            0,
            ''.concat(config.name, '.').concat(fieldName, ' args must be an object with argument names as keys.')
          );
        var args = (0, _objectEntries.default)(argsConfig).map(function (_ref) {
          var argName = _ref[0],
            argConfig = _ref[1];
          return {
            name: argName,
            description: argConfig.description,
            type: argConfig.type,
            defaultValue: argConfig.defaultValue,
            deprecationReason: argConfig.deprecationReason,
            extensions: argConfig.extensions && (0, _toObjMap.default)(argConfig.extensions),
            astNode: argConfig.astNode,
          };
        });
        return {
          name: fieldName,
          description: fieldConfig.description,
          type: fieldConfig.type,
          args,
          resolve: fieldConfig.resolve,
          subscribe: fieldConfig.subscribe,
          isDeprecated: null != fieldConfig.deprecationReason,
          deprecationReason: fieldConfig.deprecationReason,
          extensions: fieldConfig.extensions && (0, _toObjMap.default)(fieldConfig.extensions),
          astNode: fieldConfig.astNode,
        };
      });
    }
    function isPlainObj(obj) {
      return (0, _isObjectLike.default)(obj) && !Array.isArray(obj);
    }
    function fieldsToFieldsConfig(fields) {
      return (0, _mapValue.default)(fields, function (field) {
        return {
          description: field.description,
          type: field.type,
          args: argsToArgsConfig(field.args),
          resolve: field.resolve,
          subscribe: field.subscribe,
          deprecationReason: field.deprecationReason,
          extensions: field.extensions,
          astNode: field.astNode,
        };
      });
    }
    function argsToArgsConfig(args) {
      return (0, _keyValMap.default)(
        args,
        function (arg) {
          return arg.name;
        },
        function (arg) {
          return {
            description: arg.description,
            type: arg.type,
            defaultValue: arg.defaultValue,
            deprecationReason: arg.deprecationReason,
            extensions: arg.extensions,
            astNode: arg.astNode,
          };
        }
      );
    }
    var GraphQLInterfaceType = (function () {
      function GraphQLInterfaceType(config) {
        this.name = config.name;
        this.description = config.description;
        this.resolveType = config.resolveType;
        this.extensions = config.extensions && (0, _toObjMap.default)(config.extensions);
        this.astNode = config.astNode;
        this.extensionASTNodes = undefineIfEmpty(config.extensionASTNodes);
        this._fields = defineFieldMap.bind(void 0, config);
        this._interfaces = defineInterfaces.bind(void 0, config);
        'string' == typeof config.name || (0, _devAssert.default)(0, 'Must provide name.');
        null == config.resolveType ||
          'function' == typeof config.resolveType ||
          (0, _devAssert.default)(
            0,
            ''.concat(this.name, ' must provide "resolveType" as a function, ') +
              'but got: '.concat((0, _inspect.default)(config.resolveType), '.')
          );
      }
      var _proto3 = GraphQLInterfaceType.prototype;
      _proto3.getFields = function () {
        if ('function' == typeof this._fields) this._fields = this._fields();
        return this._fields;
      };
      _proto3.getInterfaces = function () {
        if ('function' == typeof this._interfaces) this._interfaces = this._interfaces();
        return this._interfaces;
      };
      _proto3.toConfig = function () {
        var _this$extensionASTNod2;
        return {
          name: this.name,
          description: this.description,
          interfaces: this.getInterfaces(),
          fields: fieldsToFieldsConfig(this.getFields()),
          resolveType: this.resolveType,
          extensions: this.extensions,
          astNode: this.astNode,
          extensionASTNodes:
            null !== (_this$extensionASTNod2 = this.extensionASTNodes) && void 0 !== _this$extensionASTNod2
              ? _this$extensionASTNod2
              : [],
        };
      };
      _proto3.toString = function () {
        return this.name;
      };
      _proto3.toJSON = function () {
        return this.toString();
      };
      _createClass(GraphQLInterfaceType, [
        {
          key: _symbols.SYMBOL_TO_STRING_TAG,
          get: function () {
            return 'GraphQLInterfaceType';
          },
        },
      ]);
      return GraphQLInterfaceType;
    })();
    exports.GraphQLInterfaceType = GraphQLInterfaceType;
    (0, _defineInspect.default)(GraphQLInterfaceType);
    var GraphQLUnionType = (function () {
      function GraphQLUnionType(config) {
        this.name = config.name;
        this.description = config.description;
        this.resolveType = config.resolveType;
        this.extensions = config.extensions && (0, _toObjMap.default)(config.extensions);
        this.astNode = config.astNode;
        this.extensionASTNodes = undefineIfEmpty(config.extensionASTNodes);
        this._types = defineTypes.bind(void 0, config);
        'string' == typeof config.name || (0, _devAssert.default)(0, 'Must provide name.');
        null == config.resolveType ||
          'function' == typeof config.resolveType ||
          (0, _devAssert.default)(
            0,
            ''.concat(this.name, ' must provide "resolveType" as a function, ') +
              'but got: '.concat((0, _inspect.default)(config.resolveType), '.')
          );
      }
      var _proto4 = GraphQLUnionType.prototype;
      _proto4.getTypes = function () {
        if ('function' == typeof this._types) this._types = this._types();
        return this._types;
      };
      _proto4.toConfig = function () {
        var _this$extensionASTNod3;
        return {
          name: this.name,
          description: this.description,
          types: this.getTypes(),
          resolveType: this.resolveType,
          extensions: this.extensions,
          astNode: this.astNode,
          extensionASTNodes:
            null !== (_this$extensionASTNod3 = this.extensionASTNodes) && void 0 !== _this$extensionASTNod3
              ? _this$extensionASTNod3
              : [],
        };
      };
      _proto4.toString = function () {
        return this.name;
      };
      _proto4.toJSON = function () {
        return this.toString();
      };
      _createClass(GraphQLUnionType, [
        {
          key: _symbols.SYMBOL_TO_STRING_TAG,
          get: function () {
            return 'GraphQLUnionType';
          },
        },
      ]);
      return GraphQLUnionType;
    })();
    exports.GraphQLUnionType = GraphQLUnionType;
    (0, _defineInspect.default)(GraphQLUnionType);
    function defineTypes(config) {
      var types = resolveThunk(config.types);
      Array.isArray(types) ||
        (0, _devAssert.default)(
          0,
          'Must provide Array of types or a function which returns such an array for Union '.concat(config.name, '.')
        );
      return types;
    }
    var GraphQLEnumType = (function () {
      function GraphQLEnumType(config) {
        this.name = config.name;
        this.description = config.description;
        this.extensions = config.extensions && (0, _toObjMap.default)(config.extensions);
        this.astNode = config.astNode;
        this.extensionASTNodes = undefineIfEmpty(config.extensionASTNodes);
        this._values = defineEnumValues(this.name, config.values);
        this._valueLookup = new Map(
          this._values.map(function (enumValue) {
            return [enumValue.value, enumValue];
          })
        );
        this._nameLookup = (0, _keyMap.default)(this._values, function (value) {
          return value.name;
        });
        'string' == typeof config.name || (0, _devAssert.default)(0, 'Must provide name.');
      }
      var _proto5 = GraphQLEnumType.prototype;
      _proto5.getValues = function () {
        return this._values;
      };
      _proto5.getValue = function (name) {
        return this._nameLookup[name];
      };
      _proto5.serialize = function (outputValue) {
        var enumValue = this._valueLookup.get(outputValue);
        if (void 0 === enumValue)
          throw new _GraphQLError.GraphQLError(
            'Enum "'.concat(this.name, '" cannot represent value: ').concat((0, _inspect.default)(outputValue))
          );
        return enumValue.name;
      };
      _proto5.parseValue = function (inputValue) {
        if ('string' != typeof inputValue) {
          var valueStr = (0, _inspect.default)(inputValue);
          throw new _GraphQLError.GraphQLError(
            'Enum "'.concat(this.name, '" cannot represent non-string value: ').concat(valueStr, '.') +
              didYouMeanEnumValue(this, valueStr)
          );
        }
        var enumValue = this.getValue(inputValue);
        if (null == enumValue)
          throw new _GraphQLError.GraphQLError(
            'Value "'.concat(inputValue, '" does not exist in "').concat(this.name, '" enum.') +
              didYouMeanEnumValue(this, inputValue)
          );
        return enumValue.value;
      };
      _proto5.parseLiteral = function (valueNode, _variables) {
        if (valueNode.kind !== _kinds.Kind.ENUM) {
          var valueStr = (0, _printer.print)(valueNode);
          throw new _GraphQLError.GraphQLError(
            'Enum "'.concat(this.name, '" cannot represent non-enum value: ').concat(valueStr, '.') +
              didYouMeanEnumValue(this, valueStr),
            valueNode
          );
        }
        var enumValue = this.getValue(valueNode.value);
        if (null == enumValue) {
          var _valueStr = (0, _printer.print)(valueNode);
          throw new _GraphQLError.GraphQLError(
            'Value "'.concat(_valueStr, '" does not exist in "').concat(this.name, '" enum.') +
              didYouMeanEnumValue(this, _valueStr),
            valueNode
          );
        }
        return enumValue.value;
      };
      _proto5.toConfig = function () {
        var _this$extensionASTNod4;
        var values = (0, _keyValMap.default)(
          this.getValues(),
          function (value) {
            return value.name;
          },
          function (value) {
            return {
              description: value.description,
              value: value.value,
              deprecationReason: value.deprecationReason,
              extensions: value.extensions,
              astNode: value.astNode,
            };
          }
        );
        return {
          name: this.name,
          description: this.description,
          values,
          extensions: this.extensions,
          astNode: this.astNode,
          extensionASTNodes:
            null !== (_this$extensionASTNod4 = this.extensionASTNodes) && void 0 !== _this$extensionASTNod4
              ? _this$extensionASTNod4
              : [],
        };
      };
      _proto5.toString = function () {
        return this.name;
      };
      _proto5.toJSON = function () {
        return this.toString();
      };
      _createClass(GraphQLEnumType, [
        {
          key: _symbols.SYMBOL_TO_STRING_TAG,
          get: function () {
            return 'GraphQLEnumType';
          },
        },
      ]);
      return GraphQLEnumType;
    })();
    exports.GraphQLEnumType = GraphQLEnumType;
    (0, _defineInspect.default)(GraphQLEnumType);
    function didYouMeanEnumValue(enumType, unknownValueStr) {
      var allNames = enumType.getValues().map(function (value) {
        return value.name;
      });
      var suggestedValues = (0, _suggestionList.default)(unknownValueStr, allNames);
      return (0, _didYouMean.default)('the enum value', suggestedValues);
    }
    function defineEnumValues(typeName, valueMap) {
      isPlainObj(valueMap) ||
        (0, _devAssert.default)(0, ''.concat(typeName, ' values must be an object with value names as keys.'));
      return (0, _objectEntries.default)(valueMap).map(function (_ref2) {
        var valueName = _ref2[0],
          valueConfig = _ref2[1];
        isPlainObj(valueConfig) ||
          (0, _devAssert.default)(
            0,
            ''.concat(typeName, '.').concat(valueName, ' must refer to an object with a "value" key ') +
              'representing an internal value but got: '.concat((0, _inspect.default)(valueConfig), '.')
          );
        !('isDeprecated' in valueConfig) ||
          (0, _devAssert.default)(
            0,
            ''.concat(typeName, '.').concat(valueName, ' should provide "deprecationReason" instead of "isDeprecated".')
          );
        return {
          name: valueName,
          description: valueConfig.description,
          value: void 0 !== valueConfig.value ? valueConfig.value : valueName,
          isDeprecated: null != valueConfig.deprecationReason,
          deprecationReason: valueConfig.deprecationReason,
          extensions: valueConfig.extensions && (0, _toObjMap.default)(valueConfig.extensions),
          astNode: valueConfig.astNode,
        };
      });
    }
    var GraphQLInputObjectType = (function () {
      function GraphQLInputObjectType(config) {
        this.name = config.name;
        this.description = config.description;
        this.extensions = config.extensions && (0, _toObjMap.default)(config.extensions);
        this.astNode = config.astNode;
        this.extensionASTNodes = undefineIfEmpty(config.extensionASTNodes);
        this._fields = defineInputFieldMap.bind(void 0, config);
        'string' == typeof config.name || (0, _devAssert.default)(0, 'Must provide name.');
      }
      var _proto6 = GraphQLInputObjectType.prototype;
      _proto6.getFields = function () {
        if ('function' == typeof this._fields) this._fields = this._fields();
        return this._fields;
      };
      _proto6.toConfig = function () {
        var _this$extensionASTNod5;
        var fields = (0, _mapValue.default)(this.getFields(), function (field) {
          return {
            description: field.description,
            type: field.type,
            defaultValue: field.defaultValue,
            extensions: field.extensions,
            astNode: field.astNode,
          };
        });
        return {
          name: this.name,
          description: this.description,
          fields,
          extensions: this.extensions,
          astNode: this.astNode,
          extensionASTNodes:
            null !== (_this$extensionASTNod5 = this.extensionASTNodes) && void 0 !== _this$extensionASTNod5
              ? _this$extensionASTNod5
              : [],
        };
      };
      _proto6.toString = function () {
        return this.name;
      };
      _proto6.toJSON = function () {
        return this.toString();
      };
      _createClass(GraphQLInputObjectType, [
        {
          key: _symbols.SYMBOL_TO_STRING_TAG,
          get: function () {
            return 'GraphQLInputObjectType';
          },
        },
      ]);
      return GraphQLInputObjectType;
    })();
    exports.GraphQLInputObjectType = GraphQLInputObjectType;
    (0, _defineInspect.default)(GraphQLInputObjectType);
    function defineInputFieldMap(config) {
      var fieldMap = resolveThunk(config.fields);
      isPlainObj(fieldMap) ||
        (0, _devAssert.default)(
          0,
          ''.concat(
            config.name,
            ' fields must be an object with field names as keys or a function which returns such an object.'
          )
        );
      return (0, _mapValue.default)(fieldMap, function (fieldConfig, fieldName) {
        !('resolve' in fieldConfig) ||
          (0, _devAssert.default)(
            0,
            ''
              .concat(config.name, '.')
              .concat(fieldName, ' field has a resolve property, but Input Types cannot define resolvers.')
          );
        return {
          name: fieldName,
          description: fieldConfig.description,
          type: fieldConfig.type,
          defaultValue: fieldConfig.defaultValue,
          deprecationReason: fieldConfig.deprecationReason,
          extensions: fieldConfig.extensions && (0, _toObjMap.default)(fieldConfig.extensions),
          astNode: fieldConfig.astNode,
        };
      });
    }
  },
  '../../node_modules/graphql/type/directives.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.isDirective = isDirective;
    exports.assertDirective = function (directive) {
      if (!isDirective(directive))
        throw new Error('Expected '.concat((0, _inspect.default)(directive), ' to be a GraphQL directive.'));
      return directive;
    };
    exports.isSpecifiedDirective = function (directive) {
      return specifiedDirectives.some(function (_ref2) {
        return _ref2.name === directive.name;
      });
    };
    exports.specifiedDirectives =
      exports.GraphQLSpecifiedByDirective =
      exports.GraphQLDeprecatedDirective =
      exports.DEFAULT_DEPRECATION_REASON =
      exports.GraphQLSkipDirective =
      exports.GraphQLIncludeDirective =
      exports.GraphQLDirective =
        void 0;
    var _objectEntries = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/polyfills/objectEntries.js')
    );
    var _symbols = __webpack_require__('../../node_modules/graphql/polyfills/symbols.js');
    var _inspect = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/inspect.js'));
    var _toObjMap = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/toObjMap.js'));
    var _devAssert = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/devAssert.js'));
    var _instanceOf = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/instanceOf.js'));
    var _isObjectLike = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/jsutils/isObjectLike.js')
    );
    var _defineInspect = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/jsutils/defineInspect.js')
    );
    var _directiveLocation = __webpack_require__('../../node_modules/graphql/language/directiveLocation.js');
    var _scalars = __webpack_require__('../../node_modules/graphql/type/scalars.js');
    var _definition = __webpack_require__('../../node_modules/graphql/type/definition.js');
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    }
    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ('value' in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }
    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      return Constructor;
    }
    function isDirective(directive) {
      return (0, _instanceOf.default)(directive, GraphQLDirective);
    }
    var GraphQLDirective = (function () {
      function GraphQLDirective(config) {
        var _config$isRepeatable, _config$args;
        this.name = config.name;
        this.description = config.description;
        this.locations = config.locations;
        this.isRepeatable =
          null !== (_config$isRepeatable = config.isRepeatable) && void 0 !== _config$isRepeatable
            ? _config$isRepeatable
            : false;
        this.extensions = config.extensions && (0, _toObjMap.default)(config.extensions);
        this.astNode = config.astNode;
        config.name || (0, _devAssert.default)(0, 'Directive must be named.');
        Array.isArray(config.locations) ||
          (0, _devAssert.default)(0, '@'.concat(config.name, ' locations must be an Array.'));
        var args = null !== (_config$args = config.args) && void 0 !== _config$args ? _config$args : {};
        ((0, _isObjectLike.default)(args) && !Array.isArray(args)) ||
          (0, _devAssert.default)(0, '@'.concat(config.name, ' args must be an object with argument names as keys.'));
        this.args = (0, _objectEntries.default)(args).map(function (_ref) {
          var argName = _ref[0],
            argConfig = _ref[1];
          return {
            name: argName,
            description: argConfig.description,
            type: argConfig.type,
            defaultValue: argConfig.defaultValue,
            deprecationReason: argConfig.deprecationReason,
            extensions: argConfig.extensions && (0, _toObjMap.default)(argConfig.extensions),
            astNode: argConfig.astNode,
          };
        });
      }
      var _proto = GraphQLDirective.prototype;
      _proto.toConfig = function () {
        return {
          name: this.name,
          description: this.description,
          locations: this.locations,
          args: (0, _definition.argsToArgsConfig)(this.args),
          isRepeatable: this.isRepeatable,
          extensions: this.extensions,
          astNode: this.astNode,
        };
      };
      _proto.toString = function () {
        return '@' + this.name;
      };
      _proto.toJSON = function () {
        return this.toString();
      };
      _createClass(GraphQLDirective, [
        {
          key: _symbols.SYMBOL_TO_STRING_TAG,
          get: function () {
            return 'GraphQLDirective';
          },
        },
      ]);
      return GraphQLDirective;
    })();
    exports.GraphQLDirective = GraphQLDirective;
    (0, _defineInspect.default)(GraphQLDirective);
    var GraphQLIncludeDirective = new GraphQLDirective({
      name: 'include',
      description: 'Directs the executor to include this field or fragment only when the `if` argument is true.',
      locations: [
        _directiveLocation.DirectiveLocation.FIELD,
        _directiveLocation.DirectiveLocation.FRAGMENT_SPREAD,
        _directiveLocation.DirectiveLocation.INLINE_FRAGMENT,
      ],
      args: {
        if: {
          type: new _definition.GraphQLNonNull(_scalars.GraphQLBoolean),
          description: 'Included when true.',
        },
      },
    });
    exports.GraphQLIncludeDirective = GraphQLIncludeDirective;
    var GraphQLSkipDirective = new GraphQLDirective({
      name: 'skip',
      description: 'Directs the executor to skip this field or fragment when the `if` argument is true.',
      locations: [
        _directiveLocation.DirectiveLocation.FIELD,
        _directiveLocation.DirectiveLocation.FRAGMENT_SPREAD,
        _directiveLocation.DirectiveLocation.INLINE_FRAGMENT,
      ],
      args: {
        if: {
          type: new _definition.GraphQLNonNull(_scalars.GraphQLBoolean),
          description: 'Skipped when true.',
        },
      },
    });
    exports.GraphQLSkipDirective = GraphQLSkipDirective;
    exports.DEFAULT_DEPRECATION_REASON = 'No longer supported';
    var GraphQLDeprecatedDirective = new GraphQLDirective({
      name: 'deprecated',
      description: 'Marks an element of a GraphQL schema as no longer supported.',
      locations: [
        _directiveLocation.DirectiveLocation.FIELD_DEFINITION,
        _directiveLocation.DirectiveLocation.ARGUMENT_DEFINITION,
        _directiveLocation.DirectiveLocation.INPUT_FIELD_DEFINITION,
        _directiveLocation.DirectiveLocation.ENUM_VALUE,
      ],
      args: {
        reason: {
          type: _scalars.GraphQLString,
          description:
            'Explains why this element was deprecated, usually also including a suggestion for how to access supported similar data. Formatted using the Markdown syntax, as specified by [CommonMark](https://commonmark.org/).',
          defaultValue: 'No longer supported',
        },
      },
    });
    exports.GraphQLDeprecatedDirective = GraphQLDeprecatedDirective;
    var GraphQLSpecifiedByDirective = new GraphQLDirective({
      name: 'specifiedBy',
      description: 'Exposes a URL that specifies the behaviour of this scalar.',
      locations: [_directiveLocation.DirectiveLocation.SCALAR],
      args: {
        url: {
          type: new _definition.GraphQLNonNull(_scalars.GraphQLString),
          description: 'The URL that specifies the behaviour of this scalar.',
        },
      },
    });
    exports.GraphQLSpecifiedByDirective = GraphQLSpecifiedByDirective;
    var specifiedDirectives = Object.freeze([
      GraphQLIncludeDirective,
      GraphQLSkipDirective,
      GraphQLDeprecatedDirective,
      GraphQLSpecifiedByDirective,
    ]);
    exports.specifiedDirectives = specifiedDirectives;
  },
  '../../node_modules/graphql/type/introspection.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.isIntrospectionType = function (type) {
      return introspectionTypes.some(function (_ref10) {
        var name = _ref10.name;
        return type.name === name;
      });
    };
    exports.introspectionTypes =
      exports.TypeNameMetaFieldDef =
      exports.TypeMetaFieldDef =
      exports.SchemaMetaFieldDef =
      exports.__TypeKind =
      exports.TypeKind =
      exports.__EnumValue =
      exports.__InputValue =
      exports.__Field =
      exports.__Type =
      exports.__DirectiveLocation =
      exports.__Directive =
      exports.__Schema =
        void 0;
    var _objectValues = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/polyfills/objectValues.js')
    );
    var _inspect = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/inspect.js'));
    var _invariant = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/invariant.js'));
    var _printer = __webpack_require__('../../node_modules/graphql/language/printer.js');
    var _directiveLocation = __webpack_require__('../../node_modules/graphql/language/directiveLocation.js');
    var _astFromValue = __webpack_require__('../../node_modules/graphql/utilities/astFromValue.js');
    var _scalars = __webpack_require__('../../node_modules/graphql/type/scalars.js');
    var _definition = __webpack_require__('../../node_modules/graphql/type/definition.js');
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    }
    var __Schema = new _definition.GraphQLObjectType({
      name: '__Schema',
      description:
        'A GraphQL Schema defines the capabilities of a GraphQL server. It exposes all available types and directives on the server, as well as the entry points for query, mutation, and subscription operations.',
      fields: function () {
        return {
          description: {
            type: _scalars.GraphQLString,
            resolve: function (schema) {
              return schema.description;
            },
          },
          types: {
            description: 'A list of all types supported by this server.',
            type: new _definition.GraphQLNonNull(new _definition.GraphQLList(new _definition.GraphQLNonNull(__Type))),
            resolve: function (schema) {
              return (0, _objectValues.default)(schema.getTypeMap());
            },
          },
          queryType: {
            description: 'The type that query operations will be rooted at.',
            type: new _definition.GraphQLNonNull(__Type),
            resolve: function (schema) {
              return schema.getQueryType();
            },
          },
          mutationType: {
            description: 'If this server supports mutation, the type that mutation operations will be rooted at.',
            type: __Type,
            resolve: function (schema) {
              return schema.getMutationType();
            },
          },
          subscriptionType: {
            description:
              'If this server support subscription, the type that subscription operations will be rooted at.',
            type: __Type,
            resolve: function (schema) {
              return schema.getSubscriptionType();
            },
          },
          directives: {
            description: 'A list of all directives supported by this server.',
            type: new _definition.GraphQLNonNull(
              new _definition.GraphQLList(new _definition.GraphQLNonNull(__Directive))
            ),
            resolve: function (schema) {
              return schema.getDirectives();
            },
          },
        };
      },
    });
    exports.__Schema = __Schema;
    var __Directive = new _definition.GraphQLObjectType({
      name: '__Directive',
      description:
        "A Directive provides a way to describe alternate runtime execution and type validation behavior in a GraphQL document.\n\nIn some cases, you need to provide options to alter GraphQL's execution behavior in ways field arguments will not suffice, such as conditionally including or skipping a field. Directives provide this by describing additional information to the executor.",
      fields: function () {
        return {
          name: {
            type: new _definition.GraphQLNonNull(_scalars.GraphQLString),
            resolve: function (directive) {
              return directive.name;
            },
          },
          description: {
            type: _scalars.GraphQLString,
            resolve: function (directive) {
              return directive.description;
            },
          },
          isRepeatable: {
            type: new _definition.GraphQLNonNull(_scalars.GraphQLBoolean),
            resolve: function (directive) {
              return directive.isRepeatable;
            },
          },
          locations: {
            type: new _definition.GraphQLNonNull(
              new _definition.GraphQLList(new _definition.GraphQLNonNull(__DirectiveLocation))
            ),
            resolve: function (directive) {
              return directive.locations;
            },
          },
          args: {
            type: new _definition.GraphQLNonNull(
              new _definition.GraphQLList(new _definition.GraphQLNonNull(__InputValue))
            ),
            resolve: function (directive) {
              return directive.args;
            },
          },
        };
      },
    });
    exports.__Directive = __Directive;
    var __DirectiveLocation = new _definition.GraphQLEnumType({
      name: '__DirectiveLocation',
      description:
        'A Directive can be adjacent to many parts of the GraphQL language, a __DirectiveLocation describes one such possible adjacencies.',
      values: {
        QUERY: {
          value: _directiveLocation.DirectiveLocation.QUERY,
          description: 'Location adjacent to a query operation.',
        },
        MUTATION: {
          value: _directiveLocation.DirectiveLocation.MUTATION,
          description: 'Location adjacent to a mutation operation.',
        },
        SUBSCRIPTION: {
          value: _directiveLocation.DirectiveLocation.SUBSCRIPTION,
          description: 'Location adjacent to a subscription operation.',
        },
        FIELD: {
          value: _directiveLocation.DirectiveLocation.FIELD,
          description: 'Location adjacent to a field.',
        },
        FRAGMENT_DEFINITION: {
          value: _directiveLocation.DirectiveLocation.FRAGMENT_DEFINITION,
          description: 'Location adjacent to a fragment definition.',
        },
        FRAGMENT_SPREAD: {
          value: _directiveLocation.DirectiveLocation.FRAGMENT_SPREAD,
          description: 'Location adjacent to a fragment spread.',
        },
        INLINE_FRAGMENT: {
          value: _directiveLocation.DirectiveLocation.INLINE_FRAGMENT,
          description: 'Location adjacent to an inline fragment.',
        },
        VARIABLE_DEFINITION: {
          value: _directiveLocation.DirectiveLocation.VARIABLE_DEFINITION,
          description: 'Location adjacent to a variable definition.',
        },
        SCHEMA: {
          value: _directiveLocation.DirectiveLocation.SCHEMA,
          description: 'Location adjacent to a schema definition.',
        },
        SCALAR: {
          value: _directiveLocation.DirectiveLocation.SCALAR,
          description: 'Location adjacent to a scalar definition.',
        },
        OBJECT: {
          value: _directiveLocation.DirectiveLocation.OBJECT,
          description: 'Location adjacent to an object type definition.',
        },
        FIELD_DEFINITION: {
          value: _directiveLocation.DirectiveLocation.FIELD_DEFINITION,
          description: 'Location adjacent to a field definition.',
        },
        ARGUMENT_DEFINITION: {
          value: _directiveLocation.DirectiveLocation.ARGUMENT_DEFINITION,
          description: 'Location adjacent to an argument definition.',
        },
        INTERFACE: {
          value: _directiveLocation.DirectiveLocation.INTERFACE,
          description: 'Location adjacent to an interface definition.',
        },
        UNION: {
          value: _directiveLocation.DirectiveLocation.UNION,
          description: 'Location adjacent to a union definition.',
        },
        ENUM: {
          value: _directiveLocation.DirectiveLocation.ENUM,
          description: 'Location adjacent to an enum definition.',
        },
        ENUM_VALUE: {
          value: _directiveLocation.DirectiveLocation.ENUM_VALUE,
          description: 'Location adjacent to an enum value definition.',
        },
        INPUT_OBJECT: {
          value: _directiveLocation.DirectiveLocation.INPUT_OBJECT,
          description: 'Location adjacent to an input object type definition.',
        },
        INPUT_FIELD_DEFINITION: {
          value: _directiveLocation.DirectiveLocation.INPUT_FIELD_DEFINITION,
          description: 'Location adjacent to an input object field definition.',
        },
      },
    });
    exports.__DirectiveLocation = __DirectiveLocation;
    var __Type = new _definition.GraphQLObjectType({
      name: '__Type',
      description:
        'The fundamental unit of any GraphQL Schema is the type. There are many kinds of types in GraphQL as represented by the `__TypeKind` enum.\n\nDepending on the kind of a type, certain fields describe information about that type. Scalar types provide no information beyond a name, description and optional `specifiedByUrl`, while Enum types provide their values. Object and Interface types provide the fields they describe. Abstract types, Union and Interface, provide the Object types possible at runtime. List and NonNull types compose other types.',
      fields: function () {
        return {
          kind: {
            type: new _definition.GraphQLNonNull(__TypeKind),
            resolve: function (type) {
              if ((0, _definition.isScalarType)(type)) return TypeKind.SCALAR;
              if ((0, _definition.isObjectType)(type)) return TypeKind.OBJECT;
              if ((0, _definition.isInterfaceType)(type)) return TypeKind.INTERFACE;
              if ((0, _definition.isUnionType)(type)) return TypeKind.UNION;
              if ((0, _definition.isEnumType)(type)) return TypeKind.ENUM;
              if ((0, _definition.isInputObjectType)(type)) return TypeKind.INPUT_OBJECT;
              if ((0, _definition.isListType)(type)) return TypeKind.LIST;
              if ((0, _definition.isNonNullType)(type)) return TypeKind.NON_NULL;
              (0, _invariant.default)(0, 'Unexpected type: "'.concat((0, _inspect.default)(type), '".'));
            },
          },
          name: {
            type: _scalars.GraphQLString,
            resolve: function (type) {
              return void 0 !== type.name ? type.name : void 0;
            },
          },
          description: {
            type: _scalars.GraphQLString,
            resolve: function (type) {
              return void 0 !== type.description ? type.description : void 0;
            },
          },
          specifiedByUrl: {
            type: _scalars.GraphQLString,
            resolve: function (obj) {
              return void 0 !== obj.specifiedByUrl ? obj.specifiedByUrl : void 0;
            },
          },
          fields: {
            type: new _definition.GraphQLList(new _definition.GraphQLNonNull(__Field)),
            args: {
              includeDeprecated: {
                type: _scalars.GraphQLBoolean,
                defaultValue: false,
              },
            },
            resolve: function (type, _ref) {
              var includeDeprecated = _ref.includeDeprecated;
              if ((0, _definition.isObjectType)(type) || (0, _definition.isInterfaceType)(type)) {
                var fields = (0, _objectValues.default)(type.getFields());
                return includeDeprecated
                  ? fields
                  : fields.filter(function (field) {
                      return null == field.deprecationReason;
                    });
              }
            },
          },
          interfaces: {
            type: new _definition.GraphQLList(new _definition.GraphQLNonNull(__Type)),
            resolve: function (type) {
              if ((0, _definition.isObjectType)(type) || (0, _definition.isInterfaceType)(type))
                return type.getInterfaces();
            },
          },
          possibleTypes: {
            type: new _definition.GraphQLList(new _definition.GraphQLNonNull(__Type)),
            resolve: function (type, _args, _context, _ref2) {
              var schema = _ref2.schema;
              if ((0, _definition.isAbstractType)(type)) return schema.getPossibleTypes(type);
            },
          },
          enumValues: {
            type: new _definition.GraphQLList(new _definition.GraphQLNonNull(__EnumValue)),
            args: {
              includeDeprecated: {
                type: _scalars.GraphQLBoolean,
                defaultValue: false,
              },
            },
            resolve: function (type, _ref3) {
              var includeDeprecated = _ref3.includeDeprecated;
              if ((0, _definition.isEnumType)(type)) {
                var values = type.getValues();
                return includeDeprecated
                  ? values
                  : values.filter(function (field) {
                      return null == field.deprecationReason;
                    });
              }
            },
          },
          inputFields: {
            type: new _definition.GraphQLList(new _definition.GraphQLNonNull(__InputValue)),
            args: {
              includeDeprecated: {
                type: _scalars.GraphQLBoolean,
                defaultValue: false,
              },
            },
            resolve: function (type, _ref4) {
              var includeDeprecated = _ref4.includeDeprecated;
              if ((0, _definition.isInputObjectType)(type)) {
                var values = (0, _objectValues.default)(type.getFields());
                return includeDeprecated
                  ? values
                  : values.filter(function (field) {
                      return null == field.deprecationReason;
                    });
              }
            },
          },
          ofType: {
            type: __Type,
            resolve: function (type) {
              return void 0 !== type.ofType ? type.ofType : void 0;
            },
          },
        };
      },
    });
    exports.__Type = __Type;
    var __Field = new _definition.GraphQLObjectType({
      name: '__Field',
      description:
        'Object and Interface types are described by a list of Fields, each of which has a name, potentially a list of arguments, and a return type.',
      fields: function () {
        return {
          name: {
            type: new _definition.GraphQLNonNull(_scalars.GraphQLString),
            resolve: function (field) {
              return field.name;
            },
          },
          description: {
            type: _scalars.GraphQLString,
            resolve: function (field) {
              return field.description;
            },
          },
          args: {
            type: new _definition.GraphQLNonNull(
              new _definition.GraphQLList(new _definition.GraphQLNonNull(__InputValue))
            ),
            args: {
              includeDeprecated: {
                type: _scalars.GraphQLBoolean,
                defaultValue: false,
              },
            },
            resolve: function (field, _ref5) {
              return _ref5.includeDeprecated
                ? field.args
                : field.args.filter(function (arg) {
                    return null == arg.deprecationReason;
                  });
            },
          },
          type: {
            type: new _definition.GraphQLNonNull(__Type),
            resolve: function (field) {
              return field.type;
            },
          },
          isDeprecated: {
            type: new _definition.GraphQLNonNull(_scalars.GraphQLBoolean),
            resolve: function (field) {
              return null != field.deprecationReason;
            },
          },
          deprecationReason: {
            type: _scalars.GraphQLString,
            resolve: function (field) {
              return field.deprecationReason;
            },
          },
        };
      },
    });
    exports.__Field = __Field;
    var __InputValue = new _definition.GraphQLObjectType({
      name: '__InputValue',
      description:
        'Arguments provided to Fields or Directives and the input fields of an InputObject are represented as Input Values which describe their type and optionally a default value.',
      fields: function () {
        return {
          name: {
            type: new _definition.GraphQLNonNull(_scalars.GraphQLString),
            resolve: function (inputValue) {
              return inputValue.name;
            },
          },
          description: {
            type: _scalars.GraphQLString,
            resolve: function (inputValue) {
              return inputValue.description;
            },
          },
          type: {
            type: new _definition.GraphQLNonNull(__Type),
            resolve: function (inputValue) {
              return inputValue.type;
            },
          },
          defaultValue: {
            type: _scalars.GraphQLString,
            description: 'A GraphQL-formatted string representing the default value for this input value.',
            resolve: function (inputValue) {
              var type = inputValue.type,
                defaultValue = inputValue.defaultValue;
              var valueAST = (0, _astFromValue.astFromValue)(defaultValue, type);
              return valueAST ? (0, _printer.print)(valueAST) : null;
            },
          },
          isDeprecated: {
            type: new _definition.GraphQLNonNull(_scalars.GraphQLBoolean),
            resolve: function (field) {
              return null != field.deprecationReason;
            },
          },
          deprecationReason: {
            type: _scalars.GraphQLString,
            resolve: function (obj) {
              return obj.deprecationReason;
            },
          },
        };
      },
    });
    exports.__InputValue = __InputValue;
    var __EnumValue = new _definition.GraphQLObjectType({
      name: '__EnumValue',
      description:
        'One possible value for a given Enum. Enum values are unique values, not a placeholder for a string or numeric value. However an Enum value is returned in a JSON response as a string.',
      fields: function () {
        return {
          name: {
            type: new _definition.GraphQLNonNull(_scalars.GraphQLString),
            resolve: function (enumValue) {
              return enumValue.name;
            },
          },
          description: {
            type: _scalars.GraphQLString,
            resolve: function (enumValue) {
              return enumValue.description;
            },
          },
          isDeprecated: {
            type: new _definition.GraphQLNonNull(_scalars.GraphQLBoolean),
            resolve: function (enumValue) {
              return null != enumValue.deprecationReason;
            },
          },
          deprecationReason: {
            type: _scalars.GraphQLString,
            resolve: function (enumValue) {
              return enumValue.deprecationReason;
            },
          },
        };
      },
    });
    exports.__EnumValue = __EnumValue;
    var TypeKind = Object.freeze({
      SCALAR: 'SCALAR',
      OBJECT: 'OBJECT',
      INTERFACE: 'INTERFACE',
      UNION: 'UNION',
      ENUM: 'ENUM',
      INPUT_OBJECT: 'INPUT_OBJECT',
      LIST: 'LIST',
      NON_NULL: 'NON_NULL',
    });
    exports.TypeKind = TypeKind;
    var __TypeKind = new _definition.GraphQLEnumType({
      name: '__TypeKind',
      description: 'An enum describing what kind of type a given `__Type` is.',
      values: {
        SCALAR: {
          value: TypeKind.SCALAR,
          description: 'Indicates this type is a scalar.',
        },
        OBJECT: {
          value: TypeKind.OBJECT,
          description: 'Indicates this type is an object. `fields` and `interfaces` are valid fields.',
        },
        INTERFACE: {
          value: TypeKind.INTERFACE,
          description:
            'Indicates this type is an interface. `fields`, `interfaces`, and `possibleTypes` are valid fields.',
        },
        UNION: {
          value: TypeKind.UNION,
          description: 'Indicates this type is a union. `possibleTypes` is a valid field.',
        },
        ENUM: {
          value: TypeKind.ENUM,
          description: 'Indicates this type is an enum. `enumValues` is a valid field.',
        },
        INPUT_OBJECT: {
          value: TypeKind.INPUT_OBJECT,
          description: 'Indicates this type is an input object. `inputFields` is a valid field.',
        },
        LIST: {
          value: TypeKind.LIST,
          description: 'Indicates this type is a list. `ofType` is a valid field.',
        },
        NON_NULL: {
          value: TypeKind.NON_NULL,
          description: 'Indicates this type is a non-null. `ofType` is a valid field.',
        },
      },
    });
    exports.__TypeKind = __TypeKind;
    var SchemaMetaFieldDef = {
      name: '__schema',
      type: new _definition.GraphQLNonNull(__Schema),
      description: 'Access the current type schema of this server.',
      args: [],
      resolve: function (_source, _args, _context, _ref6) {
        return _ref6.schema;
      },
      isDeprecated: false,
      deprecationReason: void 0,
      extensions: void 0,
      astNode: void 0,
    };
    exports.SchemaMetaFieldDef = SchemaMetaFieldDef;
    var TypeMetaFieldDef = {
      name: '__type',
      type: __Type,
      description: 'Request the type information of a single type.',
      args: [
        {
          name: 'name',
          description: void 0,
          type: new _definition.GraphQLNonNull(_scalars.GraphQLString),
          defaultValue: void 0,
          deprecationReason: void 0,
          extensions: void 0,
          astNode: void 0,
        },
      ],
      resolve: function (_source, _ref7, _context, _ref8) {
        var name = _ref7.name;
        return _ref8.schema.getType(name);
      },
      isDeprecated: false,
      deprecationReason: void 0,
      extensions: void 0,
      astNode: void 0,
    };
    exports.TypeMetaFieldDef = TypeMetaFieldDef;
    var TypeNameMetaFieldDef = {
      name: '__typename',
      type: new _definition.GraphQLNonNull(_scalars.GraphQLString),
      description: 'The name of the current Object type at runtime.',
      args: [],
      resolve: function (_source, _args, _context, _ref9) {
        return _ref9.parentType.name;
      },
      isDeprecated: false,
      deprecationReason: void 0,
      extensions: void 0,
      astNode: void 0,
    };
    exports.TypeNameMetaFieldDef = TypeNameMetaFieldDef;
    var introspectionTypes = Object.freeze([
      __Schema,
      __Directive,
      __DirectiveLocation,
      __Type,
      __Field,
      __InputValue,
      __EnumValue,
      __TypeKind,
    ]);
    exports.introspectionTypes = introspectionTypes;
  },
  '../../node_modules/graphql/type/scalars.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.isSpecifiedScalarType = function (type) {
      return specifiedScalarTypes.some(function (_ref) {
        var name = _ref.name;
        return type.name === name;
      });
    };
    exports.specifiedScalarTypes =
      exports.GraphQLID =
      exports.GraphQLBoolean =
      exports.GraphQLString =
      exports.GraphQLFloat =
      exports.GraphQLInt =
        void 0;
    var _isFinite = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/polyfills/isFinite.js'));
    var _isInteger = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/polyfills/isInteger.js'));
    var _inspect = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/inspect.js'));
    var _isObjectLike = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/jsutils/isObjectLike.js')
    );
    var _kinds = __webpack_require__('../../node_modules/graphql/language/kinds.js');
    var _printer = __webpack_require__('../../node_modules/graphql/language/printer.js');
    var _GraphQLError = __webpack_require__('../../node_modules/graphql/error/GraphQLError.js');
    var _definition = __webpack_require__('../../node_modules/graphql/type/definition.js');
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    }
    var GraphQLInt = new _definition.GraphQLScalarType({
      name: 'Int',
      description:
        'The `Int` scalar type represents non-fractional signed whole numeric values. Int can represent values between -(2^31) and 2^31 - 1.',
      serialize: function (outputValue) {
        var coercedValue = serializeObject(outputValue);
        if ('boolean' == typeof coercedValue) return coercedValue ? 1 : 0;
        var num = coercedValue;
        if ('string' == typeof coercedValue && '' !== coercedValue) num = Number(coercedValue);
        if (!(0, _isInteger.default)(num))
          throw new _GraphQLError.GraphQLError(
            'Int cannot represent non-integer value: '.concat((0, _inspect.default)(coercedValue))
          );
        if (num > 2147483647 || num < -2147483648)
          throw new _GraphQLError.GraphQLError(
            'Int cannot represent non 32-bit signed integer value: ' + (0, _inspect.default)(coercedValue)
          );
        return num;
      },
      parseValue: function (inputValue) {
        if (!(0, _isInteger.default)(inputValue))
          throw new _GraphQLError.GraphQLError(
            'Int cannot represent non-integer value: '.concat((0, _inspect.default)(inputValue))
          );
        if (inputValue > 2147483647 || inputValue < -2147483648)
          throw new _GraphQLError.GraphQLError(
            'Int cannot represent non 32-bit signed integer value: '.concat(inputValue)
          );
        return inputValue;
      },
      parseLiteral: function (valueNode) {
        if (valueNode.kind !== _kinds.Kind.INT)
          throw new _GraphQLError.GraphQLError(
            'Int cannot represent non-integer value: '.concat((0, _printer.print)(valueNode)),
            valueNode
          );
        var num = parseInt(valueNode.value, 10);
        if (num > 2147483647 || num < -2147483648)
          throw new _GraphQLError.GraphQLError(
            'Int cannot represent non 32-bit signed integer value: '.concat(valueNode.value),
            valueNode
          );
        return num;
      },
    });
    exports.GraphQLInt = GraphQLInt;
    var GraphQLFloat = new _definition.GraphQLScalarType({
      name: 'Float',
      description:
        'The `Float` scalar type represents signed double-precision fractional values as specified by [IEEE 754](https://en.wikipedia.org/wiki/IEEE_floating_point).',
      serialize: function (outputValue) {
        var coercedValue = serializeObject(outputValue);
        if ('boolean' == typeof coercedValue) return coercedValue ? 1 : 0;
        var num = coercedValue;
        if ('string' == typeof coercedValue && '' !== coercedValue) num = Number(coercedValue);
        if (!(0, _isFinite.default)(num))
          throw new _GraphQLError.GraphQLError(
            'Float cannot represent non numeric value: '.concat((0, _inspect.default)(coercedValue))
          );
        return num;
      },
      parseValue: function (inputValue) {
        if (!(0, _isFinite.default)(inputValue))
          throw new _GraphQLError.GraphQLError(
            'Float cannot represent non numeric value: '.concat((0, _inspect.default)(inputValue))
          );
        return inputValue;
      },
      parseLiteral: function (valueNode) {
        if (valueNode.kind !== _kinds.Kind.FLOAT && valueNode.kind !== _kinds.Kind.INT)
          throw new _GraphQLError.GraphQLError(
            'Float cannot represent non numeric value: '.concat((0, _printer.print)(valueNode)),
            valueNode
          );
        return parseFloat(valueNode.value);
      },
    });
    exports.GraphQLFloat = GraphQLFloat;
    function serializeObject(outputValue) {
      if ((0, _isObjectLike.default)(outputValue)) {
        if ('function' == typeof outputValue.valueOf) {
          var valueOfResult = outputValue.valueOf();
          if (!(0, _isObjectLike.default)(valueOfResult)) return valueOfResult;
        }
        if ('function' == typeof outputValue.toJSON) return outputValue.toJSON();
      }
      return outputValue;
    }
    var GraphQLString = new _definition.GraphQLScalarType({
      name: 'String',
      description:
        'The `String` scalar type represents textual data, represented as UTF-8 character sequences. The String type is most often used by GraphQL to represent free-form human-readable text.',
      serialize: function (outputValue) {
        var coercedValue = serializeObject(outputValue);
        if ('string' == typeof coercedValue) return coercedValue;
        if ('boolean' == typeof coercedValue) return coercedValue ? 'true' : 'false';
        if ((0, _isFinite.default)(coercedValue)) return coercedValue.toString();
        throw new _GraphQLError.GraphQLError(
          'String cannot represent value: '.concat((0, _inspect.default)(outputValue))
        );
      },
      parseValue: function (inputValue) {
        if ('string' != typeof inputValue)
          throw new _GraphQLError.GraphQLError(
            'String cannot represent a non string value: '.concat((0, _inspect.default)(inputValue))
          );
        return inputValue;
      },
      parseLiteral: function (valueNode) {
        if (valueNode.kind !== _kinds.Kind.STRING)
          throw new _GraphQLError.GraphQLError(
            'String cannot represent a non string value: '.concat((0, _printer.print)(valueNode)),
            valueNode
          );
        return valueNode.value;
      },
    });
    exports.GraphQLString = GraphQLString;
    var GraphQLBoolean = new _definition.GraphQLScalarType({
      name: 'Boolean',
      description: 'The `Boolean` scalar type represents `true` or `false`.',
      serialize: function (outputValue) {
        var coercedValue = serializeObject(outputValue);
        if ('boolean' == typeof coercedValue) return coercedValue;
        if ((0, _isFinite.default)(coercedValue)) return 0 !== coercedValue;
        throw new _GraphQLError.GraphQLError(
          'Boolean cannot represent a non boolean value: '.concat((0, _inspect.default)(coercedValue))
        );
      },
      parseValue: function (inputValue) {
        if ('boolean' != typeof inputValue)
          throw new _GraphQLError.GraphQLError(
            'Boolean cannot represent a non boolean value: '.concat((0, _inspect.default)(inputValue))
          );
        return inputValue;
      },
      parseLiteral: function (valueNode) {
        if (valueNode.kind !== _kinds.Kind.BOOLEAN)
          throw new _GraphQLError.GraphQLError(
            'Boolean cannot represent a non boolean value: '.concat((0, _printer.print)(valueNode)),
            valueNode
          );
        return valueNode.value;
      },
    });
    exports.GraphQLBoolean = GraphQLBoolean;
    var GraphQLID = new _definition.GraphQLScalarType({
      name: 'ID',
      description:
        'The `ID` scalar type represents a unique identifier, often used to refetch an object or as key for a cache. The ID type appears in a JSON response as a String; however, it is not intended to be human-readable. When expected as an input type, any string (such as `"4"`) or integer (such as `4`) input value will be accepted as an ID.',
      serialize: function (outputValue) {
        var coercedValue = serializeObject(outputValue);
        if ('string' == typeof coercedValue) return coercedValue;
        if ((0, _isInteger.default)(coercedValue)) return String(coercedValue);
        throw new _GraphQLError.GraphQLError('ID cannot represent value: '.concat((0, _inspect.default)(outputValue)));
      },
      parseValue: function (inputValue) {
        if ('string' == typeof inputValue) return inputValue;
        if ((0, _isInteger.default)(inputValue)) return inputValue.toString();
        throw new _GraphQLError.GraphQLError('ID cannot represent value: '.concat((0, _inspect.default)(inputValue)));
      },
      parseLiteral: function (valueNode) {
        if (valueNode.kind !== _kinds.Kind.STRING && valueNode.kind !== _kinds.Kind.INT)
          throw new _GraphQLError.GraphQLError(
            'ID cannot represent a non-string and non-integer value: ' + (0, _printer.print)(valueNode),
            valueNode
          );
        return valueNode.value;
      },
    });
    exports.GraphQLID = GraphQLID;
    var specifiedScalarTypes = Object.freeze([GraphQLString, GraphQLInt, GraphQLFloat, GraphQLBoolean, GraphQLID]);
    exports.specifiedScalarTypes = specifiedScalarTypes;
  },
  '../../node_modules/graphql/type/schema.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.isSchema = isSchema;
    exports.assertSchema = function (schema) {
      if (!isSchema(schema))
        throw new Error('Expected '.concat((0, _inspect.default)(schema), ' to be a GraphQL schema.'));
      return schema;
    };
    exports.GraphQLSchema = void 0;
    var _find = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/polyfills/find.js'));
    var _arrayFrom3 = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/polyfills/arrayFrom.js'));
    var _objectValues5 = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/polyfills/objectValues.js')
    );
    var _symbols = __webpack_require__('../../node_modules/graphql/polyfills/symbols.js');
    var _inspect = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/inspect.js'));
    var _toObjMap = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/toObjMap.js'));
    var _devAssert = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/devAssert.js'));
    var _instanceOf = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/instanceOf.js'));
    var _isObjectLike = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/jsutils/isObjectLike.js')
    );
    var _introspection = __webpack_require__('../../node_modules/graphql/type/introspection.js');
    var _directives = __webpack_require__('../../node_modules/graphql/type/directives.js');
    var _definition = __webpack_require__('../../node_modules/graphql/type/definition.js');
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    }
    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ('value' in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }
    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      return Constructor;
    }
    function isSchema(schema) {
      return (0, _instanceOf.default)(schema, GraphQLSchema);
    }
    var GraphQLSchema = (function () {
      function GraphQLSchema(config) {
        var _config$directives;
        this.__validationErrors = true === config.assumeValid ? [] : void 0;
        (0, _isObjectLike.default)(config) || (0, _devAssert.default)(0, 'Must provide configuration object.');
        !config.types ||
          Array.isArray(config.types) ||
          (0, _devAssert.default)(
            0,
            '"types" must be Array if provided but got: '.concat((0, _inspect.default)(config.types), '.')
          );
        !config.directives ||
          Array.isArray(config.directives) ||
          (0, _devAssert.default)(
            0,
            '"directives" must be Array if provided but got: ' +
              ''.concat((0, _inspect.default)(config.directives), '.')
          );
        this.description = config.description;
        this.extensions = config.extensions && (0, _toObjMap.default)(config.extensions);
        this.astNode = config.astNode;
        this.extensionASTNodes = config.extensionASTNodes;
        this._queryType = config.query;
        this._mutationType = config.mutation;
        this._subscriptionType = config.subscription;
        this._directives =
          null !== (_config$directives = config.directives) && void 0 !== _config$directives
            ? _config$directives
            : _directives.specifiedDirectives;
        var allReferencedTypes = new Set(config.types);
        if (null != config.types)
          for (var _i2 = 0, _config$types2 = config.types; _i2 < _config$types2.length; _i2++) {
            var type = _config$types2[_i2];
            allReferencedTypes.delete(type);
            collectReferencedTypes(type, allReferencedTypes);
          }
        if (null != this._queryType) collectReferencedTypes(this._queryType, allReferencedTypes);
        if (null != this._mutationType) collectReferencedTypes(this._mutationType, allReferencedTypes);
        if (null != this._subscriptionType) collectReferencedTypes(this._subscriptionType, allReferencedTypes);
        for (var _i4 = 0, _this$_directives2 = this._directives; _i4 < _this$_directives2.length; _i4++) {
          var directive = _this$_directives2[_i4];
          if ((0, _directives.isDirective)(directive))
            for (var _i6 = 0, _directive$args2 = directive.args; _i6 < _directive$args2.length; _i6++)
              collectReferencedTypes(_directive$args2[_i6].type, allReferencedTypes);
        }
        collectReferencedTypes(_introspection.__Schema, allReferencedTypes);
        this._typeMap = Object.create(null);
        this._subTypeMap = Object.create(null);
        this._implementationsMap = Object.create(null);
        for (var _i8 = 0, _arrayFrom2 = (0, _arrayFrom3.default)(allReferencedTypes); _i8 < _arrayFrom2.length; _i8++) {
          var namedType = _arrayFrom2[_i8];
          if (null == namedType) continue;
          var typeName = namedType.name;
          typeName ||
            (0, _devAssert.default)(0, 'One of the provided types for building the Schema is missing a name.');
          if (void 0 !== this._typeMap[typeName])
            throw new Error(
              'Schema must contain uniquely named types but contains multiple types named "'.concat(typeName, '".')
            );
          this._typeMap[typeName] = namedType;
          if ((0, _definition.isInterfaceType)(namedType))
            for (
              var _i10 = 0, _namedType$getInterfa2 = namedType.getInterfaces();
              _i10 < _namedType$getInterfa2.length;
              _i10++
            ) {
              var iface = _namedType$getInterfa2[_i10];
              if ((0, _definition.isInterfaceType)(iface)) {
                var implementations = this._implementationsMap[iface.name];
                if (void 0 === implementations)
                  implementations = this._implementationsMap[iface.name] = {
                    objects: [],
                    interfaces: [],
                  };
                implementations.interfaces.push(namedType);
              }
            }
          else if ((0, _definition.isObjectType)(namedType))
            for (
              var _i12 = 0, _namedType$getInterfa4 = namedType.getInterfaces();
              _i12 < _namedType$getInterfa4.length;
              _i12++
            ) {
              var _iface = _namedType$getInterfa4[_i12];
              if ((0, _definition.isInterfaceType)(_iface)) {
                var _implementations = this._implementationsMap[_iface.name];
                if (void 0 === _implementations)
                  _implementations = this._implementationsMap[_iface.name] = {
                    objects: [],
                    interfaces: [],
                  };
                _implementations.objects.push(namedType);
              }
            }
        }
      }
      var _proto = GraphQLSchema.prototype;
      _proto.getQueryType = function () {
        return this._queryType;
      };
      _proto.getMutationType = function () {
        return this._mutationType;
      };
      _proto.getSubscriptionType = function () {
        return this._subscriptionType;
      };
      _proto.getTypeMap = function () {
        return this._typeMap;
      };
      _proto.getType = function (name) {
        return this.getTypeMap()[name];
      };
      _proto.getPossibleTypes = function (abstractType) {
        return (0, _definition.isUnionType)(abstractType)
          ? abstractType.getTypes()
          : this.getImplementations(abstractType).objects;
      };
      _proto.getImplementations = function (interfaceType) {
        var implementations = this._implementationsMap[interfaceType.name];
        return null != implementations
          ? implementations
          : {
              objects: [],
              interfaces: [],
            };
      };
      _proto.isPossibleType = function (abstractType, possibleType) {
        return this.isSubType(abstractType, possibleType);
      };
      _proto.isSubType = function (abstractType, maybeSubType) {
        var map = this._subTypeMap[abstractType.name];
        if (void 0 === map) {
          map = Object.create(null);
          if ((0, _definition.isUnionType)(abstractType))
            for (
              var _i14 = 0, _abstractType$getType2 = abstractType.getTypes();
              _i14 < _abstractType$getType2.length;
              _i14++
            )
              map[_abstractType$getType2[_i14].name] = true;
          else {
            var implementations = this.getImplementations(abstractType);
            for (
              var _i16 = 0, _implementations$obje2 = implementations.objects;
              _i16 < _implementations$obje2.length;
              _i16++
            )
              map[_implementations$obje2[_i16].name] = true;
            for (
              var _i18 = 0, _implementations$inte2 = implementations.interfaces;
              _i18 < _implementations$inte2.length;
              _i18++
            )
              map[_implementations$inte2[_i18].name] = true;
          }
          this._subTypeMap[abstractType.name] = map;
        }
        return void 0 !== map[maybeSubType.name];
      };
      _proto.getDirectives = function () {
        return this._directives;
      };
      _proto.getDirective = function (name) {
        return (0, _find.default)(this.getDirectives(), function (directive) {
          return directive.name === name;
        });
      };
      _proto.toConfig = function () {
        var _this$extensionASTNod;
        return {
          description: this.description,
          query: this.getQueryType(),
          mutation: this.getMutationType(),
          subscription: this.getSubscriptionType(),
          types: (0, _objectValues5.default)(this.getTypeMap()),
          directives: this.getDirectives().slice(),
          extensions: this.extensions,
          astNode: this.astNode,
          extensionASTNodes:
            null !== (_this$extensionASTNod = this.extensionASTNodes) && void 0 !== _this$extensionASTNod
              ? _this$extensionASTNod
              : [],
          assumeValid: void 0 !== this.__validationErrors,
        };
      };
      _createClass(GraphQLSchema, [
        {
          key: _symbols.SYMBOL_TO_STRING_TAG,
          get: function () {
            return 'GraphQLSchema';
          },
        },
      ]);
      return GraphQLSchema;
    })();
    exports.GraphQLSchema = GraphQLSchema;
    function collectReferencedTypes(type, typeSet) {
      var namedType = (0, _definition.getNamedType)(type);
      if (!typeSet.has(namedType)) {
        typeSet.add(namedType);
        if ((0, _definition.isUnionType)(namedType))
          for (var _i20 = 0, _namedType$getTypes2 = namedType.getTypes(); _i20 < _namedType$getTypes2.length; _i20++)
            collectReferencedTypes(_namedType$getTypes2[_i20], typeSet);
        else if ((0, _definition.isObjectType)(namedType) || (0, _definition.isInterfaceType)(namedType)) {
          for (
            var _i22 = 0, _namedType$getInterfa6 = namedType.getInterfaces();
            _i22 < _namedType$getInterfa6.length;
            _i22++
          )
            collectReferencedTypes(_namedType$getInterfa6[_i22], typeSet);
          for (
            var _i24 = 0, _objectValues2 = (0, _objectValues5.default)(namedType.getFields());
            _i24 < _objectValues2.length;
            _i24++
          ) {
            var field = _objectValues2[_i24];
            collectReferencedTypes(field.type, typeSet);
            for (var _i26 = 0, _field$args2 = field.args; _i26 < _field$args2.length; _i26++)
              collectReferencedTypes(_field$args2[_i26].type, typeSet);
          }
        } else if ((0, _definition.isInputObjectType)(namedType))
          for (
            var _i28 = 0, _objectValues4 = (0, _objectValues5.default)(namedType.getFields());
            _i28 < _objectValues4.length;
            _i28++
          )
            collectReferencedTypes(_objectValues4[_i28].type, typeSet);
      }
      return typeSet;
    }
  },
  '../../node_modules/graphql/type/validate.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.validateSchema = validateSchema;
    exports.assertValidSchema = function (schema) {
      var errors = validateSchema(schema);
      if (0 !== errors.length)
        throw new Error(
          errors
            .map(function (error) {
              return error.message;
            })
            .join('\n\n')
        );
    };
    var _find = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/polyfills/find.js'));
    var _objectValues5 = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/polyfills/objectValues.js')
    );
    var _inspect = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/inspect.js'));
    var _GraphQLError = __webpack_require__('../../node_modules/graphql/error/GraphQLError.js');
    var _locatedError = __webpack_require__('../../node_modules/graphql/error/locatedError.js');
    var _assertValidName = __webpack_require__('../../node_modules/graphql/utilities/assertValidName.js');
    var _typeComparators = __webpack_require__('../../node_modules/graphql/utilities/typeComparators.js');
    var _schema = __webpack_require__('../../node_modules/graphql/type/schema.js');
    var _introspection = __webpack_require__('../../node_modules/graphql/type/introspection.js');
    var _directives = __webpack_require__('../../node_modules/graphql/type/directives.js');
    var _definition = __webpack_require__('../../node_modules/graphql/type/definition.js');
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    }
    function validateSchema(schema) {
      (0, _schema.assertSchema)(schema);
      if (schema.__validationErrors) return schema.__validationErrors;
      var context = new SchemaValidationContext(schema);
      validateRootTypes(context);
      validateDirectives(context);
      validateTypes(context);
      var errors = context.getErrors();
      schema.__validationErrors = errors;
      return errors;
    }
    var SchemaValidationContext = (function () {
      function SchemaValidationContext(schema) {
        this._errors = [];
        this.schema = schema;
      }
      var _proto = SchemaValidationContext.prototype;
      _proto.reportError = function (message, nodes) {
        var _nodes = Array.isArray(nodes) ? nodes.filter(Boolean) : nodes;
        this.addError(new _GraphQLError.GraphQLError(message, _nodes));
      };
      _proto.addError = function (error) {
        this._errors.push(error);
      };
      _proto.getErrors = function () {
        return this._errors;
      };
      return SchemaValidationContext;
    })();
    function validateRootTypes(context) {
      var schema = context.schema;
      var queryType = schema.getQueryType();
      if (!queryType) context.reportError('Query root type must be provided.', schema.astNode);
      else if (!(0, _definition.isObjectType)(queryType)) {
        var _getOperationTypeNode;
        context.reportError(
          'Query root type must be Object type, it cannot be '.concat((0, _inspect.default)(queryType), '.'),
          null !== (_getOperationTypeNode = getOperationTypeNode(schema, 'query')) && void 0 !== _getOperationTypeNode
            ? _getOperationTypeNode
            : queryType.astNode
        );
      }
      var mutationType = schema.getMutationType();
      if (mutationType && !(0, _definition.isObjectType)(mutationType)) {
        var _getOperationTypeNode2;
        context.reportError(
          'Mutation root type must be Object type if provided, it cannot be ' +
            ''.concat((0, _inspect.default)(mutationType), '.'),
          null !== (_getOperationTypeNode2 = getOperationTypeNode(schema, 'mutation')) &&
            void 0 !== _getOperationTypeNode2
            ? _getOperationTypeNode2
            : mutationType.astNode
        );
      }
      var subscriptionType = schema.getSubscriptionType();
      if (subscriptionType && !(0, _definition.isObjectType)(subscriptionType)) {
        var _getOperationTypeNode3;
        context.reportError(
          'Subscription root type must be Object type if provided, it cannot be ' +
            ''.concat((0, _inspect.default)(subscriptionType), '.'),
          null !== (_getOperationTypeNode3 = getOperationTypeNode(schema, 'subscription')) &&
            void 0 !== _getOperationTypeNode3
            ? _getOperationTypeNode3
            : subscriptionType.astNode
        );
      }
    }
    function getOperationTypeNode(schema, operation) {
      var operationNodes = getAllSubNodes(schema, function (node) {
        return node.operationTypes;
      });
      for (var _i2 = 0; _i2 < operationNodes.length; _i2++) {
        var node = operationNodes[_i2];
        if (node.operation === operation) return node.type;
      }
      return;
    }
    function validateDirectives(context) {
      for (
        var _i4 = 0, _context$schema$getDi2 = context.schema.getDirectives();
        _i4 < _context$schema$getDi2.length;
        _i4++
      ) {
        var directive = _context$schema$getDi2[_i4];
        if (!(0, _directives.isDirective)(directive)) {
          context.reportError(
            'Expected directive but got: '.concat((0, _inspect.default)(directive), '.'),
            null == directive ? void 0 : directive.astNode
          );
          continue;
        }
        validateName(context, directive);
        for (var _i6 = 0, _directive$args2 = directive.args; _i6 < _directive$args2.length; _i6++) {
          var arg = _directive$args2[_i6];
          validateName(context, arg);
          if (!(0, _definition.isInputType)(arg.type))
            context.reportError(
              'The type of @'.concat(directive.name, '(').concat(arg.name, ':) must be Input Type ') +
                'but got: '.concat((0, _inspect.default)(arg.type), '.'),
              arg.astNode
            );
          if ((0, _definition.isRequiredArgument)(arg) && null != arg.deprecationReason) {
            var _arg$astNode;
            context.reportError(
              'Required argument @'.concat(directive.name, '(').concat(arg.name, ':) cannot be deprecated.'),
              [
                getDeprecatedDirectiveNode(arg.astNode),
                null === (_arg$astNode = arg.astNode) || void 0 === _arg$astNode ? void 0 : _arg$astNode.type,
              ]
            );
          }
        }
      }
    }
    function validateName(context, node) {
      var error = (0, _assertValidName.isValidNameError)(node.name);
      if (error) context.addError((0, _locatedError.locatedError)(error, node.astNode));
    }
    function validateTypes(context) {
      var validateInputObjectCircularRefs = createInputObjectCircularRefsValidator(context);
      var typeMap = context.schema.getTypeMap();
      for (var _i8 = 0, _objectValues2 = (0, _objectValues5.default)(typeMap); _i8 < _objectValues2.length; _i8++) {
        var type = _objectValues2[_i8];
        if (!(0, _definition.isNamedType)(type)) {
          context.reportError(
            'Expected GraphQL named type but got: '.concat((0, _inspect.default)(type), '.'),
            type.astNode
          );
          continue;
        }
        if (!(0, _introspection.isIntrospectionType)(type)) validateName(context, type);
        if ((0, _definition.isObjectType)(type)) {
          validateFields(context, type);
          validateInterfaces(context, type);
        } else if ((0, _definition.isInterfaceType)(type)) {
          validateFields(context, type);
          validateInterfaces(context, type);
        } else if ((0, _definition.isUnionType)(type)) validateUnionMembers(context, type);
        else if ((0, _definition.isEnumType)(type)) validateEnumValues(context, type);
        else if ((0, _definition.isInputObjectType)(type)) {
          validateInputFields(context, type);
          validateInputObjectCircularRefs(type);
        }
      }
    }
    function validateFields(context, type) {
      var fields = (0, _objectValues5.default)(type.getFields());
      if (0 === fields.length)
        context.reportError('Type '.concat(type.name, ' must define one or more fields.'), getAllNodes(type));
      for (var _i10 = 0; _i10 < fields.length; _i10++) {
        var field = fields[_i10];
        validateName(context, field);
        if (!(0, _definition.isOutputType)(field.type)) {
          var _field$astNode;
          context.reportError(
            'The type of '.concat(type.name, '.').concat(field.name, ' must be Output Type ') +
              'but got: '.concat((0, _inspect.default)(field.type), '.'),
            null === (_field$astNode = field.astNode) || void 0 === _field$astNode ? void 0 : _field$astNode.type
          );
        }
        for (var _i12 = 0, _field$args2 = field.args; _i12 < _field$args2.length; _i12++) {
          var arg = _field$args2[_i12];
          var argName = arg.name;
          validateName(context, arg);
          if (!(0, _definition.isInputType)(arg.type)) {
            var _arg$astNode2;
            context.reportError(
              'The type of '.concat(type.name, '.').concat(field.name, '(').concat(argName, ':) must be Input ') +
                'Type but got: '.concat((0, _inspect.default)(arg.type), '.'),
              null === (_arg$astNode2 = arg.astNode) || void 0 === _arg$astNode2 ? void 0 : _arg$astNode2.type
            );
          }
          if ((0, _definition.isRequiredArgument)(arg) && null != arg.deprecationReason) {
            var _arg$astNode3;
            context.reportError(
              'Required argument '
                .concat(type.name, '.')
                .concat(field.name, '(')
                .concat(argName, ':) cannot be deprecated.'),
              [
                getDeprecatedDirectiveNode(arg.astNode),
                null === (_arg$astNode3 = arg.astNode) || void 0 === _arg$astNode3 ? void 0 : _arg$astNode3.type,
              ]
            );
          }
        }
      }
    }
    function validateInterfaces(context, type) {
      var ifaceTypeNames = Object.create(null);
      for (var _i14 = 0, _type$getInterfaces2 = type.getInterfaces(); _i14 < _type$getInterfaces2.length; _i14++) {
        var iface = _type$getInterfaces2[_i14];
        if (!(0, _definition.isInterfaceType)(iface)) {
          context.reportError(
            'Type '.concat((0, _inspect.default)(type), ' must only implement Interface types, ') +
              'it cannot implement '.concat((0, _inspect.default)(iface), '.'),
            getAllImplementsInterfaceNodes(type, iface)
          );
          continue;
        }
        if (type === iface) {
          context.reportError(
            'Type '.concat(type.name, ' cannot implement itself because it would create a circular reference.'),
            getAllImplementsInterfaceNodes(type, iface)
          );
          continue;
        }
        if (ifaceTypeNames[iface.name]) {
          context.reportError(
            'Type '.concat(type.name, ' can only implement ').concat(iface.name, ' once.'),
            getAllImplementsInterfaceNodes(type, iface)
          );
          continue;
        }
        ifaceTypeNames[iface.name] = true;
        validateTypeImplementsAncestors(context, type, iface);
        validateTypeImplementsInterface(context, type, iface);
      }
    }
    function validateTypeImplementsInterface(context, type, iface) {
      var typeFieldMap = type.getFields();
      for (
        var _i16 = 0, _objectValues4 = (0, _objectValues5.default)(iface.getFields());
        _i16 < _objectValues4.length;
        _i16++
      ) {
        var ifaceField = _objectValues4[_i16];
        var fieldName = ifaceField.name;
        var typeField = typeFieldMap[fieldName];
        if (!typeField) {
          context.reportError(
            'Interface field '
              .concat(iface.name, '.')
              .concat(fieldName, ' expected but ')
              .concat(type.name, ' does not provide it.'),
            [ifaceField.astNode].concat(getAllNodes(type))
          );
          continue;
        }
        if (!(0, _typeComparators.isTypeSubTypeOf)(context.schema, typeField.type, ifaceField.type)) {
          var _ifaceField$astNode, _typeField$astNode;
          context.reportError(
            'Interface field '.concat(iface.name, '.').concat(fieldName, ' expects type ') +
              ''
                .concat((0, _inspect.default)(ifaceField.type), ' but ')
                .concat(type.name, '.')
                .concat(fieldName, ' ') +
              'is type '.concat((0, _inspect.default)(typeField.type), '.'),
            [
              null === (_ifaceField$astNode = ifaceField.astNode) || void 0 === _ifaceField$astNode
                ? void 0
                : _ifaceField$astNode.type,
              null === (_typeField$astNode = typeField.astNode) || void 0 === _typeField$astNode
                ? void 0
                : _typeField$astNode.type,
            ]
          );
        }
        var _loop = function (_i18, _ifaceField$args2) {
          var ifaceArg = _ifaceField$args2[_i18];
          var argName = ifaceArg.name;
          var typeArg = (0, _find.default)(typeField.args, function (arg) {
            return arg.name === argName;
          });
          if (!typeArg) {
            context.reportError(
              'Interface field argument '
                .concat(iface.name, '.')
                .concat(fieldName, '(')
                .concat(argName, ':) expected but ')
                .concat(type.name, '.')
                .concat(fieldName, ' does not provide it.'),
              [ifaceArg.astNode, typeField.astNode]
            );
            return 'continue';
          }
          if (!(0, _typeComparators.isEqualType)(ifaceArg.type, typeArg.type)) {
            var _ifaceArg$astNode, _typeArg$astNode;
            context.reportError(
              'Interface field argument '.concat(iface.name, '.').concat(fieldName, '(').concat(argName, ':) ') +
                'expects type '.concat((0, _inspect.default)(ifaceArg.type), ' but ') +
                ''.concat(type.name, '.').concat(fieldName, '(').concat(argName, ':) is type ') +
                ''.concat((0, _inspect.default)(typeArg.type), '.'),
              [
                null === (_ifaceArg$astNode = ifaceArg.astNode) || void 0 === _ifaceArg$astNode
                  ? void 0
                  : _ifaceArg$astNode.type,
                null === (_typeArg$astNode = typeArg.astNode) || void 0 === _typeArg$astNode
                  ? void 0
                  : _typeArg$astNode.type,
              ]
            );
          }
        };
        for (var _i18 = 0, _ifaceField$args2 = ifaceField.args; _i18 < _ifaceField$args2.length; _i18++)
          if ('continue' === _loop(_i18, _ifaceField$args2)) continue;
        var _loop2 = function (_i20, _typeField$args2) {
          var typeArg = _typeField$args2[_i20];
          var argName = typeArg.name;
          if (
            !(0, _find.default)(ifaceField.args, function (arg) {
              return arg.name === argName;
            }) &&
            (0, _definition.isRequiredArgument)(typeArg)
          )
            context.reportError(
              'Object field '
                .concat(type.name, '.')
                .concat(fieldName, ' includes required argument ')
                .concat(argName, ' that is missing from the Interface field ')
                .concat(iface.name, '.')
                .concat(fieldName, '.'),
              [typeArg.astNode, ifaceField.astNode]
            );
        };
        for (var _i20 = 0, _typeField$args2 = typeField.args; _i20 < _typeField$args2.length; _i20++)
          _loop2(_i20, _typeField$args2);
      }
    }
    function validateTypeImplementsAncestors(context, type, iface) {
      var ifaceInterfaces = type.getInterfaces();
      for (var _i22 = 0, _iface$getInterfaces2 = iface.getInterfaces(); _i22 < _iface$getInterfaces2.length; _i22++) {
        var transitive = _iface$getInterfaces2[_i22];
        if (-1 === ifaceInterfaces.indexOf(transitive))
          context.reportError(
            transitive === type
              ? 'Type '
                  .concat(type.name, ' cannot implement ')
                  .concat(iface.name, ' because it would create a circular reference.')
              : 'Type '
                  .concat(type.name, ' must implement ')
                  .concat(transitive.name, ' because it is implemented by ')
                  .concat(iface.name, '.'),
            [].concat(getAllImplementsInterfaceNodes(iface, transitive), getAllImplementsInterfaceNodes(type, iface))
          );
      }
    }
    function validateUnionMembers(context, union) {
      var memberTypes = union.getTypes();
      if (0 === memberTypes.length)
        context.reportError(
          'Union type '.concat(union.name, ' must define one or more member types.'),
          getAllNodes(union)
        );
      var includedTypeNames = Object.create(null);
      for (var _i24 = 0; _i24 < memberTypes.length; _i24++) {
        var memberType = memberTypes[_i24];
        if (includedTypeNames[memberType.name]) {
          context.reportError(
            'Union type '.concat(union.name, ' can only include type ').concat(memberType.name, ' once.'),
            getUnionMemberTypeNodes(union, memberType.name)
          );
          continue;
        }
        includedTypeNames[memberType.name] = true;
        if (!(0, _definition.isObjectType)(memberType))
          context.reportError(
            'Union type '.concat(union.name, ' can only include Object types, ') +
              'it cannot include '.concat((0, _inspect.default)(memberType), '.'),
            getUnionMemberTypeNodes(union, String(memberType))
          );
      }
    }
    function validateEnumValues(context, enumType) {
      var enumValues = enumType.getValues();
      if (0 === enumValues.length)
        context.reportError(
          'Enum type '.concat(enumType.name, ' must define one or more values.'),
          getAllNodes(enumType)
        );
      for (var _i26 = 0; _i26 < enumValues.length; _i26++) {
        var enumValue = enumValues[_i26];
        var valueName = enumValue.name;
        validateName(context, enumValue);
        if ('true' === valueName || 'false' === valueName || 'null' === valueName)
          context.reportError(
            'Enum type '.concat(enumType.name, ' cannot include value: ').concat(valueName, '.'),
            enumValue.astNode
          );
      }
    }
    function validateInputFields(context, inputObj) {
      var fields = (0, _objectValues5.default)(inputObj.getFields());
      if (0 === fields.length)
        context.reportError(
          'Input Object type '.concat(inputObj.name, ' must define one or more fields.'),
          getAllNodes(inputObj)
        );
      for (var _i28 = 0; _i28 < fields.length; _i28++) {
        var field = fields[_i28];
        validateName(context, field);
        if (!(0, _definition.isInputType)(field.type)) {
          var _field$astNode2;
          context.reportError(
            'The type of '.concat(inputObj.name, '.').concat(field.name, ' must be Input Type ') +
              'but got: '.concat((0, _inspect.default)(field.type), '.'),
            null === (_field$astNode2 = field.astNode) || void 0 === _field$astNode2 ? void 0 : _field$astNode2.type
          );
        }
        if ((0, _definition.isRequiredInputField)(field) && null != field.deprecationReason) {
          var _field$astNode3;
          context.reportError(
            'Required input field '.concat(inputObj.name, '.').concat(field.name, ' cannot be deprecated.'),
            [
              getDeprecatedDirectiveNode(field.astNode),
              null === (_field$astNode3 = field.astNode) || void 0 === _field$astNode3 ? void 0 : _field$astNode3.type,
            ]
          );
        }
      }
    }
    function createInputObjectCircularRefsValidator(context) {
      var visitedTypes = Object.create(null);
      var fieldPath = [];
      var fieldPathIndexByTypeName = Object.create(null);
      return function detectCycleRecursive(inputObj) {
        if (visitedTypes[inputObj.name]) return;
        visitedTypes[inputObj.name] = true;
        fieldPathIndexByTypeName[inputObj.name] = fieldPath.length;
        var fields = (0, _objectValues5.default)(inputObj.getFields());
        for (var _i30 = 0; _i30 < fields.length; _i30++) {
          var field = fields[_i30];
          if ((0, _definition.isNonNullType)(field.type) && (0, _definition.isInputObjectType)(field.type.ofType)) {
            var fieldType = field.type.ofType;
            var cycleIndex = fieldPathIndexByTypeName[fieldType.name];
            fieldPath.push(field);
            if (void 0 === cycleIndex) detectCycleRecursive(fieldType);
            else {
              var cyclePath = fieldPath.slice(cycleIndex);
              var pathStr = cyclePath
                .map(function (fieldObj) {
                  return fieldObj.name;
                })
                .join('.');
              context.reportError(
                'Cannot reference Input Object "'
                  .concat(fieldType.name, '" within itself through a series of non-null fields: "')
                  .concat(pathStr, '".'),
                cyclePath.map(function (fieldObj) {
                  return fieldObj.astNode;
                })
              );
            }
            fieldPath.pop();
          }
        }
        fieldPathIndexByTypeName[inputObj.name] = void 0;
      };
    }
    function getAllNodes(object) {
      var astNode = object.astNode,
        extensionASTNodes = object.extensionASTNodes;
      return astNode
        ? extensionASTNodes
          ? [astNode].concat(extensionASTNodes)
          : [astNode]
        : null != extensionASTNodes
        ? extensionASTNodes
        : [];
    }
    function getAllSubNodes(object, getter) {
      var subNodes = [];
      for (var _i32 = 0, _getAllNodes2 = getAllNodes(object); _i32 < _getAllNodes2.length; _i32++) {
        var _getter;
        var node = _getAllNodes2[_i32];
        subNodes = subNodes.concat(null !== (_getter = getter(node)) && void 0 !== _getter ? _getter : []);
      }
      return subNodes;
    }
    function getAllImplementsInterfaceNodes(type, iface) {
      return getAllSubNodes(type, function (typeNode) {
        return typeNode.interfaces;
      }).filter(function (ifaceNode) {
        return ifaceNode.name.value === iface.name;
      });
    }
    function getUnionMemberTypeNodes(union, typeName) {
      return getAllSubNodes(union, function (unionNode) {
        return unionNode.types;
      }).filter(function (typeNode) {
        return typeNode.name.value === typeName;
      });
    }
    function getDeprecatedDirectiveNode(definitionNode) {
      var _definitionNode$direc;
      return null == definitionNode
        ? void 0
        : null === (_definitionNode$direc = definitionNode.directives) || void 0 === _definitionNode$direc
        ? void 0
        : _definitionNode$direc.find(function (node) {
            return node.name.value === _directives.GraphQLDeprecatedDirective.name;
          });
    }
  },
  '../../node_modules/graphql/utilities/assertValidName.js': (
    __unused_webpack_module,
    exports,
    __webpack_require__
  ) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.assertValidName = function (name) {
      var error = isValidNameError(name);
      if (error) throw error;
      return name;
    };
    exports.isValidNameError = isValidNameError;
    var _devAssert = (function (obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    })(__webpack_require__('../../node_modules/graphql/jsutils/devAssert.js'));
    var _GraphQLError = __webpack_require__('../../node_modules/graphql/error/GraphQLError.js');
    var NAME_RX = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
    function isValidNameError(name) {
      'string' == typeof name || (0, _devAssert.default)(0, 'Expected name to be a string.');
      if (name.length > 1 && '_' === name[0] && '_' === name[1])
        return new _GraphQLError.GraphQLError(
          'Name "'.concat(name, '" must not begin with "__", which is reserved by GraphQL introspection.')
        );
      if (!NAME_RX.test(name))
        return new _GraphQLError.GraphQLError(
          'Names must match /^[_a-zA-Z][_a-zA-Z0-9]*$/ but "'.concat(name, '" does not.')
        );
    }
  },
  '../../node_modules/graphql/utilities/astFromValue.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.astFromValue = function astFromValue(value, type) {
      if ((0, _definition.isNonNullType)(type)) {
        var astValue = astFromValue(value, type.ofType);
        if ((null == astValue ? void 0 : astValue.kind) === _kinds.Kind.NULL) return null;
        return astValue;
      }
      if (null === value)
        return {
          kind: _kinds.Kind.NULL,
        };
      if (void 0 === value) return null;
      if ((0, _definition.isListType)(type)) {
        var itemType = type.ofType;
        var items = (0, _safeArrayFrom.default)(value);
        if (null != items) {
          var valuesNodes = [];
          for (var _i2 = 0; _i2 < items.length; _i2++) {
            var itemNode = astFromValue(items[_i2], itemType);
            if (null != itemNode) valuesNodes.push(itemNode);
          }
          return {
            kind: _kinds.Kind.LIST,
            values: valuesNodes,
          };
        }
        return astFromValue(value, itemType);
      }
      if ((0, _definition.isInputObjectType)(type)) {
        if (!(0, _isObjectLike.default)(value)) return null;
        var fieldNodes = [];
        for (
          var _i4 = 0, _objectValues2 = (0, _objectValues3.default)(type.getFields());
          _i4 < _objectValues2.length;
          _i4++
        ) {
          var field = _objectValues2[_i4];
          var fieldValue = astFromValue(value[field.name], field.type);
          if (fieldValue)
            fieldNodes.push({
              kind: _kinds.Kind.OBJECT_FIELD,
              name: {
                kind: _kinds.Kind.NAME,
                value: field.name,
              },
              value: fieldValue,
            });
        }
        return {
          kind: _kinds.Kind.OBJECT,
          fields: fieldNodes,
        };
      }
      if ((0, _definition.isLeafType)(type)) {
        var serialized = type.serialize(value);
        if (null == serialized) return null;
        if ('boolean' == typeof serialized)
          return {
            kind: _kinds.Kind.BOOLEAN,
            value: serialized,
          };
        if ('number' == typeof serialized && (0, _isFinite.default)(serialized)) {
          var stringNum = String(serialized);
          return integerStringRegExp.test(stringNum)
            ? {
                kind: _kinds.Kind.INT,
                value: stringNum,
              }
            : {
                kind: _kinds.Kind.FLOAT,
                value: stringNum,
              };
        }
        if ('string' == typeof serialized) {
          if ((0, _definition.isEnumType)(type))
            return {
              kind: _kinds.Kind.ENUM,
              value: serialized,
            };
          if (type === _scalars.GraphQLID && integerStringRegExp.test(serialized))
            return {
              kind: _kinds.Kind.INT,
              value: serialized,
            };
          return {
            kind: _kinds.Kind.STRING,
            value: serialized,
          };
        }
        throw new TypeError('Cannot convert value to AST: '.concat((0, _inspect.default)(serialized), '.'));
      }
      (0, _invariant.default)(0, 'Unexpected input type: ' + (0, _inspect.default)(type));
    };
    var _isFinite = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/polyfills/isFinite.js'));
    var _objectValues3 = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/polyfills/objectValues.js')
    );
    var _inspect = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/inspect.js'));
    var _invariant = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/invariant.js'));
    var _isObjectLike = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/jsutils/isObjectLike.js')
    );
    var _safeArrayFrom = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/jsutils/safeArrayFrom.js')
    );
    var _kinds = __webpack_require__('../../node_modules/graphql/language/kinds.js');
    var _scalars = __webpack_require__('../../node_modules/graphql/type/scalars.js');
    var _definition = __webpack_require__('../../node_modules/graphql/type/definition.js');
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    }
    var integerStringRegExp = /^-?(?:0|[1-9][0-9]*)$/;
  },
  '../../node_modules/graphql/utilities/coerceInputValue.js': (
    __unused_webpack_module,
    exports,
    __webpack_require__
  ) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.coerceInputValue = function (inputValue, type) {
      var onError = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : defaultOnError;
      return coerceInputValueImpl(inputValue, type, onError);
    };
    var _objectValues3 = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/polyfills/objectValues.js')
    );
    var _inspect = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/inspect.js'));
    var _invariant = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/invariant.js'));
    var _didYouMean = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/didYouMean.js'));
    var _isObjectLike = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/jsutils/isObjectLike.js')
    );
    var _safeArrayFrom = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/jsutils/safeArrayFrom.js')
    );
    var _suggestionList = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/jsutils/suggestionList.js')
    );
    var _printPathArray = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/jsutils/printPathArray.js')
    );
    var _Path = __webpack_require__('../../node_modules/graphql/jsutils/Path.js');
    var _GraphQLError = __webpack_require__('../../node_modules/graphql/error/GraphQLError.js');
    var _definition = __webpack_require__('../../node_modules/graphql/type/definition.js');
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    }
    function defaultOnError(path, invalidValue, error) {
      var errorPrefix = 'Invalid value ' + (0, _inspect.default)(invalidValue);
      if (path.length > 0) errorPrefix += ' at "value'.concat((0, _printPathArray.default)(path), '"');
      error.message = errorPrefix + ': ' + error.message;
      throw error;
    }
    function coerceInputValueImpl(inputValue, type, onError, path) {
      if ((0, _definition.isNonNullType)(type)) {
        if (null != inputValue) return coerceInputValueImpl(inputValue, type.ofType, onError, path);
        onError(
          (0, _Path.pathToArray)(path),
          inputValue,
          new _GraphQLError.GraphQLError(
            'Expected non-nullable type "'.concat((0, _inspect.default)(type), '" not to be null.')
          )
        );
        return;
      }
      if (null == inputValue) return null;
      if ((0, _definition.isListType)(type)) {
        var itemType = type.ofType;
        var coercedList = (0, _safeArrayFrom.default)(inputValue, function (itemValue, index) {
          var itemPath = (0, _Path.addPath)(path, index, void 0);
          return coerceInputValueImpl(itemValue, itemType, onError, itemPath);
        });
        if (null != coercedList) return coercedList;
        return [coerceInputValueImpl(inputValue, itemType, onError, path)];
      }
      if ((0, _definition.isInputObjectType)(type)) {
        if (!(0, _isObjectLike.default)(inputValue)) {
          onError(
            (0, _Path.pathToArray)(path),
            inputValue,
            new _GraphQLError.GraphQLError('Expected type "'.concat(type.name, '" to be an object.'))
          );
          return;
        }
        var coercedValue = {};
        var fieldDefs = type.getFields();
        for (var _i2 = 0, _objectValues2 = (0, _objectValues3.default)(fieldDefs); _i2 < _objectValues2.length; _i2++) {
          var field = _objectValues2[_i2];
          var fieldValue = inputValue[field.name];
          if (void 0 === fieldValue) {
            if (void 0 !== field.defaultValue) coercedValue[field.name] = field.defaultValue;
            else if ((0, _definition.isNonNullType)(field.type)) {
              var typeStr = (0, _inspect.default)(field.type);
              onError(
                (0, _Path.pathToArray)(path),
                inputValue,
                new _GraphQLError.GraphQLError(
                  'Field "'.concat(field.name, '" of required type "').concat(typeStr, '" was not provided.')
                )
              );
            }
            continue;
          }
          coercedValue[field.name] = coerceInputValueImpl(
            fieldValue,
            field.type,
            onError,
            (0, _Path.addPath)(path, field.name, type.name)
          );
        }
        for (var _i4 = 0, _Object$keys2 = Object.keys(inputValue); _i4 < _Object$keys2.length; _i4++) {
          var fieldName = _Object$keys2[_i4];
          if (!fieldDefs[fieldName]) {
            var suggestions = (0, _suggestionList.default)(fieldName, Object.keys(type.getFields()));
            onError(
              (0, _Path.pathToArray)(path),
              inputValue,
              new _GraphQLError.GraphQLError(
                'Field "'.concat(fieldName, '" is not defined by type "').concat(type.name, '".') +
                  (0, _didYouMean.default)(suggestions)
              )
            );
          }
        }
        return coercedValue;
      }
      if ((0, _definition.isLeafType)(type)) {
        var parseResult;
        try {
          parseResult = type.parseValue(inputValue);
        } catch (error) {
          if (error instanceof _GraphQLError.GraphQLError) onError((0, _Path.pathToArray)(path), inputValue, error);
          else
            onError(
              (0, _Path.pathToArray)(path),
              inputValue,
              new _GraphQLError.GraphQLError(
                'Expected type "'.concat(type.name, '". ') + error.message,
                void 0,
                void 0,
                void 0,
                void 0,
                error
              )
            );
          return;
        }
        if (void 0 === parseResult)
          onError(
            (0, _Path.pathToArray)(path),
            inputValue,
            new _GraphQLError.GraphQLError('Expected type "'.concat(type.name, '".'))
          );
        return parseResult;
      }
      (0, _invariant.default)(0, 'Unexpected input type: ' + (0, _inspect.default)(type));
    }
  },
  '../../node_modules/graphql/utilities/getOperationRootType.js': (
    __unused_webpack_module,
    exports,
    __webpack_require__
  ) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.getOperationRootType = function (schema, operation) {
      if ('query' === operation.operation) {
        var queryType = schema.getQueryType();
        if (!queryType)
          throw new _GraphQLError.GraphQLError('Schema does not define the required query root type.', operation);
        return queryType;
      }
      if ('mutation' === operation.operation) {
        var mutationType = schema.getMutationType();
        if (!mutationType) throw new _GraphQLError.GraphQLError('Schema is not configured for mutations.', operation);
        return mutationType;
      }
      if ('subscription' === operation.operation) {
        var subscriptionType = schema.getSubscriptionType();
        if (!subscriptionType)
          throw new _GraphQLError.GraphQLError('Schema is not configured for subscriptions.', operation);
        return subscriptionType;
      }
      throw new _GraphQLError.GraphQLError('Can only have query, mutation and subscription operations.', operation);
    };
    var _GraphQLError = __webpack_require__('../../node_modules/graphql/error/GraphQLError.js');
  },
  '../../node_modules/graphql/utilities/typeComparators.js': (
    __unused_webpack_module,
    exports,
    __webpack_require__
  ) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.isEqualType = function isEqualType(typeA, typeB) {
      if (typeA === typeB) return true;
      if ((0, _definition.isNonNullType)(typeA) && (0, _definition.isNonNullType)(typeB))
        return isEqualType(typeA.ofType, typeB.ofType);
      if ((0, _definition.isListType)(typeA) && (0, _definition.isListType)(typeB))
        return isEqualType(typeA.ofType, typeB.ofType);
      return false;
    };
    exports.isTypeSubTypeOf = function isTypeSubTypeOf(schema, maybeSubType, superType) {
      if (maybeSubType === superType) return true;
      if ((0, _definition.isNonNullType)(superType)) {
        if ((0, _definition.isNonNullType)(maybeSubType))
          return isTypeSubTypeOf(schema, maybeSubType.ofType, superType.ofType);
        return false;
      }
      if ((0, _definition.isNonNullType)(maybeSubType)) return isTypeSubTypeOf(schema, maybeSubType.ofType, superType);
      if ((0, _definition.isListType)(superType)) {
        if ((0, _definition.isListType)(maybeSubType))
          return isTypeSubTypeOf(schema, maybeSubType.ofType, superType.ofType);
        return false;
      }
      if ((0, _definition.isListType)(maybeSubType)) return false;
      return (
        (0, _definition.isAbstractType)(superType) &&
        ((0, _definition.isInterfaceType)(maybeSubType) || (0, _definition.isObjectType)(maybeSubType)) &&
        schema.isSubType(superType, maybeSubType)
      );
    };
    exports.doTypesOverlap = function (schema, typeA, typeB) {
      if (typeA === typeB) return true;
      if ((0, _definition.isAbstractType)(typeA)) {
        if ((0, _definition.isAbstractType)(typeB))
          return schema.getPossibleTypes(typeA).some(function (type) {
            return schema.isSubType(typeB, type);
          });
        return schema.isSubType(typeA, typeB);
      }
      if ((0, _definition.isAbstractType)(typeB)) return schema.isSubType(typeB, typeA);
      return false;
    };
    var _definition = __webpack_require__('../../node_modules/graphql/type/definition.js');
  },
  '../../node_modules/graphql/utilities/typeFromAST.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.typeFromAST = function typeFromAST(schema, typeNode) {
      var innerType;
      if (typeNode.kind === _kinds.Kind.LIST_TYPE)
        return (innerType = typeFromAST(schema, typeNode.type)) && new _definition.GraphQLList(innerType);
      if (typeNode.kind === _kinds.Kind.NON_NULL_TYPE)
        return (innerType = typeFromAST(schema, typeNode.type)) && new _definition.GraphQLNonNull(innerType);
      if (typeNode.kind === _kinds.Kind.NAMED_TYPE) return schema.getType(typeNode.name.value);
      (0, _invariant.default)(0, 'Unexpected type node: ' + (0, _inspect.default)(typeNode));
    };
    var _inspect = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/inspect.js'));
    var _invariant = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/invariant.js'));
    var _kinds = __webpack_require__('../../node_modules/graphql/language/kinds.js');
    var _definition = __webpack_require__('../../node_modules/graphql/type/definition.js');
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    }
  },
  '../../node_modules/graphql/utilities/valueFromAST.js': (__unused_webpack_module, exports, __webpack_require__) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.valueFromAST = function valueFromAST(valueNode, type, variables) {
      if (!valueNode) return;
      if (valueNode.kind === _kinds.Kind.VARIABLE) {
        var variableName = valueNode.name.value;
        if (null == variables || void 0 === variables[variableName]) return;
        var variableValue = variables[variableName];
        if (null === variableValue && (0, _definition.isNonNullType)(type)) return;
        return variableValue;
      }
      if ((0, _definition.isNonNullType)(type)) {
        if (valueNode.kind === _kinds.Kind.NULL) return;
        return valueFromAST(valueNode, type.ofType, variables);
      }
      if (valueNode.kind === _kinds.Kind.NULL) return null;
      if ((0, _definition.isListType)(type)) {
        var itemType = type.ofType;
        if (valueNode.kind === _kinds.Kind.LIST) {
          var coercedValues = [];
          for (var _i2 = 0, _valueNode$values2 = valueNode.values; _i2 < _valueNode$values2.length; _i2++) {
            var itemNode = _valueNode$values2[_i2];
            if (isMissingVariable(itemNode, variables)) {
              if ((0, _definition.isNonNullType)(itemType)) return;
              coercedValues.push(null);
            } else {
              var itemValue = valueFromAST(itemNode, itemType, variables);
              if (void 0 === itemValue) return;
              coercedValues.push(itemValue);
            }
          }
          return coercedValues;
        }
        var coercedValue = valueFromAST(valueNode, itemType, variables);
        if (void 0 === coercedValue) return;
        return [coercedValue];
      }
      if ((0, _definition.isInputObjectType)(type)) {
        if (valueNode.kind !== _kinds.Kind.OBJECT) return;
        var coercedObj = Object.create(null);
        var fieldNodes = (0, _keyMap.default)(valueNode.fields, function (field) {
          return field.name.value;
        });
        for (
          var _i4 = 0, _objectValues2 = (0, _objectValues3.default)(type.getFields());
          _i4 < _objectValues2.length;
          _i4++
        ) {
          var field = _objectValues2[_i4];
          var fieldNode = fieldNodes[field.name];
          if (!fieldNode || isMissingVariable(fieldNode.value, variables)) {
            if (void 0 !== field.defaultValue) coercedObj[field.name] = field.defaultValue;
            else if ((0, _definition.isNonNullType)(field.type)) return;
            continue;
          }
          var fieldValue = valueFromAST(fieldNode.value, field.type, variables);
          if (void 0 === fieldValue) return;
          coercedObj[field.name] = fieldValue;
        }
        return coercedObj;
      }
      if ((0, _definition.isLeafType)(type)) {
        var result;
        try {
          result = type.parseLiteral(valueNode, variables);
        } catch (_error) {
          return;
        }
        if (void 0 === result) return;
        return result;
      }
      (0, _invariant.default)(0, 'Unexpected input type: ' + (0, _inspect.default)(type));
    };
    var _objectValues3 = _interopRequireDefault(
      __webpack_require__('../../node_modules/graphql/polyfills/objectValues.js')
    );
    var _keyMap = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/keyMap.js'));
    var _inspect = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/inspect.js'));
    var _invariant = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/invariant.js'));
    var _kinds = __webpack_require__('../../node_modules/graphql/language/kinds.js');
    var _definition = __webpack_require__('../../node_modules/graphql/type/definition.js');
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    }
    function isMissingVariable(valueNode, variables) {
      return (
        valueNode.kind === _kinds.Kind.VARIABLE && (null == variables || void 0 === variables[valueNode.name.value])
      );
    }
  },
  '../../node_modules/graphql/utilities/valueFromASTUntyped.js': (
    __unused_webpack_module,
    exports,
    __webpack_require__
  ) => {
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
    exports.valueFromASTUntyped = function valueFromASTUntyped(valueNode, variables) {
      switch (valueNode.kind) {
        case _kinds.Kind.NULL:
          return null;

        case _kinds.Kind.INT:
          return parseInt(valueNode.value, 10);

        case _kinds.Kind.FLOAT:
          return parseFloat(valueNode.value);

        case _kinds.Kind.STRING:
        case _kinds.Kind.ENUM:
        case _kinds.Kind.BOOLEAN:
          return valueNode.value;

        case _kinds.Kind.LIST:
          return valueNode.values.map(function (node) {
            return valueFromASTUntyped(node, variables);
          });

        case _kinds.Kind.OBJECT:
          return (0, _keyValMap.default)(
            valueNode.fields,
            function (field) {
              return field.name.value;
            },
            function (field) {
              return valueFromASTUntyped(field.value, variables);
            }
          );

        case _kinds.Kind.VARIABLE:
          return null == variables ? void 0 : variables[valueNode.name.value];
      }
      (0, _invariant.default)(0, 'Unexpected value node: ' + (0, _inspect.default)(valueNode));
    };
    var _inspect = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/inspect.js'));
    var _invariant = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/invariant.js'));
    var _keyValMap = _interopRequireDefault(__webpack_require__('../../node_modules/graphql/jsutils/keyValMap.js'));
    var _kinds = __webpack_require__('../../node_modules/graphql/language/kinds.js');
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          };
    }
  },
};
var __webpack_module_cache__ = {};
function __webpack_require__(moduleId) {
  var cachedModule = __webpack_module_cache__[moduleId];
  if (void 0 !== cachedModule) return cachedModule.exports;
  var module = (__webpack_module_cache__[moduleId] = {
    exports: {},
  });
  __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
  return module.exports;
}
(() => {
  __webpack_require__.d = (exports, definition) => {
    for (var key in definition)
      if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key))
        Object.defineProperty(exports, key, {
          enumerable: true,
          get: definition[key],
        });
  };
})();
(() => {
  __webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
})();
(() => {
  __webpack_require__.r = exports => {
    if ('undefined' != typeof Symbol && Symbol.toStringTag)
      Object.defineProperty(exports, Symbol.toStringTag, {
        value: 'Module',
      });
    Object.defineProperty(exports, '__esModule', {
      value: true,
    });
  };
})();
var __webpack_exports__ = {};
(() => {
  __webpack_require__.r(__webpack_exports__);
  __webpack_require__.d(__webpack_exports__, {
    graphqlServer: () => graphqlServer,
  });
  const polyfills_objectEntries =
    Object.entries ||
    function (obj) {
      return Object.keys(obj).map(function (key) {
        return [key, obj[key]];
      });
    };
  var SYMBOL_ITERATOR = 'function' == typeof Symbol && null != Symbol.iterator ? Symbol.iterator : '@@iterator';
  var SYMBOL_ASYNC_ITERATOR =
    'function' == typeof Symbol && null != Symbol.asyncIterator ? Symbol.asyncIterator : '@@asyncIterator';
  var SYMBOL_TO_STRING_TAG =
    'function' == typeof Symbol && null != Symbol.toStringTag ? Symbol.toStringTag : '@@toStringTag';
  const jsutils_nodejsCustomInspectSymbol =
    'function' == typeof Symbol && 'function' == typeof Symbol.for ? Symbol.for('nodejs.util.inspect.custom') : void 0;
  function _typeof(obj) {
    if ('function' == typeof Symbol && 'symbol' == typeof Symbol.iterator)
      _typeof = function (obj) {
        return typeof obj;
      };
    else
      _typeof = function (obj) {
        return obj && 'function' == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype
          ? 'symbol'
          : typeof obj;
      };
    return _typeof(obj);
  }
  function inspect_inspect(value) {
    return formatValue(value, []);
  }
  function formatValue(value, seenValues) {
    switch (_typeof(value)) {
      case 'string':
        return JSON.stringify(value);

      case 'function':
        return value.name ? '[function '.concat(value.name, ']') : '[function]';

      case 'object':
        if (null === value) return 'null';
        return formatObjectValue(value, seenValues);

      default:
        return String(value);
    }
  }
  function formatObjectValue(value, previouslySeenValues) {
    if (-1 !== previouslySeenValues.indexOf(value)) return '[Circular]';
    var seenValues = [].concat(previouslySeenValues, [value]);
    var customInspectFn = getCustomFn(value);
    if (void 0 !== customInspectFn) {
      var customValue = customInspectFn.call(value);
      if (customValue !== value)
        return 'string' == typeof customValue ? customValue : formatValue(customValue, seenValues);
    } else if (Array.isArray(value)) return formatArray(value, seenValues);
    return formatObject(value, seenValues);
  }
  function formatObject(object, seenValues) {
    var keys = Object.keys(object);
    if (0 === keys.length) return '{}';
    if (seenValues.length > 2) return '[' + getObjectTag(object) + ']';
    return (
      '{ ' +
      keys
        .map(function (key) {
          return key + ': ' + formatValue(object[key], seenValues);
        })
        .join(', ') +
      ' }'
    );
  }
  function formatArray(array, seenValues) {
    if (0 === array.length) return '[]';
    if (seenValues.length > 2) return '[Array]';
    var len = Math.min(10, array.length);
    var remaining = array.length - len;
    var items = [];
    for (var i = 0; i < len; ++i) items.push(formatValue(array[i], seenValues));
    if (1 === remaining) items.push('... 1 more item');
    else if (remaining > 1) items.push('... '.concat(remaining, ' more items'));
    return '[' + items.join(', ') + ']';
  }
  function getCustomFn(object) {
    var customInspectFn = object[String(jsutils_nodejsCustomInspectSymbol)];
    if ('function' == typeof customInspectFn) return customInspectFn;
    if ('function' == typeof object.inspect) return object.inspect;
  }
  function getObjectTag(object) {
    var tag = Object.prototype.toString
      .call(object)
      .replace(/^\[object /, '')
      .replace(/]$/, '');
    if ('Object' === tag && 'function' == typeof object.constructor) {
      var name = object.constructor.name;
      if ('string' == typeof name && '' !== name) return name;
    }
    return tag;
  }
  function keyMap(list, keyFn) {
    return list.reduce(function (map, item) {
      map[keyFn(item)] = item;
      return map;
    }, Object.create(null));
  }
  function mapValue(map, fn) {
    var result = Object.create(null);
    for (var _i2 = 0, _objectEntries2 = polyfills_objectEntries(map); _i2 < _objectEntries2.length; _i2++) {
      var _ref2 = _objectEntries2[_i2];
      var _key = _ref2[0];
      var _value = _ref2[1];
      result[_key] = fn(_value, _key);
    }
    return result;
  }
  function toObjMap(obj) {
    if (null === Object.getPrototypeOf(obj)) return obj;
    var map = Object.create(null);
    for (var _i2 = 0, _objectEntries2 = polyfills_objectEntries(obj); _i2 < _objectEntries2.length; _i2++) {
      var _ref2 = _objectEntries2[_i2];
      var key = _ref2[0];
      var value = _ref2[1];
      map[key] = value;
    }
    return map;
  }
  function devAssert(condition, message) {
    if (!Boolean(condition)) throw new Error(message);
  }
  function keyValMap(list, keyFn, valFn) {
    return list.reduce(function (map, item) {
      map[keyFn(item)] = valFn(item);
      return map;
    }, Object.create(null));
  }
  const instanceOf = function (value, constructor) {
    return value instanceof constructor;
  };
  function didYouMean(firstArg, secondArg) {
    var _ref = 'string' == typeof firstArg ? [firstArg, secondArg] : [void 0, firstArg],
      subMessage = _ref[0];
    var message = ' Did you mean ';
    if (subMessage) message += subMessage + ' ';
    var suggestions = _ref[1].map(function (x) {
      return '"'.concat(x, '"');
    });
    switch (suggestions.length) {
      case 0:
        return '';

      case 1:
        return message + suggestions[0] + '?';

      case 2:
        return message + suggestions[0] + ' or ' + suggestions[1] + '?';
    }
    var selected = suggestions.slice(0, 5);
    var lastItem = selected.pop();
    return message + selected.join(', ') + ', or ' + lastItem + '?';
  }
  function isObjectLike_typeof(obj) {
    if ('function' == typeof Symbol && 'symbol' == typeof Symbol.iterator)
      isObjectLike_typeof = function (obj) {
        return typeof obj;
      };
    else
      isObjectLike_typeof = function (obj) {
        return obj && 'function' == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype
          ? 'symbol'
          : typeof obj;
      };
    return isObjectLike_typeof(obj);
  }
  function isObjectLike(value) {
    return 'object' == isObjectLike_typeof(value) && null !== value;
  }
  function identityFunc(x) {
    return x;
  }
  function invariant(condition, message) {
    if (!Boolean(condition)) throw new Error(null != message ? message : 'Unexpected invariant triggered.');
  }
  function defineInspect(classObject) {
    var fn = classObject.prototype.toJSON;
    'function' == typeof fn || invariant(0);
    classObject.prototype.inspect = fn;
    if (jsutils_nodejsCustomInspectSymbol) classObject.prototype[jsutils_nodejsCustomInspectSymbol] = fn;
  }
  function naturalCompare(aStr, bStr) {
    var aIdx = 0;
    var bIdx = 0;
    while (aIdx < aStr.length && bIdx < bStr.length) {
      var aChar = aStr.charCodeAt(aIdx);
      var bChar = bStr.charCodeAt(bIdx);
      if (isDigit(aChar) && isDigit(bChar)) {
        var aNum = 0;
        do {
          ++aIdx;
          aNum = 10 * aNum + aChar - DIGIT_0;
          aChar = aStr.charCodeAt(aIdx);
        } while (isDigit(aChar) && aNum > 0);
        var bNum = 0;
        do {
          ++bIdx;
          bNum = 10 * bNum + bChar - DIGIT_0;
          bChar = bStr.charCodeAt(bIdx);
        } while (isDigit(bChar) && bNum > 0);
        if (aNum < bNum) return -1;
        if (aNum > bNum) return 1;
      } else {
        if (aChar < bChar) return -1;
        if (aChar > bChar) return 1;
        ++aIdx;
        ++bIdx;
      }
    }
    return aStr.length - bStr.length;
  }
  var DIGIT_0 = 48;
  function isDigit(code) {
    return !isNaN(code) && DIGIT_0 <= code && code <= 57;
  }
  function suggestionList(input, options) {
    var optionsByDistance = Object.create(null);
    var lexicalDistance = new LexicalDistance(input);
    var threshold = Math.floor(0.4 * input.length) + 1;
    for (var _i2 = 0; _i2 < options.length; _i2++) {
      var option = options[_i2];
      var distance = lexicalDistance.measure(option, threshold);
      if (void 0 !== distance) optionsByDistance[option] = distance;
    }
    return Object.keys(optionsByDistance).sort(function (a, b) {
      var distanceDiff = optionsByDistance[a] - optionsByDistance[b];
      return 0 !== distanceDiff ? distanceDiff : naturalCompare(a, b);
    });
  }
  var LexicalDistance = (function () {
    function LexicalDistance(input) {
      this._input = input;
      this._inputLowerCase = input.toLowerCase();
      this._inputArray = stringToArray(this._inputLowerCase);
      this._rows = [
        new Array(input.length + 1).fill(0),
        new Array(input.length + 1).fill(0),
        new Array(input.length + 1).fill(0),
      ];
    }
    LexicalDistance.prototype.measure = function (option, threshold) {
      if (this._input === option) return 0;
      var optionLowerCase = option.toLowerCase();
      if (this._inputLowerCase === optionLowerCase) return 1;
      var a = stringToArray(optionLowerCase);
      var b = this._inputArray;
      if (a.length < b.length) {
        var tmp = a;
        a = b;
        b = tmp;
      }
      var aLength = a.length;
      var bLength = b.length;
      if (aLength - bLength > threshold) return;
      var rows = this._rows;
      for (var j = 0; j <= bLength; j++) rows[0][j] = j;
      for (var i = 1; i <= aLength; i++) {
        var upRow = rows[(i - 1) % 3];
        var currentRow = rows[i % 3];
        var smallestCell = (currentRow[0] = i);
        for (var _j = 1; _j <= bLength; _j++) {
          var cost = a[i - 1] === b[_j - 1] ? 0 : 1;
          var currentCell = Math.min(upRow[_j] + 1, currentRow[_j - 1] + 1, upRow[_j - 1] + cost);
          if (i > 1 && _j > 1 && a[i - 1] === b[_j - 2] && a[i - 2] === b[_j - 1]) {
            var doubleDiagonalCell = rows[(i - 2) % 3][_j - 2];
            currentCell = Math.min(currentCell, doubleDiagonalCell + 1);
          }
          if (currentCell < smallestCell) smallestCell = currentCell;
          currentRow[_j] = currentCell;
        }
        if (smallestCell > threshold) return;
      }
      var distance = rows[aLength % 3][bLength];
      return distance <= threshold ? distance : void 0;
    };
    return LexicalDistance;
  })();
  function stringToArray(str) {
    var strLength = str.length;
    var array = new Array(strLength);
    for (var i = 0; i < strLength; ++i) array[i] = str.charCodeAt(i);
    return array;
  }
  function getLocation(source, position) {
    var lineRegexp = /\r\n|[\n\r]/g;
    var line = 1;
    var column = position + 1;
    var match;
    while ((match = lineRegexp.exec(source.body)) && match.index < position) {
      line += 1;
      column = position + 1 - (match.index + match[0].length);
    }
    return {
      line,
      column,
    };
  }
  function printLocation(location) {
    return printSourceLocation(location.source, getLocation(location.source, location.start));
  }
  function printSourceLocation(source, sourceLocation) {
    var firstLineColumnOffset = source.locationOffset.column - 1;
    var body = whitespace(firstLineColumnOffset) + source.body;
    var lineIndex = sourceLocation.line - 1;
    var lineOffset = source.locationOffset.line - 1;
    var lineNum = sourceLocation.line + lineOffset;
    var columnOffset = 1 === sourceLocation.line ? firstLineColumnOffset : 0;
    var columnNum = sourceLocation.column + columnOffset;
    var locationStr = ''.concat(source.name, ':').concat(lineNum, ':').concat(columnNum, '\n');
    var lines = body.split(/\r\n|[\n\r]/g);
    var locationLine = lines[lineIndex];
    if (locationLine.length > 120) {
      var subLineIndex = Math.floor(columnNum / 80);
      var subLineColumnNum = columnNum % 80;
      var subLines = [];
      for (var i = 0; i < locationLine.length; i += 80) subLines.push(locationLine.slice(i, i + 80));
      return (
        locationStr +
        printPrefixedLines(
          [[''.concat(lineNum), subLines[0]]].concat(
            subLines.slice(1, subLineIndex + 1).map(function (subLine) {
              return ['', subLine];
            }),
            [
              [' ', whitespace(subLineColumnNum - 1) + '^'],
              ['', subLines[subLineIndex + 1]],
            ]
          )
        )
      );
    }
    return (
      locationStr +
      printPrefixedLines([
        [''.concat(lineNum - 1), lines[lineIndex - 1]],
        [''.concat(lineNum), locationLine],
        ['', whitespace(columnNum - 1) + '^'],
        [''.concat(lineNum + 1), lines[lineIndex + 1]],
      ])
    );
  }
  function printPrefixedLines(lines) {
    var existingLines = lines.filter(function (_ref) {
      _ref[0];
      return void 0 !== _ref[1];
    });
    var padLen = Math.max.apply(
      Math,
      existingLines.map(function (_ref2) {
        return _ref2[0].length;
      })
    );
    return existingLines
      .map(function (_ref3) {
        var prefix = _ref3[0],
          line = _ref3[1];
        return leftPad(padLen, prefix) + (line ? ' | ' + line : ' |');
      })
      .join('\n');
  }
  function whitespace(len) {
    return Array(len + 1).join(' ');
  }
  function leftPad(len, str) {
    return whitespace(len - str.length) + str;
  }
  function GraphQLError_typeof(obj) {
    if ('function' == typeof Symbol && 'symbol' == typeof Symbol.iterator)
      GraphQLError_typeof = function (obj) {
        return typeof obj;
      };
    else
      GraphQLError_typeof = function (obj) {
        return obj && 'function' == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype
          ? 'symbol'
          : typeof obj;
      };
    return GraphQLError_typeof(obj);
  }
  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) throw new TypeError('Cannot call a class as a function');
  }
  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ('value' in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }
  function _inherits(subClass, superClass) {
    if ('function' != typeof superClass && null !== superClass)
      throw new TypeError('Super expression must either be null or a function');
    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        writable: true,
        configurable: true,
      },
    });
    if (superClass) _setPrototypeOf(subClass, superClass);
  }
  function _createSuper(Derived) {
    var hasNativeReflectConstruct = _isNativeReflectConstruct();
    return function () {
      var result,
        Super = _getPrototypeOf(Derived);
      if (hasNativeReflectConstruct) {
        var NewTarget = _getPrototypeOf(this).constructor;
        result = Reflect.construct(Super, arguments, NewTarget);
      } else result = Super.apply(this, arguments);
      return _possibleConstructorReturn(this, result);
    };
  }
  function _possibleConstructorReturn(self, call) {
    if (call && ('object' === GraphQLError_typeof(call) || 'function' == typeof call)) return call;
    return _assertThisInitialized(self);
  }
  function _assertThisInitialized(self) {
    if (void 0 === self) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    return self;
  }
  function _wrapNativeSuper(Class) {
    var _cache = 'function' == typeof Map ? new Map() : void 0;
    return (_wrapNativeSuper = function (Class) {
      if (null === Class || !_isNativeFunction(Class)) return Class;
      if ('function' != typeof Class) throw new TypeError('Super expression must either be null or a function');
      if ('undefined' != typeof _cache) {
        if (_cache.has(Class)) return _cache.get(Class);
        _cache.set(Class, Wrapper);
      }
      function Wrapper() {
        return _construct(Class, arguments, _getPrototypeOf(this).constructor);
      }
      Wrapper.prototype = Object.create(Class.prototype, {
        constructor: {
          value: Wrapper,
          enumerable: false,
          writable: true,
          configurable: true,
        },
      });
      return _setPrototypeOf(Wrapper, Class);
    })(Class);
  }
  function _construct(Parent, args, Class) {
    if (_isNativeReflectConstruct()) _construct = Reflect.construct;
    else
      _construct = function (Parent, args, Class) {
        var a = [null];
        a.push.apply(a, args);
        var instance = new (Function.bind.apply(Parent, a))();
        if (Class) _setPrototypeOf(instance, Class.prototype);
        return instance;
      };
    return _construct.apply(null, arguments);
  }
  function _isNativeReflectConstruct() {
    if ('undefined' == typeof Reflect || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if ('function' == typeof Proxy) return true;
    try {
      Date.prototype.toString.call(Reflect.construct(Date, [], function () {}));
      return true;
    } catch (e) {
      return false;
    }
  }
  function _isNativeFunction(fn) {
    return -1 !== Function.toString.call(fn).indexOf('[native code]');
  }
  function _setPrototypeOf(o, p) {
    return (_setPrototypeOf =
      Object.setPrototypeOf ||
      function (o, p) {
        o.__proto__ = p;
        return o;
      })(o, p);
  }
  function _getPrototypeOf(o) {
    return (_getPrototypeOf = Object.setPrototypeOf
      ? Object.getPrototypeOf
      : function (o) {
          return o.__proto__ || Object.getPrototypeOf(o);
        })(o);
  }
  var GraphQLError = (function (_Error) {
    _inherits(GraphQLError, _Error);
    var _super = _createSuper(GraphQLError);
    function GraphQLError(message, nodes, source, positions, path, originalError, extensions) {
      var _locations2, _source2, _positions2, _extensions2;
      var _this;
      _classCallCheck(this, GraphQLError);
      _this = _super.call(this, message);
      var _nodes = Array.isArray(nodes) ? (0 !== nodes.length ? nodes : void 0) : nodes ? [nodes] : void 0;
      var _source = source;
      if (!_source && _nodes) {
        var _nodes$0$loc;
        _source = null === (_nodes$0$loc = _nodes[0].loc) || void 0 === _nodes$0$loc ? void 0 : _nodes$0$loc.source;
      }
      var _positions = positions;
      if (!_positions && _nodes)
        _positions = _nodes.reduce(function (list, node) {
          if (node.loc) list.push(node.loc.start);
          return list;
        }, []);
      if (_positions && 0 === _positions.length) _positions = void 0;
      var _locations;
      if (positions && source)
        _locations = positions.map(function (pos) {
          return getLocation(source, pos);
        });
      else if (_nodes)
        _locations = _nodes.reduce(function (list, node) {
          if (node.loc) list.push(getLocation(node.loc.source, node.loc.start));
          return list;
        }, []);
      var _extensions = extensions;
      if (null == _extensions && null != originalError) {
        var originalExtensions = originalError.extensions;
        if (isObjectLike(originalExtensions)) _extensions = originalExtensions;
      }
      Object.defineProperties(_assertThisInitialized(_this), {
        name: {
          value: 'GraphQLError',
        },
        message: {
          value: message,
          enumerable: true,
          writable: true,
        },
        locations: {
          value: null !== (_locations2 = _locations) && void 0 !== _locations2 ? _locations2 : void 0,
          enumerable: null != _locations,
        },
        path: {
          value: null != path ? path : void 0,
          enumerable: null != path,
        },
        nodes: {
          value: null != _nodes ? _nodes : void 0,
        },
        source: {
          value: null !== (_source2 = _source) && void 0 !== _source2 ? _source2 : void 0,
        },
        positions: {
          value: null !== (_positions2 = _positions) && void 0 !== _positions2 ? _positions2 : void 0,
        },
        originalError: {
          value: originalError,
        },
        extensions: {
          value: null !== (_extensions2 = _extensions) && void 0 !== _extensions2 ? _extensions2 : void 0,
          enumerable: null != _extensions,
        },
      });
      if (null != originalError && originalError.stack) {
        Object.defineProperty(_assertThisInitialized(_this), 'stack', {
          value: originalError.stack,
          writable: true,
          configurable: true,
        });
        return _possibleConstructorReturn(_this);
      }
      if (Error.captureStackTrace) Error.captureStackTrace(_assertThisInitialized(_this), GraphQLError);
      else
        Object.defineProperty(_assertThisInitialized(_this), 'stack', {
          value: Error().stack,
          writable: true,
          configurable: true,
        });
      return _this;
    }
    _createClass(GraphQLError, [
      {
        key: 'toString',
        value: function () {
          return printError(this);
        },
      },
      {
        key: SYMBOL_TO_STRING_TAG,
        get: function () {
          return 'Object';
        },
      },
    ]);
    return GraphQLError;
  })(_wrapNativeSuper(Error));
  function printError(error) {
    var output = error.message;
    if (error.nodes)
      for (var _i2 = 0, _error$nodes2 = error.nodes; _i2 < _error$nodes2.length; _i2++) {
        var node = _error$nodes2[_i2];
        if (node.loc) output += '\n\n' + printLocation(node.loc);
      }
    else if (error.source && error.locations)
      for (var _i4 = 0, _error$locations2 = error.locations; _i4 < _error$locations2.length; _i4++) {
        var location = _error$locations2[_i4];
        output += '\n\n' + printSourceLocation(error.source, location);
      }
    return output;
  }
  var kinds_Kind = Object.freeze({
    NAME: 'Name',
    DOCUMENT: 'Document',
    OPERATION_DEFINITION: 'OperationDefinition',
    VARIABLE_DEFINITION: 'VariableDefinition',
    SELECTION_SET: 'SelectionSet',
    FIELD: 'Field',
    ARGUMENT: 'Argument',
    FRAGMENT_SPREAD: 'FragmentSpread',
    INLINE_FRAGMENT: 'InlineFragment',
    FRAGMENT_DEFINITION: 'FragmentDefinition',
    VARIABLE: 'Variable',
    INT: 'IntValue',
    FLOAT: 'FloatValue',
    STRING: 'StringValue',
    BOOLEAN: 'BooleanValue',
    NULL: 'NullValue',
    ENUM: 'EnumValue',
    LIST: 'ListValue',
    OBJECT: 'ObjectValue',
    OBJECT_FIELD: 'ObjectField',
    DIRECTIVE: 'Directive',
    NAMED_TYPE: 'NamedType',
    LIST_TYPE: 'ListType',
    NON_NULL_TYPE: 'NonNullType',
    SCHEMA_DEFINITION: 'SchemaDefinition',
    OPERATION_TYPE_DEFINITION: 'OperationTypeDefinition',
    SCALAR_TYPE_DEFINITION: 'ScalarTypeDefinition',
    OBJECT_TYPE_DEFINITION: 'ObjectTypeDefinition',
    FIELD_DEFINITION: 'FieldDefinition',
    INPUT_VALUE_DEFINITION: 'InputValueDefinition',
    INTERFACE_TYPE_DEFINITION: 'InterfaceTypeDefinition',
    UNION_TYPE_DEFINITION: 'UnionTypeDefinition',
    ENUM_TYPE_DEFINITION: 'EnumTypeDefinition',
    ENUM_VALUE_DEFINITION: 'EnumValueDefinition',
    INPUT_OBJECT_TYPE_DEFINITION: 'InputObjectTypeDefinition',
    DIRECTIVE_DEFINITION: 'DirectiveDefinition',
    SCHEMA_EXTENSION: 'SchemaExtension',
    SCALAR_TYPE_EXTENSION: 'ScalarTypeExtension',
    OBJECT_TYPE_EXTENSION: 'ObjectTypeExtension',
    INTERFACE_TYPE_EXTENSION: 'InterfaceTypeExtension',
    UNION_TYPE_EXTENSION: 'UnionTypeExtension',
    ENUM_TYPE_EXTENSION: 'EnumTypeExtension',
    INPUT_OBJECT_TYPE_EXTENSION: 'InputObjectTypeExtension',
  });
  var Location = (function () {
    function Location(startToken, endToken, source) {
      this.start = startToken.start;
      this.end = endToken.end;
      this.startToken = startToken;
      this.endToken = endToken;
      this.source = source;
    }
    Location.prototype.toJSON = function () {
      return {
        start: this.start,
        end: this.end,
      };
    };
    return Location;
  })();
  defineInspect(Location);
  var Token = (function () {
    function Token(kind, start, end, line, column, prev, value) {
      this.kind = kind;
      this.start = start;
      this.end = end;
      this.line = line;
      this.column = column;
      this.value = value;
      this.prev = prev;
      this.next = null;
    }
    Token.prototype.toJSON = function () {
      return {
        kind: this.kind,
        value: this.value,
        line: this.line,
        column: this.column,
      };
    };
    return Token;
  })();
  defineInspect(Token);
  function isNode(maybeNode) {
    return null != maybeNode && 'string' == typeof maybeNode.kind;
  }
  var QueryDocumentKeys = {
    Name: [],
    Document: ['definitions'],
    OperationDefinition: ['name', 'variableDefinitions', 'directives', 'selectionSet'],
    VariableDefinition: ['variable', 'type', 'defaultValue', 'directives'],
    Variable: ['name'],
    SelectionSet: ['selections'],
    Field: ['alias', 'name', 'arguments', 'directives', 'selectionSet'],
    Argument: ['name', 'value'],
    FragmentSpread: ['name', 'directives'],
    InlineFragment: ['typeCondition', 'directives', 'selectionSet'],
    FragmentDefinition: ['name', 'variableDefinitions', 'typeCondition', 'directives', 'selectionSet'],
    IntValue: [],
    FloatValue: [],
    StringValue: [],
    BooleanValue: [],
    NullValue: [],
    EnumValue: [],
    ListValue: ['values'],
    ObjectValue: ['fields'],
    ObjectField: ['name', 'value'],
    Directive: ['name', 'arguments'],
    NamedType: ['name'],
    ListType: ['type'],
    NonNullType: ['type'],
    SchemaDefinition: ['description', 'directives', 'operationTypes'],
    OperationTypeDefinition: ['type'],
    ScalarTypeDefinition: ['description', 'name', 'directives'],
    ObjectTypeDefinition: ['description', 'name', 'interfaces', 'directives', 'fields'],
    FieldDefinition: ['description', 'name', 'arguments', 'type', 'directives'],
    InputValueDefinition: ['description', 'name', 'type', 'defaultValue', 'directives'],
    InterfaceTypeDefinition: ['description', 'name', 'interfaces', 'directives', 'fields'],
    UnionTypeDefinition: ['description', 'name', 'directives', 'types'],
    EnumTypeDefinition: ['description', 'name', 'directives', 'values'],
    EnumValueDefinition: ['description', 'name', 'directives'],
    InputObjectTypeDefinition: ['description', 'name', 'directives', 'fields'],
    DirectiveDefinition: ['description', 'name', 'arguments', 'locations'],
    SchemaExtension: ['directives', 'operationTypes'],
    ScalarTypeExtension: ['name', 'directives'],
    ObjectTypeExtension: ['name', 'interfaces', 'directives', 'fields'],
    InterfaceTypeExtension: ['name', 'interfaces', 'directives', 'fields'],
    UnionTypeExtension: ['name', 'directives', 'types'],
    EnumTypeExtension: ['name', 'directives', 'values'],
    InputObjectTypeExtension: ['name', 'directives', 'fields'],
  };
  var visitor_BREAK = Object.freeze({});
  function visitor_visit(root, visitor) {
    var visitorKeys = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : QueryDocumentKeys;
    var stack = void 0;
    var inArray = Array.isArray(root);
    var keys = [root];
    var index = -1;
    var edits = [];
    var node = void 0;
    var key = void 0;
    var parent = void 0;
    var path = [];
    var ancestors = [];
    var newRoot = root;
    do {
      var isLeaving = ++index === keys.length;
      var isEdited = isLeaving && 0 !== edits.length;
      if (isLeaving) {
        key = 0 === ancestors.length ? void 0 : path[path.length - 1];
        node = parent;
        parent = ancestors.pop();
        if (isEdited) {
          if (inArray) node = node.slice();
          else {
            var clone = {};
            for (var _i2 = 0, _Object$keys2 = Object.keys(node); _i2 < _Object$keys2.length; _i2++) {
              var k = _Object$keys2[_i2];
              clone[k] = node[k];
            }
            node = clone;
          }
          var editOffset = 0;
          for (var ii = 0; ii < edits.length; ii++) {
            var editKey = edits[ii][0];
            var editValue = edits[ii][1];
            if (inArray) editKey -= editOffset;
            if (inArray && null === editValue) {
              node.splice(editKey, 1);
              editOffset++;
            } else node[editKey] = editValue;
          }
        }
        index = stack.index;
        keys = stack.keys;
        edits = stack.edits;
        inArray = stack.inArray;
        stack = stack.prev;
      } else {
        key = parent ? (inArray ? index : keys[index]) : void 0;
        if (null == (node = parent ? parent[key] : newRoot)) continue;
        if (parent) path.push(key);
      }
      var result = void 0;
      if (!Array.isArray(node)) {
        if (!isNode(node)) throw new Error('Invalid AST Node: '.concat(inspect_inspect(node), '.'));
        var visitFn = getVisitFn(visitor, node.kind, isLeaving);
        if (visitFn) {
          if ((result = visitFn.call(visitor, node, key, parent, path, ancestors)) === visitor_BREAK) break;
          if (false === result) {
            if (!isLeaving) {
              path.pop();
              continue;
            }
          } else if (void 0 !== result) {
            edits.push([key, result]);
            if (!isLeaving)
              if (isNode(result)) node = result;
              else {
                path.pop();
                continue;
              }
          }
        }
      }
      if (void 0 === result && isEdited) edits.push([key, node]);
      if (isLeaving) path.pop();
      else {
        var _visitorKeys$node$kin;
        stack = {
          inArray,
          index,
          keys,
          edits,
          prev: stack,
        };
        keys = (inArray = Array.isArray(node))
          ? node
          : null !== (_visitorKeys$node$kin = visitorKeys[node.kind]) && void 0 !== _visitorKeys$node$kin
          ? _visitorKeys$node$kin
          : [];
        index = -1;
        edits = [];
        if (parent) ancestors.push(parent);
        parent = node;
      }
    } while (void 0 !== stack);
    if (0 !== edits.length) newRoot = edits[edits.length - 1][1];
    return newRoot;
  }
  function visitInParallel(visitors) {
    var skipping = new Array(visitors.length);
    return {
      enter: function (node) {
        for (var i = 0; i < visitors.length; i++)
          if (null == skipping[i]) {
            var fn = getVisitFn(visitors[i], node.kind, false);
            if (fn) {
              var result = fn.apply(visitors[i], arguments);
              if (false === result) skipping[i] = node;
              else if (result === visitor_BREAK) skipping[i] = visitor_BREAK;
              else if (void 0 !== result) return result;
            }
          }
      },
      leave: function (node) {
        for (var i = 0; i < visitors.length; i++)
          if (null == skipping[i]) {
            var fn = getVisitFn(visitors[i], node.kind, true);
            if (fn) {
              var result = fn.apply(visitors[i], arguments);
              if (result === visitor_BREAK) skipping[i] = visitor_BREAK;
              else if (void 0 !== result && false !== result) return result;
            }
          } else if (skipping[i] === node) skipping[i] = null;
      },
    };
  }
  function getVisitFn(visitor, kind, isLeaving) {
    var kindVisitor = visitor[kind];
    if (kindVisitor) {
      if (!isLeaving && 'function' == typeof kindVisitor) return kindVisitor;
      var kindSpecificVisitor = isLeaving ? kindVisitor.leave : kindVisitor.enter;
      if ('function' == typeof kindSpecificVisitor) return kindSpecificVisitor;
    } else {
      var specificVisitor = isLeaving ? visitor.leave : visitor.enter;
      if (specificVisitor) {
        if ('function' == typeof specificVisitor) return specificVisitor;
        var specificKindVisitor = specificVisitor[kind];
        if ('function' == typeof specificKindVisitor) return specificKindVisitor;
      }
    }
  }
  function blockString_dedentBlockStringValue(rawString) {
    var lines = rawString.split(/\r\n|[\n\r]/g);
    var commonIndent = getBlockStringIndentation(rawString);
    if (0 !== commonIndent) for (var i = 1; i < lines.length; i++) lines[i] = lines[i].slice(commonIndent);
    var startLine = 0;
    while (startLine < lines.length && isBlank(lines[startLine])) ++startLine;
    var endLine = lines.length;
    while (endLine > startLine && isBlank(lines[endLine - 1])) --endLine;
    return lines.slice(startLine, endLine).join('\n');
  }
  function isBlank(str) {
    for (var i = 0; i < str.length; ++i) if (' ' !== str[i] && '\t' !== str[i]) return false;
    return true;
  }
  function getBlockStringIndentation(value) {
    var _commonIndent;
    var isFirstLine = true;
    var isEmptyLine = true;
    var indent = 0;
    var commonIndent = null;
    for (var i = 0; i < value.length; ++i)
      switch (value.charCodeAt(i)) {
        case 13:
          if (10 === value.charCodeAt(i + 1)) ++i;

        case 10:
          isFirstLine = false;
          isEmptyLine = true;
          indent = 0;
          break;

        case 9:
        case 32:
          ++indent;
          break;

        default:
          if (isEmptyLine && !isFirstLine && (null === commonIndent || indent < commonIndent)) commonIndent = indent;
          isEmptyLine = false;
      }
    return null !== (_commonIndent = commonIndent) && void 0 !== _commonIndent ? _commonIndent : 0;
  }
  function printBlockString(value) {
    var indentation = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : '';
    var preferMultipleLines = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : false;
    var isSingleLine = -1 === value.indexOf('\n');
    var hasLeadingSpace = ' ' === value[0] || '\t' === value[0];
    var hasTrailingQuote = '"' === value[value.length - 1];
    var hasTrailingSlash = '\\' === value[value.length - 1];
    var printAsMultipleLines = !isSingleLine || hasTrailingQuote || hasTrailingSlash || preferMultipleLines;
    var result = '';
    if (printAsMultipleLines && !(isSingleLine && hasLeadingSpace)) result += '\n' + indentation;
    result += indentation ? value.replace(/\n/g, '\n' + indentation) : value;
    if (printAsMultipleLines) result += '\n';
    return '"""' + result.replace(/"""/g, '\\"""') + '"""';
  }
  function printer_print(ast) {
    return visitor_visit(ast, {
      leave: printDocASTReducer,
    });
  }
  var printDocASTReducer = {
    Name: function (node) {
      return node.value;
    },
    Variable: function (node) {
      return '$' + node.name;
    },
    Document: function (node) {
      return join(node.definitions, '\n\n') + '\n';
    },
    OperationDefinition: function (node) {
      var op = node.operation;
      var name = node.name;
      var varDefs = wrap('(', join(node.variableDefinitions, ', '), ')');
      var directives = join(node.directives, ' ');
      var selectionSet = node.selectionSet;
      return !name && !directives && !varDefs && 'query' === op
        ? selectionSet
        : join([op, join([name, varDefs]), directives, selectionSet], ' ');
    },
    VariableDefinition: function (_ref) {
      var variable = _ref.variable,
        type = _ref.type,
        defaultValue = _ref.defaultValue,
        directives = _ref.directives;
      return variable + ': ' + type + wrap(' = ', defaultValue) + wrap(' ', join(directives, ' '));
    },
    SelectionSet: function (_ref2) {
      return block(_ref2.selections);
    },
    Field: function (_ref3) {
      var alias = _ref3.alias,
        name = _ref3.name,
        args = _ref3.arguments,
        directives = _ref3.directives,
        selectionSet = _ref3.selectionSet;
      var prefix = wrap('', alias, ': ') + name;
      var argsLine = prefix + wrap('(', join(args, ', '), ')');
      if (argsLine.length > 80) argsLine = prefix + wrap('(\n', indent(join(args, '\n')), '\n)');
      return join([argsLine, join(directives, ' '), selectionSet], ' ');
    },
    Argument: function (_ref4) {
      return _ref4.name + ': ' + _ref4.value;
    },
    FragmentSpread: function (_ref5) {
      return '...' + _ref5.name + wrap(' ', join(_ref5.directives, ' '));
    },
    InlineFragment: function (_ref6) {
      var typeCondition = _ref6.typeCondition,
        directives = _ref6.directives,
        selectionSet = _ref6.selectionSet;
      return join(['...', wrap('on ', typeCondition), join(directives, ' '), selectionSet], ' ');
    },
    FragmentDefinition: function (_ref7) {
      var name = _ref7.name,
        typeCondition = _ref7.typeCondition,
        variableDefinitions = _ref7.variableDefinitions,
        directives = _ref7.directives,
        selectionSet = _ref7.selectionSet;
      return (
        'fragment '.concat(name).concat(wrap('(', join(variableDefinitions, ', '), ')'), ' ') +
        'on '.concat(typeCondition, ' ').concat(wrap('', join(directives, ' '), ' ')) +
        selectionSet
      );
    },
    IntValue: function (_ref8) {
      return _ref8.value;
    },
    FloatValue: function (_ref9) {
      return _ref9.value;
    },
    StringValue: function (_ref10, key) {
      var value = _ref10.value;
      return _ref10.block ? printBlockString(value, 'description' === key ? '' : '  ') : JSON.stringify(value);
    },
    BooleanValue: function (_ref11) {
      return _ref11.value ? 'true' : 'false';
    },
    NullValue: function () {
      return 'null';
    },
    EnumValue: function (_ref12) {
      return _ref12.value;
    },
    ListValue: function (_ref13) {
      return '[' + join(_ref13.values, ', ') + ']';
    },
    ObjectValue: function (_ref14) {
      return '{' + join(_ref14.fields, ', ') + '}';
    },
    ObjectField: function (_ref15) {
      return _ref15.name + ': ' + _ref15.value;
    },
    Directive: function (_ref16) {
      return '@' + _ref16.name + wrap('(', join(_ref16.arguments, ', '), ')');
    },
    NamedType: function (_ref17) {
      return _ref17.name;
    },
    ListType: function (_ref18) {
      return '[' + _ref18.type + ']';
    },
    NonNullType: function (_ref19) {
      return _ref19.type + '!';
    },
    SchemaDefinition: addDescription(function (_ref20) {
      var directives = _ref20.directives,
        operationTypes = _ref20.operationTypes;
      return join(['schema', join(directives, ' '), block(operationTypes)], ' ');
    }),
    OperationTypeDefinition: function (_ref21) {
      return _ref21.operation + ': ' + _ref21.type;
    },
    ScalarTypeDefinition: addDescription(function (_ref22) {
      return join(['scalar', _ref22.name, join(_ref22.directives, ' ')], ' ');
    }),
    ObjectTypeDefinition: addDescription(function (_ref23) {
      var name = _ref23.name,
        interfaces = _ref23.interfaces,
        directives = _ref23.directives,
        fields = _ref23.fields;
      return join(
        ['type', name, wrap('implements ', join(interfaces, ' & ')), join(directives, ' '), block(fields)],
        ' '
      );
    }),
    FieldDefinition: addDescription(function (_ref24) {
      var name = _ref24.name,
        args = _ref24.arguments,
        type = _ref24.type,
        directives = _ref24.directives;
      return (
        name +
        (hasMultilineItems(args) ? wrap('(\n', indent(join(args, '\n')), '\n)') : wrap('(', join(args, ', '), ')')) +
        ': ' +
        type +
        wrap(' ', join(directives, ' '))
      );
    }),
    InputValueDefinition: addDescription(function (_ref25) {
      var name = _ref25.name,
        type = _ref25.type,
        defaultValue = _ref25.defaultValue,
        directives = _ref25.directives;
      return join([name + ': ' + type, wrap('= ', defaultValue), join(directives, ' ')], ' ');
    }),
    InterfaceTypeDefinition: addDescription(function (_ref26) {
      var name = _ref26.name,
        interfaces = _ref26.interfaces,
        directives = _ref26.directives,
        fields = _ref26.fields;
      return join(
        ['interface', name, wrap('implements ', join(interfaces, ' & ')), join(directives, ' '), block(fields)],
        ' '
      );
    }),
    UnionTypeDefinition: addDescription(function (_ref27) {
      var name = _ref27.name,
        directives = _ref27.directives,
        types = _ref27.types;
      return join(
        ['union', name, join(directives, ' '), types && 0 !== types.length ? '= ' + join(types, ' | ') : ''],
        ' '
      );
    }),
    EnumTypeDefinition: addDescription(function (_ref28) {
      var name = _ref28.name,
        directives = _ref28.directives,
        values = _ref28.values;
      return join(['enum', name, join(directives, ' '), block(values)], ' ');
    }),
    EnumValueDefinition: addDescription(function (_ref29) {
      return join([_ref29.name, join(_ref29.directives, ' ')], ' ');
    }),
    InputObjectTypeDefinition: addDescription(function (_ref30) {
      var name = _ref30.name,
        directives = _ref30.directives,
        fields = _ref30.fields;
      return join(['input', name, join(directives, ' '), block(fields)], ' ');
    }),
    DirectiveDefinition: addDescription(function (_ref31) {
      var name = _ref31.name,
        args = _ref31.arguments,
        repeatable = _ref31.repeatable,
        locations = _ref31.locations;
      return (
        'directive @' +
        name +
        (hasMultilineItems(args) ? wrap('(\n', indent(join(args, '\n')), '\n)') : wrap('(', join(args, ', '), ')')) +
        (repeatable ? ' repeatable' : '') +
        ' on ' +
        join(locations, ' | ')
      );
    }),
    SchemaExtension: function (_ref32) {
      var directives = _ref32.directives,
        operationTypes = _ref32.operationTypes;
      return join(['extend schema', join(directives, ' '), block(operationTypes)], ' ');
    },
    ScalarTypeExtension: function (_ref33) {
      return join(['extend scalar', _ref33.name, join(_ref33.directives, ' ')], ' ');
    },
    ObjectTypeExtension: function (_ref34) {
      var name = _ref34.name,
        interfaces = _ref34.interfaces,
        directives = _ref34.directives,
        fields = _ref34.fields;
      return join(
        ['extend type', name, wrap('implements ', join(interfaces, ' & ')), join(directives, ' '), block(fields)],
        ' '
      );
    },
    InterfaceTypeExtension: function (_ref35) {
      var name = _ref35.name,
        interfaces = _ref35.interfaces,
        directives = _ref35.directives,
        fields = _ref35.fields;
      return join(
        ['extend interface', name, wrap('implements ', join(interfaces, ' & ')), join(directives, ' '), block(fields)],
        ' '
      );
    },
    UnionTypeExtension: function (_ref36) {
      var name = _ref36.name,
        directives = _ref36.directives,
        types = _ref36.types;
      return join(
        ['extend union', name, join(directives, ' '), types && 0 !== types.length ? '= ' + join(types, ' | ') : ''],
        ' '
      );
    },
    EnumTypeExtension: function (_ref37) {
      var name = _ref37.name,
        directives = _ref37.directives,
        values = _ref37.values;
      return join(['extend enum', name, join(directives, ' '), block(values)], ' ');
    },
    InputObjectTypeExtension: function (_ref38) {
      var name = _ref38.name,
        directives = _ref38.directives,
        fields = _ref38.fields;
      return join(['extend input', name, join(directives, ' '), block(fields)], ' ');
    },
  };
  function addDescription(cb) {
    return function (node) {
      return join([node.description, cb(node)], '\n');
    };
  }
  function join(maybeArray) {
    var _maybeArray$filter$jo;
    var separator = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : '';
    return null !==
      (_maybeArray$filter$jo =
        null == maybeArray
          ? void 0
          : maybeArray
              .filter(function (x) {
                return x;
              })
              .join(separator)) && void 0 !== _maybeArray$filter$jo
      ? _maybeArray$filter$jo
      : '';
  }
  function block(array) {
    return wrap('{\n', indent(join(array, '\n')), '\n}');
  }
  function wrap(start, maybeString) {
    var end = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : '';
    return null != maybeString && '' !== maybeString ? start + maybeString + end : '';
  }
  function indent(str) {
    return wrap('  ', str.replace(/\n/g, '\n  '));
  }
  function isMultiline(str) {
    return -1 !== str.indexOf('\n');
  }
  function hasMultilineItems(maybeArray) {
    return null != maybeArray && maybeArray.some(isMultiline);
  }
  function valueFromASTUntyped(valueNode, variables) {
    switch (valueNode.kind) {
      case kinds_Kind.NULL:
        return null;

      case kinds_Kind.INT:
        return parseInt(valueNode.value, 10);

      case kinds_Kind.FLOAT:
        return parseFloat(valueNode.value);

      case kinds_Kind.STRING:
      case kinds_Kind.ENUM:
      case kinds_Kind.BOOLEAN:
        return valueNode.value;

      case kinds_Kind.LIST:
        return valueNode.values.map(function (node) {
          return valueFromASTUntyped(node, variables);
        });

      case kinds_Kind.OBJECT:
        return keyValMap(
          valueNode.fields,
          function (field) {
            return field.name.value;
          },
          function (field) {
            return valueFromASTUntyped(field.value, variables);
          }
        );

      case kinds_Kind.VARIABLE:
        return null == variables ? void 0 : variables[valueNode.name.value];
    }
    invariant(0, 'Unexpected value node: ' + inspect_inspect(valueNode));
  }
  function definition_defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ('value' in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  function definition_createClass(Constructor, protoProps, staticProps) {
    if (protoProps) definition_defineProperties(Constructor.prototype, protoProps);
    if (staticProps) definition_defineProperties(Constructor, staticProps);
    return Constructor;
  }
  function isType(type) {
    return (
      definition_isScalarType(type) ||
      definition_isObjectType(type) ||
      definition_isInterfaceType(type) ||
      definition_isUnionType(type) ||
      definition_isEnumType(type) ||
      definition_isInputObjectType(type) ||
      definition_isListType(type) ||
      definition_isNonNullType(type)
    );
  }
  function assertType(type) {
    if (!isType(type)) throw new Error('Expected '.concat(inspect_inspect(type), ' to be a GraphQL type.'));
    return type;
  }
  function definition_isScalarType(type) {
    return instanceOf(type, definition_GraphQLScalarType);
  }
  function definition_isObjectType(type) {
    return instanceOf(type, definition_GraphQLObjectType);
  }
  function definition_isInterfaceType(type) {
    return instanceOf(type, definition_GraphQLInterfaceType);
  }
  function definition_isUnionType(type) {
    return instanceOf(type, definition_GraphQLUnionType);
  }
  function definition_isEnumType(type) {
    return instanceOf(type, definition_GraphQLEnumType);
  }
  function definition_isInputObjectType(type) {
    return instanceOf(type, definition_GraphQLInputObjectType);
  }
  function definition_isListType(type) {
    return instanceOf(type, GraphQLList);
  }
  function definition_isNonNullType(type) {
    return instanceOf(type, GraphQLNonNull);
  }
  function definition_isInputType(type) {
    return (
      definition_isScalarType(type) ||
      definition_isEnumType(type) ||
      definition_isInputObjectType(type) ||
      (isWrappingType(type) && definition_isInputType(type.ofType))
    );
  }
  function isOutputType(type) {
    return (
      definition_isScalarType(type) ||
      definition_isObjectType(type) ||
      definition_isInterfaceType(type) ||
      definition_isUnionType(type) ||
      definition_isEnumType(type) ||
      (isWrappingType(type) && isOutputType(type.ofType))
    );
  }
  function definition_isLeafType(type) {
    return definition_isScalarType(type) || definition_isEnumType(type);
  }
  function isCompositeType(type) {
    return definition_isObjectType(type) || definition_isInterfaceType(type) || definition_isUnionType(type);
  }
  function definition_isAbstractType(type) {
    return definition_isInterfaceType(type) || definition_isUnionType(type);
  }
  function GraphQLList(ofType) {
    if (this instanceof GraphQLList) this.ofType = assertType(ofType);
    else return new GraphQLList(ofType);
  }
  GraphQLList.prototype.toString = function () {
    return '[' + String(this.ofType) + ']';
  };
  GraphQLList.prototype.toJSON = function () {
    return this.toString();
  };
  Object.defineProperty(GraphQLList.prototype, SYMBOL_TO_STRING_TAG, {
    get: function () {
      return 'GraphQLList';
    },
  });
  defineInspect(GraphQLList);
  function GraphQLNonNull(ofType) {
    if (this instanceof GraphQLNonNull) this.ofType = assertNullableType(ofType);
    else return new GraphQLNonNull(ofType);
  }
  GraphQLNonNull.prototype.toString = function () {
    return String(this.ofType) + '!';
  };
  GraphQLNonNull.prototype.toJSON = function () {
    return this.toString();
  };
  Object.defineProperty(GraphQLNonNull.prototype, SYMBOL_TO_STRING_TAG, {
    get: function () {
      return 'GraphQLNonNull';
    },
  });
  defineInspect(GraphQLNonNull);
  function isWrappingType(type) {
    return definition_isListType(type) || definition_isNonNullType(type);
  }
  function isNullableType(type) {
    return isType(type) && !definition_isNonNullType(type);
  }
  function assertNullableType(type) {
    if (!isNullableType(type))
      throw new Error('Expected '.concat(inspect_inspect(type), ' to be a GraphQL nullable type.'));
    return type;
  }
  function definition_getNullableType(type) {
    if (type) return definition_isNonNullType(type) ? type.ofType : type;
  }
  function definition_isNamedType(type) {
    return (
      definition_isScalarType(type) ||
      definition_isObjectType(type) ||
      definition_isInterfaceType(type) ||
      definition_isUnionType(type) ||
      definition_isEnumType(type) ||
      definition_isInputObjectType(type)
    );
  }
  function definition_getNamedType(type) {
    if (type) {
      var unwrappedType = type;
      while (isWrappingType(unwrappedType)) unwrappedType = unwrappedType.ofType;
      return unwrappedType;
    }
  }
  function resolveThunk(thunk) {
    return 'function' == typeof thunk ? thunk() : thunk;
  }
  function undefineIfEmpty(arr) {
    return arr && arr.length > 0 ? arr : void 0;
  }
  var definition_GraphQLScalarType = (function () {
    function GraphQLScalarType(config) {
      var _config$parseValue, _config$serialize, _config$parseLiteral;
      var parseValue =
        null !== (_config$parseValue = config.parseValue) && void 0 !== _config$parseValue
          ? _config$parseValue
          : identityFunc;
      this.name = config.name;
      this.description = config.description;
      this.specifiedByUrl = config.specifiedByUrl;
      this.serialize =
        null !== (_config$serialize = config.serialize) && void 0 !== _config$serialize
          ? _config$serialize
          : identityFunc;
      this.parseValue = parseValue;
      this.parseLiteral =
        null !== (_config$parseLiteral = config.parseLiteral) && void 0 !== _config$parseLiteral
          ? _config$parseLiteral
          : function (node, variables) {
              return parseValue(valueFromASTUntyped(node, variables));
            };
      this.extensions = config.extensions && toObjMap(config.extensions);
      this.astNode = config.astNode;
      this.extensionASTNodes = undefineIfEmpty(config.extensionASTNodes);
      'string' == typeof config.name || devAssert(0, 'Must provide name.');
      null == config.specifiedByUrl ||
        'string' == typeof config.specifiedByUrl ||
        devAssert(
          0,
          ''.concat(this.name, ' must provide "specifiedByUrl" as a string, ') +
            'but got: '.concat(inspect_inspect(config.specifiedByUrl), '.')
        );
      null == config.serialize ||
        'function' == typeof config.serialize ||
        devAssert(
          0,
          ''.concat(
            this.name,
            ' must provide "serialize" function. If this custom Scalar is also used as an input type, ensure "parseValue" and "parseLiteral" functions are also provided.'
          )
        );
      if (config.parseLiteral)
        ('function' == typeof config.parseValue && 'function' == typeof config.parseLiteral) ||
          devAssert(0, ''.concat(this.name, ' must provide both "parseValue" and "parseLiteral" functions.'));
    }
    var _proto = GraphQLScalarType.prototype;
    _proto.toConfig = function () {
      var _this$extensionASTNod;
      return {
        name: this.name,
        description: this.description,
        specifiedByUrl: this.specifiedByUrl,
        serialize: this.serialize,
        parseValue: this.parseValue,
        parseLiteral: this.parseLiteral,
        extensions: this.extensions,
        astNode: this.astNode,
        extensionASTNodes:
          null !== (_this$extensionASTNod = this.extensionASTNodes) && void 0 !== _this$extensionASTNod
            ? _this$extensionASTNod
            : [],
      };
    };
    _proto.toString = function () {
      return this.name;
    };
    _proto.toJSON = function () {
      return this.toString();
    };
    definition_createClass(GraphQLScalarType, [
      {
        key: SYMBOL_TO_STRING_TAG,
        get: function () {
          return 'GraphQLScalarType';
        },
      },
    ]);
    return GraphQLScalarType;
  })();
  defineInspect(definition_GraphQLScalarType);
  var definition_GraphQLObjectType = (function () {
    function GraphQLObjectType(config) {
      this.name = config.name;
      this.description = config.description;
      this.isTypeOf = config.isTypeOf;
      this.extensions = config.extensions && toObjMap(config.extensions);
      this.astNode = config.astNode;
      this.extensionASTNodes = undefineIfEmpty(config.extensionASTNodes);
      this._fields = defineFieldMap.bind(void 0, config);
      this._interfaces = defineInterfaces.bind(void 0, config);
      'string' == typeof config.name || devAssert(0, 'Must provide name.');
      null == config.isTypeOf ||
        'function' == typeof config.isTypeOf ||
        devAssert(
          0,
          ''.concat(this.name, ' must provide "isTypeOf" as a function, ') +
            'but got: '.concat(inspect_inspect(config.isTypeOf), '.')
        );
    }
    var _proto2 = GraphQLObjectType.prototype;
    _proto2.getFields = function () {
      if ('function' == typeof this._fields) this._fields = this._fields();
      return this._fields;
    };
    _proto2.getInterfaces = function () {
      if ('function' == typeof this._interfaces) this._interfaces = this._interfaces();
      return this._interfaces;
    };
    _proto2.toConfig = function () {
      return {
        name: this.name,
        description: this.description,
        interfaces: this.getInterfaces(),
        fields: fieldsToFieldsConfig(this.getFields()),
        isTypeOf: this.isTypeOf,
        extensions: this.extensions,
        astNode: this.astNode,
        extensionASTNodes: this.extensionASTNodes || [],
      };
    };
    _proto2.toString = function () {
      return this.name;
    };
    _proto2.toJSON = function () {
      return this.toString();
    };
    definition_createClass(GraphQLObjectType, [
      {
        key: SYMBOL_TO_STRING_TAG,
        get: function () {
          return 'GraphQLObjectType';
        },
      },
    ]);
    return GraphQLObjectType;
  })();
  defineInspect(definition_GraphQLObjectType);
  function defineInterfaces(config) {
    var _resolveThunk;
    var interfaces =
      null !== (_resolveThunk = resolveThunk(config.interfaces)) && void 0 !== _resolveThunk ? _resolveThunk : [];
    Array.isArray(interfaces) ||
      devAssert(0, ''.concat(config.name, ' interfaces must be an Array or a function which returns an Array.'));
    return interfaces;
  }
  function defineFieldMap(config) {
    var fieldMap = resolveThunk(config.fields);
    isPlainObj(fieldMap) ||
      devAssert(
        0,
        ''.concat(
          config.name,
          ' fields must be an object with field names as keys or a function which returns such an object.'
        )
      );
    return mapValue(fieldMap, function (fieldConfig, fieldName) {
      var _fieldConfig$args;
      isPlainObj(fieldConfig) ||
        devAssert(0, ''.concat(config.name, '.').concat(fieldName, ' field config must be an object.'));
      !('isDeprecated' in fieldConfig) ||
        devAssert(
          0,
          ''
            .concat(config.name, '.')
            .concat(fieldName, ' should provide "deprecationReason" instead of "isDeprecated".')
        );
      null == fieldConfig.resolve ||
        'function' == typeof fieldConfig.resolve ||
        devAssert(
          0,
          ''.concat(config.name, '.').concat(fieldName, ' field resolver must be a function if ') +
            'provided, but got: '.concat(inspect_inspect(fieldConfig.resolve), '.')
        );
      var argsConfig =
        null !== (_fieldConfig$args = fieldConfig.args) && void 0 !== _fieldConfig$args ? _fieldConfig$args : {};
      isPlainObj(argsConfig) ||
        devAssert(
          0,
          ''.concat(config.name, '.').concat(fieldName, ' args must be an object with argument names as keys.')
        );
      var args = polyfills_objectEntries(argsConfig).map(function (_ref) {
        var argName = _ref[0],
          argConfig = _ref[1];
        return {
          name: argName,
          description: argConfig.description,
          type: argConfig.type,
          defaultValue: argConfig.defaultValue,
          deprecationReason: argConfig.deprecationReason,
          extensions: argConfig.extensions && toObjMap(argConfig.extensions),
          astNode: argConfig.astNode,
        };
      });
      return {
        name: fieldName,
        description: fieldConfig.description,
        type: fieldConfig.type,
        args,
        resolve: fieldConfig.resolve,
        subscribe: fieldConfig.subscribe,
        isDeprecated: null != fieldConfig.deprecationReason,
        deprecationReason: fieldConfig.deprecationReason,
        extensions: fieldConfig.extensions && toObjMap(fieldConfig.extensions),
        astNode: fieldConfig.astNode,
      };
    });
  }
  function isPlainObj(obj) {
    return isObjectLike(obj) && !Array.isArray(obj);
  }
  function fieldsToFieldsConfig(fields) {
    return mapValue(fields, function (field) {
      return {
        description: field.description,
        type: field.type,
        args: argsToArgsConfig(field.args),
        resolve: field.resolve,
        subscribe: field.subscribe,
        deprecationReason: field.deprecationReason,
        extensions: field.extensions,
        astNode: field.astNode,
      };
    });
  }
  function argsToArgsConfig(args) {
    return keyValMap(
      args,
      function (arg) {
        return arg.name;
      },
      function (arg) {
        return {
          description: arg.description,
          type: arg.type,
          defaultValue: arg.defaultValue,
          deprecationReason: arg.deprecationReason,
          extensions: arg.extensions,
          astNode: arg.astNode,
        };
      }
    );
  }
  function isRequiredArgument(arg) {
    return definition_isNonNullType(arg.type) && void 0 === arg.defaultValue;
  }
  var definition_GraphQLInterfaceType = (function () {
    function GraphQLInterfaceType(config) {
      this.name = config.name;
      this.description = config.description;
      this.resolveType = config.resolveType;
      this.extensions = config.extensions && toObjMap(config.extensions);
      this.astNode = config.astNode;
      this.extensionASTNodes = undefineIfEmpty(config.extensionASTNodes);
      this._fields = defineFieldMap.bind(void 0, config);
      this._interfaces = defineInterfaces.bind(void 0, config);
      'string' == typeof config.name || devAssert(0, 'Must provide name.');
      null == config.resolveType ||
        'function' == typeof config.resolveType ||
        devAssert(
          0,
          ''.concat(this.name, ' must provide "resolveType" as a function, ') +
            'but got: '.concat(inspect_inspect(config.resolveType), '.')
        );
    }
    var _proto3 = GraphQLInterfaceType.prototype;
    _proto3.getFields = function () {
      if ('function' == typeof this._fields) this._fields = this._fields();
      return this._fields;
    };
    _proto3.getInterfaces = function () {
      if ('function' == typeof this._interfaces) this._interfaces = this._interfaces();
      return this._interfaces;
    };
    _proto3.toConfig = function () {
      var _this$extensionASTNod2;
      return {
        name: this.name,
        description: this.description,
        interfaces: this.getInterfaces(),
        fields: fieldsToFieldsConfig(this.getFields()),
        resolveType: this.resolveType,
        extensions: this.extensions,
        astNode: this.astNode,
        extensionASTNodes:
          null !== (_this$extensionASTNod2 = this.extensionASTNodes) && void 0 !== _this$extensionASTNod2
            ? _this$extensionASTNod2
            : [],
      };
    };
    _proto3.toString = function () {
      return this.name;
    };
    _proto3.toJSON = function () {
      return this.toString();
    };
    definition_createClass(GraphQLInterfaceType, [
      {
        key: SYMBOL_TO_STRING_TAG,
        get: function () {
          return 'GraphQLInterfaceType';
        },
      },
    ]);
    return GraphQLInterfaceType;
  })();
  defineInspect(definition_GraphQLInterfaceType);
  var definition_GraphQLUnionType = (function () {
    function GraphQLUnionType(config) {
      this.name = config.name;
      this.description = config.description;
      this.resolveType = config.resolveType;
      this.extensions = config.extensions && toObjMap(config.extensions);
      this.astNode = config.astNode;
      this.extensionASTNodes = undefineIfEmpty(config.extensionASTNodes);
      this._types = defineTypes.bind(void 0, config);
      'string' == typeof config.name || devAssert(0, 'Must provide name.');
      null == config.resolveType ||
        'function' == typeof config.resolveType ||
        devAssert(
          0,
          ''.concat(this.name, ' must provide "resolveType" as a function, ') +
            'but got: '.concat(inspect_inspect(config.resolveType), '.')
        );
    }
    var _proto4 = GraphQLUnionType.prototype;
    _proto4.getTypes = function () {
      if ('function' == typeof this._types) this._types = this._types();
      return this._types;
    };
    _proto4.toConfig = function () {
      var _this$extensionASTNod3;
      return {
        name: this.name,
        description: this.description,
        types: this.getTypes(),
        resolveType: this.resolveType,
        extensions: this.extensions,
        astNode: this.astNode,
        extensionASTNodes:
          null !== (_this$extensionASTNod3 = this.extensionASTNodes) && void 0 !== _this$extensionASTNod3
            ? _this$extensionASTNod3
            : [],
      };
    };
    _proto4.toString = function () {
      return this.name;
    };
    _proto4.toJSON = function () {
      return this.toString();
    };
    definition_createClass(GraphQLUnionType, [
      {
        key: SYMBOL_TO_STRING_TAG,
        get: function () {
          return 'GraphQLUnionType';
        },
      },
    ]);
    return GraphQLUnionType;
  })();
  defineInspect(definition_GraphQLUnionType);
  function defineTypes(config) {
    var types = resolveThunk(config.types);
    Array.isArray(types) ||
      devAssert(
        0,
        'Must provide Array of types or a function which returns such an array for Union '.concat(config.name, '.')
      );
    return types;
  }
  var definition_GraphQLEnumType = (function () {
    function GraphQLEnumType(config) {
      this.name = config.name;
      this.description = config.description;
      this.extensions = config.extensions && toObjMap(config.extensions);
      this.astNode = config.astNode;
      this.extensionASTNodes = undefineIfEmpty(config.extensionASTNodes);
      this._values = defineEnumValues(this.name, config.values);
      this._valueLookup = new Map(
        this._values.map(function (enumValue) {
          return [enumValue.value, enumValue];
        })
      );
      this._nameLookup = keyMap(this._values, function (value) {
        return value.name;
      });
      'string' == typeof config.name || devAssert(0, 'Must provide name.');
    }
    var _proto5 = GraphQLEnumType.prototype;
    _proto5.getValues = function () {
      return this._values;
    };
    _proto5.getValue = function (name) {
      return this._nameLookup[name];
    };
    _proto5.serialize = function (outputValue) {
      var enumValue = this._valueLookup.get(outputValue);
      if (void 0 === enumValue)
        throw new GraphQLError(
          'Enum "'.concat(this.name, '" cannot represent value: ').concat(inspect_inspect(outputValue))
        );
      return enumValue.name;
    };
    _proto5.parseValue = function (inputValue) {
      if ('string' != typeof inputValue) {
        var valueStr = inspect_inspect(inputValue);
        throw new GraphQLError(
          'Enum "'.concat(this.name, '" cannot represent non-string value: ').concat(valueStr, '.') +
            didYouMeanEnumValue(this, valueStr)
        );
      }
      var enumValue = this.getValue(inputValue);
      if (null == enumValue)
        throw new GraphQLError(
          'Value "'.concat(inputValue, '" does not exist in "').concat(this.name, '" enum.') +
            didYouMeanEnumValue(this, inputValue)
        );
      return enumValue.value;
    };
    _proto5.parseLiteral = function (valueNode, _variables) {
      if (valueNode.kind !== kinds_Kind.ENUM) {
        var valueStr = printer_print(valueNode);
        throw new GraphQLError(
          'Enum "'.concat(this.name, '" cannot represent non-enum value: ').concat(valueStr, '.') +
            didYouMeanEnumValue(this, valueStr),
          valueNode
        );
      }
      var enumValue = this.getValue(valueNode.value);
      if (null == enumValue) {
        var _valueStr = printer_print(valueNode);
        throw new GraphQLError(
          'Value "'.concat(_valueStr, '" does not exist in "').concat(this.name, '" enum.') +
            didYouMeanEnumValue(this, _valueStr),
          valueNode
        );
      }
      return enumValue.value;
    };
    _proto5.toConfig = function () {
      var _this$extensionASTNod4;
      var values = keyValMap(
        this.getValues(),
        function (value) {
          return value.name;
        },
        function (value) {
          return {
            description: value.description,
            value: value.value,
            deprecationReason: value.deprecationReason,
            extensions: value.extensions,
            astNode: value.astNode,
          };
        }
      );
      return {
        name: this.name,
        description: this.description,
        values,
        extensions: this.extensions,
        astNode: this.astNode,
        extensionASTNodes:
          null !== (_this$extensionASTNod4 = this.extensionASTNodes) && void 0 !== _this$extensionASTNod4
            ? _this$extensionASTNod4
            : [],
      };
    };
    _proto5.toString = function () {
      return this.name;
    };
    _proto5.toJSON = function () {
      return this.toString();
    };
    definition_createClass(GraphQLEnumType, [
      {
        key: SYMBOL_TO_STRING_TAG,
        get: function () {
          return 'GraphQLEnumType';
        },
      },
    ]);
    return GraphQLEnumType;
  })();
  defineInspect(definition_GraphQLEnumType);
  function didYouMeanEnumValue(enumType, unknownValueStr) {
    return didYouMean(
      'the enum value',
      suggestionList(
        unknownValueStr,
        enumType.getValues().map(function (value) {
          return value.name;
        })
      )
    );
  }
  function defineEnumValues(typeName, valueMap) {
    isPlainObj(valueMap) || devAssert(0, ''.concat(typeName, ' values must be an object with value names as keys.'));
    return polyfills_objectEntries(valueMap).map(function (_ref2) {
      var valueName = _ref2[0],
        valueConfig = _ref2[1];
      isPlainObj(valueConfig) ||
        devAssert(
          0,
          ''.concat(typeName, '.').concat(valueName, ' must refer to an object with a "value" key ') +
            'representing an internal value but got: '.concat(inspect_inspect(valueConfig), '.')
        );
      !('isDeprecated' in valueConfig) ||
        devAssert(
          0,
          ''.concat(typeName, '.').concat(valueName, ' should provide "deprecationReason" instead of "isDeprecated".')
        );
      return {
        name: valueName,
        description: valueConfig.description,
        value: void 0 !== valueConfig.value ? valueConfig.value : valueName,
        isDeprecated: null != valueConfig.deprecationReason,
        deprecationReason: valueConfig.deprecationReason,
        extensions: valueConfig.extensions && toObjMap(valueConfig.extensions),
        astNode: valueConfig.astNode,
      };
    });
  }
  var definition_GraphQLInputObjectType = (function () {
    function GraphQLInputObjectType(config) {
      this.name = config.name;
      this.description = config.description;
      this.extensions = config.extensions && toObjMap(config.extensions);
      this.astNode = config.astNode;
      this.extensionASTNodes = undefineIfEmpty(config.extensionASTNodes);
      this._fields = defineInputFieldMap.bind(void 0, config);
      'string' == typeof config.name || devAssert(0, 'Must provide name.');
    }
    var _proto6 = GraphQLInputObjectType.prototype;
    _proto6.getFields = function () {
      if ('function' == typeof this._fields) this._fields = this._fields();
      return this._fields;
    };
    _proto6.toConfig = function () {
      var _this$extensionASTNod5;
      var fields = mapValue(this.getFields(), function (field) {
        return {
          description: field.description,
          type: field.type,
          defaultValue: field.defaultValue,
          extensions: field.extensions,
          astNode: field.astNode,
        };
      });
      return {
        name: this.name,
        description: this.description,
        fields,
        extensions: this.extensions,
        astNode: this.astNode,
        extensionASTNodes:
          null !== (_this$extensionASTNod5 = this.extensionASTNodes) && void 0 !== _this$extensionASTNod5
            ? _this$extensionASTNod5
            : [],
      };
    };
    _proto6.toString = function () {
      return this.name;
    };
    _proto6.toJSON = function () {
      return this.toString();
    };
    definition_createClass(GraphQLInputObjectType, [
      {
        key: SYMBOL_TO_STRING_TAG,
        get: function () {
          return 'GraphQLInputObjectType';
        },
      },
    ]);
    return GraphQLInputObjectType;
  })();
  defineInspect(definition_GraphQLInputObjectType);
  function defineInputFieldMap(config) {
    var fieldMap = resolveThunk(config.fields);
    isPlainObj(fieldMap) ||
      devAssert(
        0,
        ''.concat(
          config.name,
          ' fields must be an object with field names as keys or a function which returns such an object.'
        )
      );
    return mapValue(fieldMap, function (fieldConfig, fieldName) {
      !('resolve' in fieldConfig) ||
        devAssert(
          0,
          ''
            .concat(config.name, '.')
            .concat(fieldName, ' field has a resolve property, but Input Types cannot define resolvers.')
        );
      return {
        name: fieldName,
        description: fieldConfig.description,
        type: fieldConfig.type,
        defaultValue: fieldConfig.defaultValue,
        deprecationReason: fieldConfig.deprecationReason,
        extensions: fieldConfig.extensions && toObjMap(fieldConfig.extensions),
        astNode: fieldConfig.astNode,
      };
    });
  }
  function isRequiredInputField(field) {
    return definition_isNonNullType(field.type) && void 0 === field.defaultValue;
  }
  const polyfills_find = Array.prototype.find
    ? function (list, predicate) {
        return Array.prototype.find.call(list, predicate);
      }
    : function (list, predicate) {
        for (var _i2 = 0; _i2 < list.length; _i2++) {
          var value = list[_i2];
          if (predicate(value)) return value;
        }
      };
  const polyfills_arrayFrom =
    Array.from ||
    function (obj, mapFn, thisArg) {
      if (null == obj) throw new TypeError('Array.from requires an array-like object - not null or undefined');
      var iteratorMethod = obj[SYMBOL_ITERATOR];
      if ('function' == typeof iteratorMethod) {
        var iterator = iteratorMethod.call(obj);
        var result = [];
        var step;
        for (var i = 0; !(step = iterator.next()).done; ++i) {
          result.push(mapFn.call(thisArg, step.value, i));
          if (i > 9999999) throw new TypeError('Near-infinite iteration.');
        }
        return result;
      }
      var length = obj.length;
      if ('number' == typeof length && length >= 0 && length % 1 == 0) {
        var _result = [];
        for (var _i = 0; _i < length; ++_i)
          if (Object.prototype.hasOwnProperty.call(obj, _i)) _result.push(mapFn.call(thisArg, obj[_i], _i));
        return _result;
      }
      return [];
    };
  const polyfills_objectValues =
    Object.values ||
    function (obj) {
      return Object.keys(obj).map(function (key) {
        return obj[key];
      });
    };
  var DirectiveLocation = Object.freeze({
    QUERY: 'QUERY',
    MUTATION: 'MUTATION',
    SUBSCRIPTION: 'SUBSCRIPTION',
    FIELD: 'FIELD',
    FRAGMENT_DEFINITION: 'FRAGMENT_DEFINITION',
    FRAGMENT_SPREAD: 'FRAGMENT_SPREAD',
    INLINE_FRAGMENT: 'INLINE_FRAGMENT',
    VARIABLE_DEFINITION: 'VARIABLE_DEFINITION',
    SCHEMA: 'SCHEMA',
    SCALAR: 'SCALAR',
    OBJECT: 'OBJECT',
    FIELD_DEFINITION: 'FIELD_DEFINITION',
    ARGUMENT_DEFINITION: 'ARGUMENT_DEFINITION',
    INTERFACE: 'INTERFACE',
    UNION: 'UNION',
    ENUM: 'ENUM',
    ENUM_VALUE: 'ENUM_VALUE',
    INPUT_OBJECT: 'INPUT_OBJECT',
    INPUT_FIELD_DEFINITION: 'INPUT_FIELD_DEFINITION',
  });
  const polyfills_isFinite =
    Number.isFinite ||
    function (value) {
      return 'number' == typeof value && isFinite(value);
    };
  function safeArrayFrom_typeof(obj) {
    if ('function' == typeof Symbol && 'symbol' == typeof Symbol.iterator)
      safeArrayFrom_typeof = function (obj) {
        return typeof obj;
      };
    else
      safeArrayFrom_typeof = function (obj) {
        return obj && 'function' == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype
          ? 'symbol'
          : typeof obj;
      };
    return safeArrayFrom_typeof(obj);
  }
  function safeArrayFrom(collection) {
    var mapFn =
      arguments.length > 1 && void 0 !== arguments[1]
        ? arguments[1]
        : function (item) {
            return item;
          };
    if (null == collection || 'object' !== safeArrayFrom_typeof(collection)) return null;
    if (Array.isArray(collection)) return collection.map(mapFn);
    var iteratorMethod = collection[SYMBOL_ITERATOR];
    if ('function' == typeof iteratorMethod) {
      var iterator = iteratorMethod.call(collection);
      var result = [];
      var step;
      for (var i = 0; !(step = iterator.next()).done; ++i) result.push(mapFn(step.value, i));
      return result;
    }
    var length = collection.length;
    if ('number' == typeof length && length >= 0 && length % 1 == 0) {
      var _result = [];
      for (var _i = 0; _i < length; ++_i) {
        if (!Object.prototype.hasOwnProperty.call(collection, _i)) return null;
        _result.push(mapFn(collection[String(_i)], _i));
      }
      return _result;
    }
    return null;
  }
  const polyfills_isInteger =
    Number.isInteger ||
    function (value) {
      return 'number' == typeof value && isFinite(value) && Math.floor(value) === value;
    };
  var GraphQLInt = new definition_GraphQLScalarType({
    name: 'Int',
    description:
      'The `Int` scalar type represents non-fractional signed whole numeric values. Int can represent values between -(2^31) and 2^31 - 1.',
    serialize: function (outputValue) {
      var coercedValue = serializeObject(outputValue);
      if ('boolean' == typeof coercedValue) return coercedValue ? 1 : 0;
      var num = coercedValue;
      if ('string' == typeof coercedValue && '' !== coercedValue) num = Number(coercedValue);
      if (!polyfills_isInteger(num))
        throw new GraphQLError('Int cannot represent non-integer value: '.concat(inspect_inspect(coercedValue)));
      if (num > 2147483647 || num < -2147483648)
        throw new GraphQLError(
          'Int cannot represent non 32-bit signed integer value: ' + inspect_inspect(coercedValue)
        );
      return num;
    },
    parseValue: function (inputValue) {
      if (!polyfills_isInteger(inputValue))
        throw new GraphQLError('Int cannot represent non-integer value: '.concat(inspect_inspect(inputValue)));
      if (inputValue > 2147483647 || inputValue < -2147483648)
        throw new GraphQLError('Int cannot represent non 32-bit signed integer value: '.concat(inputValue));
      return inputValue;
    },
    parseLiteral: function (valueNode) {
      if (valueNode.kind !== kinds_Kind.INT)
        throw new GraphQLError('Int cannot represent non-integer value: '.concat(printer_print(valueNode)), valueNode);
      var num = parseInt(valueNode.value, 10);
      if (num > 2147483647 || num < -2147483648)
        throw new GraphQLError(
          'Int cannot represent non 32-bit signed integer value: '.concat(valueNode.value),
          valueNode
        );
      return num;
    },
  });
  var GraphQLFloat = new definition_GraphQLScalarType({
    name: 'Float',
    description:
      'The `Float` scalar type represents signed double-precision fractional values as specified by [IEEE 754](https://en.wikipedia.org/wiki/IEEE_floating_point).',
    serialize: function (outputValue) {
      var coercedValue = serializeObject(outputValue);
      if ('boolean' == typeof coercedValue) return coercedValue ? 1 : 0;
      var num = coercedValue;
      if ('string' == typeof coercedValue && '' !== coercedValue) num = Number(coercedValue);
      if (!polyfills_isFinite(num))
        throw new GraphQLError('Float cannot represent non numeric value: '.concat(inspect_inspect(coercedValue)));
      return num;
    },
    parseValue: function (inputValue) {
      if (!polyfills_isFinite(inputValue))
        throw new GraphQLError('Float cannot represent non numeric value: '.concat(inspect_inspect(inputValue)));
      return inputValue;
    },
    parseLiteral: function (valueNode) {
      if (valueNode.kind !== kinds_Kind.FLOAT && valueNode.kind !== kinds_Kind.INT)
        throw new GraphQLError(
          'Float cannot represent non numeric value: '.concat(printer_print(valueNode)),
          valueNode
        );
      return parseFloat(valueNode.value);
    },
  });
  function serializeObject(outputValue) {
    if (isObjectLike(outputValue)) {
      if ('function' == typeof outputValue.valueOf) {
        var valueOfResult = outputValue.valueOf();
        if (!isObjectLike(valueOfResult)) return valueOfResult;
      }
      if ('function' == typeof outputValue.toJSON) return outputValue.toJSON();
    }
    return outputValue;
  }
  var GraphQLString = new definition_GraphQLScalarType({
    name: 'String',
    description:
      'The `String` scalar type represents textual data, represented as UTF-8 character sequences. The String type is most often used by GraphQL to represent free-form human-readable text.',
    serialize: function (outputValue) {
      var coercedValue = serializeObject(outputValue);
      if ('string' == typeof coercedValue) return coercedValue;
      if ('boolean' == typeof coercedValue) return coercedValue ? 'true' : 'false';
      if (polyfills_isFinite(coercedValue)) return coercedValue.toString();
      throw new GraphQLError('String cannot represent value: '.concat(inspect_inspect(outputValue)));
    },
    parseValue: function (inputValue) {
      if ('string' != typeof inputValue)
        throw new GraphQLError('String cannot represent a non string value: '.concat(inspect_inspect(inputValue)));
      return inputValue;
    },
    parseLiteral: function (valueNode) {
      if (valueNode.kind !== kinds_Kind.STRING)
        throw new GraphQLError(
          'String cannot represent a non string value: '.concat(printer_print(valueNode)),
          valueNode
        );
      return valueNode.value;
    },
  });
  var GraphQLBoolean = new definition_GraphQLScalarType({
    name: 'Boolean',
    description: 'The `Boolean` scalar type represents `true` or `false`.',
    serialize: function (outputValue) {
      var coercedValue = serializeObject(outputValue);
      if ('boolean' == typeof coercedValue) return coercedValue;
      if (polyfills_isFinite(coercedValue)) return 0 !== coercedValue;
      throw new GraphQLError('Boolean cannot represent a non boolean value: '.concat(inspect_inspect(coercedValue)));
    },
    parseValue: function (inputValue) {
      if ('boolean' != typeof inputValue)
        throw new GraphQLError('Boolean cannot represent a non boolean value: '.concat(inspect_inspect(inputValue)));
      return inputValue;
    },
    parseLiteral: function (valueNode) {
      if (valueNode.kind !== kinds_Kind.BOOLEAN)
        throw new GraphQLError(
          'Boolean cannot represent a non boolean value: '.concat(printer_print(valueNode)),
          valueNode
        );
      return valueNode.value;
    },
  });
  var GraphQLID = new definition_GraphQLScalarType({
    name: 'ID',
    description:
      'The `ID` scalar type represents a unique identifier, often used to refetch an object or as key for a cache. The ID type appears in a JSON response as a String; however, it is not intended to be human-readable. When expected as an input type, any string (such as `"4"`) or integer (such as `4`) input value will be accepted as an ID.',
    serialize: function (outputValue) {
      var coercedValue = serializeObject(outputValue);
      if ('string' == typeof coercedValue) return coercedValue;
      if (polyfills_isInteger(coercedValue)) return String(coercedValue);
      throw new GraphQLError('ID cannot represent value: '.concat(inspect_inspect(outputValue)));
    },
    parseValue: function (inputValue) {
      if ('string' == typeof inputValue) return inputValue;
      if (polyfills_isInteger(inputValue)) return inputValue.toString();
      throw new GraphQLError('ID cannot represent value: '.concat(inspect_inspect(inputValue)));
    },
    parseLiteral: function (valueNode) {
      if (valueNode.kind !== kinds_Kind.STRING && valueNode.kind !== kinds_Kind.INT)
        throw new GraphQLError(
          'ID cannot represent a non-string and non-integer value: ' + printer_print(valueNode),
          valueNode
        );
      return valueNode.value;
    },
  });
  var specifiedScalarTypes = Object.freeze([GraphQLString, GraphQLInt, GraphQLFloat, GraphQLBoolean, GraphQLID]);
  function scalars_isSpecifiedScalarType(type) {
    return specifiedScalarTypes.some(function (_ref) {
      var name = _ref.name;
      return type.name === name;
    });
  }
  function astFromValue(value, type) {
    if (definition_isNonNullType(type)) {
      var astValue = astFromValue(value, type.ofType);
      if ((null == astValue ? void 0 : astValue.kind) === kinds_Kind.NULL) return null;
      return astValue;
    }
    if (null === value)
      return {
        kind: kinds_Kind.NULL,
      };
    if (void 0 === value) return null;
    if (definition_isListType(type)) {
      var itemType = type.ofType;
      var items = safeArrayFrom(value);
      if (null != items) {
        var valuesNodes = [];
        for (var _i2 = 0; _i2 < items.length; _i2++) {
          var itemNode = astFromValue(items[_i2], itemType);
          if (null != itemNode) valuesNodes.push(itemNode);
        }
        return {
          kind: kinds_Kind.LIST,
          values: valuesNodes,
        };
      }
      return astFromValue(value, itemType);
    }
    if (definition_isInputObjectType(type)) {
      if (!isObjectLike(value)) return null;
      var fieldNodes = [];
      for (var _i4 = 0, _objectValues2 = polyfills_objectValues(type.getFields()); _i4 < _objectValues2.length; _i4++) {
        var field = _objectValues2[_i4];
        var fieldValue = astFromValue(value[field.name], field.type);
        if (fieldValue)
          fieldNodes.push({
            kind: kinds_Kind.OBJECT_FIELD,
            name: {
              kind: kinds_Kind.NAME,
              value: field.name,
            },
            value: fieldValue,
          });
      }
      return {
        kind: kinds_Kind.OBJECT,
        fields: fieldNodes,
      };
    }
    if (definition_isLeafType(type)) {
      var serialized = type.serialize(value);
      if (null == serialized) return null;
      if ('boolean' == typeof serialized)
        return {
          kind: kinds_Kind.BOOLEAN,
          value: serialized,
        };
      if ('number' == typeof serialized && polyfills_isFinite(serialized)) {
        var stringNum = String(serialized);
        return integerStringRegExp.test(stringNum)
          ? {
              kind: kinds_Kind.INT,
              value: stringNum,
            }
          : {
              kind: kinds_Kind.FLOAT,
              value: stringNum,
            };
      }
      if ('string' == typeof serialized) {
        if (definition_isEnumType(type))
          return {
            kind: kinds_Kind.ENUM,
            value: serialized,
          };
        if (type === GraphQLID && integerStringRegExp.test(serialized))
          return {
            kind: kinds_Kind.INT,
            value: serialized,
          };
        return {
          kind: kinds_Kind.STRING,
          value: serialized,
        };
      }
      throw new TypeError('Cannot convert value to AST: '.concat(inspect_inspect(serialized), '.'));
    }
    invariant(0, 'Unexpected input type: ' + inspect_inspect(type));
  }
  var integerStringRegExp = /^-?(?:0|[1-9][0-9]*)$/;
  var __Schema = new definition_GraphQLObjectType({
    name: '__Schema',
    description:
      'A GraphQL Schema defines the capabilities of a GraphQL server. It exposes all available types and directives on the server, as well as the entry points for query, mutation, and subscription operations.',
    fields: function () {
      return {
        description: {
          type: GraphQLString,
          resolve: function (schema) {
            return schema.description;
          },
        },
        types: {
          description: 'A list of all types supported by this server.',
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(__Type))),
          resolve: function (schema) {
            return polyfills_objectValues(schema.getTypeMap());
          },
        },
        queryType: {
          description: 'The type that query operations will be rooted at.',
          type: new GraphQLNonNull(__Type),
          resolve: function (schema) {
            return schema.getQueryType();
          },
        },
        mutationType: {
          description: 'If this server supports mutation, the type that mutation operations will be rooted at.',
          type: __Type,
          resolve: function (schema) {
            return schema.getMutationType();
          },
        },
        subscriptionType: {
          description: 'If this server support subscription, the type that subscription operations will be rooted at.',
          type: __Type,
          resolve: function (schema) {
            return schema.getSubscriptionType();
          },
        },
        directives: {
          description: 'A list of all directives supported by this server.',
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(__Directive))),
          resolve: function (schema) {
            return schema.getDirectives();
          },
        },
      };
    },
  });
  var __Directive = new definition_GraphQLObjectType({
    name: '__Directive',
    description:
      "A Directive provides a way to describe alternate runtime execution and type validation behavior in a GraphQL document.\n\nIn some cases, you need to provide options to alter GraphQL's execution behavior in ways field arguments will not suffice, such as conditionally including or skipping a field. Directives provide this by describing additional information to the executor.",
    fields: function () {
      return {
        name: {
          type: new GraphQLNonNull(GraphQLString),
          resolve: function (directive) {
            return directive.name;
          },
        },
        description: {
          type: GraphQLString,
          resolve: function (directive) {
            return directive.description;
          },
        },
        isRepeatable: {
          type: new GraphQLNonNull(GraphQLBoolean),
          resolve: function (directive) {
            return directive.isRepeatable;
          },
        },
        locations: {
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(__DirectiveLocation))),
          resolve: function (directive) {
            return directive.locations;
          },
        },
        args: {
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(__InputValue))),
          resolve: function (directive) {
            return directive.args;
          },
        },
      };
    },
  });
  var __DirectiveLocation = new definition_GraphQLEnumType({
    name: '__DirectiveLocation',
    description:
      'A Directive can be adjacent to many parts of the GraphQL language, a __DirectiveLocation describes one such possible adjacencies.',
    values: {
      QUERY: {
        value: DirectiveLocation.QUERY,
        description: 'Location adjacent to a query operation.',
      },
      MUTATION: {
        value: DirectiveLocation.MUTATION,
        description: 'Location adjacent to a mutation operation.',
      },
      SUBSCRIPTION: {
        value: DirectiveLocation.SUBSCRIPTION,
        description: 'Location adjacent to a subscription operation.',
      },
      FIELD: {
        value: DirectiveLocation.FIELD,
        description: 'Location adjacent to a field.',
      },
      FRAGMENT_DEFINITION: {
        value: DirectiveLocation.FRAGMENT_DEFINITION,
        description: 'Location adjacent to a fragment definition.',
      },
      FRAGMENT_SPREAD: {
        value: DirectiveLocation.FRAGMENT_SPREAD,
        description: 'Location adjacent to a fragment spread.',
      },
      INLINE_FRAGMENT: {
        value: DirectiveLocation.INLINE_FRAGMENT,
        description: 'Location adjacent to an inline fragment.',
      },
      VARIABLE_DEFINITION: {
        value: DirectiveLocation.VARIABLE_DEFINITION,
        description: 'Location adjacent to a variable definition.',
      },
      SCHEMA: {
        value: DirectiveLocation.SCHEMA,
        description: 'Location adjacent to a schema definition.',
      },
      SCALAR: {
        value: DirectiveLocation.SCALAR,
        description: 'Location adjacent to a scalar definition.',
      },
      OBJECT: {
        value: DirectiveLocation.OBJECT,
        description: 'Location adjacent to an object type definition.',
      },
      FIELD_DEFINITION: {
        value: DirectiveLocation.FIELD_DEFINITION,
        description: 'Location adjacent to a field definition.',
      },
      ARGUMENT_DEFINITION: {
        value: DirectiveLocation.ARGUMENT_DEFINITION,
        description: 'Location adjacent to an argument definition.',
      },
      INTERFACE: {
        value: DirectiveLocation.INTERFACE,
        description: 'Location adjacent to an interface definition.',
      },
      UNION: {
        value: DirectiveLocation.UNION,
        description: 'Location adjacent to a union definition.',
      },
      ENUM: {
        value: DirectiveLocation.ENUM,
        description: 'Location adjacent to an enum definition.',
      },
      ENUM_VALUE: {
        value: DirectiveLocation.ENUM_VALUE,
        description: 'Location adjacent to an enum value definition.',
      },
      INPUT_OBJECT: {
        value: DirectiveLocation.INPUT_OBJECT,
        description: 'Location adjacent to an input object type definition.',
      },
      INPUT_FIELD_DEFINITION: {
        value: DirectiveLocation.INPUT_FIELD_DEFINITION,
        description: 'Location adjacent to an input object field definition.',
      },
    },
  });
  var __Type = new definition_GraphQLObjectType({
    name: '__Type',
    description:
      'The fundamental unit of any GraphQL Schema is the type. There are many kinds of types in GraphQL as represented by the `__TypeKind` enum.\n\nDepending on the kind of a type, certain fields describe information about that type. Scalar types provide no information beyond a name, description and optional `specifiedByUrl`, while Enum types provide their values. Object and Interface types provide the fields they describe. Abstract types, Union and Interface, provide the Object types possible at runtime. List and NonNull types compose other types.',
    fields: function () {
      return {
        kind: {
          type: new GraphQLNonNull(__TypeKind),
          resolve: function (type) {
            if (definition_isScalarType(type)) return TypeKind.SCALAR;
            if (definition_isObjectType(type)) return TypeKind.OBJECT;
            if (definition_isInterfaceType(type)) return TypeKind.INTERFACE;
            if (definition_isUnionType(type)) return TypeKind.UNION;
            if (definition_isEnumType(type)) return TypeKind.ENUM;
            if (definition_isInputObjectType(type)) return TypeKind.INPUT_OBJECT;
            if (definition_isListType(type)) return TypeKind.LIST;
            if (definition_isNonNullType(type)) return TypeKind.NON_NULL;
            invariant(0, 'Unexpected type: "'.concat(inspect_inspect(type), '".'));
          },
        },
        name: {
          type: GraphQLString,
          resolve: function (type) {
            return void 0 !== type.name ? type.name : void 0;
          },
        },
        description: {
          type: GraphQLString,
          resolve: function (type) {
            return void 0 !== type.description ? type.description : void 0;
          },
        },
        specifiedByUrl: {
          type: GraphQLString,
          resolve: function (obj) {
            return void 0 !== obj.specifiedByUrl ? obj.specifiedByUrl : void 0;
          },
        },
        fields: {
          type: new GraphQLList(new GraphQLNonNull(__Field)),
          args: {
            includeDeprecated: {
              type: GraphQLBoolean,
              defaultValue: false,
            },
          },
          resolve: function (type, _ref) {
            var includeDeprecated = _ref.includeDeprecated;
            if (definition_isObjectType(type) || definition_isInterfaceType(type)) {
              var fields = polyfills_objectValues(type.getFields());
              return includeDeprecated
                ? fields
                : fields.filter(function (field) {
                    return null == field.deprecationReason;
                  });
            }
          },
        },
        interfaces: {
          type: new GraphQLList(new GraphQLNonNull(__Type)),
          resolve: function (type) {
            if (definition_isObjectType(type) || definition_isInterfaceType(type)) return type.getInterfaces();
          },
        },
        possibleTypes: {
          type: new GraphQLList(new GraphQLNonNull(__Type)),
          resolve: function (type, _args, _context, _ref2) {
            var schema = _ref2.schema;
            if (definition_isAbstractType(type)) return schema.getPossibleTypes(type);
          },
        },
        enumValues: {
          type: new GraphQLList(new GraphQLNonNull(__EnumValue)),
          args: {
            includeDeprecated: {
              type: GraphQLBoolean,
              defaultValue: false,
            },
          },
          resolve: function (type, _ref3) {
            var includeDeprecated = _ref3.includeDeprecated;
            if (definition_isEnumType(type)) {
              var values = type.getValues();
              return includeDeprecated
                ? values
                : values.filter(function (field) {
                    return null == field.deprecationReason;
                  });
            }
          },
        },
        inputFields: {
          type: new GraphQLList(new GraphQLNonNull(__InputValue)),
          args: {
            includeDeprecated: {
              type: GraphQLBoolean,
              defaultValue: false,
            },
          },
          resolve: function (type, _ref4) {
            var includeDeprecated = _ref4.includeDeprecated;
            if (definition_isInputObjectType(type)) {
              var values = polyfills_objectValues(type.getFields());
              return includeDeprecated
                ? values
                : values.filter(function (field) {
                    return null == field.deprecationReason;
                  });
            }
          },
        },
        ofType: {
          type: __Type,
          resolve: function (type) {
            return void 0 !== type.ofType ? type.ofType : void 0;
          },
        },
      };
    },
  });
  var __Field = new definition_GraphQLObjectType({
    name: '__Field',
    description:
      'Object and Interface types are described by a list of Fields, each of which has a name, potentially a list of arguments, and a return type.',
    fields: function () {
      return {
        name: {
          type: new GraphQLNonNull(GraphQLString),
          resolve: function (field) {
            return field.name;
          },
        },
        description: {
          type: GraphQLString,
          resolve: function (field) {
            return field.description;
          },
        },
        args: {
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(__InputValue))),
          args: {
            includeDeprecated: {
              type: GraphQLBoolean,
              defaultValue: false,
            },
          },
          resolve: function (field, _ref5) {
            return _ref5.includeDeprecated
              ? field.args
              : field.args.filter(function (arg) {
                  return null == arg.deprecationReason;
                });
          },
        },
        type: {
          type: new GraphQLNonNull(__Type),
          resolve: function (field) {
            return field.type;
          },
        },
        isDeprecated: {
          type: new GraphQLNonNull(GraphQLBoolean),
          resolve: function (field) {
            return null != field.deprecationReason;
          },
        },
        deprecationReason: {
          type: GraphQLString,
          resolve: function (field) {
            return field.deprecationReason;
          },
        },
      };
    },
  });
  var __InputValue = new definition_GraphQLObjectType({
    name: '__InputValue',
    description:
      'Arguments provided to Fields or Directives and the input fields of an InputObject are represented as Input Values which describe their type and optionally a default value.',
    fields: function () {
      return {
        name: {
          type: new GraphQLNonNull(GraphQLString),
          resolve: function (inputValue) {
            return inputValue.name;
          },
        },
        description: {
          type: GraphQLString,
          resolve: function (inputValue) {
            return inputValue.description;
          },
        },
        type: {
          type: new GraphQLNonNull(__Type),
          resolve: function (inputValue) {
            return inputValue.type;
          },
        },
        defaultValue: {
          type: GraphQLString,
          description: 'A GraphQL-formatted string representing the default value for this input value.',
          resolve: function (inputValue) {
            var type = inputValue.type;
            var valueAST = astFromValue(inputValue.defaultValue, type);
            return valueAST ? printer_print(valueAST) : null;
          },
        },
        isDeprecated: {
          type: new GraphQLNonNull(GraphQLBoolean),
          resolve: function (field) {
            return null != field.deprecationReason;
          },
        },
        deprecationReason: {
          type: GraphQLString,
          resolve: function (obj) {
            return obj.deprecationReason;
          },
        },
      };
    },
  });
  var __EnumValue = new definition_GraphQLObjectType({
    name: '__EnumValue',
    description:
      'One possible value for a given Enum. Enum values are unique values, not a placeholder for a string or numeric value. However an Enum value is returned in a JSON response as a string.',
    fields: function () {
      return {
        name: {
          type: new GraphQLNonNull(GraphQLString),
          resolve: function (enumValue) {
            return enumValue.name;
          },
        },
        description: {
          type: GraphQLString,
          resolve: function (enumValue) {
            return enumValue.description;
          },
        },
        isDeprecated: {
          type: new GraphQLNonNull(GraphQLBoolean),
          resolve: function (enumValue) {
            return null != enumValue.deprecationReason;
          },
        },
        deprecationReason: {
          type: GraphQLString,
          resolve: function (enumValue) {
            return enumValue.deprecationReason;
          },
        },
      };
    },
  });
  var TypeKind = Object.freeze({
    SCALAR: 'SCALAR',
    OBJECT: 'OBJECT',
    INTERFACE: 'INTERFACE',
    UNION: 'UNION',
    ENUM: 'ENUM',
    INPUT_OBJECT: 'INPUT_OBJECT',
    LIST: 'LIST',
    NON_NULL: 'NON_NULL',
  });
  var __TypeKind = new definition_GraphQLEnumType({
    name: '__TypeKind',
    description: 'An enum describing what kind of type a given `__Type` is.',
    values: {
      SCALAR: {
        value: TypeKind.SCALAR,
        description: 'Indicates this type is a scalar.',
      },
      OBJECT: {
        value: TypeKind.OBJECT,
        description: 'Indicates this type is an object. `fields` and `interfaces` are valid fields.',
      },
      INTERFACE: {
        value: TypeKind.INTERFACE,
        description:
          'Indicates this type is an interface. `fields`, `interfaces`, and `possibleTypes` are valid fields.',
      },
      UNION: {
        value: TypeKind.UNION,
        description: 'Indicates this type is a union. `possibleTypes` is a valid field.',
      },
      ENUM: {
        value: TypeKind.ENUM,
        description: 'Indicates this type is an enum. `enumValues` is a valid field.',
      },
      INPUT_OBJECT: {
        value: TypeKind.INPUT_OBJECT,
        description: 'Indicates this type is an input object. `inputFields` is a valid field.',
      },
      LIST: {
        value: TypeKind.LIST,
        description: 'Indicates this type is a list. `ofType` is a valid field.',
      },
      NON_NULL: {
        value: TypeKind.NON_NULL,
        description: 'Indicates this type is a non-null. `ofType` is a valid field.',
      },
    },
  });
  var SchemaMetaFieldDef = {
    name: '__schema',
    type: new GraphQLNonNull(__Schema),
    description: 'Access the current type schema of this server.',
    args: [],
    resolve: function (_source, _args, _context, _ref6) {
      return _ref6.schema;
    },
    isDeprecated: false,
    deprecationReason: void 0,
    extensions: void 0,
    astNode: void 0,
  };
  var TypeMetaFieldDef = {
    name: '__type',
    type: __Type,
    description: 'Request the type information of a single type.',
    args: [
      {
        name: 'name',
        description: void 0,
        type: new GraphQLNonNull(GraphQLString),
        defaultValue: void 0,
        deprecationReason: void 0,
        extensions: void 0,
        astNode: void 0,
      },
    ],
    resolve: function (_source, _ref7, _context, _ref8) {
      var name = _ref7.name;
      return _ref8.schema.getType(name);
    },
    isDeprecated: false,
    deprecationReason: void 0,
    extensions: void 0,
    astNode: void 0,
  };
  var introspection_TypeNameMetaFieldDef = {
    name: '__typename',
    type: new GraphQLNonNull(GraphQLString),
    description: 'The name of the current Object type at runtime.',
    args: [],
    resolve: function (_source, _args, _context, _ref9) {
      return _ref9.parentType.name;
    },
    isDeprecated: false,
    deprecationReason: void 0,
    extensions: void 0,
    astNode: void 0,
  };
  var introspectionTypes = Object.freeze([
    __Schema,
    __Directive,
    __DirectiveLocation,
    __Type,
    __Field,
    __InputValue,
    __EnumValue,
    __TypeKind,
  ]);
  function introspection_isIntrospectionType(type) {
    return introspectionTypes.some(function (_ref10) {
      var name = _ref10.name;
      return type.name === name;
    });
  }
  function directives_defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ('value' in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  function directives_createClass(Constructor, protoProps, staticProps) {
    if (protoProps) directives_defineProperties(Constructor.prototype, protoProps);
    if (staticProps) directives_defineProperties(Constructor, staticProps);
    return Constructor;
  }
  function directives_isDirective(directive) {
    return instanceOf(directive, GraphQLDirective);
  }
  var GraphQLDirective = (function () {
    function GraphQLDirective(config) {
      var _config$isRepeatable, _config$args;
      this.name = config.name;
      this.description = config.description;
      this.locations = config.locations;
      this.isRepeatable =
        null !== (_config$isRepeatable = config.isRepeatable) && void 0 !== _config$isRepeatable
          ? _config$isRepeatable
          : false;
      this.extensions = config.extensions && toObjMap(config.extensions);
      this.astNode = config.astNode;
      config.name || devAssert(0, 'Directive must be named.');
      Array.isArray(config.locations) || devAssert(0, '@'.concat(config.name, ' locations must be an Array.'));
      var args = null !== (_config$args = config.args) && void 0 !== _config$args ? _config$args : {};
      (isObjectLike(args) && !Array.isArray(args)) ||
        devAssert(0, '@'.concat(config.name, ' args must be an object with argument names as keys.'));
      this.args = polyfills_objectEntries(args).map(function (_ref) {
        var argName = _ref[0],
          argConfig = _ref[1];
        return {
          name: argName,
          description: argConfig.description,
          type: argConfig.type,
          defaultValue: argConfig.defaultValue,
          deprecationReason: argConfig.deprecationReason,
          extensions: argConfig.extensions && toObjMap(argConfig.extensions),
          astNode: argConfig.astNode,
        };
      });
    }
    var _proto = GraphQLDirective.prototype;
    _proto.toConfig = function () {
      return {
        name: this.name,
        description: this.description,
        locations: this.locations,
        args: argsToArgsConfig(this.args),
        isRepeatable: this.isRepeatable,
        extensions: this.extensions,
        astNode: this.astNode,
      };
    };
    _proto.toString = function () {
      return '@' + this.name;
    };
    _proto.toJSON = function () {
      return this.toString();
    };
    directives_createClass(GraphQLDirective, [
      {
        key: SYMBOL_TO_STRING_TAG,
        get: function () {
          return 'GraphQLDirective';
        },
      },
    ]);
    return GraphQLDirective;
  })();
  defineInspect(GraphQLDirective);
  var GraphQLIncludeDirective = new GraphQLDirective({
    name: 'include',
    description: 'Directs the executor to include this field or fragment only when the `if` argument is true.',
    locations: [DirectiveLocation.FIELD, DirectiveLocation.FRAGMENT_SPREAD, DirectiveLocation.INLINE_FRAGMENT],
    args: {
      if: {
        type: new GraphQLNonNull(GraphQLBoolean),
        description: 'Included when true.',
      },
    },
  });
  var GraphQLSkipDirective = new GraphQLDirective({
    name: 'skip',
    description: 'Directs the executor to skip this field or fragment when the `if` argument is true.',
    locations: [DirectiveLocation.FIELD, DirectiveLocation.FRAGMENT_SPREAD, DirectiveLocation.INLINE_FRAGMENT],
    args: {
      if: {
        type: new GraphQLNonNull(GraphQLBoolean),
        description: 'Skipped when true.',
      },
    },
  });
  var GraphQLDeprecatedDirective = new GraphQLDirective({
    name: 'deprecated',
    description: 'Marks an element of a GraphQL schema as no longer supported.',
    locations: [
      DirectiveLocation.FIELD_DEFINITION,
      DirectiveLocation.ARGUMENT_DEFINITION,
      DirectiveLocation.INPUT_FIELD_DEFINITION,
      DirectiveLocation.ENUM_VALUE,
    ],
    args: {
      reason: {
        type: GraphQLString,
        description:
          'Explains why this element was deprecated, usually also including a suggestion for how to access supported similar data. Formatted using the Markdown syntax, as specified by [CommonMark](https://commonmark.org/).',
        defaultValue: 'No longer supported',
      },
    },
  });
  var GraphQLSpecifiedByDirective = new GraphQLDirective({
    name: 'specifiedBy',
    description: 'Exposes a URL that specifies the behaviour of this scalar.',
    locations: [DirectiveLocation.SCALAR],
    args: {
      url: {
        type: new GraphQLNonNull(GraphQLString),
        description: 'The URL that specifies the behaviour of this scalar.',
      },
    },
  });
  var specifiedDirectives = Object.freeze([
    GraphQLIncludeDirective,
    GraphQLSkipDirective,
    GraphQLDeprecatedDirective,
    GraphQLSpecifiedByDirective,
  ]);
  function isSpecifiedDirective(directive) {
    return specifiedDirectives.some(function (_ref2) {
      return _ref2.name === directive.name;
    });
  }
  function schema_defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ('value' in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  function schema_createClass(Constructor, protoProps, staticProps) {
    if (protoProps) schema_defineProperties(Constructor.prototype, protoProps);
    if (staticProps) schema_defineProperties(Constructor, staticProps);
    return Constructor;
  }
  function isSchema(schema) {
    return instanceOf(schema, schema_GraphQLSchema);
  }
  function assertSchema(schema) {
    if (!isSchema(schema)) throw new Error('Expected '.concat(inspect_inspect(schema), ' to be a GraphQL schema.'));
    return schema;
  }
  var schema_GraphQLSchema = (function () {
    function GraphQLSchema(config) {
      var _config$directives;
      this.__validationErrors = true === config.assumeValid ? [] : void 0;
      isObjectLike(config) || devAssert(0, 'Must provide configuration object.');
      !config.types ||
        Array.isArray(config.types) ||
        devAssert(0, '"types" must be Array if provided but got: '.concat(inspect_inspect(config.types), '.'));
      !config.directives ||
        Array.isArray(config.directives) ||
        devAssert(
          0,
          '"directives" must be Array if provided but got: ' + ''.concat(inspect_inspect(config.directives), '.')
        );
      this.description = config.description;
      this.extensions = config.extensions && toObjMap(config.extensions);
      this.astNode = config.astNode;
      this.extensionASTNodes = config.extensionASTNodes;
      this._queryType = config.query;
      this._mutationType = config.mutation;
      this._subscriptionType = config.subscription;
      this._directives =
        null !== (_config$directives = config.directives) && void 0 !== _config$directives
          ? _config$directives
          : specifiedDirectives;
      var allReferencedTypes = new Set(config.types);
      if (null != config.types)
        for (var _i2 = 0, _config$types2 = config.types; _i2 < _config$types2.length; _i2++) {
          var type = _config$types2[_i2];
          allReferencedTypes.delete(type);
          collectReferencedTypes(type, allReferencedTypes);
        }
      if (null != this._queryType) collectReferencedTypes(this._queryType, allReferencedTypes);
      if (null != this._mutationType) collectReferencedTypes(this._mutationType, allReferencedTypes);
      if (null != this._subscriptionType) collectReferencedTypes(this._subscriptionType, allReferencedTypes);
      for (var _i4 = 0, _this$_directives2 = this._directives; _i4 < _this$_directives2.length; _i4++) {
        var directive = _this$_directives2[_i4];
        if (directives_isDirective(directive))
          for (var _i6 = 0, _directive$args2 = directive.args; _i6 < _directive$args2.length; _i6++)
            collectReferencedTypes(_directive$args2[_i6].type, allReferencedTypes);
      }
      collectReferencedTypes(__Schema, allReferencedTypes);
      this._typeMap = Object.create(null);
      this._subTypeMap = Object.create(null);
      this._implementationsMap = Object.create(null);
      for (var _i8 = 0, _arrayFrom2 = polyfills_arrayFrom(allReferencedTypes); _i8 < _arrayFrom2.length; _i8++) {
        var namedType = _arrayFrom2[_i8];
        if (null == namedType) continue;
        var typeName = namedType.name;
        typeName || devAssert(0, 'One of the provided types for building the Schema is missing a name.');
        if (void 0 !== this._typeMap[typeName])
          throw new Error(
            'Schema must contain uniquely named types but contains multiple types named "'.concat(typeName, '".')
          );
        this._typeMap[typeName] = namedType;
        if (definition_isInterfaceType(namedType))
          for (
            var _i10 = 0, _namedType$getInterfa2 = namedType.getInterfaces();
            _i10 < _namedType$getInterfa2.length;
            _i10++
          ) {
            var iface = _namedType$getInterfa2[_i10];
            if (definition_isInterfaceType(iface)) {
              var implementations = this._implementationsMap[iface.name];
              if (void 0 === implementations)
                implementations = this._implementationsMap[iface.name] = {
                  objects: [],
                  interfaces: [],
                };
              implementations.interfaces.push(namedType);
            }
          }
        else if (definition_isObjectType(namedType))
          for (
            var _i12 = 0, _namedType$getInterfa4 = namedType.getInterfaces();
            _i12 < _namedType$getInterfa4.length;
            _i12++
          ) {
            var _iface = _namedType$getInterfa4[_i12];
            if (definition_isInterfaceType(_iface)) {
              var _implementations = this._implementationsMap[_iface.name];
              if (void 0 === _implementations)
                _implementations = this._implementationsMap[_iface.name] = {
                  objects: [],
                  interfaces: [],
                };
              _implementations.objects.push(namedType);
            }
          }
      }
    }
    var _proto = GraphQLSchema.prototype;
    _proto.getQueryType = function () {
      return this._queryType;
    };
    _proto.getMutationType = function () {
      return this._mutationType;
    };
    _proto.getSubscriptionType = function () {
      return this._subscriptionType;
    };
    _proto.getTypeMap = function () {
      return this._typeMap;
    };
    _proto.getType = function (name) {
      return this.getTypeMap()[name];
    };
    _proto.getPossibleTypes = function (abstractType) {
      return definition_isUnionType(abstractType)
        ? abstractType.getTypes()
        : this.getImplementations(abstractType).objects;
    };
    _proto.getImplementations = function (interfaceType) {
      var implementations = this._implementationsMap[interfaceType.name];
      return null != implementations
        ? implementations
        : {
            objects: [],
            interfaces: [],
          };
    };
    _proto.isPossibleType = function (abstractType, possibleType) {
      return this.isSubType(abstractType, possibleType);
    };
    _proto.isSubType = function (abstractType, maybeSubType) {
      var map = this._subTypeMap[abstractType.name];
      if (void 0 === map) {
        map = Object.create(null);
        if (definition_isUnionType(abstractType))
          for (
            var _i14 = 0, _abstractType$getType2 = abstractType.getTypes();
            _i14 < _abstractType$getType2.length;
            _i14++
          )
            map[_abstractType$getType2[_i14].name] = true;
        else {
          var implementations = this.getImplementations(abstractType);
          for (
            var _i16 = 0, _implementations$obje2 = implementations.objects;
            _i16 < _implementations$obje2.length;
            _i16++
          )
            map[_implementations$obje2[_i16].name] = true;
          for (
            var _i18 = 0, _implementations$inte2 = implementations.interfaces;
            _i18 < _implementations$inte2.length;
            _i18++
          )
            map[_implementations$inte2[_i18].name] = true;
        }
        this._subTypeMap[abstractType.name] = map;
      }
      return void 0 !== map[maybeSubType.name];
    };
    _proto.getDirectives = function () {
      return this._directives;
    };
    _proto.getDirective = function (name) {
      return polyfills_find(this.getDirectives(), function (directive) {
        return directive.name === name;
      });
    };
    _proto.toConfig = function () {
      var _this$extensionASTNod;
      return {
        description: this.description,
        query: this.getQueryType(),
        mutation: this.getMutationType(),
        subscription: this.getSubscriptionType(),
        types: polyfills_objectValues(this.getTypeMap()),
        directives: this.getDirectives().slice(),
        extensions: this.extensions,
        astNode: this.astNode,
        extensionASTNodes:
          null !== (_this$extensionASTNod = this.extensionASTNodes) && void 0 !== _this$extensionASTNod
            ? _this$extensionASTNod
            : [],
        assumeValid: void 0 !== this.__validationErrors,
      };
    };
    schema_createClass(GraphQLSchema, [
      {
        key: SYMBOL_TO_STRING_TAG,
        get: function () {
          return 'GraphQLSchema';
        },
      },
    ]);
    return GraphQLSchema;
  })();
  function collectReferencedTypes(type, typeSet) {
    var namedType = definition_getNamedType(type);
    if (!typeSet.has(namedType)) {
      typeSet.add(namedType);
      if (definition_isUnionType(namedType))
        for (var _i20 = 0, _namedType$getTypes2 = namedType.getTypes(); _i20 < _namedType$getTypes2.length; _i20++)
          collectReferencedTypes(_namedType$getTypes2[_i20], typeSet);
      else if (definition_isObjectType(namedType) || definition_isInterfaceType(namedType)) {
        for (
          var _i22 = 0, _namedType$getInterfa6 = namedType.getInterfaces();
          _i22 < _namedType$getInterfa6.length;
          _i22++
        )
          collectReferencedTypes(_namedType$getInterfa6[_i22], typeSet);
        for (
          var _i24 = 0, _objectValues2 = polyfills_objectValues(namedType.getFields());
          _i24 < _objectValues2.length;
          _i24++
        ) {
          var field = _objectValues2[_i24];
          collectReferencedTypes(field.type, typeSet);
          for (var _i26 = 0, _field$args2 = field.args; _i26 < _field$args2.length; _i26++)
            collectReferencedTypes(_field$args2[_i26].type, typeSet);
        }
      } else if (definition_isInputObjectType(namedType))
        for (
          var _i28 = 0, _objectValues4 = polyfills_objectValues(namedType.getFields());
          _i28 < _objectValues4.length;
          _i28++
        )
          collectReferencedTypes(_objectValues4[_i28].type, typeSet);
    }
    return typeSet;
  }
  function syntaxError(source, position, description) {
    return new GraphQLError('Syntax Error: '.concat(description), void 0, source, [position]);
  }
  var tokenKind_TokenKind = Object.freeze({
    SOF: '<SOF>',
    EOF: '<EOF>',
    BANG: '!',
    DOLLAR: '$',
    AMP: '&',
    PAREN_L: '(',
    PAREN_R: ')',
    SPREAD: '...',
    COLON: ':',
    EQUALS: '=',
    AT: '@',
    BRACKET_L: '[',
    BRACKET_R: ']',
    BRACE_L: '{',
    PIPE: '|',
    BRACE_R: '}',
    NAME: 'Name',
    INT: 'Int',
    FLOAT: 'Float',
    STRING: 'String',
    BLOCK_STRING: 'BlockString',
    COMMENT: 'Comment',
  });
  function source_defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ('value' in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  function source_createClass(Constructor, protoProps, staticProps) {
    if (protoProps) source_defineProperties(Constructor.prototype, protoProps);
    if (staticProps) source_defineProperties(Constructor, staticProps);
    return Constructor;
  }
  var source_Source = (function () {
    function Source(body) {
      var name = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 'GraphQL request';
      var locationOffset =
        arguments.length > 2 && void 0 !== arguments[2]
          ? arguments[2]
          : {
              line: 1,
              column: 1,
            };
      'string' == typeof body || devAssert(0, 'Body must be a string. Received: '.concat(inspect_inspect(body), '.'));
      this.body = body;
      this.name = name;
      this.locationOffset = locationOffset;
      this.locationOffset.line > 0 || devAssert(0, 'line in locationOffset is 1-indexed and must be positive.');
      this.locationOffset.column > 0 || devAssert(0, 'column in locationOffset is 1-indexed and must be positive.');
    }
    source_createClass(Source, [
      {
        key: SYMBOL_TO_STRING_TAG,
        get: function () {
          return 'Source';
        },
      },
    ]);
    return Source;
  })();
  function isSource(source) {
    return instanceOf(source, source_Source);
  }
  var Lexer = (function () {
    function Lexer(source) {
      var startOfFileToken = new Token(tokenKind_TokenKind.SOF, 0, 0, 0, 0, null);
      this.source = source;
      this.lastToken = startOfFileToken;
      this.token = startOfFileToken;
      this.line = 1;
      this.lineStart = 0;
    }
    var _proto = Lexer.prototype;
    _proto.advance = function () {
      this.lastToken = this.token;
      return (this.token = this.lookahead());
    };
    _proto.lookahead = function () {
      var token = this.token;
      if (token.kind !== tokenKind_TokenKind.EOF)
        do {
          var _token$next;
          token =
            null !== (_token$next = token.next) && void 0 !== _token$next
              ? _token$next
              : (token.next = readToken(this, token));
        } while (token.kind === tokenKind_TokenKind.COMMENT);
      return token;
    };
    return Lexer;
  })();
  function isPunctuatorTokenKind(kind) {
    return (
      kind === tokenKind_TokenKind.BANG ||
      kind === tokenKind_TokenKind.DOLLAR ||
      kind === tokenKind_TokenKind.AMP ||
      kind === tokenKind_TokenKind.PAREN_L ||
      kind === tokenKind_TokenKind.PAREN_R ||
      kind === tokenKind_TokenKind.SPREAD ||
      kind === tokenKind_TokenKind.COLON ||
      kind === tokenKind_TokenKind.EQUALS ||
      kind === tokenKind_TokenKind.AT ||
      kind === tokenKind_TokenKind.BRACKET_L ||
      kind === tokenKind_TokenKind.BRACKET_R ||
      kind === tokenKind_TokenKind.BRACE_L ||
      kind === tokenKind_TokenKind.PIPE ||
      kind === tokenKind_TokenKind.BRACE_R
    );
  }
  function printCharCode(code) {
    return isNaN(code)
      ? tokenKind_TokenKind.EOF
      : code < 127
      ? JSON.stringify(String.fromCharCode(code))
      : '"\\u'.concat(('00' + code.toString(16).toUpperCase()).slice(-4), '"');
  }
  function readToken(lexer, prev) {
    var source = lexer.source;
    var body = source.body;
    var bodyLength = body.length;
    var pos = prev.end;
    while (pos < bodyLength) {
      var code = body.charCodeAt(pos);
      var _line = lexer.line;
      var _col = 1 + pos - lexer.lineStart;
      switch (code) {
        case 65279:
        case 9:
        case 32:
        case 44:
          ++pos;
          continue;

        case 10:
          ++pos;
          ++lexer.line;
          lexer.lineStart = pos;
          continue;

        case 13:
          if (10 === body.charCodeAt(pos + 1)) pos += 2;
          else ++pos;
          ++lexer.line;
          lexer.lineStart = pos;
          continue;

        case 33:
          return new Token(tokenKind_TokenKind.BANG, pos, pos + 1, _line, _col, prev);

        case 35:
          return readComment(source, pos, _line, _col, prev);

        case 36:
          return new Token(tokenKind_TokenKind.DOLLAR, pos, pos + 1, _line, _col, prev);

        case 38:
          return new Token(tokenKind_TokenKind.AMP, pos, pos + 1, _line, _col, prev);

        case 40:
          return new Token(tokenKind_TokenKind.PAREN_L, pos, pos + 1, _line, _col, prev);

        case 41:
          return new Token(tokenKind_TokenKind.PAREN_R, pos, pos + 1, _line, _col, prev);

        case 46:
          if (46 === body.charCodeAt(pos + 1) && 46 === body.charCodeAt(pos + 2))
            return new Token(tokenKind_TokenKind.SPREAD, pos, pos + 3, _line, _col, prev);
          break;

        case 58:
          return new Token(tokenKind_TokenKind.COLON, pos, pos + 1, _line, _col, prev);

        case 61:
          return new Token(tokenKind_TokenKind.EQUALS, pos, pos + 1, _line, _col, prev);

        case 64:
          return new Token(tokenKind_TokenKind.AT, pos, pos + 1, _line, _col, prev);

        case 91:
          return new Token(tokenKind_TokenKind.BRACKET_L, pos, pos + 1, _line, _col, prev);

        case 93:
          return new Token(tokenKind_TokenKind.BRACKET_R, pos, pos + 1, _line, _col, prev);

        case 123:
          return new Token(tokenKind_TokenKind.BRACE_L, pos, pos + 1, _line, _col, prev);

        case 124:
          return new Token(tokenKind_TokenKind.PIPE, pos, pos + 1, _line, _col, prev);

        case 125:
          return new Token(tokenKind_TokenKind.BRACE_R, pos, pos + 1, _line, _col, prev);

        case 34:
          if (34 === body.charCodeAt(pos + 1) && 34 === body.charCodeAt(pos + 2))
            return readBlockString(source, pos, _line, _col, prev, lexer);
          return readString(source, pos, _line, _col, prev);

        case 45:
        case 48:
        case 49:
        case 50:
        case 51:
        case 52:
        case 53:
        case 54:
        case 55:
        case 56:
        case 57:
          return readNumber(source, pos, code, _line, _col, prev);

        case 65:
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 95:
        case 97:
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
        case 109:
        case 110:
        case 111:
        case 112:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 119:
        case 120:
        case 121:
        case 122:
          return readName(source, pos, _line, _col, prev);
      }
      throw syntaxError(source, pos, unexpectedCharacterMessage(code));
    }
    var line = lexer.line;
    var col = 1 + pos - lexer.lineStart;
    return new Token(tokenKind_TokenKind.EOF, bodyLength, bodyLength, line, col, prev);
  }
  function unexpectedCharacterMessage(code) {
    if (code < 32 && 9 !== code && 10 !== code && 13 !== code)
      return 'Cannot contain the invalid character '.concat(printCharCode(code), '.');
    if (39 === code) return 'Unexpected single quote character (\'), did you mean to use a double quote (")?';
    return 'Cannot parse the unexpected character '.concat(printCharCode(code), '.');
  }
  function readComment(source, start, line, col, prev) {
    var body = source.body;
    var code;
    var position = start;
    do {
      code = body.charCodeAt(++position);
    } while (!isNaN(code) && (code > 31 || 9 === code));
    return new Token(tokenKind_TokenKind.COMMENT, start, position, line, col, prev, body.slice(start + 1, position));
  }
  function readNumber(source, start, firstCode, line, col, prev) {
    var body = source.body;
    var code = firstCode;
    var position = start;
    var isFloat = false;
    if (45 === code) code = body.charCodeAt(++position);
    if (48 === code) {
      if ((code = body.charCodeAt(++position)) >= 48 && code <= 57)
        throw syntaxError(
          source,
          position,
          'Invalid number, unexpected digit after 0: '.concat(printCharCode(code), '.')
        );
    } else {
      position = readDigits(source, position, code);
      code = body.charCodeAt(position);
    }
    if (46 === code) {
      isFloat = true;
      code = body.charCodeAt(++position);
      position = readDigits(source, position, code);
      code = body.charCodeAt(position);
    }
    if (69 === code || 101 === code) {
      isFloat = true;
      if (43 === (code = body.charCodeAt(++position)) || 45 === code) code = body.charCodeAt(++position);
      position = readDigits(source, position, code);
      code = body.charCodeAt(position);
    }
    if (46 === code || isNameStart(code))
      throw syntaxError(source, position, 'Invalid number, expected digit but got: '.concat(printCharCode(code), '.'));
    return new Token(
      isFloat ? tokenKind_TokenKind.FLOAT : tokenKind_TokenKind.INT,
      start,
      position,
      line,
      col,
      prev,
      body.slice(start, position)
    );
  }
  function readDigits(source, start, firstCode) {
    var body = source.body;
    var position = start;
    var code = firstCode;
    if (code >= 48 && code <= 57) {
      do {
        code = body.charCodeAt(++position);
      } while (code >= 48 && code <= 57);
      return position;
    }
    throw syntaxError(source, position, 'Invalid number, expected digit but got: '.concat(printCharCode(code), '.'));
  }
  function readString(source, start, line, col, prev) {
    var body = source.body;
    var position = start + 1;
    var chunkStart = position;
    var code = 0;
    var value = '';
    while (position < body.length && !isNaN((code = body.charCodeAt(position))) && 10 !== code && 13 !== code) {
      if (34 === code) {
        value += body.slice(chunkStart, position);
        return new Token(tokenKind_TokenKind.STRING, start, position + 1, line, col, prev, value);
      }
      if (code < 32 && 9 !== code)
        throw syntaxError(source, position, 'Invalid character within String: '.concat(printCharCode(code), '.'));
      ++position;
      if (92 === code) {
        value += body.slice(chunkStart, position - 1);
        switch ((code = body.charCodeAt(position))) {
          case 34:
            value += '"';
            break;

          case 47:
            value += '/';
            break;

          case 92:
            value += '\\';
            break;

          case 98:
            value += '\b';
            break;

          case 102:
            value += '\f';
            break;

          case 110:
            value += '\n';
            break;

          case 114:
            value += '\r';
            break;

          case 116:
            value += '\t';
            break;

          case 117:
            var charCode = uniCharCode(
              body.charCodeAt(position + 1),
              body.charCodeAt(position + 2),
              body.charCodeAt(position + 3),
              body.charCodeAt(position + 4)
            );
            if (charCode < 0) {
              var invalidSequence = body.slice(position + 1, position + 5);
              throw syntaxError(
                source,
                position,
                'Invalid character escape sequence: \\u'.concat(invalidSequence, '.')
              );
            }
            value += String.fromCharCode(charCode);
            position += 4;
            break;

          default:
            throw syntaxError(
              source,
              position,
              'Invalid character escape sequence: \\'.concat(String.fromCharCode(code), '.')
            );
        }
        chunkStart = ++position;
      }
    }
    throw syntaxError(source, position, 'Unterminated string.');
  }
  function readBlockString(source, start, line, col, prev, lexer) {
    var body = source.body;
    var position = start + 3;
    var chunkStart = position;
    var code = 0;
    var rawValue = '';
    while (position < body.length && !isNaN((code = body.charCodeAt(position)))) {
      if (34 === code && 34 === body.charCodeAt(position + 1) && 34 === body.charCodeAt(position + 2)) {
        rawValue += body.slice(chunkStart, position);
        return new Token(
          tokenKind_TokenKind.BLOCK_STRING,
          start,
          position + 3,
          line,
          col,
          prev,
          blockString_dedentBlockStringValue(rawValue)
        );
      }
      if (code < 32 && 9 !== code && 10 !== code && 13 !== code)
        throw syntaxError(source, position, 'Invalid character within String: '.concat(printCharCode(code), '.'));
      if (10 === code) {
        ++position;
        ++lexer.line;
        lexer.lineStart = position;
      } else if (13 === code) {
        if (10 === body.charCodeAt(position + 1)) position += 2;
        else ++position;
        ++lexer.line;
        lexer.lineStart = position;
      } else if (
        92 === code &&
        34 === body.charCodeAt(position + 1) &&
        34 === body.charCodeAt(position + 2) &&
        34 === body.charCodeAt(position + 3)
      ) {
        rawValue += body.slice(chunkStart, position) + '"""';
        chunkStart = position += 4;
      } else ++position;
    }
    throw syntaxError(source, position, 'Unterminated string.');
  }
  function uniCharCode(a, b, c, d) {
    return (char2hex(a) << 12) | (char2hex(b) << 8) | (char2hex(c) << 4) | char2hex(d);
  }
  function char2hex(a) {
    return a >= 48 && a <= 57 ? a - 48 : a >= 65 && a <= 70 ? a - 55 : a >= 97 && a <= 102 ? a - 87 : -1;
  }
  function readName(source, start, line, col, prev) {
    var body = source.body;
    var bodyLength = body.length;
    var position = start + 1;
    var code = 0;
    while (
      position !== bodyLength &&
      !isNaN((code = body.charCodeAt(position))) &&
      (95 === code || (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122))
    )
      ++position;
    return new Token(tokenKind_TokenKind.NAME, start, position, line, col, prev, body.slice(start, position));
  }
  function isNameStart(code) {
    return 95 === code || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
  }
  function parser_parse(source, options) {
    return new Parser(source, options).parseDocument();
  }
  var Parser = (function () {
    function Parser(source, options) {
      var sourceObj = isSource(source) ? source : new source_Source(source);
      this._lexer = new Lexer(sourceObj);
      this._options = options;
    }
    var _proto = Parser.prototype;
    _proto.parseName = function () {
      var token = this.expectToken(tokenKind_TokenKind.NAME);
      return {
        kind: kinds_Kind.NAME,
        value: token.value,
        loc: this.loc(token),
      };
    };
    _proto.parseDocument = function () {
      var start = this._lexer.token;
      return {
        kind: kinds_Kind.DOCUMENT,
        definitions: this.many(tokenKind_TokenKind.SOF, this.parseDefinition, tokenKind_TokenKind.EOF),
        loc: this.loc(start),
      };
    };
    _proto.parseDefinition = function () {
      if (this.peek(tokenKind_TokenKind.NAME))
        switch (this._lexer.token.value) {
          case 'query':
          case 'mutation':
          case 'subscription':
            return this.parseOperationDefinition();

          case 'fragment':
            return this.parseFragmentDefinition();

          case 'schema':
          case 'scalar':
          case 'type':
          case 'interface':
          case 'union':
          case 'enum':
          case 'input':
          case 'directive':
            return this.parseTypeSystemDefinition();

          case 'extend':
            return this.parseTypeSystemExtension();
        }
      else if (this.peek(tokenKind_TokenKind.BRACE_L)) return this.parseOperationDefinition();
      else if (this.peekDescription()) return this.parseTypeSystemDefinition();
      throw this.unexpected();
    };
    _proto.parseOperationDefinition = function () {
      var start = this._lexer.token;
      if (this.peek(tokenKind_TokenKind.BRACE_L))
        return {
          kind: kinds_Kind.OPERATION_DEFINITION,
          operation: 'query',
          name: void 0,
          variableDefinitions: [],
          directives: [],
          selectionSet: this.parseSelectionSet(),
          loc: this.loc(start),
        };
      var operation = this.parseOperationType();
      var name;
      if (this.peek(tokenKind_TokenKind.NAME)) name = this.parseName();
      return {
        kind: kinds_Kind.OPERATION_DEFINITION,
        operation,
        name,
        variableDefinitions: this.parseVariableDefinitions(),
        directives: this.parseDirectives(false),
        selectionSet: this.parseSelectionSet(),
        loc: this.loc(start),
      };
    };
    _proto.parseOperationType = function () {
      var operationToken = this.expectToken(tokenKind_TokenKind.NAME);
      switch (operationToken.value) {
        case 'query':
          return 'query';

        case 'mutation':
          return 'mutation';

        case 'subscription':
          return 'subscription';
      }
      throw this.unexpected(operationToken);
    };
    _proto.parseVariableDefinitions = function () {
      return this.optionalMany(tokenKind_TokenKind.PAREN_L, this.parseVariableDefinition, tokenKind_TokenKind.PAREN_R);
    };
    _proto.parseVariableDefinition = function () {
      var start = this._lexer.token;
      return {
        kind: kinds_Kind.VARIABLE_DEFINITION,
        variable: this.parseVariable(),
        type: (this.expectToken(tokenKind_TokenKind.COLON), this.parseTypeReference()),
        defaultValue: this.expectOptionalToken(tokenKind_TokenKind.EQUALS) ? this.parseValueLiteral(true) : void 0,
        directives: this.parseDirectives(true),
        loc: this.loc(start),
      };
    };
    _proto.parseVariable = function () {
      var start = this._lexer.token;
      this.expectToken(tokenKind_TokenKind.DOLLAR);
      return {
        kind: kinds_Kind.VARIABLE,
        name: this.parseName(),
        loc: this.loc(start),
      };
    };
    _proto.parseSelectionSet = function () {
      var start = this._lexer.token;
      return {
        kind: kinds_Kind.SELECTION_SET,
        selections: this.many(tokenKind_TokenKind.BRACE_L, this.parseSelection, tokenKind_TokenKind.BRACE_R),
        loc: this.loc(start),
      };
    };
    _proto.parseSelection = function () {
      return this.peek(tokenKind_TokenKind.SPREAD) ? this.parseFragment() : this.parseField();
    };
    _proto.parseField = function () {
      var start = this._lexer.token;
      var nameOrAlias = this.parseName();
      var alias;
      var name;
      if (this.expectOptionalToken(tokenKind_TokenKind.COLON)) {
        alias = nameOrAlias;
        name = this.parseName();
      } else name = nameOrAlias;
      return {
        kind: kinds_Kind.FIELD,
        alias,
        name,
        arguments: this.parseArguments(false),
        directives: this.parseDirectives(false),
        selectionSet: this.peek(tokenKind_TokenKind.BRACE_L) ? this.parseSelectionSet() : void 0,
        loc: this.loc(start),
      };
    };
    _proto.parseArguments = function (isConst) {
      var item = isConst ? this.parseConstArgument : this.parseArgument;
      return this.optionalMany(tokenKind_TokenKind.PAREN_L, item, tokenKind_TokenKind.PAREN_R);
    };
    _proto.parseArgument = function () {
      var start = this._lexer.token;
      var name = this.parseName();
      this.expectToken(tokenKind_TokenKind.COLON);
      return {
        kind: kinds_Kind.ARGUMENT,
        name,
        value: this.parseValueLiteral(false),
        loc: this.loc(start),
      };
    };
    _proto.parseConstArgument = function () {
      var start = this._lexer.token;
      return {
        kind: kinds_Kind.ARGUMENT,
        name: this.parseName(),
        value: (this.expectToken(tokenKind_TokenKind.COLON), this.parseValueLiteral(true)),
        loc: this.loc(start),
      };
    };
    _proto.parseFragment = function () {
      var start = this._lexer.token;
      this.expectToken(tokenKind_TokenKind.SPREAD);
      var hasTypeCondition = this.expectOptionalKeyword('on');
      if (!hasTypeCondition && this.peek(tokenKind_TokenKind.NAME))
        return {
          kind: kinds_Kind.FRAGMENT_SPREAD,
          name: this.parseFragmentName(),
          directives: this.parseDirectives(false),
          loc: this.loc(start),
        };
      return {
        kind: kinds_Kind.INLINE_FRAGMENT,
        typeCondition: hasTypeCondition ? this.parseNamedType() : void 0,
        directives: this.parseDirectives(false),
        selectionSet: this.parseSelectionSet(),
        loc: this.loc(start),
      };
    };
    _proto.parseFragmentDefinition = function () {
      var _this$_options;
      var start = this._lexer.token;
      this.expectKeyword('fragment');
      if (
        true ===
        (null === (_this$_options = this._options) || void 0 === _this$_options
          ? void 0
          : _this$_options.experimentalFragmentVariables)
      )
        return {
          kind: kinds_Kind.FRAGMENT_DEFINITION,
          name: this.parseFragmentName(),
          variableDefinitions: this.parseVariableDefinitions(),
          typeCondition: (this.expectKeyword('on'), this.parseNamedType()),
          directives: this.parseDirectives(false),
          selectionSet: this.parseSelectionSet(),
          loc: this.loc(start),
        };
      return {
        kind: kinds_Kind.FRAGMENT_DEFINITION,
        name: this.parseFragmentName(),
        typeCondition: (this.expectKeyword('on'), this.parseNamedType()),
        directives: this.parseDirectives(false),
        selectionSet: this.parseSelectionSet(),
        loc: this.loc(start),
      };
    };
    _proto.parseFragmentName = function () {
      if ('on' === this._lexer.token.value) throw this.unexpected();
      return this.parseName();
    };
    _proto.parseValueLiteral = function (isConst) {
      var token = this._lexer.token;
      switch (token.kind) {
        case tokenKind_TokenKind.BRACKET_L:
          return this.parseList(isConst);

        case tokenKind_TokenKind.BRACE_L:
          return this.parseObject(isConst);

        case tokenKind_TokenKind.INT:
          this._lexer.advance();
          return {
            kind: kinds_Kind.INT,
            value: token.value,
            loc: this.loc(token),
          };

        case tokenKind_TokenKind.FLOAT:
          this._lexer.advance();
          return {
            kind: kinds_Kind.FLOAT,
            value: token.value,
            loc: this.loc(token),
          };

        case tokenKind_TokenKind.STRING:
        case tokenKind_TokenKind.BLOCK_STRING:
          return this.parseStringLiteral();

        case tokenKind_TokenKind.NAME:
          this._lexer.advance();
          switch (token.value) {
            case 'true':
              return {
                kind: kinds_Kind.BOOLEAN,
                value: true,
                loc: this.loc(token),
              };

            case 'false':
              return {
                kind: kinds_Kind.BOOLEAN,
                value: false,
                loc: this.loc(token),
              };

            case 'null':
              return {
                kind: kinds_Kind.NULL,
                loc: this.loc(token),
              };

            default:
              return {
                kind: kinds_Kind.ENUM,
                value: token.value,
                loc: this.loc(token),
              };
          }

        case tokenKind_TokenKind.DOLLAR:
          if (!isConst) return this.parseVariable();
          break;
      }
      throw this.unexpected();
    };
    _proto.parseStringLiteral = function () {
      var token = this._lexer.token;
      this._lexer.advance();
      return {
        kind: kinds_Kind.STRING,
        value: token.value,
        block: token.kind === tokenKind_TokenKind.BLOCK_STRING,
        loc: this.loc(token),
      };
    };
    _proto.parseList = function (isConst) {
      var _this = this;
      var start = this._lexer.token;
      return {
        kind: kinds_Kind.LIST,
        values: this.any(
          tokenKind_TokenKind.BRACKET_L,
          function () {
            return _this.parseValueLiteral(isConst);
          },
          tokenKind_TokenKind.BRACKET_R
        ),
        loc: this.loc(start),
      };
    };
    _proto.parseObject = function (isConst) {
      var _this2 = this;
      var start = this._lexer.token;
      return {
        kind: kinds_Kind.OBJECT,
        fields: this.any(
          tokenKind_TokenKind.BRACE_L,
          function () {
            return _this2.parseObjectField(isConst);
          },
          tokenKind_TokenKind.BRACE_R
        ),
        loc: this.loc(start),
      };
    };
    _proto.parseObjectField = function (isConst) {
      var start = this._lexer.token;
      var name = this.parseName();
      this.expectToken(tokenKind_TokenKind.COLON);
      return {
        kind: kinds_Kind.OBJECT_FIELD,
        name,
        value: this.parseValueLiteral(isConst),
        loc: this.loc(start),
      };
    };
    _proto.parseDirectives = function (isConst) {
      var directives = [];
      while (this.peek(tokenKind_TokenKind.AT)) directives.push(this.parseDirective(isConst));
      return directives;
    };
    _proto.parseDirective = function (isConst) {
      var start = this._lexer.token;
      this.expectToken(tokenKind_TokenKind.AT);
      return {
        kind: kinds_Kind.DIRECTIVE,
        name: this.parseName(),
        arguments: this.parseArguments(isConst),
        loc: this.loc(start),
      };
    };
    _proto.parseTypeReference = function () {
      var start = this._lexer.token;
      var type;
      if (this.expectOptionalToken(tokenKind_TokenKind.BRACKET_L)) {
        type = this.parseTypeReference();
        this.expectToken(tokenKind_TokenKind.BRACKET_R);
        type = {
          kind: kinds_Kind.LIST_TYPE,
          type,
          loc: this.loc(start),
        };
      } else type = this.parseNamedType();
      if (this.expectOptionalToken(tokenKind_TokenKind.BANG))
        return {
          kind: kinds_Kind.NON_NULL_TYPE,
          type,
          loc: this.loc(start),
        };
      return type;
    };
    _proto.parseNamedType = function () {
      var start = this._lexer.token;
      return {
        kind: kinds_Kind.NAMED_TYPE,
        name: this.parseName(),
        loc: this.loc(start),
      };
    };
    _proto.parseTypeSystemDefinition = function () {
      var keywordToken = this.peekDescription() ? this._lexer.lookahead() : this._lexer.token;
      if (keywordToken.kind === tokenKind_TokenKind.NAME)
        switch (keywordToken.value) {
          case 'schema':
            return this.parseSchemaDefinition();

          case 'scalar':
            return this.parseScalarTypeDefinition();

          case 'type':
            return this.parseObjectTypeDefinition();

          case 'interface':
            return this.parseInterfaceTypeDefinition();

          case 'union':
            return this.parseUnionTypeDefinition();

          case 'enum':
            return this.parseEnumTypeDefinition();

          case 'input':
            return this.parseInputObjectTypeDefinition();

          case 'directive':
            return this.parseDirectiveDefinition();
        }
      throw this.unexpected(keywordToken);
    };
    _proto.peekDescription = function () {
      return this.peek(tokenKind_TokenKind.STRING) || this.peek(tokenKind_TokenKind.BLOCK_STRING);
    };
    _proto.parseDescription = function () {
      if (this.peekDescription()) return this.parseStringLiteral();
    };
    _proto.parseSchemaDefinition = function () {
      var start = this._lexer.token;
      var description = this.parseDescription();
      this.expectKeyword('schema');
      var directives = this.parseDirectives(true);
      var operationTypes = this.many(
        tokenKind_TokenKind.BRACE_L,
        this.parseOperationTypeDefinition,
        tokenKind_TokenKind.BRACE_R
      );
      return {
        kind: kinds_Kind.SCHEMA_DEFINITION,
        description,
        directives,
        operationTypes,
        loc: this.loc(start),
      };
    };
    _proto.parseOperationTypeDefinition = function () {
      var start = this._lexer.token;
      var operation = this.parseOperationType();
      this.expectToken(tokenKind_TokenKind.COLON);
      var type = this.parseNamedType();
      return {
        kind: kinds_Kind.OPERATION_TYPE_DEFINITION,
        operation,
        type,
        loc: this.loc(start),
      };
    };
    _proto.parseScalarTypeDefinition = function () {
      var start = this._lexer.token;
      var description = this.parseDescription();
      this.expectKeyword('scalar');
      var name = this.parseName();
      var directives = this.parseDirectives(true);
      return {
        kind: kinds_Kind.SCALAR_TYPE_DEFINITION,
        description,
        name,
        directives,
        loc: this.loc(start),
      };
    };
    _proto.parseObjectTypeDefinition = function () {
      var start = this._lexer.token;
      var description = this.parseDescription();
      this.expectKeyword('type');
      var name = this.parseName();
      var interfaces = this.parseImplementsInterfaces();
      var directives = this.parseDirectives(true);
      var fields = this.parseFieldsDefinition();
      return {
        kind: kinds_Kind.OBJECT_TYPE_DEFINITION,
        description,
        name,
        interfaces,
        directives,
        fields,
        loc: this.loc(start),
      };
    };
    _proto.parseImplementsInterfaces = function () {
      var _this$_options2;
      if (!this.expectOptionalKeyword('implements')) return [];
      if (
        true ===
        (null === (_this$_options2 = this._options) || void 0 === _this$_options2
          ? void 0
          : _this$_options2.allowLegacySDLImplementsInterfaces)
      ) {
        var types = [];
        this.expectOptionalToken(tokenKind_TokenKind.AMP);
        do {
          types.push(this.parseNamedType());
        } while (this.expectOptionalToken(tokenKind_TokenKind.AMP) || this.peek(tokenKind_TokenKind.NAME));
        return types;
      }
      return this.delimitedMany(tokenKind_TokenKind.AMP, this.parseNamedType);
    };
    _proto.parseFieldsDefinition = function () {
      var _this$_options3;
      if (
        true ===
          (null === (_this$_options3 = this._options) || void 0 === _this$_options3
            ? void 0
            : _this$_options3.allowLegacySDLEmptyFields) &&
        this.peek(tokenKind_TokenKind.BRACE_L) &&
        this._lexer.lookahead().kind === tokenKind_TokenKind.BRACE_R
      ) {
        this._lexer.advance();
        this._lexer.advance();
        return [];
      }
      return this.optionalMany(tokenKind_TokenKind.BRACE_L, this.parseFieldDefinition, tokenKind_TokenKind.BRACE_R);
    };
    _proto.parseFieldDefinition = function () {
      var start = this._lexer.token;
      var description = this.parseDescription();
      var name = this.parseName();
      var args = this.parseArgumentDefs();
      this.expectToken(tokenKind_TokenKind.COLON);
      var type = this.parseTypeReference();
      var directives = this.parseDirectives(true);
      return {
        kind: kinds_Kind.FIELD_DEFINITION,
        description,
        name,
        arguments: args,
        type,
        directives,
        loc: this.loc(start),
      };
    };
    _proto.parseArgumentDefs = function () {
      return this.optionalMany(tokenKind_TokenKind.PAREN_L, this.parseInputValueDef, tokenKind_TokenKind.PAREN_R);
    };
    _proto.parseInputValueDef = function () {
      var start = this._lexer.token;
      var description = this.parseDescription();
      var name = this.parseName();
      this.expectToken(tokenKind_TokenKind.COLON);
      var type = this.parseTypeReference();
      var defaultValue;
      if (this.expectOptionalToken(tokenKind_TokenKind.EQUALS)) defaultValue = this.parseValueLiteral(true);
      var directives = this.parseDirectives(true);
      return {
        kind: kinds_Kind.INPUT_VALUE_DEFINITION,
        description,
        name,
        type,
        defaultValue,
        directives,
        loc: this.loc(start),
      };
    };
    _proto.parseInterfaceTypeDefinition = function () {
      var start = this._lexer.token;
      var description = this.parseDescription();
      this.expectKeyword('interface');
      var name = this.parseName();
      var interfaces = this.parseImplementsInterfaces();
      var directives = this.parseDirectives(true);
      var fields = this.parseFieldsDefinition();
      return {
        kind: kinds_Kind.INTERFACE_TYPE_DEFINITION,
        description,
        name,
        interfaces,
        directives,
        fields,
        loc: this.loc(start),
      };
    };
    _proto.parseUnionTypeDefinition = function () {
      var start = this._lexer.token;
      var description = this.parseDescription();
      this.expectKeyword('union');
      var name = this.parseName();
      var directives = this.parseDirectives(true);
      var types = this.parseUnionMemberTypes();
      return {
        kind: kinds_Kind.UNION_TYPE_DEFINITION,
        description,
        name,
        directives,
        types,
        loc: this.loc(start),
      };
    };
    _proto.parseUnionMemberTypes = function () {
      return this.expectOptionalToken(tokenKind_TokenKind.EQUALS)
        ? this.delimitedMany(tokenKind_TokenKind.PIPE, this.parseNamedType)
        : [];
    };
    _proto.parseEnumTypeDefinition = function () {
      var start = this._lexer.token;
      var description = this.parseDescription();
      this.expectKeyword('enum');
      var name = this.parseName();
      var directives = this.parseDirectives(true);
      var values = this.parseEnumValuesDefinition();
      return {
        kind: kinds_Kind.ENUM_TYPE_DEFINITION,
        description,
        name,
        directives,
        values,
        loc: this.loc(start),
      };
    };
    _proto.parseEnumValuesDefinition = function () {
      return this.optionalMany(tokenKind_TokenKind.BRACE_L, this.parseEnumValueDefinition, tokenKind_TokenKind.BRACE_R);
    };
    _proto.parseEnumValueDefinition = function () {
      var start = this._lexer.token;
      var description = this.parseDescription();
      var name = this.parseName();
      var directives = this.parseDirectives(true);
      return {
        kind: kinds_Kind.ENUM_VALUE_DEFINITION,
        description,
        name,
        directives,
        loc: this.loc(start),
      };
    };
    _proto.parseInputObjectTypeDefinition = function () {
      var start = this._lexer.token;
      var description = this.parseDescription();
      this.expectKeyword('input');
      var name = this.parseName();
      var directives = this.parseDirectives(true);
      var fields = this.parseInputFieldsDefinition();
      return {
        kind: kinds_Kind.INPUT_OBJECT_TYPE_DEFINITION,
        description,
        name,
        directives,
        fields,
        loc: this.loc(start),
      };
    };
    _proto.parseInputFieldsDefinition = function () {
      return this.optionalMany(tokenKind_TokenKind.BRACE_L, this.parseInputValueDef, tokenKind_TokenKind.BRACE_R);
    };
    _proto.parseTypeSystemExtension = function () {
      var keywordToken = this._lexer.lookahead();
      if (keywordToken.kind === tokenKind_TokenKind.NAME)
        switch (keywordToken.value) {
          case 'schema':
            return this.parseSchemaExtension();

          case 'scalar':
            return this.parseScalarTypeExtension();

          case 'type':
            return this.parseObjectTypeExtension();

          case 'interface':
            return this.parseInterfaceTypeExtension();

          case 'union':
            return this.parseUnionTypeExtension();

          case 'enum':
            return this.parseEnumTypeExtension();

          case 'input':
            return this.parseInputObjectTypeExtension();
        }
      throw this.unexpected(keywordToken);
    };
    _proto.parseSchemaExtension = function () {
      var start = this._lexer.token;
      this.expectKeyword('extend');
      this.expectKeyword('schema');
      var directives = this.parseDirectives(true);
      var operationTypes = this.optionalMany(
        tokenKind_TokenKind.BRACE_L,
        this.parseOperationTypeDefinition,
        tokenKind_TokenKind.BRACE_R
      );
      if (0 === directives.length && 0 === operationTypes.length) throw this.unexpected();
      return {
        kind: kinds_Kind.SCHEMA_EXTENSION,
        directives,
        operationTypes,
        loc: this.loc(start),
      };
    };
    _proto.parseScalarTypeExtension = function () {
      var start = this._lexer.token;
      this.expectKeyword('extend');
      this.expectKeyword('scalar');
      var name = this.parseName();
      var directives = this.parseDirectives(true);
      if (0 === directives.length) throw this.unexpected();
      return {
        kind: kinds_Kind.SCALAR_TYPE_EXTENSION,
        name,
        directives,
        loc: this.loc(start),
      };
    };
    _proto.parseObjectTypeExtension = function () {
      var start = this._lexer.token;
      this.expectKeyword('extend');
      this.expectKeyword('type');
      var name = this.parseName();
      var interfaces = this.parseImplementsInterfaces();
      var directives = this.parseDirectives(true);
      var fields = this.parseFieldsDefinition();
      if (0 === interfaces.length && 0 === directives.length && 0 === fields.length) throw this.unexpected();
      return {
        kind: kinds_Kind.OBJECT_TYPE_EXTENSION,
        name,
        interfaces,
        directives,
        fields,
        loc: this.loc(start),
      };
    };
    _proto.parseInterfaceTypeExtension = function () {
      var start = this._lexer.token;
      this.expectKeyword('extend');
      this.expectKeyword('interface');
      var name = this.parseName();
      var interfaces = this.parseImplementsInterfaces();
      var directives = this.parseDirectives(true);
      var fields = this.parseFieldsDefinition();
      if (0 === interfaces.length && 0 === directives.length && 0 === fields.length) throw this.unexpected();
      return {
        kind: kinds_Kind.INTERFACE_TYPE_EXTENSION,
        name,
        interfaces,
        directives,
        fields,
        loc: this.loc(start),
      };
    };
    _proto.parseUnionTypeExtension = function () {
      var start = this._lexer.token;
      this.expectKeyword('extend');
      this.expectKeyword('union');
      var name = this.parseName();
      var directives = this.parseDirectives(true);
      var types = this.parseUnionMemberTypes();
      if (0 === directives.length && 0 === types.length) throw this.unexpected();
      return {
        kind: kinds_Kind.UNION_TYPE_EXTENSION,
        name,
        directives,
        types,
        loc: this.loc(start),
      };
    };
    _proto.parseEnumTypeExtension = function () {
      var start = this._lexer.token;
      this.expectKeyword('extend');
      this.expectKeyword('enum');
      var name = this.parseName();
      var directives = this.parseDirectives(true);
      var values = this.parseEnumValuesDefinition();
      if (0 === directives.length && 0 === values.length) throw this.unexpected();
      return {
        kind: kinds_Kind.ENUM_TYPE_EXTENSION,
        name,
        directives,
        values,
        loc: this.loc(start),
      };
    };
    _proto.parseInputObjectTypeExtension = function () {
      var start = this._lexer.token;
      this.expectKeyword('extend');
      this.expectKeyword('input');
      var name = this.parseName();
      var directives = this.parseDirectives(true);
      var fields = this.parseInputFieldsDefinition();
      if (0 === directives.length && 0 === fields.length) throw this.unexpected();
      return {
        kind: kinds_Kind.INPUT_OBJECT_TYPE_EXTENSION,
        name,
        directives,
        fields,
        loc: this.loc(start),
      };
    };
    _proto.parseDirectiveDefinition = function () {
      var start = this._lexer.token;
      var description = this.parseDescription();
      this.expectKeyword('directive');
      this.expectToken(tokenKind_TokenKind.AT);
      var name = this.parseName();
      var args = this.parseArgumentDefs();
      var repeatable = this.expectOptionalKeyword('repeatable');
      this.expectKeyword('on');
      var locations = this.parseDirectiveLocations();
      return {
        kind: kinds_Kind.DIRECTIVE_DEFINITION,
        description,
        name,
        arguments: args,
        repeatable,
        locations,
        loc: this.loc(start),
      };
    };
    _proto.parseDirectiveLocations = function () {
      return this.delimitedMany(tokenKind_TokenKind.PIPE, this.parseDirectiveLocation);
    };
    _proto.parseDirectiveLocation = function () {
      var start = this._lexer.token;
      var name = this.parseName();
      if (void 0 !== DirectiveLocation[name.value]) return name;
      throw this.unexpected(start);
    };
    _proto.loc = function (startToken) {
      var _this$_options4;
      if (
        true !==
        (null === (_this$_options4 = this._options) || void 0 === _this$_options4 ? void 0 : _this$_options4.noLocation)
      )
        return new Location(startToken, this._lexer.lastToken, this._lexer.source);
    };
    _proto.peek = function (kind) {
      return this._lexer.token.kind === kind;
    };
    _proto.expectToken = function (kind) {
      var token = this._lexer.token;
      if (token.kind === kind) {
        this._lexer.advance();
        return token;
      }
      throw syntaxError(
        this._lexer.source,
        token.start,
        'Expected '.concat(getTokenKindDesc(kind), ', found ').concat(getTokenDesc(token), '.')
      );
    };
    _proto.expectOptionalToken = function (kind) {
      var token = this._lexer.token;
      if (token.kind === kind) {
        this._lexer.advance();
        return token;
      }
      return;
    };
    _proto.expectKeyword = function (value) {
      var token = this._lexer.token;
      if (token.kind === tokenKind_TokenKind.NAME && token.value === value) this._lexer.advance();
      else
        throw syntaxError(
          this._lexer.source,
          token.start,
          'Expected "'.concat(value, '", found ').concat(getTokenDesc(token), '.')
        );
    };
    _proto.expectOptionalKeyword = function (value) {
      var token = this._lexer.token;
      if (token.kind === tokenKind_TokenKind.NAME && token.value === value) {
        this._lexer.advance();
        return true;
      }
      return false;
    };
    _proto.unexpected = function (atToken) {
      var token = null != atToken ? atToken : this._lexer.token;
      return syntaxError(this._lexer.source, token.start, 'Unexpected '.concat(getTokenDesc(token), '.'));
    };
    _proto.any = function (openKind, parseFn, closeKind) {
      this.expectToken(openKind);
      var nodes = [];
      while (!this.expectOptionalToken(closeKind)) nodes.push(parseFn.call(this));
      return nodes;
    };
    _proto.optionalMany = function (openKind, parseFn, closeKind) {
      if (this.expectOptionalToken(openKind)) {
        var nodes = [];
        do {
          nodes.push(parseFn.call(this));
        } while (!this.expectOptionalToken(closeKind));
        return nodes;
      }
      return [];
    };
    _proto.many = function (openKind, parseFn, closeKind) {
      this.expectToken(openKind);
      var nodes = [];
      do {
        nodes.push(parseFn.call(this));
      } while (!this.expectOptionalToken(closeKind));
      return nodes;
    };
    _proto.delimitedMany = function (delimiterKind, parseFn) {
      this.expectOptionalToken(delimiterKind);
      var nodes = [];
      do {
        nodes.push(parseFn.call(this));
      } while (this.expectOptionalToken(delimiterKind));
      return nodes;
    };
    return Parser;
  })();
  function getTokenDesc(token) {
    var value = token.value;
    return getTokenKindDesc(token.kind) + (null != value ? ' "'.concat(value, '"') : '');
  }
  function getTokenKindDesc(kind) {
    return isPunctuatorTokenKind(kind) ? '"'.concat(kind, '"') : kind;
  }
  function locatedError(rawOriginalError, nodes, path) {
    var _nodes;
    var originalError =
      rawOriginalError instanceof Error
        ? rawOriginalError
        : new Error('Unexpected error value: ' + inspect_inspect(rawOriginalError));
    if (Array.isArray(originalError.path)) return originalError;
    return new GraphQLError(
      originalError.message,
      null !== (_nodes = originalError.nodes) && void 0 !== _nodes ? _nodes : nodes,
      originalError.source,
      originalError.positions,
      path,
      originalError
    );
  }
  var NAME_RX = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
  function isValidNameError(name) {
    'string' == typeof name || devAssert(0, 'Expected name to be a string.');
    if (name.length > 1 && '_' === name[0] && '_' === name[1])
      return new GraphQLError(
        'Name "'.concat(name, '" must not begin with "__", which is reserved by GraphQL introspection.')
      );
    if (!NAME_RX.test(name))
      return new GraphQLError('Names must match /^[_a-zA-Z][_a-zA-Z0-9]*$/ but "'.concat(name, '" does not.'));
  }
  function isEqualType(typeA, typeB) {
    if (typeA === typeB) return true;
    if (definition_isNonNullType(typeA) && definition_isNonNullType(typeB))
      return isEqualType(typeA.ofType, typeB.ofType);
    if (definition_isListType(typeA) && definition_isListType(typeB)) return isEqualType(typeA.ofType, typeB.ofType);
    return false;
  }
  function isTypeSubTypeOf(schema, maybeSubType, superType) {
    if (maybeSubType === superType) return true;
    if (definition_isNonNullType(superType)) {
      if (definition_isNonNullType(maybeSubType)) return isTypeSubTypeOf(schema, maybeSubType.ofType, superType.ofType);
      return false;
    }
    if (definition_isNonNullType(maybeSubType)) return isTypeSubTypeOf(schema, maybeSubType.ofType, superType);
    if (definition_isListType(superType)) {
      if (definition_isListType(maybeSubType)) return isTypeSubTypeOf(schema, maybeSubType.ofType, superType.ofType);
      return false;
    }
    if (definition_isListType(maybeSubType)) return false;
    return (
      definition_isAbstractType(superType) &&
      (definition_isInterfaceType(maybeSubType) || definition_isObjectType(maybeSubType)) &&
      schema.isSubType(superType, maybeSubType)
    );
  }
  function doTypesOverlap(schema, typeA, typeB) {
    if (typeA === typeB) return true;
    if (definition_isAbstractType(typeA)) {
      if (definition_isAbstractType(typeB))
        return schema.getPossibleTypes(typeA).some(function (type) {
          return schema.isSubType(typeB, type);
        });
      return schema.isSubType(typeA, typeB);
    }
    if (definition_isAbstractType(typeB)) return schema.isSubType(typeB, typeA);
    return false;
  }
  function validateSchema(schema) {
    assertSchema(schema);
    if (schema.__validationErrors) return schema.__validationErrors;
    var context = new SchemaValidationContext(schema);
    validateRootTypes(context);
    validateDirectives(context);
    validateTypes(context);
    var errors = context.getErrors();
    schema.__validationErrors = errors;
    return errors;
  }
  function assertValidSchema(schema) {
    var errors = validateSchema(schema);
    if (0 !== errors.length)
      throw new Error(
        errors
          .map(function (error) {
            return error.message;
          })
          .join('\n\n')
      );
  }
  var SchemaValidationContext = (function () {
    function SchemaValidationContext(schema) {
      this._errors = [];
      this.schema = schema;
    }
    var _proto = SchemaValidationContext.prototype;
    _proto.reportError = function (message, nodes) {
      var _nodes = Array.isArray(nodes) ? nodes.filter(Boolean) : nodes;
      this.addError(new GraphQLError(message, _nodes));
    };
    _proto.addError = function (error) {
      this._errors.push(error);
    };
    _proto.getErrors = function () {
      return this._errors;
    };
    return SchemaValidationContext;
  })();
  function validateRootTypes(context) {
    var schema = context.schema;
    var queryType = schema.getQueryType();
    if (!queryType) context.reportError('Query root type must be provided.', schema.astNode);
    else if (!definition_isObjectType(queryType)) {
      var _getOperationTypeNode;
      context.reportError(
        'Query root type must be Object type, it cannot be '.concat(inspect_inspect(queryType), '.'),
        null !== (_getOperationTypeNode = getOperationTypeNode(schema, 'query')) && void 0 !== _getOperationTypeNode
          ? _getOperationTypeNode
          : queryType.astNode
      );
    }
    var mutationType = schema.getMutationType();
    if (mutationType && !definition_isObjectType(mutationType)) {
      var _getOperationTypeNode2;
      context.reportError(
        'Mutation root type must be Object type if provided, it cannot be ' +
          ''.concat(inspect_inspect(mutationType), '.'),
        null !== (_getOperationTypeNode2 = getOperationTypeNode(schema, 'mutation')) &&
          void 0 !== _getOperationTypeNode2
          ? _getOperationTypeNode2
          : mutationType.astNode
      );
    }
    var subscriptionType = schema.getSubscriptionType();
    if (subscriptionType && !definition_isObjectType(subscriptionType)) {
      var _getOperationTypeNode3;
      context.reportError(
        'Subscription root type must be Object type if provided, it cannot be ' +
          ''.concat(inspect_inspect(subscriptionType), '.'),
        null !== (_getOperationTypeNode3 = getOperationTypeNode(schema, 'subscription')) &&
          void 0 !== _getOperationTypeNode3
          ? _getOperationTypeNode3
          : subscriptionType.astNode
      );
    }
  }
  function getOperationTypeNode(schema, operation) {
    var operationNodes = getAllSubNodes(schema, function (node) {
      return node.operationTypes;
    });
    for (var _i2 = 0; _i2 < operationNodes.length; _i2++) {
      var node = operationNodes[_i2];
      if (node.operation === operation) return node.type;
    }
    return;
  }
  function validateDirectives(context) {
    for (
      var _i4 = 0, _context$schema$getDi2 = context.schema.getDirectives();
      _i4 < _context$schema$getDi2.length;
      _i4++
    ) {
      var directive = _context$schema$getDi2[_i4];
      if (!directives_isDirective(directive)) {
        context.reportError(
          'Expected directive but got: '.concat(inspect_inspect(directive), '.'),
          null == directive ? void 0 : directive.astNode
        );
        continue;
      }
      validateName(context, directive);
      for (var _i6 = 0, _directive$args2 = directive.args; _i6 < _directive$args2.length; _i6++) {
        var arg = _directive$args2[_i6];
        validateName(context, arg);
        if (!definition_isInputType(arg.type))
          context.reportError(
            'The type of @'.concat(directive.name, '(').concat(arg.name, ':) must be Input Type ') +
              'but got: '.concat(inspect_inspect(arg.type), '.'),
            arg.astNode
          );
        if (isRequiredArgument(arg) && null != arg.deprecationReason) {
          var _arg$astNode;
          context.reportError(
            'Required argument @'.concat(directive.name, '(').concat(arg.name, ':) cannot be deprecated.'),
            [
              getDeprecatedDirectiveNode(arg.astNode),
              null === (_arg$astNode = arg.astNode) || void 0 === _arg$astNode ? void 0 : _arg$astNode.type,
            ]
          );
        }
      }
    }
  }
  function validateName(context, node) {
    var error = isValidNameError(node.name);
    if (error) context.addError(locatedError(error, node.astNode));
  }
  function validateTypes(context) {
    var validateInputObjectCircularRefs = createInputObjectCircularRefsValidator(context);
    var typeMap = context.schema.getTypeMap();
    for (var _i8 = 0, _objectValues2 = polyfills_objectValues(typeMap); _i8 < _objectValues2.length; _i8++) {
      var type = _objectValues2[_i8];
      if (!definition_isNamedType(type)) {
        context.reportError('Expected GraphQL named type but got: '.concat(inspect_inspect(type), '.'), type.astNode);
        continue;
      }
      if (!introspection_isIntrospectionType(type)) validateName(context, type);
      if (definition_isObjectType(type)) {
        validateFields(context, type);
        validateInterfaces(context, type);
      } else if (definition_isInterfaceType(type)) {
        validateFields(context, type);
        validateInterfaces(context, type);
      } else if (definition_isUnionType(type)) validateUnionMembers(context, type);
      else if (definition_isEnumType(type)) validateEnumValues(context, type);
      else if (definition_isInputObjectType(type)) {
        validateInputFields(context, type);
        validateInputObjectCircularRefs(type);
      }
    }
  }
  function validateFields(context, type) {
    var fields = polyfills_objectValues(type.getFields());
    if (0 === fields.length)
      context.reportError('Type '.concat(type.name, ' must define one or more fields.'), getAllNodes(type));
    for (var _i10 = 0; _i10 < fields.length; _i10++) {
      var field = fields[_i10];
      validateName(context, field);
      if (!isOutputType(field.type)) {
        var _field$astNode;
        context.reportError(
          'The type of '.concat(type.name, '.').concat(field.name, ' must be Output Type ') +
            'but got: '.concat(inspect_inspect(field.type), '.'),
          null === (_field$astNode = field.astNode) || void 0 === _field$astNode ? void 0 : _field$astNode.type
        );
      }
      for (var _i12 = 0, _field$args2 = field.args; _i12 < _field$args2.length; _i12++) {
        var arg = _field$args2[_i12];
        var argName = arg.name;
        validateName(context, arg);
        if (!definition_isInputType(arg.type)) {
          var _arg$astNode2;
          context.reportError(
            'The type of '.concat(type.name, '.').concat(field.name, '(').concat(argName, ':) must be Input ') +
              'Type but got: '.concat(inspect_inspect(arg.type), '.'),
            null === (_arg$astNode2 = arg.astNode) || void 0 === _arg$astNode2 ? void 0 : _arg$astNode2.type
          );
        }
        if (isRequiredArgument(arg) && null != arg.deprecationReason) {
          var _arg$astNode3;
          context.reportError(
            'Required argument '
              .concat(type.name, '.')
              .concat(field.name, '(')
              .concat(argName, ':) cannot be deprecated.'),
            [
              getDeprecatedDirectiveNode(arg.astNode),
              null === (_arg$astNode3 = arg.astNode) || void 0 === _arg$astNode3 ? void 0 : _arg$astNode3.type,
            ]
          );
        }
      }
    }
  }
  function validateInterfaces(context, type) {
    var ifaceTypeNames = Object.create(null);
    for (var _i14 = 0, _type$getInterfaces2 = type.getInterfaces(); _i14 < _type$getInterfaces2.length; _i14++) {
      var iface = _type$getInterfaces2[_i14];
      if (!definition_isInterfaceType(iface)) {
        context.reportError(
          'Type '.concat(inspect_inspect(type), ' must only implement Interface types, ') +
            'it cannot implement '.concat(inspect_inspect(iface), '.'),
          getAllImplementsInterfaceNodes(type, iface)
        );
        continue;
      }
      if (type === iface) {
        context.reportError(
          'Type '.concat(type.name, ' cannot implement itself because it would create a circular reference.'),
          getAllImplementsInterfaceNodes(type, iface)
        );
        continue;
      }
      if (ifaceTypeNames[iface.name]) {
        context.reportError(
          'Type '.concat(type.name, ' can only implement ').concat(iface.name, ' once.'),
          getAllImplementsInterfaceNodes(type, iface)
        );
        continue;
      }
      ifaceTypeNames[iface.name] = true;
      validateTypeImplementsAncestors(context, type, iface);
      validateTypeImplementsInterface(context, type, iface);
    }
  }
  function validateTypeImplementsInterface(context, type, iface) {
    var typeFieldMap = type.getFields();
    for (
      var _i16 = 0, _objectValues4 = polyfills_objectValues(iface.getFields());
      _i16 < _objectValues4.length;
      _i16++
    ) {
      var ifaceField = _objectValues4[_i16];
      var fieldName = ifaceField.name;
      var typeField = typeFieldMap[fieldName];
      if (!typeField) {
        context.reportError(
          'Interface field '
            .concat(iface.name, '.')
            .concat(fieldName, ' expected but ')
            .concat(type.name, ' does not provide it.'),
          [ifaceField.astNode].concat(getAllNodes(type))
        );
        continue;
      }
      if (!isTypeSubTypeOf(context.schema, typeField.type, ifaceField.type)) {
        var _ifaceField$astNode, _typeField$astNode;
        context.reportError(
          'Interface field '.concat(iface.name, '.').concat(fieldName, ' expects type ') +
            ''.concat(inspect_inspect(ifaceField.type), ' but ').concat(type.name, '.').concat(fieldName, ' ') +
            'is type '.concat(inspect_inspect(typeField.type), '.'),
          [
            null === (_ifaceField$astNode = ifaceField.astNode) || void 0 === _ifaceField$astNode
              ? void 0
              : _ifaceField$astNode.type,
            null === (_typeField$astNode = typeField.astNode) || void 0 === _typeField$astNode
              ? void 0
              : _typeField$astNode.type,
          ]
        );
      }
      var _loop = function (_i18, _ifaceField$args2) {
        var ifaceArg = _ifaceField$args2[_i18];
        var argName = ifaceArg.name;
        var typeArg = polyfills_find(typeField.args, function (arg) {
          return arg.name === argName;
        });
        if (!typeArg) {
          context.reportError(
            'Interface field argument '
              .concat(iface.name, '.')
              .concat(fieldName, '(')
              .concat(argName, ':) expected but ')
              .concat(type.name, '.')
              .concat(fieldName, ' does not provide it.'),
            [ifaceArg.astNode, typeField.astNode]
          );
          return 'continue';
        }
        if (!isEqualType(ifaceArg.type, typeArg.type)) {
          var _ifaceArg$astNode, _typeArg$astNode;
          context.reportError(
            'Interface field argument '.concat(iface.name, '.').concat(fieldName, '(').concat(argName, ':) ') +
              'expects type '.concat(inspect_inspect(ifaceArg.type), ' but ') +
              ''.concat(type.name, '.').concat(fieldName, '(').concat(argName, ':) is type ') +
              ''.concat(inspect_inspect(typeArg.type), '.'),
            [
              null === (_ifaceArg$astNode = ifaceArg.astNode) || void 0 === _ifaceArg$astNode
                ? void 0
                : _ifaceArg$astNode.type,
              null === (_typeArg$astNode = typeArg.astNode) || void 0 === _typeArg$astNode
                ? void 0
                : _typeArg$astNode.type,
            ]
          );
        }
      };
      for (var _i18 = 0, _ifaceField$args2 = ifaceField.args; _i18 < _ifaceField$args2.length; _i18++)
        if ('continue' === _loop(_i18, _ifaceField$args2)) continue;
      var _loop2 = function (_i20, _typeField$args2) {
        var typeArg = _typeField$args2[_i20];
        var argName = typeArg.name;
        if (
          !polyfills_find(ifaceField.args, function (arg) {
            return arg.name === argName;
          }) &&
          isRequiredArgument(typeArg)
        )
          context.reportError(
            'Object field '
              .concat(type.name, '.')
              .concat(fieldName, ' includes required argument ')
              .concat(argName, ' that is missing from the Interface field ')
              .concat(iface.name, '.')
              .concat(fieldName, '.'),
            [typeArg.astNode, ifaceField.astNode]
          );
      };
      for (var _i20 = 0, _typeField$args2 = typeField.args; _i20 < _typeField$args2.length; _i20++)
        _loop2(_i20, _typeField$args2);
    }
  }
  function validateTypeImplementsAncestors(context, type, iface) {
    var ifaceInterfaces = type.getInterfaces();
    for (var _i22 = 0, _iface$getInterfaces2 = iface.getInterfaces(); _i22 < _iface$getInterfaces2.length; _i22++) {
      var transitive = _iface$getInterfaces2[_i22];
      if (-1 === ifaceInterfaces.indexOf(transitive))
        context.reportError(
          transitive === type
            ? 'Type '
                .concat(type.name, ' cannot implement ')
                .concat(iface.name, ' because it would create a circular reference.')
            : 'Type '
                .concat(type.name, ' must implement ')
                .concat(transitive.name, ' because it is implemented by ')
                .concat(iface.name, '.'),
          [].concat(getAllImplementsInterfaceNodes(iface, transitive), getAllImplementsInterfaceNodes(type, iface))
        );
    }
  }
  function validateUnionMembers(context, union) {
    var memberTypes = union.getTypes();
    if (0 === memberTypes.length)
      context.reportError(
        'Union type '.concat(union.name, ' must define one or more member types.'),
        getAllNodes(union)
      );
    var includedTypeNames = Object.create(null);
    for (var _i24 = 0; _i24 < memberTypes.length; _i24++) {
      var memberType = memberTypes[_i24];
      if (includedTypeNames[memberType.name]) {
        context.reportError(
          'Union type '.concat(union.name, ' can only include type ').concat(memberType.name, ' once.'),
          getUnionMemberTypeNodes(union, memberType.name)
        );
        continue;
      }
      includedTypeNames[memberType.name] = true;
      if (!definition_isObjectType(memberType))
        context.reportError(
          'Union type '.concat(union.name, ' can only include Object types, ') +
            'it cannot include '.concat(inspect_inspect(memberType), '.'),
          getUnionMemberTypeNodes(union, String(memberType))
        );
    }
  }
  function validateEnumValues(context, enumType) {
    var enumValues = enumType.getValues();
    if (0 === enumValues.length)
      context.reportError(
        'Enum type '.concat(enumType.name, ' must define one or more values.'),
        getAllNodes(enumType)
      );
    for (var _i26 = 0; _i26 < enumValues.length; _i26++) {
      var enumValue = enumValues[_i26];
      var valueName = enumValue.name;
      validateName(context, enumValue);
      if ('true' === valueName || 'false' === valueName || 'null' === valueName)
        context.reportError(
          'Enum type '.concat(enumType.name, ' cannot include value: ').concat(valueName, '.'),
          enumValue.astNode
        );
    }
  }
  function validateInputFields(context, inputObj) {
    var fields = polyfills_objectValues(inputObj.getFields());
    if (0 === fields.length)
      context.reportError(
        'Input Object type '.concat(inputObj.name, ' must define one or more fields.'),
        getAllNodes(inputObj)
      );
    for (var _i28 = 0; _i28 < fields.length; _i28++) {
      var field = fields[_i28];
      validateName(context, field);
      if (!definition_isInputType(field.type)) {
        var _field$astNode2;
        context.reportError(
          'The type of '.concat(inputObj.name, '.').concat(field.name, ' must be Input Type ') +
            'but got: '.concat(inspect_inspect(field.type), '.'),
          null === (_field$astNode2 = field.astNode) || void 0 === _field$astNode2 ? void 0 : _field$astNode2.type
        );
      }
      if (isRequiredInputField(field) && null != field.deprecationReason) {
        var _field$astNode3;
        context.reportError(
          'Required input field '.concat(inputObj.name, '.').concat(field.name, ' cannot be deprecated.'),
          [
            getDeprecatedDirectiveNode(field.astNode),
            null === (_field$astNode3 = field.astNode) || void 0 === _field$astNode3 ? void 0 : _field$astNode3.type,
          ]
        );
      }
    }
  }
  function createInputObjectCircularRefsValidator(context) {
    var visitedTypes = Object.create(null);
    var fieldPath = [];
    var fieldPathIndexByTypeName = Object.create(null);
    return function detectCycleRecursive(inputObj) {
      if (visitedTypes[inputObj.name]) return;
      visitedTypes[inputObj.name] = true;
      fieldPathIndexByTypeName[inputObj.name] = fieldPath.length;
      var fields = polyfills_objectValues(inputObj.getFields());
      for (var _i30 = 0; _i30 < fields.length; _i30++) {
        var field = fields[_i30];
        if (definition_isNonNullType(field.type) && definition_isInputObjectType(field.type.ofType)) {
          var fieldType = field.type.ofType;
          var cycleIndex = fieldPathIndexByTypeName[fieldType.name];
          fieldPath.push(field);
          if (void 0 === cycleIndex) detectCycleRecursive(fieldType);
          else {
            var cyclePath = fieldPath.slice(cycleIndex);
            var pathStr = cyclePath
              .map(function (fieldObj) {
                return fieldObj.name;
              })
              .join('.');
            context.reportError(
              'Cannot reference Input Object "'
                .concat(fieldType.name, '" within itself through a series of non-null fields: "')
                .concat(pathStr, '".'),
              cyclePath.map(function (fieldObj) {
                return fieldObj.astNode;
              })
            );
          }
          fieldPath.pop();
        }
      }
      fieldPathIndexByTypeName[inputObj.name] = void 0;
    };
  }
  function getAllNodes(object) {
    var astNode = object.astNode,
      extensionASTNodes = object.extensionASTNodes;
    return astNode
      ? extensionASTNodes
        ? [astNode].concat(extensionASTNodes)
        : [astNode]
      : null != extensionASTNodes
      ? extensionASTNodes
      : [];
  }
  function getAllSubNodes(object, getter) {
    var subNodes = [];
    for (var _i32 = 0, _getAllNodes2 = getAllNodes(object); _i32 < _getAllNodes2.length; _i32++) {
      var _getter;
      var node = _getAllNodes2[_i32];
      subNodes = subNodes.concat(null !== (_getter = getter(node)) && void 0 !== _getter ? _getter : []);
    }
    return subNodes;
  }
  function getAllImplementsInterfaceNodes(type, iface) {
    return getAllSubNodes(type, function (typeNode) {
      return typeNode.interfaces;
    }).filter(function (ifaceNode) {
      return ifaceNode.name.value === iface.name;
    });
  }
  function getUnionMemberTypeNodes(union, typeName) {
    return getAllSubNodes(union, function (unionNode) {
      return unionNode.types;
    }).filter(function (typeNode) {
      return typeNode.name.value === typeName;
    });
  }
  function getDeprecatedDirectiveNode(definitionNode) {
    var _definitionNode$direc;
    return null == definitionNode
      ? void 0
      : null === (_definitionNode$direc = definitionNode.directives) || void 0 === _definitionNode$direc
      ? void 0
      : _definitionNode$direc.find(function (node) {
          return node.name.value === GraphQLDeprecatedDirective.name;
        });
  }
  function typeFromAST_typeFromAST(schema, typeNode) {
    var innerType;
    if (typeNode.kind === kinds_Kind.LIST_TYPE)
      return (innerType = typeFromAST_typeFromAST(schema, typeNode.type)) && new GraphQLList(innerType);
    if (typeNode.kind === kinds_Kind.NON_NULL_TYPE)
      return (innerType = typeFromAST_typeFromAST(schema, typeNode.type)) && new GraphQLNonNull(innerType);
    if (typeNode.kind === kinds_Kind.NAMED_TYPE) return schema.getType(typeNode.name.value);
    invariant(0, 'Unexpected type node: ' + inspect_inspect(typeNode));
  }
  var TypeInfo_TypeInfo = (function () {
    function TypeInfo(schema, getFieldDefFn, initialType) {
      this._schema = schema;
      this._typeStack = [];
      this._parentTypeStack = [];
      this._inputTypeStack = [];
      this._fieldDefStack = [];
      this._defaultValueStack = [];
      this._directive = null;
      this._argument = null;
      this._enumValue = null;
      this._getFieldDef = null != getFieldDefFn ? getFieldDefFn : getFieldDef;
      if (initialType) {
        if (definition_isInputType(initialType)) this._inputTypeStack.push(initialType);
        if (isCompositeType(initialType)) this._parentTypeStack.push(initialType);
        if (isOutputType(initialType)) this._typeStack.push(initialType);
      }
    }
    var _proto = TypeInfo.prototype;
    _proto.getType = function () {
      if (this._typeStack.length > 0) return this._typeStack[this._typeStack.length - 1];
    };
    _proto.getParentType = function () {
      if (this._parentTypeStack.length > 0) return this._parentTypeStack[this._parentTypeStack.length - 1];
    };
    _proto.getInputType = function () {
      if (this._inputTypeStack.length > 0) return this._inputTypeStack[this._inputTypeStack.length - 1];
    };
    _proto.getParentInputType = function () {
      if (this._inputTypeStack.length > 1) return this._inputTypeStack[this._inputTypeStack.length - 2];
    };
    _proto.getFieldDef = function () {
      if (this._fieldDefStack.length > 0) return this._fieldDefStack[this._fieldDefStack.length - 1];
    };
    _proto.getDefaultValue = function () {
      if (this._defaultValueStack.length > 0) return this._defaultValueStack[this._defaultValueStack.length - 1];
    };
    _proto.getDirective = function () {
      return this._directive;
    };
    _proto.getArgument = function () {
      return this._argument;
    };
    _proto.getEnumValue = function () {
      return this._enumValue;
    };
    _proto.enter = function (node) {
      var schema = this._schema;
      switch (node.kind) {
        case kinds_Kind.SELECTION_SET:
          var namedType = definition_getNamedType(this.getType());
          this._parentTypeStack.push(isCompositeType(namedType) ? namedType : void 0);
          break;

        case kinds_Kind.FIELD:
          var parentType = this.getParentType();
          var fieldDef;
          var fieldType;
          if (parentType) if ((fieldDef = this._getFieldDef(schema, parentType, node))) fieldType = fieldDef.type;
          this._fieldDefStack.push(fieldDef);
          this._typeStack.push(isOutputType(fieldType) ? fieldType : void 0);
          break;

        case kinds_Kind.DIRECTIVE:
          this._directive = schema.getDirective(node.name.value);
          break;

        case kinds_Kind.OPERATION_DEFINITION:
          var type;
          switch (node.operation) {
            case 'query':
              type = schema.getQueryType();
              break;

            case 'mutation':
              type = schema.getMutationType();
              break;

            case 'subscription':
              type = schema.getSubscriptionType();
              break;
          }
          this._typeStack.push(definition_isObjectType(type) ? type : void 0);
          break;

        case kinds_Kind.INLINE_FRAGMENT:
        case kinds_Kind.FRAGMENT_DEFINITION:
          var typeConditionAST = node.typeCondition;
          var outputType = typeConditionAST
            ? typeFromAST_typeFromAST(schema, typeConditionAST)
            : definition_getNamedType(this.getType());
          this._typeStack.push(isOutputType(outputType) ? outputType : void 0);
          break;

        case kinds_Kind.VARIABLE_DEFINITION:
          var inputType = typeFromAST_typeFromAST(schema, node.type);
          this._inputTypeStack.push(definition_isInputType(inputType) ? inputType : void 0);
          break;

        case kinds_Kind.ARGUMENT:
          var _this$getDirective;
          var argDef;
          var argType;
          var fieldOrDirective =
            null !== (_this$getDirective = this.getDirective()) && void 0 !== _this$getDirective
              ? _this$getDirective
              : this.getFieldDef();
          if (fieldOrDirective)
            if (
              (argDef = polyfills_find(fieldOrDirective.args, function (arg) {
                return arg.name === node.name.value;
              }))
            )
              argType = argDef.type;
          this._argument = argDef;
          this._defaultValueStack.push(argDef ? argDef.defaultValue : void 0);
          this._inputTypeStack.push(definition_isInputType(argType) ? argType : void 0);
          break;

        case kinds_Kind.LIST:
          var listType = definition_getNullableType(this.getInputType());
          var itemType = definition_isListType(listType) ? listType.ofType : listType;
          this._defaultValueStack.push(void 0);
          this._inputTypeStack.push(definition_isInputType(itemType) ? itemType : void 0);
          break;

        case kinds_Kind.OBJECT_FIELD:
          var objectType = definition_getNamedType(this.getInputType());
          var inputFieldType;
          var inputField;
          if (definition_isInputObjectType(objectType))
            if ((inputField = objectType.getFields()[node.name.value])) inputFieldType = inputField.type;
          this._defaultValueStack.push(inputField ? inputField.defaultValue : void 0);
          this._inputTypeStack.push(definition_isInputType(inputFieldType) ? inputFieldType : void 0);
          break;

        case kinds_Kind.ENUM:
          var enumType = definition_getNamedType(this.getInputType());
          var enumValue;
          if (definition_isEnumType(enumType)) enumValue = enumType.getValue(node.value);
          this._enumValue = enumValue;
          break;
      }
    };
    _proto.leave = function (node) {
      switch (node.kind) {
        case kinds_Kind.SELECTION_SET:
          this._parentTypeStack.pop();
          break;

        case kinds_Kind.FIELD:
          this._fieldDefStack.pop();
          this._typeStack.pop();
          break;

        case kinds_Kind.DIRECTIVE:
          this._directive = null;
          break;

        case kinds_Kind.OPERATION_DEFINITION:
        case kinds_Kind.INLINE_FRAGMENT:
        case kinds_Kind.FRAGMENT_DEFINITION:
          this._typeStack.pop();
          break;

        case kinds_Kind.VARIABLE_DEFINITION:
          this._inputTypeStack.pop();
          break;

        case kinds_Kind.ARGUMENT:
          this._argument = null;
          this._defaultValueStack.pop();
          this._inputTypeStack.pop();
          break;

        case kinds_Kind.LIST:
        case kinds_Kind.OBJECT_FIELD:
          this._defaultValueStack.pop();
          this._inputTypeStack.pop();
          break;

        case kinds_Kind.ENUM:
          this._enumValue = null;
          break;
      }
    };
    return TypeInfo;
  })();
  function getFieldDef(schema, parentType, fieldNode) {
    var name = fieldNode.name.value;
    if (name === SchemaMetaFieldDef.name && schema.getQueryType() === parentType) return SchemaMetaFieldDef;
    if (name === TypeMetaFieldDef.name && schema.getQueryType() === parentType) return TypeMetaFieldDef;
    if (name === introspection_TypeNameMetaFieldDef.name && isCompositeType(parentType))
      return introspection_TypeNameMetaFieldDef;
    if (definition_isObjectType(parentType) || definition_isInterfaceType(parentType))
      return parentType.getFields()[name];
  }
  function TypeInfo_visitWithTypeInfo(typeInfo, visitor) {
    return {
      enter: function (node) {
        typeInfo.enter(node);
        var fn = getVisitFn(visitor, node.kind, false);
        if (fn) {
          var result = fn.apply(visitor, arguments);
          if (void 0 !== result) {
            typeInfo.leave(node);
            if (isNode(result)) typeInfo.enter(result);
          }
          return result;
        }
      },
      leave: function (node) {
        var fn = getVisitFn(visitor, node.kind, true);
        var result;
        if (fn) result = fn.apply(visitor, arguments);
        typeInfo.leave(node);
        return result;
      },
    };
  }
  function isDefinitionNode(node) {
    return (
      isExecutableDefinitionNode(node) || predicates_isTypeSystemDefinitionNode(node) || isTypeSystemExtensionNode(node)
    );
  }
  function isExecutableDefinitionNode(node) {
    return node.kind === kinds_Kind.OPERATION_DEFINITION || node.kind === kinds_Kind.FRAGMENT_DEFINITION;
  }
  function predicates_isTypeSystemDefinitionNode(node) {
    return (
      node.kind === kinds_Kind.SCHEMA_DEFINITION ||
      isTypeDefinitionNode(node) ||
      node.kind === kinds_Kind.DIRECTIVE_DEFINITION
    );
  }
  function isTypeDefinitionNode(node) {
    return (
      node.kind === kinds_Kind.SCALAR_TYPE_DEFINITION ||
      node.kind === kinds_Kind.OBJECT_TYPE_DEFINITION ||
      node.kind === kinds_Kind.INTERFACE_TYPE_DEFINITION ||
      node.kind === kinds_Kind.UNION_TYPE_DEFINITION ||
      node.kind === kinds_Kind.ENUM_TYPE_DEFINITION ||
      node.kind === kinds_Kind.INPUT_OBJECT_TYPE_DEFINITION
    );
  }
  function isTypeSystemExtensionNode(node) {
    return node.kind === kinds_Kind.SCHEMA_EXTENSION || isTypeExtensionNode(node);
  }
  function isTypeExtensionNode(node) {
    return (
      node.kind === kinds_Kind.SCALAR_TYPE_EXTENSION ||
      node.kind === kinds_Kind.OBJECT_TYPE_EXTENSION ||
      node.kind === kinds_Kind.INTERFACE_TYPE_EXTENSION ||
      node.kind === kinds_Kind.UNION_TYPE_EXTENSION ||
      node.kind === kinds_Kind.ENUM_TYPE_EXTENSION ||
      node.kind === kinds_Kind.INPUT_OBJECT_TYPE_EXTENSION
    );
  }
  function KnownTypeNamesRule(context) {
    var schema = context.getSchema();
    var existingTypesMap = schema ? schema.getTypeMap() : Object.create(null);
    var definedTypes = Object.create(null);
    for (
      var _i2 = 0, _context$getDocument$2 = context.getDocument().definitions;
      _i2 < _context$getDocument$2.length;
      _i2++
    ) {
      var def = _context$getDocument$2[_i2];
      if (isTypeDefinitionNode(def)) definedTypes[def.name.value] = true;
    }
    var typeNames = Object.keys(existingTypesMap).concat(Object.keys(definedTypes));
    return {
      NamedType: function (node, _1, parent, _2, ancestors) {
        var typeName = node.name.value;
        if (!existingTypesMap[typeName] && !definedTypes[typeName]) {
          var _ancestors$;
          var definitionNode = null !== (_ancestors$ = ancestors[2]) && void 0 !== _ancestors$ ? _ancestors$ : parent;
          var isSDL = null != definitionNode && isSDLNode(definitionNode);
          if (isSDL && isStandardTypeName(typeName)) return;
          var suggestedTypes = suggestionList(typeName, isSDL ? standardTypeNames.concat(typeNames) : typeNames);
          context.reportError(
            new GraphQLError('Unknown type "'.concat(typeName, '".') + didYouMean(suggestedTypes), node)
          );
        }
      },
    };
  }
  var standardTypeNames = [].concat(specifiedScalarTypes, introspectionTypes).map(function (type) {
    return type.name;
  });
  function isStandardTypeName(typeName) {
    return -1 !== standardTypeNames.indexOf(typeName);
  }
  function isSDLNode(value) {
    return !Array.isArray(value) && (predicates_isTypeSystemDefinitionNode(value) || isTypeSystemExtensionNode(value));
  }
  function getSuggestedTypeNames(schema, type, fieldName) {
    if (!definition_isAbstractType(type)) return [];
    var suggestedTypes = new Set();
    var usageCount = Object.create(null);
    for (
      var _i2 = 0, _schema$getPossibleTy2 = schema.getPossibleTypes(type);
      _i2 < _schema$getPossibleTy2.length;
      _i2++
    ) {
      var possibleType = _schema$getPossibleTy2[_i2];
      if (!possibleType.getFields()[fieldName]) continue;
      suggestedTypes.add(possibleType);
      usageCount[possibleType.name] = 1;
      for (
        var _i4 = 0, _possibleType$getInte2 = possibleType.getInterfaces();
        _i4 < _possibleType$getInte2.length;
        _i4++
      ) {
        var _usageCount$possibleI;
        var possibleInterface = _possibleType$getInte2[_i4];
        if (!possibleInterface.getFields()[fieldName]) continue;
        suggestedTypes.add(possibleInterface);
        usageCount[possibleInterface.name] =
          (null !== (_usageCount$possibleI = usageCount[possibleInterface.name]) && void 0 !== _usageCount$possibleI
            ? _usageCount$possibleI
            : 0) + 1;
      }
    }
    return polyfills_arrayFrom(suggestedTypes)
      .sort(function (typeA, typeB) {
        var usageCountDiff = usageCount[typeB.name] - usageCount[typeA.name];
        if (0 !== usageCountDiff) return usageCountDiff;
        if (definition_isInterfaceType(typeA) && schema.isSubType(typeA, typeB)) return -1;
        if (definition_isInterfaceType(typeB) && schema.isSubType(typeB, typeA)) return 1;
        return naturalCompare(typeA.name, typeB.name);
      })
      .map(function (x) {
        return x.name;
      });
  }
  function getSuggestedFieldNames(type, fieldName) {
    if (definition_isObjectType(type) || definition_isInterfaceType(type))
      return suggestionList(fieldName, Object.keys(type.getFields()));
    return [];
  }
  function getFragmentType(context, name) {
    var frag = context.getFragment(name);
    if (frag) {
      var type = typeFromAST_typeFromAST(context.getSchema(), frag.typeCondition);
      if (isCompositeType(type)) return type;
    }
  }
  function KnownDirectivesRule(context) {
    var locationsMap = Object.create(null);
    var schema = context.getSchema();
    var definedDirectives = schema ? schema.getDirectives() : specifiedDirectives;
    for (var _i2 = 0; _i2 < definedDirectives.length; _i2++) {
      var directive = definedDirectives[_i2];
      locationsMap[directive.name] = directive.locations;
    }
    var astDefinitions = context.getDocument().definitions;
    for (var _i4 = 0; _i4 < astDefinitions.length; _i4++) {
      var def = astDefinitions[_i4];
      if (def.kind === kinds_Kind.DIRECTIVE_DEFINITION)
        locationsMap[def.name.value] = def.locations.map(function (name) {
          return name.value;
        });
    }
    return {
      Directive: function (node, _key, _parent, _path, ancestors) {
        var name = node.name.value;
        var locations = locationsMap[name];
        if (!locations) {
          context.reportError(new GraphQLError('Unknown directive "@'.concat(name, '".'), node));
          return;
        }
        var candidateLocation = getDirectiveLocationForASTPath(ancestors);
        if (candidateLocation && -1 === locations.indexOf(candidateLocation))
          context.reportError(
            new GraphQLError('Directive "@'.concat(name, '" may not be used on ').concat(candidateLocation, '.'), node)
          );
      },
    };
  }
  function getDirectiveLocationForASTPath(ancestors) {
    var appliedTo = ancestors[ancestors.length - 1];
    !Array.isArray(appliedTo) || invariant(0);
    switch (appliedTo.kind) {
      case kinds_Kind.OPERATION_DEFINITION:
        return getDirectiveLocationForOperation(appliedTo.operation);

      case kinds_Kind.FIELD:
        return DirectiveLocation.FIELD;

      case kinds_Kind.FRAGMENT_SPREAD:
        return DirectiveLocation.FRAGMENT_SPREAD;

      case kinds_Kind.INLINE_FRAGMENT:
        return DirectiveLocation.INLINE_FRAGMENT;

      case kinds_Kind.FRAGMENT_DEFINITION:
        return DirectiveLocation.FRAGMENT_DEFINITION;

      case kinds_Kind.VARIABLE_DEFINITION:
        return DirectiveLocation.VARIABLE_DEFINITION;

      case kinds_Kind.SCHEMA_DEFINITION:
      case kinds_Kind.SCHEMA_EXTENSION:
        return DirectiveLocation.SCHEMA;

      case kinds_Kind.SCALAR_TYPE_DEFINITION:
      case kinds_Kind.SCALAR_TYPE_EXTENSION:
        return DirectiveLocation.SCALAR;

      case kinds_Kind.OBJECT_TYPE_DEFINITION:
      case kinds_Kind.OBJECT_TYPE_EXTENSION:
        return DirectiveLocation.OBJECT;

      case kinds_Kind.FIELD_DEFINITION:
        return DirectiveLocation.FIELD_DEFINITION;

      case kinds_Kind.INTERFACE_TYPE_DEFINITION:
      case kinds_Kind.INTERFACE_TYPE_EXTENSION:
        return DirectiveLocation.INTERFACE;

      case kinds_Kind.UNION_TYPE_DEFINITION:
      case kinds_Kind.UNION_TYPE_EXTENSION:
        return DirectiveLocation.UNION;

      case kinds_Kind.ENUM_TYPE_DEFINITION:
      case kinds_Kind.ENUM_TYPE_EXTENSION:
        return DirectiveLocation.ENUM;

      case kinds_Kind.ENUM_VALUE_DEFINITION:
        return DirectiveLocation.ENUM_VALUE;

      case kinds_Kind.INPUT_OBJECT_TYPE_DEFINITION:
      case kinds_Kind.INPUT_OBJECT_TYPE_EXTENSION:
        return DirectiveLocation.INPUT_OBJECT;

      case kinds_Kind.INPUT_VALUE_DEFINITION:
        return ancestors[ancestors.length - 3].kind === kinds_Kind.INPUT_OBJECT_TYPE_DEFINITION
          ? DirectiveLocation.INPUT_FIELD_DEFINITION
          : DirectiveLocation.ARGUMENT_DEFINITION;
    }
  }
  function getDirectiveLocationForOperation(operation) {
    switch (operation) {
      case 'query':
        return DirectiveLocation.QUERY;

      case 'mutation':
        return DirectiveLocation.MUTATION;

      case 'subscription':
        return DirectiveLocation.SUBSCRIPTION;
    }
    invariant(0, 'Unexpected operation: ' + inspect_inspect(operation));
  }
  function UniqueDirectivesPerLocationRule(context) {
    var uniqueDirectiveMap = Object.create(null);
    var schema = context.getSchema();
    var definedDirectives = schema ? schema.getDirectives() : specifiedDirectives;
    for (var _i2 = 0; _i2 < definedDirectives.length; _i2++) {
      var directive = definedDirectives[_i2];
      uniqueDirectiveMap[directive.name] = !directive.isRepeatable;
    }
    var astDefinitions = context.getDocument().definitions;
    for (var _i4 = 0; _i4 < astDefinitions.length; _i4++) {
      var def = astDefinitions[_i4];
      if (def.kind === kinds_Kind.DIRECTIVE_DEFINITION) uniqueDirectiveMap[def.name.value] = !def.repeatable;
    }
    var schemaDirectives = Object.create(null);
    var typeDirectivesMap = Object.create(null);
    return {
      enter: function (node) {
        if (null == node.directives) return;
        var seenDirectives;
        if (node.kind === kinds_Kind.SCHEMA_DEFINITION || node.kind === kinds_Kind.SCHEMA_EXTENSION)
          seenDirectives = schemaDirectives;
        else if (isTypeDefinitionNode(node) || isTypeExtensionNode(node)) {
          var typeName = node.name.value;
          if (void 0 === (seenDirectives = typeDirectivesMap[typeName]))
            typeDirectivesMap[typeName] = seenDirectives = Object.create(null);
        } else seenDirectives = Object.create(null);
        for (var _i6 = 0, _node$directives2 = node.directives; _i6 < _node$directives2.length; _i6++) {
          var _directive = _node$directives2[_i6];
          var directiveName = _directive.name.value;
          if (uniqueDirectiveMap[directiveName])
            if (seenDirectives[directiveName])
              context.reportError(
                new GraphQLError(
                  'The directive "@'.concat(directiveName, '" can only be used once at this location.'),
                  [seenDirectives[directiveName], _directive]
                )
              );
            else seenDirectives[directiveName] = _directive;
        }
      },
    };
  }
  function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);
    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);
      if (enumerableOnly)
        symbols = symbols.filter(function (sym) {
          return Object.getOwnPropertyDescriptor(object, sym).enumerable;
        });
      keys.push.apply(keys, symbols);
    }
    return keys;
  }
  function _objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = null != arguments[i] ? arguments[i] : {};
      if (i % 2)
        ownKeys(Object(source), true).forEach(function (key) {
          _defineProperty(target, key, source[key]);
        });
      else if (Object.getOwnPropertyDescriptors)
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
      else
        ownKeys(Object(source)).forEach(function (key) {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
    }
    return target;
  }
  function _defineProperty(obj, key, value) {
    if (key in obj)
      Object.defineProperty(obj, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    else obj[key] = value;
    return obj;
  }
  function KnownArgumentNamesOnDirectivesRule(context) {
    var directiveArgs = Object.create(null);
    var schema = context.getSchema();
    var definedDirectives = schema ? schema.getDirectives() : specifiedDirectives;
    for (var _i2 = 0; _i2 < definedDirectives.length; _i2++) {
      var directive = definedDirectives[_i2];
      directiveArgs[directive.name] = directive.args.map(function (arg) {
        return arg.name;
      });
    }
    var astDefinitions = context.getDocument().definitions;
    for (var _i4 = 0; _i4 < astDefinitions.length; _i4++) {
      var def = astDefinitions[_i4];
      if (def.kind === kinds_Kind.DIRECTIVE_DEFINITION) {
        var _def$arguments;
        var argsNodes = null !== (_def$arguments = def.arguments) && void 0 !== _def$arguments ? _def$arguments : [];
        directiveArgs[def.name.value] = argsNodes.map(function (arg) {
          return arg.name.value;
        });
      }
    }
    return {
      Directive: function (directiveNode) {
        var directiveName = directiveNode.name.value;
        var knownArgs = directiveArgs[directiveName];
        if (directiveNode.arguments && knownArgs)
          for (
            var _i6 = 0, _directiveNode$argume2 = directiveNode.arguments;
            _i6 < _directiveNode$argume2.length;
            _i6++
          ) {
            var argNode = _directiveNode$argume2[_i6];
            var argName = argNode.name.value;
            if (-1 === knownArgs.indexOf(argName)) {
              var suggestions = suggestionList(argName, knownArgs);
              context.reportError(
                new GraphQLError(
                  'Unknown argument "'.concat(argName, '" on directive "@').concat(directiveName, '".') +
                    didYouMean(suggestions),
                  argNode
                )
              );
            }
          }
        return false;
      },
    };
  }
  function UniqueArgumentNamesRule(context) {
    var knownArgNames = Object.create(null);
    return {
      Field: function () {
        knownArgNames = Object.create(null);
      },
      Directive: function () {
        knownArgNames = Object.create(null);
      },
      Argument: function (node) {
        var argName = node.name.value;
        if (knownArgNames[argName])
          context.reportError(
            new GraphQLError('There can be only one argument named "'.concat(argName, '".'), [
              knownArgNames[argName],
              node.name,
            ])
          );
        else knownArgNames[argName] = node.name;
        return false;
      },
    };
  }
  function isValidValueNode(context, node) {
    var locationType = context.getInputType();
    if (!locationType) return;
    var type = definition_getNamedType(locationType);
    if (!definition_isLeafType(type)) {
      var typeStr = inspect_inspect(locationType);
      context.reportError(
        new GraphQLError('Expected value of type "'.concat(typeStr, '", found ').concat(printer_print(node), '.'), node)
      );
      return;
    }
    try {
      if (void 0 === type.parseLiteral(node, void 0)) {
        var _typeStr = inspect_inspect(locationType);
        context.reportError(
          new GraphQLError(
            'Expected value of type "'.concat(_typeStr, '", found ').concat(printer_print(node), '.'),
            node
          )
        );
      }
    } catch (error) {
      var _typeStr2 = inspect_inspect(locationType);
      if (error instanceof GraphQLError) context.reportError(error);
      else
        context.reportError(
          new GraphQLError(
            'Expected value of type "'.concat(_typeStr2, '", found ').concat(printer_print(node), '; ') + error.message,
            node,
            void 0,
            void 0,
            void 0,
            error
          )
        );
    }
  }
  function ProvidedRequiredArgumentsRule_ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);
    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);
      if (enumerableOnly)
        symbols = symbols.filter(function (sym) {
          return Object.getOwnPropertyDescriptor(object, sym).enumerable;
        });
      keys.push.apply(keys, symbols);
    }
    return keys;
  }
  function ProvidedRequiredArgumentsRule_objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = null != arguments[i] ? arguments[i] : {};
      if (i % 2)
        ProvidedRequiredArgumentsRule_ownKeys(Object(source), true).forEach(function (key) {
          ProvidedRequiredArgumentsRule_defineProperty(target, key, source[key]);
        });
      else if (Object.getOwnPropertyDescriptors)
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
      else
        ProvidedRequiredArgumentsRule_ownKeys(Object(source)).forEach(function (key) {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
    }
    return target;
  }
  function ProvidedRequiredArgumentsRule_defineProperty(obj, key, value) {
    if (key in obj)
      Object.defineProperty(obj, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    else obj[key] = value;
    return obj;
  }
  function ProvidedRequiredArgumentsOnDirectivesRule(context) {
    var requiredArgsMap = Object.create(null);
    var schema = context.getSchema();
    var definedDirectives = schema ? schema.getDirectives() : specifiedDirectives;
    for (var _i4 = 0; _i4 < definedDirectives.length; _i4++) {
      var directive = definedDirectives[_i4];
      requiredArgsMap[directive.name] = keyMap(directive.args.filter(isRequiredArgument), function (arg) {
        return arg.name;
      });
    }
    var astDefinitions = context.getDocument().definitions;
    for (var _i6 = 0; _i6 < astDefinitions.length; _i6++) {
      var def = astDefinitions[_i6];
      if (def.kind === kinds_Kind.DIRECTIVE_DEFINITION) {
        var _def$arguments;
        var argNodes = null !== (_def$arguments = def.arguments) && void 0 !== _def$arguments ? _def$arguments : [];
        requiredArgsMap[def.name.value] = keyMap(argNodes.filter(isRequiredArgumentNode), function (arg) {
          return arg.name.value;
        });
      }
    }
    return {
      Directive: {
        leave: function (directiveNode) {
          var directiveName = directiveNode.name.value;
          var requiredArgs = requiredArgsMap[directiveName];
          if (requiredArgs) {
            var _directiveNode$argume;
            var argNodeMap = keyMap(
              null !== (_directiveNode$argume = directiveNode.arguments) && void 0 !== _directiveNode$argume
                ? _directiveNode$argume
                : [],
              function (arg) {
                return arg.name.value;
              }
            );
            for (var _i8 = 0, _Object$keys2 = Object.keys(requiredArgs); _i8 < _Object$keys2.length; _i8++) {
              var argName = _Object$keys2[_i8];
              if (!argNodeMap[argName]) {
                var argType = requiredArgs[argName].type;
                var argTypeStr = isType(argType) ? inspect_inspect(argType) : printer_print(argType);
                context.reportError(
                  new GraphQLError(
                    'Directive "@'
                      .concat(directiveName, '" argument "')
                      .concat(argName, '" of type "')
                      .concat(argTypeStr, '" is required, but it was not provided.'),
                    directiveNode
                  )
                );
              }
            }
          }
        },
      },
    };
  }
  function isRequiredArgumentNode(arg) {
    return arg.type.kind === kinds_Kind.NON_NULL_TYPE && null == arg.defaultValue;
  }
  function allowedVariableUsage(schema, varType, varDefaultValue, locationType, locationDefaultValue) {
    if (definition_isNonNullType(locationType) && !definition_isNonNullType(varType)) {
      if (!((null != varDefaultValue && varDefaultValue.kind !== kinds_Kind.NULL) || void 0 !== locationDefaultValue))
        return false;
      return isTypeSubTypeOf(schema, varType, locationType.ofType);
    }
    return isTypeSubTypeOf(schema, varType, locationType);
  }
  function reasonMessage(reason) {
    if (Array.isArray(reason))
      return reason
        .map(function (_ref) {
          var responseName = _ref[0],
            subReason = _ref[1];
          return 'subfields "'.concat(responseName, '" conflict because ') + reasonMessage(subReason);
        })
        .join(' and ');
    return reason;
  }
  function findConflictsWithinSelectionSet(
    context,
    cachedFieldsAndFragmentNames,
    comparedFragmentPairs,
    parentType,
    selectionSet
  ) {
    var conflicts = [];
    var _getFieldsAndFragment = getFieldsAndFragmentNames(
        context,
        cachedFieldsAndFragmentNames,
        parentType,
        selectionSet
      ),
      fieldMap = _getFieldsAndFragment[0],
      fragmentNames = _getFieldsAndFragment[1];
    collectConflictsWithin(context, conflicts, cachedFieldsAndFragmentNames, comparedFragmentPairs, fieldMap);
    if (0 !== fragmentNames.length)
      for (var i = 0; i < fragmentNames.length; i++) {
        collectConflictsBetweenFieldsAndFragment(
          context,
          conflicts,
          cachedFieldsAndFragmentNames,
          comparedFragmentPairs,
          false,
          fieldMap,
          fragmentNames[i]
        );
        for (var j = i + 1; j < fragmentNames.length; j++)
          collectConflictsBetweenFragments(
            context,
            conflicts,
            cachedFieldsAndFragmentNames,
            comparedFragmentPairs,
            false,
            fragmentNames[i],
            fragmentNames[j]
          );
      }
    return conflicts;
  }
  function collectConflictsBetweenFieldsAndFragment(
    context,
    conflicts,
    cachedFieldsAndFragmentNames,
    comparedFragmentPairs,
    areMutuallyExclusive,
    fieldMap,
    fragmentName
  ) {
    var fragment = context.getFragment(fragmentName);
    if (!fragment) return;
    var _getReferencedFieldsA = getReferencedFieldsAndFragmentNames(context, cachedFieldsAndFragmentNames, fragment),
      fieldMap2 = _getReferencedFieldsA[0],
      fragmentNames2 = _getReferencedFieldsA[1];
    if (fieldMap === fieldMap2) return;
    collectConflictsBetween(
      context,
      conflicts,
      cachedFieldsAndFragmentNames,
      comparedFragmentPairs,
      areMutuallyExclusive,
      fieldMap,
      fieldMap2
    );
    for (var i = 0; i < fragmentNames2.length; i++)
      collectConflictsBetweenFieldsAndFragment(
        context,
        conflicts,
        cachedFieldsAndFragmentNames,
        comparedFragmentPairs,
        areMutuallyExclusive,
        fieldMap,
        fragmentNames2[i]
      );
  }
  function collectConflictsBetweenFragments(
    context,
    conflicts,
    cachedFieldsAndFragmentNames,
    comparedFragmentPairs,
    areMutuallyExclusive,
    fragmentName1,
    fragmentName2
  ) {
    if (fragmentName1 === fragmentName2) return;
    if (comparedFragmentPairs.has(fragmentName1, fragmentName2, areMutuallyExclusive)) return;
    comparedFragmentPairs.add(fragmentName1, fragmentName2, areMutuallyExclusive);
    var fragment1 = context.getFragment(fragmentName1);
    var fragment2 = context.getFragment(fragmentName2);
    if (!fragment1 || !fragment2) return;
    var _getReferencedFieldsA2 = getReferencedFieldsAndFragmentNames(context, cachedFieldsAndFragmentNames, fragment1),
      fieldMap1 = _getReferencedFieldsA2[0],
      fragmentNames1 = _getReferencedFieldsA2[1];
    var _getReferencedFieldsA3 = getReferencedFieldsAndFragmentNames(context, cachedFieldsAndFragmentNames, fragment2),
      fieldMap2 = _getReferencedFieldsA3[0],
      fragmentNames2 = _getReferencedFieldsA3[1];
    collectConflictsBetween(
      context,
      conflicts,
      cachedFieldsAndFragmentNames,
      comparedFragmentPairs,
      areMutuallyExclusive,
      fieldMap1,
      fieldMap2
    );
    for (var j = 0; j < fragmentNames2.length; j++)
      collectConflictsBetweenFragments(
        context,
        conflicts,
        cachedFieldsAndFragmentNames,
        comparedFragmentPairs,
        areMutuallyExclusive,
        fragmentName1,
        fragmentNames2[j]
      );
    for (var i = 0; i < fragmentNames1.length; i++)
      collectConflictsBetweenFragments(
        context,
        conflicts,
        cachedFieldsAndFragmentNames,
        comparedFragmentPairs,
        areMutuallyExclusive,
        fragmentNames1[i],
        fragmentName2
      );
  }
  function findConflictsBetweenSubSelectionSets(
    context,
    cachedFieldsAndFragmentNames,
    comparedFragmentPairs,
    areMutuallyExclusive,
    parentType1,
    selectionSet1,
    parentType2,
    selectionSet2
  ) {
    var conflicts = [];
    var _getFieldsAndFragment2 = getFieldsAndFragmentNames(
        context,
        cachedFieldsAndFragmentNames,
        parentType1,
        selectionSet1
      ),
      fieldMap1 = _getFieldsAndFragment2[0],
      fragmentNames1 = _getFieldsAndFragment2[1];
    var _getFieldsAndFragment3 = getFieldsAndFragmentNames(
        context,
        cachedFieldsAndFragmentNames,
        parentType2,
        selectionSet2
      ),
      fieldMap2 = _getFieldsAndFragment3[0],
      fragmentNames2 = _getFieldsAndFragment3[1];
    collectConflictsBetween(
      context,
      conflicts,
      cachedFieldsAndFragmentNames,
      comparedFragmentPairs,
      areMutuallyExclusive,
      fieldMap1,
      fieldMap2
    );
    if (0 !== fragmentNames2.length)
      for (var j = 0; j < fragmentNames2.length; j++)
        collectConflictsBetweenFieldsAndFragment(
          context,
          conflicts,
          cachedFieldsAndFragmentNames,
          comparedFragmentPairs,
          areMutuallyExclusive,
          fieldMap1,
          fragmentNames2[j]
        );
    if (0 !== fragmentNames1.length)
      for (var i = 0; i < fragmentNames1.length; i++)
        collectConflictsBetweenFieldsAndFragment(
          context,
          conflicts,
          cachedFieldsAndFragmentNames,
          comparedFragmentPairs,
          areMutuallyExclusive,
          fieldMap2,
          fragmentNames1[i]
        );
    for (var _i3 = 0; _i3 < fragmentNames1.length; _i3++)
      for (var _j = 0; _j < fragmentNames2.length; _j++)
        collectConflictsBetweenFragments(
          context,
          conflicts,
          cachedFieldsAndFragmentNames,
          comparedFragmentPairs,
          areMutuallyExclusive,
          fragmentNames1[_i3],
          fragmentNames2[_j]
        );
    return conflicts;
  }
  function collectConflictsWithin(context, conflicts, cachedFieldsAndFragmentNames, comparedFragmentPairs, fieldMap) {
    for (var _i5 = 0, _objectEntries2 = polyfills_objectEntries(fieldMap); _i5 < _objectEntries2.length; _i5++) {
      var _ref5 = _objectEntries2[_i5];
      var responseName = _ref5[0];
      var fields = _ref5[1];
      if (fields.length > 1)
        for (var i = 0; i < fields.length; i++)
          for (var j = i + 1; j < fields.length; j++) {
            var conflict = findConflict(
              context,
              cachedFieldsAndFragmentNames,
              comparedFragmentPairs,
              false,
              responseName,
              fields[i],
              fields[j]
            );
            if (conflict) conflicts.push(conflict);
          }
    }
  }
  function collectConflictsBetween(
    context,
    conflicts,
    cachedFieldsAndFragmentNames,
    comparedFragmentPairs,
    parentFieldsAreMutuallyExclusive,
    fieldMap1,
    fieldMap2
  ) {
    for (var _i7 = 0, _Object$keys2 = Object.keys(fieldMap1); _i7 < _Object$keys2.length; _i7++) {
      var responseName = _Object$keys2[_i7];
      var fields2 = fieldMap2[responseName];
      if (fields2) {
        var fields1 = fieldMap1[responseName];
        for (var i = 0; i < fields1.length; i++)
          for (var j = 0; j < fields2.length; j++) {
            var conflict = findConflict(
              context,
              cachedFieldsAndFragmentNames,
              comparedFragmentPairs,
              parentFieldsAreMutuallyExclusive,
              responseName,
              fields1[i],
              fields2[j]
            );
            if (conflict) conflicts.push(conflict);
          }
      }
    }
  }
  function findConflict(
    context,
    cachedFieldsAndFragmentNames,
    comparedFragmentPairs,
    parentFieldsAreMutuallyExclusive,
    responseName,
    field1,
    field2
  ) {
    var parentType1 = field1[0],
      node1 = field1[1],
      def1 = field1[2];
    var parentType2 = field2[0],
      node2 = field2[1],
      def2 = field2[2];
    var areMutuallyExclusive =
      parentFieldsAreMutuallyExclusive ||
      (parentType1 !== parentType2 && definition_isObjectType(parentType1) && definition_isObjectType(parentType2));
    if (!areMutuallyExclusive) {
      var _node1$arguments, _node2$arguments;
      var name1 = node1.name.value;
      var name2 = node2.name.value;
      if (name1 !== name2)
        return [[responseName, '"'.concat(name1, '" and "').concat(name2, '" are different fields')], [node1], [node2]];
      if (
        !sameArguments(
          null !== (_node1$arguments = node1.arguments) && void 0 !== _node1$arguments ? _node1$arguments : [],
          null !== (_node2$arguments = node2.arguments) && void 0 !== _node2$arguments ? _node2$arguments : []
        )
      )
        return [[responseName, 'they have differing arguments'], [node1], [node2]];
    }
    var type1 = null == def1 ? void 0 : def1.type;
    var type2 = null == def2 ? void 0 : def2.type;
    if (type1 && type2 && doTypesConflict(type1, type2))
      return [
        [
          responseName,
          'they return conflicting types "'
            .concat(inspect_inspect(type1), '" and "')
            .concat(inspect_inspect(type2), '"'),
        ],
        [node1],
        [node2],
      ];
    var selectionSet1 = node1.selectionSet;
    var selectionSet2 = node2.selectionSet;
    if (selectionSet1 && selectionSet2)
      return subfieldConflicts(
        findConflictsBetweenSubSelectionSets(
          context,
          cachedFieldsAndFragmentNames,
          comparedFragmentPairs,
          areMutuallyExclusive,
          definition_getNamedType(type1),
          selectionSet1,
          definition_getNamedType(type2),
          selectionSet2
        ),
        responseName,
        node1,
        node2
      );
  }
  function sameArguments(arguments1, arguments2) {
    if (arguments1.length !== arguments2.length) return false;
    return arguments1.every(function (argument1) {
      var argument2 = polyfills_find(arguments2, function (argument) {
        return argument.name.value === argument1.name.value;
      });
      if (!argument2) return false;
      return sameValue(argument1.value, argument2.value);
    });
  }
  function sameValue(value1, value2) {
    return printer_print(value1) === printer_print(value2);
  }
  function doTypesConflict(type1, type2) {
    if (definition_isListType(type1))
      return definition_isListType(type2) ? doTypesConflict(type1.ofType, type2.ofType) : true;
    if (definition_isListType(type2)) return true;
    if (definition_isNonNullType(type1))
      return definition_isNonNullType(type2) ? doTypesConflict(type1.ofType, type2.ofType) : true;
    if (definition_isNonNullType(type2)) return true;
    if (definition_isLeafType(type1) || definition_isLeafType(type2)) return type1 !== type2;
    return false;
  }
  function getFieldsAndFragmentNames(context, cachedFieldsAndFragmentNames, parentType, selectionSet) {
    var cached = cachedFieldsAndFragmentNames.get(selectionSet);
    if (!cached) {
      var nodeAndDefs = Object.create(null);
      var fragmentNames = Object.create(null);
      _collectFieldsAndFragmentNames(context, parentType, selectionSet, nodeAndDefs, fragmentNames);
      cached = [nodeAndDefs, Object.keys(fragmentNames)];
      cachedFieldsAndFragmentNames.set(selectionSet, cached);
    }
    return cached;
  }
  function getReferencedFieldsAndFragmentNames(context, cachedFieldsAndFragmentNames, fragment) {
    var cached = cachedFieldsAndFragmentNames.get(fragment.selectionSet);
    if (cached) return cached;
    var fragmentType = typeFromAST_typeFromAST(context.getSchema(), fragment.typeCondition);
    return getFieldsAndFragmentNames(context, cachedFieldsAndFragmentNames, fragmentType, fragment.selectionSet);
  }
  function _collectFieldsAndFragmentNames(context, parentType, selectionSet, nodeAndDefs, fragmentNames) {
    for (var _i9 = 0, _selectionSet$selecti2 = selectionSet.selections; _i9 < _selectionSet$selecti2.length; _i9++) {
      var selection = _selectionSet$selecti2[_i9];
      switch (selection.kind) {
        case kinds_Kind.FIELD:
          var fieldName = selection.name.value;
          var fieldDef = void 0;
          if (definition_isObjectType(parentType) || definition_isInterfaceType(parentType))
            fieldDef = parentType.getFields()[fieldName];
          var responseName = selection.alias ? selection.alias.value : fieldName;
          if (!nodeAndDefs[responseName]) nodeAndDefs[responseName] = [];
          nodeAndDefs[responseName].push([parentType, selection, fieldDef]);
          break;

        case kinds_Kind.FRAGMENT_SPREAD:
          fragmentNames[selection.name.value] = true;
          break;

        case kinds_Kind.INLINE_FRAGMENT:
          var typeCondition = selection.typeCondition;
          var inlineFragmentType = typeCondition
            ? typeFromAST_typeFromAST(context.getSchema(), typeCondition)
            : parentType;
          _collectFieldsAndFragmentNames(
            context,
            inlineFragmentType,
            selection.selectionSet,
            nodeAndDefs,
            fragmentNames
          );
          break;
      }
    }
  }
  function subfieldConflicts(conflicts, responseName, node1, node2) {
    if (conflicts.length > 0)
      return [
        [
          responseName,
          conflicts.map(function (_ref6) {
            return _ref6[0];
          }),
        ],
        conflicts.reduce(
          function (allFields, _ref7) {
            var fields1 = _ref7[1];
            return allFields.concat(fields1);
          },
          [node1]
        ),
        conflicts.reduce(
          function (allFields, _ref8) {
            var fields2 = _ref8[2];
            return allFields.concat(fields2);
          },
          [node2]
        ),
      ];
  }
  var PairSet = (function () {
    function PairSet() {
      this._data = Object.create(null);
    }
    var _proto = PairSet.prototype;
    _proto.has = function (a, b, areMutuallyExclusive) {
      var first = this._data[a];
      var result = first && first[b];
      if (void 0 === result) return false;
      if (false === areMutuallyExclusive) return false === result;
      return true;
    };
    _proto.add = function (a, b, areMutuallyExclusive) {
      this._pairSetAdd(a, b, areMutuallyExclusive);
      this._pairSetAdd(b, a, areMutuallyExclusive);
    };
    _proto._pairSetAdd = function (a, b, areMutuallyExclusive) {
      var map = this._data[a];
      if (!map) {
        map = Object.create(null);
        this._data[a] = map;
      }
      map[b] = areMutuallyExclusive;
    };
    return PairSet;
  })();
  function UniqueInputFieldNamesRule(context) {
    var knownNameStack = [];
    var knownNames = Object.create(null);
    return {
      ObjectValue: {
        enter: function () {
          knownNameStack.push(knownNames);
          knownNames = Object.create(null);
        },
        leave: function () {
          knownNames = knownNameStack.pop();
        },
      },
      ObjectField: function (node) {
        var fieldName = node.name.value;
        if (knownNames[fieldName])
          context.reportError(
            new GraphQLError('There can be only one input field named "'.concat(fieldName, '".'), [
              knownNames[fieldName],
              node.name,
            ])
          );
        else knownNames[fieldName] = node.name;
      },
    };
  }
  function hasField(type, fieldName) {
    if (definition_isObjectType(type) || definition_isInterfaceType(type) || definition_isInputObjectType(type))
      return null != type.getFields()[fieldName];
    return false;
  }
  var _defKindToExtKind;
  function PossibleTypeExtensionsRule_defineProperty(obj, key, value) {
    if (key in obj)
      Object.defineProperty(obj, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    else obj[key] = value;
    return obj;
  }
  var defKindToExtKind =
    (PossibleTypeExtensionsRule_defineProperty(
      (_defKindToExtKind = {}),
      kinds_Kind.SCALAR_TYPE_DEFINITION,
      kinds_Kind.SCALAR_TYPE_EXTENSION
    ),
    PossibleTypeExtensionsRule_defineProperty(
      _defKindToExtKind,
      kinds_Kind.OBJECT_TYPE_DEFINITION,
      kinds_Kind.OBJECT_TYPE_EXTENSION
    ),
    PossibleTypeExtensionsRule_defineProperty(
      _defKindToExtKind,
      kinds_Kind.INTERFACE_TYPE_DEFINITION,
      kinds_Kind.INTERFACE_TYPE_EXTENSION
    ),
    PossibleTypeExtensionsRule_defineProperty(
      _defKindToExtKind,
      kinds_Kind.UNION_TYPE_DEFINITION,
      kinds_Kind.UNION_TYPE_EXTENSION
    ),
    PossibleTypeExtensionsRule_defineProperty(
      _defKindToExtKind,
      kinds_Kind.ENUM_TYPE_DEFINITION,
      kinds_Kind.ENUM_TYPE_EXTENSION
    ),
    PossibleTypeExtensionsRule_defineProperty(
      _defKindToExtKind,
      kinds_Kind.INPUT_OBJECT_TYPE_DEFINITION,
      kinds_Kind.INPUT_OBJECT_TYPE_EXTENSION
    ),
    _defKindToExtKind);
  function typeToExtKind(type) {
    if (definition_isScalarType(type)) return kinds_Kind.SCALAR_TYPE_EXTENSION;
    if (definition_isObjectType(type)) return kinds_Kind.OBJECT_TYPE_EXTENSION;
    if (definition_isInterfaceType(type)) return kinds_Kind.INTERFACE_TYPE_EXTENSION;
    if (definition_isUnionType(type)) return kinds_Kind.UNION_TYPE_EXTENSION;
    if (definition_isEnumType(type)) return kinds_Kind.ENUM_TYPE_EXTENSION;
    if (definition_isInputObjectType(type)) return kinds_Kind.INPUT_OBJECT_TYPE_EXTENSION;
    invariant(0, 'Unexpected type: ' + inspect_inspect(type));
  }
  function extensionKindToTypeName(kind) {
    switch (kind) {
      case kinds_Kind.SCALAR_TYPE_EXTENSION:
        return 'scalar';

      case kinds_Kind.OBJECT_TYPE_EXTENSION:
        return 'object';

      case kinds_Kind.INTERFACE_TYPE_EXTENSION:
        return 'interface';

      case kinds_Kind.UNION_TYPE_EXTENSION:
        return 'union';

      case kinds_Kind.ENUM_TYPE_EXTENSION:
        return 'enum';

      case kinds_Kind.INPUT_OBJECT_TYPE_EXTENSION:
        return 'input object';
    }
    invariant(0, 'Unexpected kind: ' + inspect_inspect(kind));
  }
  var specifiedRules_specifiedRules = Object.freeze([
    function (context) {
      return {
        Document: function (node) {
          for (var _i2 = 0, _node$definitions2 = node.definitions; _i2 < _node$definitions2.length; _i2++) {
            var definition = _node$definitions2[_i2];
            if (!isExecutableDefinitionNode(definition)) {
              var defName =
                definition.kind === kinds_Kind.SCHEMA_DEFINITION || definition.kind === kinds_Kind.SCHEMA_EXTENSION
                  ? 'schema'
                  : '"' + definition.name.value + '"';
              context.reportError(
                new GraphQLError('The '.concat(defName, ' definition is not executable.'), definition)
              );
            }
          }
          return false;
        },
      };
    },
    function (context) {
      var knownOperationNames = Object.create(null);
      return {
        OperationDefinition: function (node) {
          var operationName = node.name;
          if (operationName)
            if (knownOperationNames[operationName.value])
              context.reportError(
                new GraphQLError('There can be only one operation named "'.concat(operationName.value, '".'), [
                  knownOperationNames[operationName.value],
                  operationName,
                ])
              );
            else knownOperationNames[operationName.value] = operationName;
          return false;
        },
        FragmentDefinition: function () {
          return false;
        },
      };
    },
    function (context) {
      var operationCount = 0;
      return {
        Document: function (node) {
          operationCount = node.definitions.filter(function (definition) {
            return definition.kind === kinds_Kind.OPERATION_DEFINITION;
          }).length;
        },
        OperationDefinition: function (node) {
          if (!node.name && operationCount > 1)
            context.reportError(new GraphQLError('This anonymous operation must be the only defined operation.', node));
        },
      };
    },
    function (context) {
      return {
        OperationDefinition: function (node) {
          if ('subscription' === node.operation)
            if (1 !== node.selectionSet.selections.length)
              context.reportError(
                new GraphQLError(
                  node.name
                    ? 'Subscription "'.concat(node.name.value, '" must select only one top level field.')
                    : 'Anonymous Subscription must select only one top level field.',
                  node.selectionSet.selections.slice(1)
                )
              );
        },
      };
    },
    KnownTypeNamesRule,
    function (context) {
      return {
        InlineFragment: function (node) {
          var typeCondition = node.typeCondition;
          if (typeCondition) {
            var type = typeFromAST_typeFromAST(context.getSchema(), typeCondition);
            if (type && !isCompositeType(type)) {
              var typeStr = printer_print(typeCondition);
              context.reportError(
                new GraphQLError(
                  'Fragment cannot condition on non composite type "'.concat(typeStr, '".'),
                  typeCondition
                )
              );
            }
          }
        },
        FragmentDefinition: function (node) {
          var type = typeFromAST_typeFromAST(context.getSchema(), node.typeCondition);
          if (type && !isCompositeType(type)) {
            var typeStr = printer_print(node.typeCondition);
            context.reportError(
              new GraphQLError(
                'Fragment "'
                  .concat(node.name.value, '" cannot condition on non composite type "')
                  .concat(typeStr, '".'),
                node.typeCondition
              )
            );
          }
        },
      };
    },
    function (context) {
      return {
        VariableDefinition: function (node) {
          var type = typeFromAST_typeFromAST(context.getSchema(), node.type);
          if (type && !definition_isInputType(type)) {
            var variableName = node.variable.name.value;
            var typeName = printer_print(node.type);
            context.reportError(
              new GraphQLError(
                'Variable "$'.concat(variableName, '" cannot be non-input type "').concat(typeName, '".'),
                node.type
              )
            );
          }
        },
      };
    },
    function (context) {
      return {
        Field: function (node) {
          var type = context.getType();
          var selectionSet = node.selectionSet;
          if (type)
            if (definition_isLeafType(definition_getNamedType(type))) {
              if (selectionSet) {
                var fieldName = node.name.value;
                var typeStr = inspect_inspect(type);
                context.reportError(
                  new GraphQLError(
                    'Field "'
                      .concat(fieldName, '" must not have a selection since type "')
                      .concat(typeStr, '" has no subfields.'),
                    selectionSet
                  )
                );
              }
            } else if (!selectionSet) {
              var _fieldName = node.name.value;
              var _typeStr = inspect_inspect(type);
              context.reportError(
                new GraphQLError(
                  'Field "'
                    .concat(_fieldName, '" of type "')
                    .concat(_typeStr, '" must have a selection of subfields. Did you mean "')
                    .concat(_fieldName, ' { ... }"?'),
                  node
                )
              );
            }
        },
      };
    },
    function (context) {
      return {
        Field: function (node) {
          var type = context.getParentType();
          if (type)
            if (!context.getFieldDef()) {
              var schema = context.getSchema();
              var fieldName = node.name.value;
              var suggestion = didYouMean(
                'to use an inline fragment on',
                getSuggestedTypeNames(schema, type, fieldName)
              );
              if ('' === suggestion) suggestion = didYouMean(getSuggestedFieldNames(type, fieldName));
              context.reportError(
                new GraphQLError(
                  'Cannot query field "'.concat(fieldName, '" on type "').concat(type.name, '".') + suggestion,
                  node
                )
              );
            }
        },
      };
    },
    function (context) {
      var knownFragmentNames = Object.create(null);
      return {
        OperationDefinition: function () {
          return false;
        },
        FragmentDefinition: function (node) {
          var fragmentName = node.name.value;
          if (knownFragmentNames[fragmentName])
            context.reportError(
              new GraphQLError('There can be only one fragment named "'.concat(fragmentName, '".'), [
                knownFragmentNames[fragmentName],
                node.name,
              ])
            );
          else knownFragmentNames[fragmentName] = node.name;
          return false;
        },
      };
    },
    function (context) {
      return {
        FragmentSpread: function (node) {
          var fragmentName = node.name.value;
          if (!context.getFragment(fragmentName))
            context.reportError(new GraphQLError('Unknown fragment "'.concat(fragmentName, '".'), node.name));
        },
      };
    },
    function (context) {
      var operationDefs = [];
      var fragmentDefs = [];
      return {
        OperationDefinition: function (node) {
          operationDefs.push(node);
          return false;
        },
        FragmentDefinition: function (node) {
          fragmentDefs.push(node);
          return false;
        },
        Document: {
          leave: function () {
            var fragmentNameUsed = Object.create(null);
            for (var _i2 = 0; _i2 < operationDefs.length; _i2++) {
              var operation = operationDefs[_i2];
              for (
                var _i4 = 0, _context$getRecursive2 = context.getRecursivelyReferencedFragments(operation);
                _i4 < _context$getRecursive2.length;
                _i4++
              )
                fragmentNameUsed[_context$getRecursive2[_i4].name.value] = true;
            }
            for (var _i6 = 0; _i6 < fragmentDefs.length; _i6++) {
              var fragmentDef = fragmentDefs[_i6];
              var fragName = fragmentDef.name.value;
              if (true !== fragmentNameUsed[fragName])
                context.reportError(new GraphQLError('Fragment "'.concat(fragName, '" is never used.'), fragmentDef));
            }
          },
        },
      };
    },
    function (context) {
      return {
        InlineFragment: function (node) {
          var fragType = context.getType();
          var parentType = context.getParentType();
          if (
            isCompositeType(fragType) &&
            isCompositeType(parentType) &&
            !doTypesOverlap(context.getSchema(), fragType, parentType)
          ) {
            var parentTypeStr = inspect_inspect(parentType);
            var fragTypeStr = inspect_inspect(fragType);
            context.reportError(
              new GraphQLError(
                'Fragment cannot be spread here as objects of type "'
                  .concat(parentTypeStr, '" can never be of type "')
                  .concat(fragTypeStr, '".'),
                node
              )
            );
          }
        },
        FragmentSpread: function (node) {
          var fragName = node.name.value;
          var fragType = getFragmentType(context, fragName);
          var parentType = context.getParentType();
          if (fragType && parentType && !doTypesOverlap(context.getSchema(), fragType, parentType)) {
            var parentTypeStr = inspect_inspect(parentType);
            var fragTypeStr = inspect_inspect(fragType);
            context.reportError(
              new GraphQLError(
                'Fragment "'
                  .concat(fragName, '" cannot be spread here as objects of type "')
                  .concat(parentTypeStr, '" can never be of type "')
                  .concat(fragTypeStr, '".'),
                node
              )
            );
          }
        },
      };
    },
    function (context) {
      var visitedFrags = Object.create(null);
      var spreadPath = [];
      var spreadPathIndexByName = Object.create(null);
      return {
        OperationDefinition: function () {
          return false;
        },
        FragmentDefinition: function (node) {
          detectCycleRecursive(node);
          return false;
        },
      };
      function detectCycleRecursive(fragment) {
        if (visitedFrags[fragment.name.value]) return;
        var fragmentName = fragment.name.value;
        visitedFrags[fragmentName] = true;
        var spreadNodes = context.getFragmentSpreads(fragment.selectionSet);
        if (0 === spreadNodes.length) return;
        spreadPathIndexByName[fragmentName] = spreadPath.length;
        for (var _i2 = 0; _i2 < spreadNodes.length; _i2++) {
          var spreadNode = spreadNodes[_i2];
          var spreadName = spreadNode.name.value;
          var cycleIndex = spreadPathIndexByName[spreadName];
          spreadPath.push(spreadNode);
          if (void 0 === cycleIndex) {
            var spreadFragment = context.getFragment(spreadName);
            if (spreadFragment) detectCycleRecursive(spreadFragment);
          } else {
            var cyclePath = spreadPath.slice(cycleIndex);
            var viaPath = cyclePath
              .slice(0, -1)
              .map(function (s) {
                return '"' + s.name.value + '"';
              })
              .join(', ');
            context.reportError(
              new GraphQLError(
                'Cannot spread fragment "'.concat(spreadName, '" within itself') +
                  ('' !== viaPath ? ' via '.concat(viaPath, '.') : '.'),
                cyclePath
              )
            );
          }
          spreadPath.pop();
        }
        spreadPathIndexByName[fragmentName] = void 0;
      }
    },
    function (context) {
      var knownVariableNames = Object.create(null);
      return {
        OperationDefinition: function () {
          knownVariableNames = Object.create(null);
        },
        VariableDefinition: function (node) {
          var variableName = node.variable.name.value;
          if (knownVariableNames[variableName])
            context.reportError(
              new GraphQLError('There can be only one variable named "$'.concat(variableName, '".'), [
                knownVariableNames[variableName],
                node.variable.name,
              ])
            );
          else knownVariableNames[variableName] = node.variable.name;
        },
      };
    },
    function (context) {
      var variableNameDefined = Object.create(null);
      return {
        OperationDefinition: {
          enter: function () {
            variableNameDefined = Object.create(null);
          },
          leave: function (operation) {
            var usages = context.getRecursiveVariableUsages(operation);
            for (var _i2 = 0; _i2 < usages.length; _i2++) {
              var node = usages[_i2].node;
              var varName = node.name.value;
              if (true !== variableNameDefined[varName])
                context.reportError(
                  new GraphQLError(
                    operation.name
                      ? 'Variable "$'
                          .concat(varName, '" is not defined by operation "')
                          .concat(operation.name.value, '".')
                      : 'Variable "$'.concat(varName, '" is not defined.'),
                    [node, operation]
                  )
                );
            }
          },
        },
        VariableDefinition: function (node) {
          variableNameDefined[node.variable.name.value] = true;
        },
      };
    },
    function (context) {
      var variableDefs = [];
      return {
        OperationDefinition: {
          enter: function () {
            variableDefs = [];
          },
          leave: function (operation) {
            var variableNameUsed = Object.create(null);
            var usages = context.getRecursiveVariableUsages(operation);
            for (var _i2 = 0; _i2 < usages.length; _i2++) variableNameUsed[usages[_i2].node.name.value] = true;
            for (var _i4 = 0, _variableDefs2 = variableDefs; _i4 < _variableDefs2.length; _i4++) {
              var variableDef = _variableDefs2[_i4];
              var variableName = variableDef.variable.name.value;
              if (true !== variableNameUsed[variableName])
                context.reportError(
                  new GraphQLError(
                    operation.name
                      ? 'Variable "$'
                          .concat(variableName, '" is never used in operation "')
                          .concat(operation.name.value, '".')
                      : 'Variable "$'.concat(variableName, '" is never used.'),
                    variableDef
                  )
                );
            }
          },
        },
        VariableDefinition: function (def) {
          variableDefs.push(def);
        },
      };
    },
    KnownDirectivesRule,
    UniqueDirectivesPerLocationRule,
    function (context) {
      return _objectSpread(
        _objectSpread({}, KnownArgumentNamesOnDirectivesRule(context)),
        {},
        {
          Argument: function (argNode) {
            var argDef = context.getArgument();
            var fieldDef = context.getFieldDef();
            var parentType = context.getParentType();
            if (!argDef && fieldDef && parentType) {
              var argName = argNode.name.value;
              var suggestions = suggestionList(
                argName,
                fieldDef.args.map(function (arg) {
                  return arg.name;
                })
              );
              context.reportError(
                new GraphQLError(
                  'Unknown argument "'
                    .concat(argName, '" on field "')
                    .concat(parentType.name, '.')
                    .concat(fieldDef.name, '".') + didYouMean(suggestions),
                  argNode
                )
              );
            }
          },
        }
      );
    },
    UniqueArgumentNamesRule,
    function (context) {
      return {
        ListValue: function (node) {
          if (!definition_isListType(definition_getNullableType(context.getParentInputType()))) {
            isValidValueNode(context, node);
            return false;
          }
        },
        ObjectValue: function (node) {
          var type = definition_getNamedType(context.getInputType());
          if (!definition_isInputObjectType(type)) {
            isValidValueNode(context, node);
            return false;
          }
          var fieldNodeMap = keyMap(node.fields, function (field) {
            return field.name.value;
          });
          for (
            var _i2 = 0, _objectValues2 = polyfills_objectValues(type.getFields());
            _i2 < _objectValues2.length;
            _i2++
          ) {
            var fieldDef = _objectValues2[_i2];
            if (!fieldNodeMap[fieldDef.name] && isRequiredInputField(fieldDef)) {
              var typeStr = inspect_inspect(fieldDef.type);
              context.reportError(
                new GraphQLError(
                  'Field "'
                    .concat(type.name, '.')
                    .concat(fieldDef.name, '" of required type "')
                    .concat(typeStr, '" was not provided.'),
                  node
                )
              );
            }
          }
        },
        ObjectField: function (node) {
          var parentType = definition_getNamedType(context.getParentInputType());
          if (!context.getInputType() && definition_isInputObjectType(parentType)) {
            var suggestions = suggestionList(node.name.value, Object.keys(parentType.getFields()));
            context.reportError(
              new GraphQLError(
                'Field "'.concat(node.name.value, '" is not defined by type "').concat(parentType.name, '".') +
                  didYouMean(suggestions),
                node
              )
            );
          }
        },
        NullValue: function (node) {
          var type = context.getInputType();
          if (definition_isNonNullType(type))
            context.reportError(
              new GraphQLError(
                'Expected value of type "'.concat(inspect_inspect(type), '", found ').concat(printer_print(node), '.'),
                node
              )
            );
        },
        EnumValue: function (node) {
          return isValidValueNode(context, node);
        },
        IntValue: function (node) {
          return isValidValueNode(context, node);
        },
        FloatValue: function (node) {
          return isValidValueNode(context, node);
        },
        StringValue: function (node) {
          return isValidValueNode(context, node);
        },
        BooleanValue: function (node) {
          return isValidValueNode(context, node);
        },
      };
    },
    function (context) {
      return ProvidedRequiredArgumentsRule_objectSpread(
        ProvidedRequiredArgumentsRule_objectSpread({}, ProvidedRequiredArgumentsOnDirectivesRule(context)),
        {},
        {
          Field: {
            leave: function (fieldNode) {
              var _fieldNode$arguments;
              var fieldDef = context.getFieldDef();
              if (!fieldDef) return false;
              var argNodeMap = keyMap(
                null !== (_fieldNode$arguments = fieldNode.arguments) && void 0 !== _fieldNode$arguments
                  ? _fieldNode$arguments
                  : [],
                function (arg) {
                  return arg.name.value;
                }
              );
              for (var _i2 = 0, _fieldDef$args2 = fieldDef.args; _i2 < _fieldDef$args2.length; _i2++) {
                var argDef = _fieldDef$args2[_i2];
                if (!argNodeMap[argDef.name] && isRequiredArgument(argDef)) {
                  var argTypeStr = inspect_inspect(argDef.type);
                  context.reportError(
                    new GraphQLError(
                      'Field "'
                        .concat(fieldDef.name, '" argument "')
                        .concat(argDef.name, '" of type "')
                        .concat(argTypeStr, '" is required, but it was not provided.'),
                      fieldNode
                    )
                  );
                }
              }
            },
          },
        }
      );
    },
    function (context) {
      var varDefMap = Object.create(null);
      return {
        OperationDefinition: {
          enter: function () {
            varDefMap = Object.create(null);
          },
          leave: function (operation) {
            var usages = context.getRecursiveVariableUsages(operation);
            for (var _i2 = 0; _i2 < usages.length; _i2++) {
              var _ref2 = usages[_i2];
              var node = _ref2.node;
              var type = _ref2.type;
              var defaultValue = _ref2.defaultValue;
              var varName = node.name.value;
              var varDef = varDefMap[varName];
              if (varDef && type) {
                var schema = context.getSchema();
                var varType = typeFromAST_typeFromAST(schema, varDef.type);
                if (varType && !allowedVariableUsage(schema, varType, varDef.defaultValue, type, defaultValue)) {
                  var varTypeStr = inspect_inspect(varType);
                  var typeStr = inspect_inspect(type);
                  context.reportError(
                    new GraphQLError(
                      'Variable "$'
                        .concat(varName, '" of type "')
                        .concat(varTypeStr, '" used in position expecting type "')
                        .concat(typeStr, '".'),
                      [varDef, node]
                    )
                  );
                }
              }
            }
          },
        },
        VariableDefinition: function (node) {
          varDefMap[node.variable.name.value] = node;
        },
      };
    },
    function (context) {
      var comparedFragmentPairs = new PairSet();
      var cachedFieldsAndFragmentNames = new Map();
      return {
        SelectionSet: function (selectionSet) {
          var conflicts = findConflictsWithinSelectionSet(
            context,
            cachedFieldsAndFragmentNames,
            comparedFragmentPairs,
            context.getParentType(),
            selectionSet
          );
          for (var _i2 = 0; _i2 < conflicts.length; _i2++) {
            var _ref3 = conflicts[_i2];
            var _ref2$ = _ref3[0];
            var responseName = _ref2$[0];
            var reason = _ref2$[1];
            var fields1 = _ref3[1];
            var fields2 = _ref3[2];
            var reasonMsg = reasonMessage(reason);
            context.reportError(
              new GraphQLError(
                'Fields "'
                  .concat(responseName, '" conflict because ')
                  .concat(reasonMsg, '. Use different aliases on the fields to fetch both if this was intentional.'),
                fields1.concat(fields2)
              )
            );
          }
        },
      };
    },
    UniqueInputFieldNamesRule,
  ]);
  var specifiedSDLRules = Object.freeze([
    function (context) {
      var _ref, _ref2, _oldSchema$astNode;
      var oldSchema = context.getSchema();
      var alreadyDefined =
        null !==
          (_ref =
            null !==
              (_ref2 =
                null !== (_oldSchema$astNode = null == oldSchema ? void 0 : oldSchema.astNode) &&
                void 0 !== _oldSchema$astNode
                  ? _oldSchema$astNode
                  : null == oldSchema
                  ? void 0
                  : oldSchema.getQueryType()) && void 0 !== _ref2
              ? _ref2
              : null == oldSchema
              ? void 0
              : oldSchema.getMutationType()) && void 0 !== _ref
          ? _ref
          : null == oldSchema
          ? void 0
          : oldSchema.getSubscriptionType();
      var schemaDefinitionsCount = 0;
      return {
        SchemaDefinition: function (node) {
          if (alreadyDefined) {
            context.reportError(new GraphQLError('Cannot define a new schema within a schema extension.', node));
            return;
          }
          if (schemaDefinitionsCount > 0)
            context.reportError(new GraphQLError('Must provide only one schema definition.', node));
          ++schemaDefinitionsCount;
        },
      };
    },
    function (context) {
      var schema = context.getSchema();
      var definedOperationTypes = Object.create(null);
      var existingOperationTypes = schema
        ? {
            query: schema.getQueryType(),
            mutation: schema.getMutationType(),
            subscription: schema.getSubscriptionType(),
          }
        : {};
      return {
        SchemaDefinition: checkOperationTypes,
        SchemaExtension: checkOperationTypes,
      };
      function checkOperationTypes(node) {
        var _node$operationTypes;
        var operationTypesNodes =
          null !== (_node$operationTypes = node.operationTypes) && void 0 !== _node$operationTypes
            ? _node$operationTypes
            : [];
        for (var _i2 = 0; _i2 < operationTypesNodes.length; _i2++) {
          var operationType = operationTypesNodes[_i2];
          var operation = operationType.operation;
          var alreadyDefinedOperationType = definedOperationTypes[operation];
          if (existingOperationTypes[operation])
            context.reportError(
              new GraphQLError(
                'Type for '.concat(operation, ' already defined in the schema. It cannot be redefined.'),
                operationType
              )
            );
          else if (alreadyDefinedOperationType)
            context.reportError(
              new GraphQLError('There can be only one '.concat(operation, ' type in schema.'), [
                alreadyDefinedOperationType,
                operationType,
              ])
            );
          else definedOperationTypes[operation] = operationType;
        }
        return false;
      }
    },
    function (context) {
      var knownTypeNames = Object.create(null);
      var schema = context.getSchema();
      return {
        ScalarTypeDefinition: checkTypeName,
        ObjectTypeDefinition: checkTypeName,
        InterfaceTypeDefinition: checkTypeName,
        UnionTypeDefinition: checkTypeName,
        EnumTypeDefinition: checkTypeName,
        InputObjectTypeDefinition: checkTypeName,
      };
      function checkTypeName(node) {
        var typeName = node.name.value;
        if (null != schema && schema.getType(typeName)) {
          context.reportError(
            new GraphQLError(
              'Type "'.concat(
                typeName,
                '" already exists in the schema. It cannot also be defined in this type definition.'
              ),
              node.name
            )
          );
          return;
        }
        if (knownTypeNames[typeName])
          context.reportError(
            new GraphQLError('There can be only one type named "'.concat(typeName, '".'), [
              knownTypeNames[typeName],
              node.name,
            ])
          );
        else knownTypeNames[typeName] = node.name;
        return false;
      }
    },
    function (context) {
      var schema = context.getSchema();
      var existingTypeMap = schema ? schema.getTypeMap() : Object.create(null);
      var knownValueNames = Object.create(null);
      return {
        EnumTypeDefinition: checkValueUniqueness,
        EnumTypeExtension: checkValueUniqueness,
      };
      function checkValueUniqueness(node) {
        var _node$values;
        var typeName = node.name.value;
        if (!knownValueNames[typeName]) knownValueNames[typeName] = Object.create(null);
        var valueNodes = null !== (_node$values = node.values) && void 0 !== _node$values ? _node$values : [];
        var valueNames = knownValueNames[typeName];
        for (var _i2 = 0; _i2 < valueNodes.length; _i2++) {
          var valueDef = valueNodes[_i2];
          var valueName = valueDef.name.value;
          var existingType = existingTypeMap[typeName];
          if (definition_isEnumType(existingType) && existingType.getValue(valueName))
            context.reportError(
              new GraphQLError(
                'Enum value "'
                  .concat(typeName, '.')
                  .concat(
                    valueName,
                    '" already exists in the schema. It cannot also be defined in this type extension.'
                  ),
                valueDef.name
              )
            );
          else if (valueNames[valueName])
            context.reportError(
              new GraphQLError('Enum value "'.concat(typeName, '.').concat(valueName, '" can only be defined once.'), [
                valueNames[valueName],
                valueDef.name,
              ])
            );
          else valueNames[valueName] = valueDef.name;
        }
        return false;
      }
    },
    function (context) {
      var schema = context.getSchema();
      var existingTypeMap = schema ? schema.getTypeMap() : Object.create(null);
      var knownFieldNames = Object.create(null);
      return {
        InputObjectTypeDefinition: checkFieldUniqueness,
        InputObjectTypeExtension: checkFieldUniqueness,
        InterfaceTypeDefinition: checkFieldUniqueness,
        InterfaceTypeExtension: checkFieldUniqueness,
        ObjectTypeDefinition: checkFieldUniqueness,
        ObjectTypeExtension: checkFieldUniqueness,
      };
      function checkFieldUniqueness(node) {
        var _node$fields;
        var typeName = node.name.value;
        if (!knownFieldNames[typeName]) knownFieldNames[typeName] = Object.create(null);
        var fieldNodes = null !== (_node$fields = node.fields) && void 0 !== _node$fields ? _node$fields : [];
        var fieldNames = knownFieldNames[typeName];
        for (var _i2 = 0; _i2 < fieldNodes.length; _i2++) {
          var fieldDef = fieldNodes[_i2];
          var fieldName = fieldDef.name.value;
          if (hasField(existingTypeMap[typeName], fieldName))
            context.reportError(
              new GraphQLError(
                'Field "'
                  .concat(typeName, '.')
                  .concat(
                    fieldName,
                    '" already exists in the schema. It cannot also be defined in this type extension.'
                  ),
                fieldDef.name
              )
            );
          else if (fieldNames[fieldName])
            context.reportError(
              new GraphQLError('Field "'.concat(typeName, '.').concat(fieldName, '" can only be defined once.'), [
                fieldNames[fieldName],
                fieldDef.name,
              ])
            );
          else fieldNames[fieldName] = fieldDef.name;
        }
        return false;
      }
    },
    function (context) {
      var knownDirectiveNames = Object.create(null);
      var schema = context.getSchema();
      return {
        DirectiveDefinition: function (node) {
          var directiveName = node.name.value;
          if (null != schema && schema.getDirective(directiveName)) {
            context.reportError(
              new GraphQLError(
                'Directive "@'.concat(directiveName, '" already exists in the schema. It cannot be redefined.'),
                node.name
              )
            );
            return;
          }
          if (knownDirectiveNames[directiveName])
            context.reportError(
              new GraphQLError('There can be only one directive named "@'.concat(directiveName, '".'), [
                knownDirectiveNames[directiveName],
                node.name,
              ])
            );
          else knownDirectiveNames[directiveName] = node.name;
          return false;
        },
      };
    },
    KnownTypeNamesRule,
    KnownDirectivesRule,
    UniqueDirectivesPerLocationRule,
    function (context) {
      var schema = context.getSchema();
      var definedTypes = Object.create(null);
      for (
        var _i2 = 0, _context$getDocument$2 = context.getDocument().definitions;
        _i2 < _context$getDocument$2.length;
        _i2++
      ) {
        var def = _context$getDocument$2[_i2];
        if (isTypeDefinitionNode(def)) definedTypes[def.name.value] = def;
      }
      return {
        ScalarTypeExtension: checkExtension,
        ObjectTypeExtension: checkExtension,
        InterfaceTypeExtension: checkExtension,
        UnionTypeExtension: checkExtension,
        EnumTypeExtension: checkExtension,
        InputObjectTypeExtension: checkExtension,
      };
      function checkExtension(node) {
        var typeName = node.name.value;
        var defNode = definedTypes[typeName];
        var existingType = null == schema ? void 0 : schema.getType(typeName);
        var expectedKind;
        if (defNode) expectedKind = defKindToExtKind[defNode.kind];
        else if (existingType) expectedKind = typeToExtKind(existingType);
        if (expectedKind) {
          if (expectedKind !== node.kind) {
            var kindStr = extensionKindToTypeName(node.kind);
            context.reportError(
              new GraphQLError(
                'Cannot extend non-'.concat(kindStr, ' type "').concat(typeName, '".'),
                defNode ? [defNode, node] : node
              )
            );
          }
        } else {
          var allTypeNames = Object.keys(definedTypes);
          if (schema) allTypeNames = allTypeNames.concat(Object.keys(schema.getTypeMap()));
          var suggestedTypes = suggestionList(typeName, allTypeNames);
          context.reportError(
            new GraphQLError(
              'Cannot extend type "'.concat(typeName, '" because it is not defined.') + didYouMean(suggestedTypes),
              node.name
            )
          );
        }
      }
    },
    KnownArgumentNamesOnDirectivesRule,
    UniqueArgumentNamesRule,
    UniqueInputFieldNamesRule,
    ProvidedRequiredArgumentsOnDirectivesRule,
  ]);
  function _inheritsLoose(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    subClass.__proto__ = superClass;
  }
  var ASTValidationContext = (function () {
    function ASTValidationContext(ast, onError) {
      this._ast = ast;
      this._fragments = void 0;
      this._fragmentSpreads = new Map();
      this._recursivelyReferencedFragments = new Map();
      this._onError = onError;
    }
    var _proto = ASTValidationContext.prototype;
    _proto.reportError = function (error) {
      this._onError(error);
    };
    _proto.getDocument = function () {
      return this._ast;
    };
    _proto.getFragment = function (name) {
      var fragments = this._fragments;
      if (!fragments)
        this._fragments = fragments = this.getDocument().definitions.reduce(function (frags, statement) {
          if (statement.kind === kinds_Kind.FRAGMENT_DEFINITION) frags[statement.name.value] = statement;
          return frags;
        }, Object.create(null));
      return fragments[name];
    };
    _proto.getFragmentSpreads = function (node) {
      var spreads = this._fragmentSpreads.get(node);
      if (!spreads) {
        spreads = [];
        var setsToVisit = [node];
        while (0 !== setsToVisit.length)
          for (var _i2 = 0, _set$selections2 = setsToVisit.pop().selections; _i2 < _set$selections2.length; _i2++) {
            var selection = _set$selections2[_i2];
            if (selection.kind === kinds_Kind.FRAGMENT_SPREAD) spreads.push(selection);
            else if (selection.selectionSet) setsToVisit.push(selection.selectionSet);
          }
        this._fragmentSpreads.set(node, spreads);
      }
      return spreads;
    };
    _proto.getRecursivelyReferencedFragments = function (operation) {
      var fragments = this._recursivelyReferencedFragments.get(operation);
      if (!fragments) {
        fragments = [];
        var collectedNames = Object.create(null);
        var nodesToVisit = [operation.selectionSet];
        while (0 !== nodesToVisit.length) {
          var node = nodesToVisit.pop();
          for (
            var _i4 = 0, _this$getFragmentSpre2 = this.getFragmentSpreads(node);
            _i4 < _this$getFragmentSpre2.length;
            _i4++
          ) {
            var fragName = _this$getFragmentSpre2[_i4].name.value;
            if (true !== collectedNames[fragName]) {
              collectedNames[fragName] = true;
              var fragment = this.getFragment(fragName);
              if (fragment) {
                fragments.push(fragment);
                nodesToVisit.push(fragment.selectionSet);
              }
            }
          }
        }
        this._recursivelyReferencedFragments.set(operation, fragments);
      }
      return fragments;
    };
    return ASTValidationContext;
  })();
  var SDLValidationContext = (function (_ASTValidationContext) {
    _inheritsLoose(SDLValidationContext, _ASTValidationContext);
    function SDLValidationContext(ast, schema, onError) {
      var _this;
      (_this = _ASTValidationContext.call(this, ast, onError) || this)._schema = schema;
      return _this;
    }
    SDLValidationContext.prototype.getSchema = function () {
      return this._schema;
    };
    return SDLValidationContext;
  })(ASTValidationContext);
  var ValidationContext = (function (_ASTValidationContext2) {
    _inheritsLoose(ValidationContext, _ASTValidationContext2);
    function ValidationContext(schema, ast, typeInfo, onError) {
      var _this2;
      (_this2 = _ASTValidationContext2.call(this, ast, onError) || this)._schema = schema;
      _this2._typeInfo = typeInfo;
      _this2._variableUsages = new Map();
      _this2._recursiveVariableUsages = new Map();
      return _this2;
    }
    var _proto3 = ValidationContext.prototype;
    _proto3.getSchema = function () {
      return this._schema;
    };
    _proto3.getVariableUsages = function (node) {
      var usages = this._variableUsages.get(node);
      if (!usages) {
        var newUsages = [];
        var typeInfo = new TypeInfo_TypeInfo(this._schema);
        visitor_visit(
          node,
          TypeInfo_visitWithTypeInfo(typeInfo, {
            VariableDefinition: function () {
              return false;
            },
            Variable: function (variable) {
              newUsages.push({
                node: variable,
                type: typeInfo.getInputType(),
                defaultValue: typeInfo.getDefaultValue(),
              });
            },
          })
        );
        usages = newUsages;
        this._variableUsages.set(node, usages);
      }
      return usages;
    };
    _proto3.getRecursiveVariableUsages = function (operation) {
      var usages = this._recursiveVariableUsages.get(operation);
      if (!usages) {
        usages = this.getVariableUsages(operation);
        for (
          var _i6 = 0, _this$getRecursivelyR2 = this.getRecursivelyReferencedFragments(operation);
          _i6 < _this$getRecursivelyR2.length;
          _i6++
        ) {
          var frag = _this$getRecursivelyR2[_i6];
          usages = usages.concat(this.getVariableUsages(frag));
        }
        this._recursiveVariableUsages.set(operation, usages);
      }
      return usages;
    };
    _proto3.getType = function () {
      return this._typeInfo.getType();
    };
    _proto3.getParentType = function () {
      return this._typeInfo.getParentType();
    };
    _proto3.getInputType = function () {
      return this._typeInfo.getInputType();
    };
    _proto3.getParentInputType = function () {
      return this._typeInfo.getParentInputType();
    };
    _proto3.getFieldDef = function () {
      return this._typeInfo.getFieldDef();
    };
    _proto3.getDirective = function () {
      return this._typeInfo.getDirective();
    };
    _proto3.getArgument = function () {
      return this._typeInfo.getArgument();
    };
    _proto3.getEnumValue = function () {
      return this._typeInfo.getEnumValue();
    };
    return ValidationContext;
  })(ASTValidationContext);
  function validate_validate(schema, documentAST) {
    var rules = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : specifiedRules_specifiedRules;
    var typeInfo = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : new TypeInfo_TypeInfo(schema);
    var options =
      arguments.length > 4 && void 0 !== arguments[4]
        ? arguments[4]
        : {
            maxErrors: void 0,
          };
    documentAST || devAssert(0, 'Must provide document.');
    assertValidSchema(schema);
    var abortObj = Object.freeze({});
    var errors = [];
    var context = new ValidationContext(schema, documentAST, typeInfo, function (error) {
      if (null != options.maxErrors && errors.length >= options.maxErrors) {
        errors.push(new GraphQLError('Too many validation errors, error limit reached. Validation aborted.'));
        throw abortObj;
      }
      errors.push(error);
    });
    var visitor = visitInParallel(
      rules.map(function (rule) {
        return rule(context);
      })
    );
    try {
      visitor_visit(documentAST, TypeInfo_visitWithTypeInfo(typeInfo, visitor));
    } catch (e) {
      if (e !== abortObj) throw e;
    }
    return errors;
  }
  function validateSDL(documentAST, schemaToExtend) {
    var rules = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : specifiedSDLRules;
    var errors = [];
    var context = new SDLValidationContext(documentAST, schemaToExtend, function (error) {
      errors.push(error);
    });
    var visitors = rules.map(function (rule) {
      return rule(context);
    });
    visitor_visit(documentAST, visitInParallel(visitors));
    return errors;
  }
  function assertValidSDL(documentAST) {
    var errors = validateSDL(documentAST);
    if (0 !== errors.length)
      throw new Error(
        errors
          .map(function (error) {
            return error.message;
          })
          .join('\n\n')
      );
  }
  function assertValidSDLExtension(documentAST, schema) {
    var errors = validateSDL(documentAST, schema);
    if (0 !== errors.length)
      throw new Error(
        errors
          .map(function (error) {
            return error.message;
          })
          .join('\n\n')
      );
  }
  function printPathArray(path) {
    return path
      .map(function (key) {
        return 'number' == typeof key ? '[' + key.toString() + ']' : '.' + key;
      })
      .join('');
  }
  function valueFromAST_valueFromAST(valueNode, type, variables) {
    if (!valueNode) return;
    if (valueNode.kind === kinds_Kind.VARIABLE) {
      var variableName = valueNode.name.value;
      if (null == variables || void 0 === variables[variableName]) return;
      var variableValue = variables[variableName];
      if (null === variableValue && definition_isNonNullType(type)) return;
      return variableValue;
    }
    if (definition_isNonNullType(type)) {
      if (valueNode.kind === kinds_Kind.NULL) return;
      return valueFromAST_valueFromAST(valueNode, type.ofType, variables);
    }
    if (valueNode.kind === kinds_Kind.NULL) return null;
    if (definition_isListType(type)) {
      var itemType = type.ofType;
      if (valueNode.kind === kinds_Kind.LIST) {
        var coercedValues = [];
        for (var _i2 = 0, _valueNode$values2 = valueNode.values; _i2 < _valueNode$values2.length; _i2++) {
          var itemNode = _valueNode$values2[_i2];
          if (isMissingVariable(itemNode, variables)) {
            if (definition_isNonNullType(itemType)) return;
            coercedValues.push(null);
          } else {
            var itemValue = valueFromAST_valueFromAST(itemNode, itemType, variables);
            if (void 0 === itemValue) return;
            coercedValues.push(itemValue);
          }
        }
        return coercedValues;
      }
      var coercedValue = valueFromAST_valueFromAST(valueNode, itemType, variables);
      if (void 0 === coercedValue) return;
      return [coercedValue];
    }
    if (definition_isInputObjectType(type)) {
      if (valueNode.kind !== kinds_Kind.OBJECT) return;
      var coercedObj = Object.create(null);
      var fieldNodes = keyMap(valueNode.fields, function (field) {
        return field.name.value;
      });
      for (var _i4 = 0, _objectValues2 = polyfills_objectValues(type.getFields()); _i4 < _objectValues2.length; _i4++) {
        var field = _objectValues2[_i4];
        var fieldNode = fieldNodes[field.name];
        if (!fieldNode || isMissingVariable(fieldNode.value, variables)) {
          if (void 0 !== field.defaultValue) coercedObj[field.name] = field.defaultValue;
          else if (definition_isNonNullType(field.type)) return;
          continue;
        }
        var fieldValue = valueFromAST_valueFromAST(fieldNode.value, field.type, variables);
        if (void 0 === fieldValue) return;
        coercedObj[field.name] = fieldValue;
      }
      return coercedObj;
    }
    if (definition_isLeafType(type)) {
      var result;
      try {
        result = type.parseLiteral(valueNode, variables);
      } catch (_error) {
        return;
      }
      if (void 0 === result) return;
      return result;
    }
    invariant(0, 'Unexpected input type: ' + inspect_inspect(type));
  }
  function isMissingVariable(valueNode, variables) {
    return valueNode.kind === kinds_Kind.VARIABLE && (null == variables || void 0 === variables[valueNode.name.value]);
  }
  function addPath(prev, key, typename) {
    return {
      prev,
      key,
      typename,
    };
  }
  function pathToArray(path) {
    var flattened = [];
    var curr = path;
    while (curr) {
      flattened.push(curr.key);
      curr = curr.prev;
    }
    return flattened.reverse();
  }
  function coerceInputValue(inputValue, type) {
    var onError = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : defaultOnError;
    return coerceInputValueImpl(inputValue, type, onError);
  }
  function defaultOnError(path, invalidValue, error) {
    var errorPrefix = 'Invalid value ' + inspect_inspect(invalidValue);
    if (path.length > 0) errorPrefix += ' at "value'.concat(printPathArray(path), '"');
    error.message = errorPrefix + ': ' + error.message;
    throw error;
  }
  function coerceInputValueImpl(inputValue, type, onError, path) {
    if (definition_isNonNullType(type)) {
      if (null != inputValue) return coerceInputValueImpl(inputValue, type.ofType, onError, path);
      onError(
        pathToArray(path),
        inputValue,
        new GraphQLError('Expected non-nullable type "'.concat(inspect_inspect(type), '" not to be null.'))
      );
      return;
    }
    if (null == inputValue) return null;
    if (definition_isListType(type)) {
      var itemType = type.ofType;
      var coercedList = safeArrayFrom(inputValue, function (itemValue, index) {
        var itemPath = addPath(path, index, void 0);
        return coerceInputValueImpl(itemValue, itemType, onError, itemPath);
      });
      if (null != coercedList) return coercedList;
      return [coerceInputValueImpl(inputValue, itemType, onError, path)];
    }
    if (definition_isInputObjectType(type)) {
      if (!isObjectLike(inputValue)) {
        onError(
          pathToArray(path),
          inputValue,
          new GraphQLError('Expected type "'.concat(type.name, '" to be an object.'))
        );
        return;
      }
      var coercedValue = {};
      var fieldDefs = type.getFields();
      for (var _i2 = 0, _objectValues2 = polyfills_objectValues(fieldDefs); _i2 < _objectValues2.length; _i2++) {
        var field = _objectValues2[_i2];
        var fieldValue = inputValue[field.name];
        if (void 0 === fieldValue) {
          if (void 0 !== field.defaultValue) coercedValue[field.name] = field.defaultValue;
          else if (definition_isNonNullType(field.type)) {
            var typeStr = inspect_inspect(field.type);
            onError(
              pathToArray(path),
              inputValue,
              new GraphQLError(
                'Field "'.concat(field.name, '" of required type "').concat(typeStr, '" was not provided.')
              )
            );
          }
          continue;
        }
        coercedValue[field.name] = coerceInputValueImpl(
          fieldValue,
          field.type,
          onError,
          addPath(path, field.name, type.name)
        );
      }
      for (var _i4 = 0, _Object$keys2 = Object.keys(inputValue); _i4 < _Object$keys2.length; _i4++) {
        var fieldName = _Object$keys2[_i4];
        if (!fieldDefs[fieldName]) {
          var suggestions = suggestionList(fieldName, Object.keys(type.getFields()));
          onError(
            pathToArray(path),
            inputValue,
            new GraphQLError(
              'Field "'.concat(fieldName, '" is not defined by type "').concat(type.name, '".') +
                didYouMean(suggestions)
            )
          );
        }
      }
      return coercedValue;
    }
    if (definition_isLeafType(type)) {
      var parseResult;
      try {
        parseResult = type.parseValue(inputValue);
      } catch (error) {
        if (error instanceof GraphQLError) onError(pathToArray(path), inputValue, error);
        else
          onError(
            pathToArray(path),
            inputValue,
            new GraphQLError(
              'Expected type "'.concat(type.name, '". ') + error.message,
              void 0,
              void 0,
              void 0,
              void 0,
              error
            )
          );
        return;
      }
      if (void 0 === parseResult)
        onError(pathToArray(path), inputValue, new GraphQLError('Expected type "'.concat(type.name, '".')));
      return parseResult;
    }
    invariant(0, 'Unexpected input type: ' + inspect_inspect(type));
  }
  function getVariableValues(schema, varDefNodes, inputs, options) {
    var errors = [];
    var maxErrors = null == options ? void 0 : options.maxErrors;
    try {
      var coerced = coerceVariableValues(schema, varDefNodes, inputs, function (error) {
        if (null != maxErrors && errors.length >= maxErrors)
          throw new GraphQLError('Too many errors processing variables, error limit reached. Execution aborted.');
        errors.push(error);
      });
      if (0 === errors.length)
        return {
          coerced,
        };
    } catch (error) {
      errors.push(error);
    }
    return {
      errors,
    };
  }
  function coerceVariableValues(schema, varDefNodes, inputs, onError) {
    var coercedValues = {};
    var _loop = function (_i2) {
      var varDefNode = varDefNodes[_i2];
      var varName = varDefNode.variable.name.value;
      var varType = typeFromAST_typeFromAST(schema, varDefNode.type);
      if (!definition_isInputType(varType)) {
        var varTypeStr = printer_print(varDefNode.type);
        onError(
          new GraphQLError(
            'Variable "$'
              .concat(varName, '" expected value of type "')
              .concat(varTypeStr, '" which cannot be used as an input type.'),
            varDefNode.type
          )
        );
        return 'continue';
      }
      if (!values_hasOwnProperty(inputs, varName)) {
        if (varDefNode.defaultValue)
          coercedValues[varName] = valueFromAST_valueFromAST(varDefNode.defaultValue, varType);
        else if (definition_isNonNullType(varType)) {
          var _varTypeStr = inspect_inspect(varType);
          onError(
            new GraphQLError(
              'Variable "$'.concat(varName, '" of required type "').concat(_varTypeStr, '" was not provided.'),
              varDefNode
            )
          );
        }
        return 'continue';
      }
      var value = inputs[varName];
      if (null === value && definition_isNonNullType(varType)) {
        var _varTypeStr2 = inspect_inspect(varType);
        onError(
          new GraphQLError(
            'Variable "$'.concat(varName, '" of non-null type "').concat(_varTypeStr2, '" must not be null.'),
            varDefNode
          )
        );
        return 'continue';
      }
      coercedValues[varName] = coerceInputValue(value, varType, function (path, invalidValue, error) {
        var prefix = 'Variable "$'.concat(varName, '" got invalid value ') + inspect_inspect(invalidValue);
        if (path.length > 0) prefix += ' at "'.concat(varName).concat(printPathArray(path), '"');
        onError(
          new GraphQLError(prefix + '; ' + error.message, varDefNode, void 0, void 0, void 0, error.originalError)
        );
      });
    };
    for (var _i2 = 0; _i2 < varDefNodes.length; _i2++) if ('continue' === _loop(_i2)) continue;
    return coercedValues;
  }
  function values_getArgumentValues(def, node, variableValues) {
    var _node$arguments;
    var coercedValues = {};
    var argNodeMap = keyMap(
      null !== (_node$arguments = node.arguments) && void 0 !== _node$arguments ? _node$arguments : [],
      function (arg) {
        return arg.name.value;
      }
    );
    for (var _i4 = 0, _def$args2 = def.args; _i4 < _def$args2.length; _i4++) {
      var argDef = _def$args2[_i4];
      var name = argDef.name;
      var argType = argDef.type;
      var argumentNode = argNodeMap[name];
      if (!argumentNode) {
        if (void 0 !== argDef.defaultValue) coercedValues[name] = argDef.defaultValue;
        else if (definition_isNonNullType(argType))
          throw new GraphQLError(
            'Argument "'.concat(name, '" of required type "').concat(inspect_inspect(argType), '" ') +
              'was not provided.',
            node
          );
        continue;
      }
      var valueNode = argumentNode.value;
      var isNull = valueNode.kind === kinds_Kind.NULL;
      if (valueNode.kind === kinds_Kind.VARIABLE) {
        var variableName = valueNode.name.value;
        if (null == variableValues || !values_hasOwnProperty(variableValues, variableName)) {
          if (void 0 !== argDef.defaultValue) coercedValues[name] = argDef.defaultValue;
          else if (definition_isNonNullType(argType))
            throw new GraphQLError(
              'Argument "'.concat(name, '" of required type "').concat(inspect_inspect(argType), '" ') +
                'was provided the variable "$'.concat(variableName, '" which was not provided a runtime value.'),
              valueNode
            );
          continue;
        }
        isNull = null == variableValues[variableName];
      }
      if (isNull && definition_isNonNullType(argType))
        throw new GraphQLError(
          'Argument "'.concat(name, '" of non-null type "').concat(inspect_inspect(argType), '" ') +
            'must not be null.',
          valueNode
        );
      var coercedValue = valueFromAST_valueFromAST(valueNode, argType, variableValues);
      if (void 0 === coercedValue)
        throw new GraphQLError(
          'Argument "'.concat(name, '" has invalid value ').concat(printer_print(valueNode), '.'),
          valueNode
        );
      coercedValues[name] = coercedValue;
    }
    return coercedValues;
  }
  function getDirectiveValues(directiveDef, node, variableValues) {
    var directiveNode =
      node.directives &&
      polyfills_find(node.directives, function (directive) {
        return directive.name.value === directiveDef.name;
      });
    if (directiveNode) return values_getArgumentValues(directiveDef, directiveNode, variableValues);
  }
  function values_hasOwnProperty(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  }
  function extendSchema_ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);
    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);
      if (enumerableOnly)
        symbols = symbols.filter(function (sym) {
          return Object.getOwnPropertyDescriptor(object, sym).enumerable;
        });
      keys.push.apply(keys, symbols);
    }
    return keys;
  }
  function extendSchema_objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = null != arguments[i] ? arguments[i] : {};
      if (i % 2)
        extendSchema_ownKeys(Object(source), true).forEach(function (key) {
          extendSchema_defineProperty(target, key, source[key]);
        });
      else if (Object.getOwnPropertyDescriptors)
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
      else
        extendSchema_ownKeys(Object(source)).forEach(function (key) {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
    }
    return target;
  }
  function extendSchema_defineProperty(obj, key, value) {
    if (key in obj)
      Object.defineProperty(obj, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    else obj[key] = value;
    return obj;
  }
  function extendSchema(schema, documentAST, options) {
    assertSchema(schema);
    (null != documentAST && documentAST.kind === kinds_Kind.DOCUMENT) ||
      devAssert(0, 'Must provide valid Document AST.');
    if (
      true !== (null == options ? void 0 : options.assumeValid) &&
      true !== (null == options ? void 0 : options.assumeValidSDL)
    )
      assertValidSDLExtension(documentAST, schema);
    var schemaConfig = schema.toConfig();
    var extendedConfig = extendSchemaImpl(schemaConfig, documentAST, options);
    return schemaConfig === extendedConfig ? schema : new schema_GraphQLSchema(extendedConfig);
  }
  function extendSchemaImpl(schemaConfig, documentAST, options) {
    var _schemaDef, _schemaDef$descriptio, _schemaDef2, _options$assumeValid;
    var typeDefs = [];
    var typeExtensionsMap = Object.create(null);
    var directiveDefs = [];
    var schemaDef;
    var schemaExtensions = [];
    for (var _i2 = 0, _documentAST$definiti2 = documentAST.definitions; _i2 < _documentAST$definiti2.length; _i2++) {
      var def = _documentAST$definiti2[_i2];
      if (def.kind === kinds_Kind.SCHEMA_DEFINITION) schemaDef = def;
      else if (def.kind === kinds_Kind.SCHEMA_EXTENSION) schemaExtensions.push(def);
      else if (isTypeDefinitionNode(def)) typeDefs.push(def);
      else if (isTypeExtensionNode(def)) {
        var extendedTypeName = def.name.value;
        var existingTypeExtensions = typeExtensionsMap[extendedTypeName];
        typeExtensionsMap[extendedTypeName] = existingTypeExtensions ? existingTypeExtensions.concat([def]) : [def];
      } else if (def.kind === kinds_Kind.DIRECTIVE_DEFINITION) directiveDefs.push(def);
    }
    if (
      0 === Object.keys(typeExtensionsMap).length &&
      0 === typeDefs.length &&
      0 === directiveDefs.length &&
      0 === schemaExtensions.length &&
      null == schemaDef
    )
      return schemaConfig;
    var typeMap = Object.create(null);
    for (var _i4 = 0, _schemaConfig$types2 = schemaConfig.types; _i4 < _schemaConfig$types2.length; _i4++) {
      var existingType = _schemaConfig$types2[_i4];
      typeMap[existingType.name] = extendNamedType(existingType);
    }
    for (var _i6 = 0; _i6 < typeDefs.length; _i6++) {
      var _stdTypeMap$name;
      var typeNode = typeDefs[_i6];
      var name = typeNode.name.value;
      typeMap[name] =
        null !== (_stdTypeMap$name = stdTypeMap[name]) && void 0 !== _stdTypeMap$name
          ? _stdTypeMap$name
          : buildType(typeNode);
    }
    var operationTypes = extendSchema_objectSpread(
      extendSchema_objectSpread(
        {
          query: schemaConfig.query && replaceNamedType(schemaConfig.query),
          mutation: schemaConfig.mutation && replaceNamedType(schemaConfig.mutation),
          subscription: schemaConfig.subscription && replaceNamedType(schemaConfig.subscription),
        },
        schemaDef && getOperationTypes([schemaDef])
      ),
      getOperationTypes(schemaExtensions)
    );
    return extendSchema_objectSpread(
      extendSchema_objectSpread(
        {
          description:
            null === (_schemaDef = schemaDef) || void 0 === _schemaDef
              ? void 0
              : null === (_schemaDef$descriptio = _schemaDef.description) || void 0 === _schemaDef$descriptio
              ? void 0
              : _schemaDef$descriptio.value,
        },
        operationTypes
      ),
      {},
      {
        types: polyfills_objectValues(typeMap),
        directives: [].concat(
          schemaConfig.directives.map(function (directive) {
            var config = directive.toConfig();
            return new GraphQLDirective(
              extendSchema_objectSpread(
                extendSchema_objectSpread({}, config),
                {},
                {
                  args: mapValue(config.args, extendArg),
                }
              )
            );
          }),
          directiveDefs.map(function (node) {
            var locations = node.locations.map(function (_ref) {
              return _ref.value;
            });
            return new GraphQLDirective({
              name: node.name.value,
              description: getDescription(node, options),
              locations,
              isRepeatable: node.repeatable,
              args: buildArgumentMap(node.arguments),
              astNode: node,
            });
          })
        ),
        extensions: void 0,
        astNode: null !== (_schemaDef2 = schemaDef) && void 0 !== _schemaDef2 ? _schemaDef2 : schemaConfig.astNode,
        extensionASTNodes: schemaConfig.extensionASTNodes.concat(schemaExtensions),
        assumeValid:
          null !== (_options$assumeValid = null == options ? void 0 : options.assumeValid) &&
          void 0 !== _options$assumeValid
            ? _options$assumeValid
            : false,
      }
    );
    function replaceType(type) {
      if (definition_isListType(type)) return new GraphQLList(replaceType(type.ofType));
      if (definition_isNonNullType(type)) return new GraphQLNonNull(replaceType(type.ofType));
      return replaceNamedType(type);
    }
    function replaceNamedType(type) {
      return typeMap[type.name];
    }
    function extendNamedType(type) {
      if (introspection_isIntrospectionType(type) || scalars_isSpecifiedScalarType(type)) return type;
      if (definition_isScalarType(type)) return extendScalarType(type);
      if (definition_isObjectType(type)) return extendObjectType(type);
      if (definition_isInterfaceType(type)) return extendInterfaceType(type);
      if (definition_isUnionType(type)) return extendUnionType(type);
      if (definition_isEnumType(type)) return extendEnumType(type);
      if (definition_isInputObjectType(type)) return extendInputObjectType(type);
      invariant(0, 'Unexpected type: ' + inspect_inspect(type));
    }
    function extendInputObjectType(type) {
      var _typeExtensionsMap$co;
      var config = type.toConfig();
      var extensions =
        null !== (_typeExtensionsMap$co = typeExtensionsMap[config.name]) && void 0 !== _typeExtensionsMap$co
          ? _typeExtensionsMap$co
          : [];
      return new definition_GraphQLInputObjectType(
        extendSchema_objectSpread(
          extendSchema_objectSpread({}, config),
          {},
          {
            fields: function () {
              return extendSchema_objectSpread(
                extendSchema_objectSpread(
                  {},
                  mapValue(config.fields, function (field) {
                    return extendSchema_objectSpread(
                      extendSchema_objectSpread({}, field),
                      {},
                      {
                        type: replaceType(field.type),
                      }
                    );
                  })
                ),
                buildInputFieldMap(extensions)
              );
            },
            extensionASTNodes: config.extensionASTNodes.concat(extensions),
          }
        )
      );
    }
    function extendEnumType(type) {
      var _typeExtensionsMap$ty;
      var config = type.toConfig();
      var extensions =
        null !== (_typeExtensionsMap$ty = typeExtensionsMap[type.name]) && void 0 !== _typeExtensionsMap$ty
          ? _typeExtensionsMap$ty
          : [];
      return new definition_GraphQLEnumType(
        extendSchema_objectSpread(
          extendSchema_objectSpread({}, config),
          {},
          {
            values: extendSchema_objectSpread(
              extendSchema_objectSpread({}, config.values),
              buildEnumValueMap(extensions)
            ),
            extensionASTNodes: config.extensionASTNodes.concat(extensions),
          }
        )
      );
    }
    function extendScalarType(type) {
      var _typeExtensionsMap$co2;
      var config = type.toConfig();
      var extensions =
        null !== (_typeExtensionsMap$co2 = typeExtensionsMap[config.name]) && void 0 !== _typeExtensionsMap$co2
          ? _typeExtensionsMap$co2
          : [];
      var specifiedByUrl = config.specifiedByUrl;
      for (var _i8 = 0; _i8 < extensions.length; _i8++) {
        var _getSpecifiedByUrl;
        specifiedByUrl =
          null !== (_getSpecifiedByUrl = getSpecifiedByUrl(extensions[_i8])) && void 0 !== _getSpecifiedByUrl
            ? _getSpecifiedByUrl
            : specifiedByUrl;
      }
      return new definition_GraphQLScalarType(
        extendSchema_objectSpread(
          extendSchema_objectSpread({}, config),
          {},
          {
            specifiedByUrl,
            extensionASTNodes: config.extensionASTNodes.concat(extensions),
          }
        )
      );
    }
    function extendObjectType(type) {
      var _typeExtensionsMap$co3;
      var config = type.toConfig();
      var extensions =
        null !== (_typeExtensionsMap$co3 = typeExtensionsMap[config.name]) && void 0 !== _typeExtensionsMap$co3
          ? _typeExtensionsMap$co3
          : [];
      return new definition_GraphQLObjectType(
        extendSchema_objectSpread(
          extendSchema_objectSpread({}, config),
          {},
          {
            interfaces: function () {
              return [].concat(type.getInterfaces().map(replaceNamedType), buildInterfaces(extensions));
            },
            fields: function () {
              return extendSchema_objectSpread(
                extendSchema_objectSpread({}, mapValue(config.fields, extendField)),
                buildFieldMap(extensions)
              );
            },
            extensionASTNodes: config.extensionASTNodes.concat(extensions),
          }
        )
      );
    }
    function extendInterfaceType(type) {
      var _typeExtensionsMap$co4;
      var config = type.toConfig();
      var extensions =
        null !== (_typeExtensionsMap$co4 = typeExtensionsMap[config.name]) && void 0 !== _typeExtensionsMap$co4
          ? _typeExtensionsMap$co4
          : [];
      return new definition_GraphQLInterfaceType(
        extendSchema_objectSpread(
          extendSchema_objectSpread({}, config),
          {},
          {
            interfaces: function () {
              return [].concat(type.getInterfaces().map(replaceNamedType), buildInterfaces(extensions));
            },
            fields: function () {
              return extendSchema_objectSpread(
                extendSchema_objectSpread({}, mapValue(config.fields, extendField)),
                buildFieldMap(extensions)
              );
            },
            extensionASTNodes: config.extensionASTNodes.concat(extensions),
          }
        )
      );
    }
    function extendUnionType(type) {
      var _typeExtensionsMap$co5;
      var config = type.toConfig();
      var extensions =
        null !== (_typeExtensionsMap$co5 = typeExtensionsMap[config.name]) && void 0 !== _typeExtensionsMap$co5
          ? _typeExtensionsMap$co5
          : [];
      return new definition_GraphQLUnionType(
        extendSchema_objectSpread(
          extendSchema_objectSpread({}, config),
          {},
          {
            types: function () {
              return [].concat(type.getTypes().map(replaceNamedType), buildUnionTypes(extensions));
            },
            extensionASTNodes: config.extensionASTNodes.concat(extensions),
          }
        )
      );
    }
    function extendField(field) {
      return extendSchema_objectSpread(
        extendSchema_objectSpread({}, field),
        {},
        {
          type: replaceType(field.type),
          args: mapValue(field.args, extendArg),
        }
      );
    }
    function extendArg(arg) {
      return extendSchema_objectSpread(
        extendSchema_objectSpread({}, arg),
        {},
        {
          type: replaceType(arg.type),
        }
      );
    }
    function getOperationTypes(nodes) {
      var opTypes = {};
      for (var _i10 = 0; _i10 < nodes.length; _i10++) {
        var _node$operationTypes;
        var operationTypesNodes =
          null !== (_node$operationTypes = nodes[_i10].operationTypes) && void 0 !== _node$operationTypes
            ? _node$operationTypes
            : [];
        for (var _i12 = 0; _i12 < operationTypesNodes.length; _i12++) {
          var operationType = operationTypesNodes[_i12];
          opTypes[operationType.operation] = getNamedType(operationType.type);
        }
      }
      return opTypes;
    }
    function getNamedType(node) {
      var _stdTypeMap$name2;
      var name = node.name.value;
      var type =
        null !== (_stdTypeMap$name2 = stdTypeMap[name]) && void 0 !== _stdTypeMap$name2
          ? _stdTypeMap$name2
          : typeMap[name];
      if (void 0 === type) throw new Error('Unknown type: "'.concat(name, '".'));
      return type;
    }
    function getWrappedType(node) {
      if (node.kind === kinds_Kind.LIST_TYPE) return new GraphQLList(getWrappedType(node.type));
      if (node.kind === kinds_Kind.NON_NULL_TYPE) return new GraphQLNonNull(getWrappedType(node.type));
      return getNamedType(node);
    }
    function buildFieldMap(nodes) {
      var fieldConfigMap = Object.create(null);
      for (var _i14 = 0; _i14 < nodes.length; _i14++) {
        var _node$fields;
        var nodeFields = null !== (_node$fields = nodes[_i14].fields) && void 0 !== _node$fields ? _node$fields : [];
        for (var _i16 = 0; _i16 < nodeFields.length; _i16++) {
          var field = nodeFields[_i16];
          fieldConfigMap[field.name.value] = {
            type: getWrappedType(field.type),
            description: getDescription(field, options),
            args: buildArgumentMap(field.arguments),
            deprecationReason: getDeprecationReason(field),
            astNode: field,
          };
        }
      }
      return fieldConfigMap;
    }
    function buildArgumentMap(args) {
      var argsNodes = null != args ? args : [];
      var argConfigMap = Object.create(null);
      for (var _i18 = 0; _i18 < argsNodes.length; _i18++) {
        var arg = argsNodes[_i18];
        var type = getWrappedType(arg.type);
        argConfigMap[arg.name.value] = {
          type,
          description: getDescription(arg, options),
          defaultValue: valueFromAST_valueFromAST(arg.defaultValue, type),
          deprecationReason: getDeprecationReason(arg),
          astNode: arg,
        };
      }
      return argConfigMap;
    }
    function buildInputFieldMap(nodes) {
      var inputFieldMap = Object.create(null);
      for (var _i20 = 0; _i20 < nodes.length; _i20++) {
        var _node$fields2;
        var fieldsNodes =
          null !== (_node$fields2 = nodes[_i20].fields) && void 0 !== _node$fields2 ? _node$fields2 : [];
        for (var _i22 = 0; _i22 < fieldsNodes.length; _i22++) {
          var field = fieldsNodes[_i22];
          var type = getWrappedType(field.type);
          inputFieldMap[field.name.value] = {
            type,
            description: getDescription(field, options),
            defaultValue: valueFromAST_valueFromAST(field.defaultValue, type),
            deprecationReason: getDeprecationReason(field),
            astNode: field,
          };
        }
      }
      return inputFieldMap;
    }
    function buildEnumValueMap(nodes) {
      var enumValueMap = Object.create(null);
      for (var _i24 = 0; _i24 < nodes.length; _i24++) {
        var _node$values;
        var valuesNodes = null !== (_node$values = nodes[_i24].values) && void 0 !== _node$values ? _node$values : [];
        for (var _i26 = 0; _i26 < valuesNodes.length; _i26++) {
          var value = valuesNodes[_i26];
          enumValueMap[value.name.value] = {
            description: getDescription(value, options),
            deprecationReason: getDeprecationReason(value),
            astNode: value,
          };
        }
      }
      return enumValueMap;
    }
    function buildInterfaces(nodes) {
      var interfaces = [];
      for (var _i28 = 0; _i28 < nodes.length; _i28++) {
        var _node$interfaces;
        var interfacesNodes =
          null !== (_node$interfaces = nodes[_i28].interfaces) && void 0 !== _node$interfaces ? _node$interfaces : [];
        for (var _i30 = 0; _i30 < interfacesNodes.length; _i30++) {
          var type = interfacesNodes[_i30];
          interfaces.push(getNamedType(type));
        }
      }
      return interfaces;
    }
    function buildUnionTypes(nodes) {
      var types = [];
      for (var _i32 = 0; _i32 < nodes.length; _i32++) {
        var _node$types;
        var typeNodes = null !== (_node$types = nodes[_i32].types) && void 0 !== _node$types ? _node$types : [];
        for (var _i34 = 0; _i34 < typeNodes.length; _i34++) {
          var type = typeNodes[_i34];
          types.push(getNamedType(type));
        }
      }
      return types;
    }
    function buildType(astNode) {
      var _typeExtensionsMap$na;
      var name = astNode.name.value;
      var description = getDescription(astNode, options);
      var extensionNodes =
        null !== (_typeExtensionsMap$na = typeExtensionsMap[name]) && void 0 !== _typeExtensionsMap$na
          ? _typeExtensionsMap$na
          : [];
      switch (astNode.kind) {
        case kinds_Kind.OBJECT_TYPE_DEFINITION:
          var extensionASTNodes = extensionNodes;
          var allNodes = [astNode].concat(extensionASTNodes);
          return new definition_GraphQLObjectType({
            name,
            description,
            interfaces: function () {
              return buildInterfaces(allNodes);
            },
            fields: function () {
              return buildFieldMap(allNodes);
            },
            astNode,
            extensionASTNodes,
          });

        case kinds_Kind.INTERFACE_TYPE_DEFINITION:
          var _extensionASTNodes = extensionNodes;
          var _allNodes = [astNode].concat(_extensionASTNodes);
          return new definition_GraphQLInterfaceType({
            name,
            description,
            interfaces: function () {
              return buildInterfaces(_allNodes);
            },
            fields: function () {
              return buildFieldMap(_allNodes);
            },
            astNode,
            extensionASTNodes: _extensionASTNodes,
          });

        case kinds_Kind.ENUM_TYPE_DEFINITION:
          var _extensionASTNodes2 = extensionNodes;
          var _allNodes2 = [astNode].concat(_extensionASTNodes2);
          return new definition_GraphQLEnumType({
            name,
            description,
            values: buildEnumValueMap(_allNodes2),
            astNode,
            extensionASTNodes: _extensionASTNodes2,
          });

        case kinds_Kind.UNION_TYPE_DEFINITION:
          var _extensionASTNodes3 = extensionNodes;
          var _allNodes3 = [astNode].concat(_extensionASTNodes3);
          return new definition_GraphQLUnionType({
            name,
            description,
            types: function () {
              return buildUnionTypes(_allNodes3);
            },
            astNode,
            extensionASTNodes: _extensionASTNodes3,
          });

        case kinds_Kind.SCALAR_TYPE_DEFINITION:
          var _extensionASTNodes4 = extensionNodes;
          return new definition_GraphQLScalarType({
            name,
            description,
            specifiedByUrl: getSpecifiedByUrl(astNode),
            astNode,
            extensionASTNodes: _extensionASTNodes4,
          });

        case kinds_Kind.INPUT_OBJECT_TYPE_DEFINITION:
          var _extensionASTNodes5 = extensionNodes;
          var _allNodes4 = [astNode].concat(_extensionASTNodes5);
          return new definition_GraphQLInputObjectType({
            name,
            description,
            fields: function () {
              return buildInputFieldMap(_allNodes4);
            },
            astNode,
            extensionASTNodes: _extensionASTNodes5,
          });
      }
      invariant(0, 'Unexpected type definition node: ' + inspect_inspect(astNode));
    }
  }
  var stdTypeMap = keyMap(specifiedScalarTypes.concat(introspectionTypes), function (type) {
    return type.name;
  });
  function getDeprecationReason(node) {
    var deprecated = getDirectiveValues(GraphQLDeprecatedDirective, node);
    return null == deprecated ? void 0 : deprecated.reason;
  }
  function getSpecifiedByUrl(node) {
    var specifiedBy = getDirectiveValues(GraphQLSpecifiedByDirective, node);
    return null == specifiedBy ? void 0 : specifiedBy.url;
  }
  function getDescription(node, options) {
    if (node.description) return node.description.value;
    if (true === (null == options ? void 0 : options.commentDescriptions)) {
      var rawValue = getLeadingCommentBlock(node);
      if (void 0 !== rawValue) return blockString_dedentBlockStringValue('\n' + rawValue);
    }
  }
  function getLeadingCommentBlock(node) {
    var loc = node.loc;
    if (!loc) return;
    var comments = [];
    var token = loc.startToken.prev;
    while (
      null != token &&
      token.kind === tokenKind_TokenKind.COMMENT &&
      token.next &&
      token.prev &&
      token.line + 1 === token.next.line &&
      token.line !== token.prev.line
    ) {
      var value = String(token.value);
      comments.push(value);
      token = token.prev;
    }
    return comments.length > 0 ? comments.reverse().join('\n') : void 0;
  }
  function buildASTSchema_buildASTSchema(documentAST, options) {
    (null != documentAST && documentAST.kind === kinds_Kind.DOCUMENT) ||
      devAssert(0, 'Must provide valid Document AST.');
    if (
      true !== (null == options ? void 0 : options.assumeValid) &&
      true !== (null == options ? void 0 : options.assumeValidSDL)
    )
      assertValidSDL(documentAST);
    var config = extendSchemaImpl(
      {
        description: void 0,
        types: [],
        directives: [],
        extensions: void 0,
        extensionASTNodes: [],
        assumeValid: false,
      },
      documentAST,
      options
    );
    if (null == config.astNode)
      for (var _i2 = 0, _config$types2 = config.types; _i2 < _config$types2.length; _i2++) {
        var type = _config$types2[_i2];
        switch (type.name) {
          case 'Query':
            config.query = type;
            break;

          case 'Mutation':
            config.mutation = type;
            break;

          case 'Subscription':
            config.subscription = type;
            break;
        }
      }
    var directives = config.directives;
    var _loop = function (_i4) {
      var stdDirective = specifiedDirectives[_i4];
      if (
        directives.every(function (directive) {
          return directive.name !== stdDirective.name;
        })
      )
        directives.push(stdDirective);
    };
    for (var _i4 = 0; _i4 < specifiedDirectives.length; _i4++) _loop(_i4);
    return new schema_GraphQLSchema(config);
  }
  function buildSchema(source, options) {
    return buildASTSchema_buildASTSchema(
      parser_parse(source, {
        noLocation: null == options ? void 0 : options.noLocation,
        allowLegacySDLEmptyFields: null == options ? void 0 : options.allowLegacySDLEmptyFields,
        allowLegacySDLImplementsInterfaces: null == options ? void 0 : options.allowLegacySDLImplementsInterfaces,
        experimentalFragmentVariables: null == options ? void 0 : options.experimentalFragmentVariables,
      }),
      {
        commentDescriptions: null == options ? void 0 : options.commentDescriptions,
        assumeValidSDL: null == options ? void 0 : options.assumeValidSDL,
        assumeValid: null == options ? void 0 : options.assumeValid,
      }
    );
  }
  var jsutils_inspect = __webpack_require__('../../node_modules/graphql/jsutils/inspect.js');
  const utils_asArray = fns => (Array.isArray(fns) ? fns : fns ? [fns] : []);
  function isEqual(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let index = 0; index < a.length; index++) if (a[index] !== b[index]) return false;
      return true;
    }
    return a === b || (!a && !b);
  }
  function isNotEqual(a, b) {
    return !isEqual(a, b);
  }
  function compareStrings(a, b) {
    if (String(a) < String(b)) return -1;
    if (String(a) > String(b)) return 1;
    return 0;
  }
  function nodeToString(a) {
    var _a, _b;
    let name;
    if ('alias' in a) name = null === (_a = a.alias) || void 0 === _a ? void 0 : _a.value;
    if (null == name && 'name' in a) name = null === (_b = a.name) || void 0 === _b ? void 0 : _b.value;
    if (null == name) name = a.kind;
    return name;
  }
  function compareNodes(a, b, customFn) {
    const aStr = nodeToString(a);
    const bStr = nodeToString(b);
    if ('function' == typeof customFn) return customFn(aStr, bStr);
    return compareStrings(aStr, bStr);
  }
  function isSome(input) {
    return null != input;
  }
  function utils_getArgumentValues(def, node, variableValues = {}) {
    var _a;
    const variableMap = Object.entries(variableValues).reduce(
      (prev, [key, value]) => ({
        ...prev,
        [key]: value,
      }),
      {}
    );
    const coercedValues = {};
    const argNodeMap = (null !== (_a = node.arguments) && void 0 !== _a ? _a : []).reduce(
      (prev, arg) => ({
        ...prev,
        [arg.name.value]: arg,
      }),
      {}
    );
    for (const { name, type: argType, defaultValue } of def.args) {
      const argumentNode = argNodeMap[name];
      if (!argumentNode) {
        if (void 0 !== defaultValue) coercedValues[name] = defaultValue;
        else if (definition_isNonNullType(argType))
          throw new GraphQLError(
            `Argument "${name}" of required type "${jsutils_inspect.inspect(argType)}" was not provided.`,
            node
          );
        continue;
      }
      const valueNode = argumentNode.value;
      let isNull = valueNode.kind === kinds_Kind.NULL;
      if (valueNode.kind === kinds_Kind.VARIABLE) {
        const variableName = valueNode.name.value;
        if (null == variableValues || !variableMap[variableName]) {
          if (void 0 !== defaultValue) coercedValues[name] = defaultValue;
          else if (definition_isNonNullType(argType))
            throw new GraphQLError(
              `Argument "${name}" of required type "${jsutils_inspect.inspect(
                argType
              )}" was provided the variable "$${variableName}" which was not provided a runtime value.`,
              valueNode
            );
          continue;
        }
        isNull = null == variableValues[variableName];
      }
      if (isNull && definition_isNonNullType(argType))
        throw new GraphQLError(
          `Argument "${name}" of non-null type "${jsutils_inspect.inspect(argType)}" must not be null.`,
          valueNode
        );
      const coercedValue = valueFromAST_valueFromAST(valueNode, argType, variableValues);
      if (void 0 === coercedValue)
        throw new GraphQLError(`Argument "${name}" has invalid value ${printer_print(valueNode)}.`, valueNode);
      coercedValues[name] = coercedValue;
    }
    return coercedValues;
  }
  function getDirectivesInExtensions(node, pathToDirectivesInExtensions = ['directives']) {
    return pathToDirectivesInExtensions.reduce(
      (acc, pathSegment) => (null == acc ? acc : acc[pathSegment]),
      null == node ? void 0 : node.extensions
    );
  }
  function _getDirectiveInExtensions(directivesInExtensions, directiveName) {
    const directiveInExtensions = directivesInExtensions.filter(
      directiveAnnotation => directiveAnnotation.name === directiveName
    );
    if (!directiveInExtensions.length) return;
    return directiveInExtensions.map(directive => {
      var _a;
      return null !== (_a = directive.args) && void 0 !== _a ? _a : {};
    });
  }
  function getDirectiveInExtensions(node, directiveName, pathToDirectivesInExtensions = ['directives']) {
    const directivesInExtensions = pathToDirectivesInExtensions.reduce(
      (acc, pathSegment) => (null == acc ? acc : acc[pathSegment]),
      null == node ? void 0 : node.extensions
    );
    if (void 0 === directivesInExtensions) return;
    if (Array.isArray(directivesInExtensions)) return _getDirectiveInExtensions(directivesInExtensions, directiveName);
    const reformattedDirectivesInExtensions = [];
    for (const [name, argsOrArrayOfArgs] of Object.entries(directivesInExtensions))
      if (Array.isArray(argsOrArrayOfArgs))
        for (const args of argsOrArrayOfArgs)
          reformattedDirectivesInExtensions.push({
            name,
            args,
          });
      else
        reformattedDirectivesInExtensions.push({
          name,
          args: argsOrArrayOfArgs,
        });
    return _getDirectiveInExtensions(reformattedDirectivesInExtensions, directiveName);
  }
  function getDirective(schema, node, directiveName, pathToDirectivesInExtensions = ['directives']) {
    const directiveInExtensions = getDirectiveInExtensions(node, directiveName, pathToDirectivesInExtensions);
    if (null != directiveInExtensions) return directiveInExtensions;
    const schemaDirective = schema && schema.getDirective ? schema.getDirective(directiveName) : void 0;
    if (null == schemaDirective) return;
    let astNodes = [];
    if (node.astNode) astNodes.push(node.astNode);
    if ('extensionASTNodes' in node && node.extensionASTNodes) astNodes = [...astNodes, ...node.extensionASTNodes];
    const result = [];
    for (const astNode of astNodes)
      if (astNode.directives)
        for (const directiveNode of astNode.directives)
          if (directiveNode.name.value === directiveName)
            result.push(utils_getArgumentValues(schemaDirective, directiveNode));
    if (!result.length) return;
    return result;
  }
  function getImplementingTypes(interfaceName, schema) {
    const allTypesMap = schema.getTypeMap();
    const result = [];
    for (const graphqlTypeName in allTypesMap) {
      const graphqlType = allTypesMap[graphqlTypeName];
      if (definition_isObjectType(graphqlType))
        if (graphqlType.getInterfaces().find(int => int.name === interfaceName)) result.push(graphqlType.name);
    }
    return result;
  }
  function astFromType(type) {
    if (definition_isNonNullType(type)) {
      const innerType = astFromType(type.ofType);
      if (innerType.kind === kinds_Kind.NON_NULL_TYPE)
        throw new Error(
          `Invalid type node ${JSON.stringify(type)}. Inner type of non-null type cannot be a non-null type.`
        );
      return {
        kind: kinds_Kind.NON_NULL_TYPE,
        type: innerType,
      };
    } else if (definition_isListType(type))
      return {
        kind: kinds_Kind.LIST_TYPE,
        type: astFromType(type.ofType),
      };
    return {
      kind: kinds_Kind.NAMED_TYPE,
      name: {
        kind: kinds_Kind.NAME,
        value: type.name,
      },
    };
  }
  function astFromValueUntyped(value) {
    if (null === value)
      return {
        kind: kinds_Kind.NULL,
      };
    if (void 0 === value) return null;
    if (Array.isArray(value)) {
      const valuesNodes = [];
      for (const item of value) {
        const itemNode = astFromValueUntyped(item);
        if (null != itemNode) valuesNodes.push(itemNode);
      }
      return {
        kind: kinds_Kind.LIST,
        values: valuesNodes,
      };
    }
    if ('object' == typeof value) {
      const fieldNodes = [];
      for (const fieldName in value) {
        const ast = astFromValueUntyped(value[fieldName]);
        if (ast)
          fieldNodes.push({
            kind: kinds_Kind.OBJECT_FIELD,
            name: {
              kind: kinds_Kind.NAME,
              value: fieldName,
            },
            value: ast,
          });
      }
      return {
        kind: kinds_Kind.OBJECT,
        fields: fieldNodes,
      };
    }
    if ('boolean' == typeof value)
      return {
        kind: kinds_Kind.BOOLEAN,
        value,
      };
    if ('number' == typeof value && isFinite(value)) {
      const stringNum = String(value);
      return utils_integerStringRegExp.test(stringNum)
        ? {
            kind: kinds_Kind.INT,
            value: stringNum,
          }
        : {
            kind: kinds_Kind.FLOAT,
            value: stringNum,
          };
    }
    if ('string' == typeof value)
      return {
        kind: kinds_Kind.STRING,
        value,
      };
    throw new TypeError(`Cannot convert value to AST: ${value}.`);
  }
  const utils_integerStringRegExp = /^-?(?:0|[1-9][0-9]*)$/;
  function getDocumentNodeFromSchema(schema, options = {}) {
    const pathToDirectivesInExtensions = options.pathToDirectivesInExtensions;
    const typesMap = schema.getTypeMap();
    const schemaNode = astFromSchema(schema, pathToDirectivesInExtensions);
    const definitions = null != schemaNode ? [schemaNode] : [];
    const directives = schema.getDirectives();
    for (const directive of directives) {
      if (isSpecifiedDirective(directive)) continue;
      definitions.push(astFromDirective(directive, schema, pathToDirectivesInExtensions));
    }
    for (const typeName in typesMap) {
      const type = typesMap[typeName];
      const isPredefinedScalar = scalars_isSpecifiedScalarType(type);
      const isIntrospection = introspection_isIntrospectionType(type);
      if (isPredefinedScalar || isIntrospection) continue;
      if (definition_isObjectType(type))
        definitions.push(astFromObjectType(type, schema, pathToDirectivesInExtensions));
      else if (definition_isInterfaceType(type))
        definitions.push(astFromInterfaceType(type, schema, pathToDirectivesInExtensions));
      else if (definition_isUnionType(type))
        definitions.push(astFromUnionType(type, schema, pathToDirectivesInExtensions));
      else if (definition_isInputObjectType(type))
        definitions.push(astFromInputObjectType(type, schema, pathToDirectivesInExtensions));
      else if (definition_isEnumType(type))
        definitions.push(astFromEnumType(type, schema, pathToDirectivesInExtensions));
      else if (definition_isScalarType(type))
        definitions.push(astFromScalarType(type, schema, pathToDirectivesInExtensions));
      else throw new Error(`Unknown type ${type}.`);
    }
    return {
      kind: kinds_Kind.DOCUMENT,
      definitions,
    };
  }
  function astFromSchema(schema, pathToDirectivesInExtensions) {
    var _a, _b;
    const operationTypeMap = {
      query: void 0,
      mutation: void 0,
      subscription: void 0,
    };
    const nodes = [];
    if (null != schema.astNode) nodes.push(schema.astNode);
    if (null != schema.extensionASTNodes)
      for (const extensionASTNode of schema.extensionASTNodes) nodes.push(extensionASTNode);
    for (const node of nodes)
      if (node.operationTypes)
        for (const operationTypeDefinitionNode of node.operationTypes)
          operationTypeMap[operationTypeDefinitionNode.operation] = operationTypeDefinitionNode;
    const rootTypeMap = {
      query: schema.getQueryType(),
      mutation: schema.getMutationType(),
      subscription: schema.getSubscriptionType(),
    };
    for (const operationTypeNode in operationTypeMap)
      if (null != rootTypeMap[operationTypeNode])
        if (null != operationTypeMap[operationTypeNode])
          operationTypeMap[operationTypeNode].type = astFromType(rootTypeMap[operationTypeNode]);
        else
          operationTypeMap[operationTypeNode] = {
            kind: kinds_Kind.OPERATION_TYPE_DEFINITION,
            operation: operationTypeNode,
            type: astFromType(rootTypeMap[operationTypeNode]),
          };
    const operationTypes = Object.values(operationTypeMap).filter(isSome);
    const directives = getDirectiveNodes(schema, schema, pathToDirectivesInExtensions);
    if (!operationTypes.length && !directives.length) return null;
    const schemaNode = {
      kind: null != operationTypes ? kinds_Kind.SCHEMA_DEFINITION : kinds_Kind.SCHEMA_EXTENSION,
      operationTypes,
      directives,
    };
    schemaNode.description = (
      null !== (_b = null === (_a = schema.astNode) || void 0 === _a ? void 0 : _a.description) && void 0 !== _b
        ? _b
        : null != schema.description
    )
      ? {
          kind: kinds_Kind.STRING,
          value: schema.description,
          block: true,
        }
      : void 0;
    return schemaNode;
  }
  function astFromDirective(directive, schema, pathToDirectivesInExtensions) {
    var _a, _b;
    return {
      kind: kinds_Kind.DIRECTIVE_DEFINITION,
      description:
        null !== (_b = null === (_a = directive.astNode) || void 0 === _a ? void 0 : _a.description) && void 0 !== _b
          ? _b
          : directive.description
          ? {
              kind: kinds_Kind.STRING,
              value: directive.description,
            }
          : void 0,
      name: {
        kind: kinds_Kind.NAME,
        value: directive.name,
      },
      arguments: (null == directive ? void 0 : directive.args)
        ? directive.args.map(arg => astFromArg(arg, schema, pathToDirectivesInExtensions))
        : void 0,
      repeatable: directive.isRepeatable,
      locations: (null == directive ? void 0 : directive.locations)
        ? directive.locations.map(location => ({
            kind: kinds_Kind.NAME,
            value: location,
          }))
        : [],
    };
  }
  function getDirectiveNodes(entity, schema, pathToDirectivesInExtensions) {
    const directivesInExtensions = getDirectivesInExtensions(entity, pathToDirectivesInExtensions);
    let nodes = [];
    if (null != entity.astNode) nodes.push(entity.astNode);
    if ('extensionASTNodes' in entity && null != entity.extensionASTNodes)
      nodes = nodes.concat(entity.extensionASTNodes);
    let directives;
    if (null != directivesInExtensions) directives = makeDirectiveNodes(schema, directivesInExtensions);
    else {
      directives = [];
      for (const node of nodes) if (node.directives) directives.push(...node.directives);
    }
    return directives;
  }
  function getDeprecatableDirectiveNodes(entity, schema, pathToDirectivesInExtensions) {
    var _a, _b;
    let directiveNodesBesidesDeprecated = [];
    let deprecatedDirectiveNode = null;
    const directivesInExtensions = getDirectivesInExtensions(entity, pathToDirectivesInExtensions);
    let directives;
    if (null != directivesInExtensions) directives = makeDirectiveNodes(schema, directivesInExtensions);
    else directives = null === (_a = entity.astNode) || void 0 === _a ? void 0 : _a.directives;
    if (null != directives) {
      directiveNodesBesidesDeprecated = directives.filter(directive => 'deprecated' !== directive.name.value);
      if (null != entity.deprecationReason)
        deprecatedDirectiveNode =
          null === (_b = directives.filter(directive => 'deprecated' === directive.name.value)) || void 0 === _b
            ? void 0
            : _b[0];
    }
    if (null != entity.deprecationReason && null == deprecatedDirectiveNode)
      deprecatedDirectiveNode = makeDeprecatedDirective(entity.deprecationReason);
    return null == deprecatedDirectiveNode
      ? directiveNodesBesidesDeprecated
      : [deprecatedDirectiveNode].concat(directiveNodesBesidesDeprecated);
  }
  function astFromArg(arg, schema, pathToDirectivesInExtensions) {
    var _a, _b, _c;
    return {
      kind: kinds_Kind.INPUT_VALUE_DEFINITION,
      description:
        null !== (_b = null === (_a = arg.astNode) || void 0 === _a ? void 0 : _a.description) && void 0 !== _b
          ? _b
          : arg.description
          ? {
              kind: kinds_Kind.STRING,
              value: arg.description,
              block: true,
            }
          : void 0,
      name: {
        kind: kinds_Kind.NAME,
        value: arg.name,
      },
      type: astFromType(arg.type),
      defaultValue:
        void 0 !== arg.defaultValue
          ? null !== (_c = astFromValue(arg.defaultValue, arg.type)) && void 0 !== _c
            ? _c
            : void 0
          : void 0,
      directives: getDeprecatableDirectiveNodes(arg, schema, pathToDirectivesInExtensions),
    };
  }
  function astFromObjectType(type, schema, pathToDirectivesInExtensions) {
    var _a, _b;
    return {
      kind: kinds_Kind.OBJECT_TYPE_DEFINITION,
      description:
        null !== (_b = null === (_a = type.astNode) || void 0 === _a ? void 0 : _a.description) && void 0 !== _b
          ? _b
          : type.description
          ? {
              kind: kinds_Kind.STRING,
              value: type.description,
              block: true,
            }
          : void 0,
      name: {
        kind: kinds_Kind.NAME,
        value: type.name,
      },
      fields: Object.values(type.getFields()).map(field => astFromField(field, schema, pathToDirectivesInExtensions)),
      interfaces: Object.values(type.getInterfaces()).map(iFace => astFromType(iFace)),
      directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions),
    };
  }
  function astFromInterfaceType(type, schema, pathToDirectivesInExtensions) {
    var _a, _b;
    const node = {
      kind: kinds_Kind.INTERFACE_TYPE_DEFINITION,
      description:
        null !== (_b = null === (_a = type.astNode) || void 0 === _a ? void 0 : _a.description) && void 0 !== _b
          ? _b
          : type.description
          ? {
              kind: kinds_Kind.STRING,
              value: type.description,
              block: true,
            }
          : void 0,
      name: {
        kind: kinds_Kind.NAME,
        value: type.name,
      },
      fields: Object.values(type.getFields()).map(field => astFromField(field, schema, pathToDirectivesInExtensions)),
      directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions),
    };
    if ('getInterfaces' in type) node.interfaces = Object.values(type.getInterfaces()).map(iFace => astFromType(iFace));
    return node;
  }
  function astFromUnionType(type, schema, pathToDirectivesInExtensions) {
    var _a, _b;
    return {
      kind: kinds_Kind.UNION_TYPE_DEFINITION,
      description:
        null !== (_b = null === (_a = type.astNode) || void 0 === _a ? void 0 : _a.description) && void 0 !== _b
          ? _b
          : type.description
          ? {
              kind: kinds_Kind.STRING,
              value: type.description,
              block: true,
            }
          : void 0,
      name: {
        kind: kinds_Kind.NAME,
        value: type.name,
      },
      directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions),
      types: type.getTypes().map(type => astFromType(type)),
    };
  }
  function astFromInputObjectType(type, schema, pathToDirectivesInExtensions) {
    var _a, _b;
    return {
      kind: kinds_Kind.INPUT_OBJECT_TYPE_DEFINITION,
      description:
        null !== (_b = null === (_a = type.astNode) || void 0 === _a ? void 0 : _a.description) && void 0 !== _b
          ? _b
          : type.description
          ? {
              kind: kinds_Kind.STRING,
              value: type.description,
              block: true,
            }
          : void 0,
      name: {
        kind: kinds_Kind.NAME,
        value: type.name,
      },
      fields: Object.values(type.getFields()).map(field =>
        astFromInputField(field, schema, pathToDirectivesInExtensions)
      ),
      directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions),
    };
  }
  function astFromEnumType(type, schema, pathToDirectivesInExtensions) {
    var _a, _b;
    return {
      kind: kinds_Kind.ENUM_TYPE_DEFINITION,
      description:
        null !== (_b = null === (_a = type.astNode) || void 0 === _a ? void 0 : _a.description) && void 0 !== _b
          ? _b
          : type.description
          ? {
              kind: kinds_Kind.STRING,
              value: type.description,
              block: true,
            }
          : void 0,
      name: {
        kind: kinds_Kind.NAME,
        value: type.name,
      },
      values: Object.values(type.getValues()).map(value =>
        astFromEnumValue(value, schema, pathToDirectivesInExtensions)
      ),
      directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions),
    };
  }
  function astFromScalarType(type, schema, pathToDirectivesInExtensions) {
    var _a, _b, _c, _d;
    let directiveNodesBesidesSpecifiedBy = [];
    let specifiedByDirectiveNode = null;
    const directivesInExtensions = getDirectivesInExtensions(type, pathToDirectivesInExtensions);
    let allDirectives;
    if (null != directivesInExtensions) allDirectives = makeDirectiveNodes(schema, directivesInExtensions);
    else allDirectives = null === (_a = type.astNode) || void 0 === _a ? void 0 : _a.directives;
    if (null != allDirectives) {
      directiveNodesBesidesSpecifiedBy = allDirectives.filter(directive => 'specifiedBy' !== directive.name.value);
      if (null != type.specifiedByUrl)
        specifiedByDirectiveNode =
          null === (_b = allDirectives.filter(directive => 'specifiedBy' === directive.name.value)) || void 0 === _b
            ? void 0
            : _b[0];
    }
    if (null != type.specifiedByUrl && null == specifiedByDirectiveNode)
      specifiedByDirectiveNode = makeDirectiveNode('specifiedBy', {
        url: type.specifiedByUrl,
      });
    const directives =
      null == specifiedByDirectiveNode
        ? directiveNodesBesidesSpecifiedBy
        : [specifiedByDirectiveNode].concat(directiveNodesBesidesSpecifiedBy);
    return {
      kind: kinds_Kind.SCALAR_TYPE_DEFINITION,
      description:
        null !== (_d = null === (_c = type.astNode) || void 0 === _c ? void 0 : _c.description) && void 0 !== _d
          ? _d
          : type.description
          ? {
              kind: kinds_Kind.STRING,
              value: type.description,
              block: true,
            }
          : void 0,
      name: {
        kind: kinds_Kind.NAME,
        value: type.name,
      },
      directives,
    };
  }
  function astFromField(field, schema, pathToDirectivesInExtensions) {
    var _a, _b;
    return {
      kind: kinds_Kind.FIELD_DEFINITION,
      description:
        null !== (_b = null === (_a = field.astNode) || void 0 === _a ? void 0 : _a.description) && void 0 !== _b
          ? _b
          : field.description
          ? {
              kind: kinds_Kind.STRING,
              value: field.description,
              block: true,
            }
          : void 0,
      name: {
        kind: kinds_Kind.NAME,
        value: field.name,
      },
      arguments: field.args.map(arg => astFromArg(arg, schema, pathToDirectivesInExtensions)),
      type: astFromType(field.type),
      directives: getDeprecatableDirectiveNodes(field, schema, pathToDirectivesInExtensions),
    };
  }
  function astFromInputField(field, schema, pathToDirectivesInExtensions) {
    var _a, _b, _c;
    return {
      kind: kinds_Kind.INPUT_VALUE_DEFINITION,
      description:
        null !== (_b = null === (_a = field.astNode) || void 0 === _a ? void 0 : _a.description) && void 0 !== _b
          ? _b
          : field.description
          ? {
              kind: kinds_Kind.STRING,
              value: field.description,
              block: true,
            }
          : void 0,
      name: {
        kind: kinds_Kind.NAME,
        value: field.name,
      },
      type: astFromType(field.type),
      directives: getDeprecatableDirectiveNodes(field, schema, pathToDirectivesInExtensions),
      defaultValue: null !== (_c = astFromValue(field.defaultValue, field.type)) && void 0 !== _c ? _c : void 0,
    };
  }
  function astFromEnumValue(value, schema, pathToDirectivesInExtensions) {
    var _a, _b;
    return {
      kind: kinds_Kind.ENUM_VALUE_DEFINITION,
      description:
        null !== (_b = null === (_a = value.astNode) || void 0 === _a ? void 0 : _a.description) && void 0 !== _b
          ? _b
          : value.description
          ? {
              kind: kinds_Kind.STRING,
              value: value.description,
              block: true,
            }
          : void 0,
      name: {
        kind: kinds_Kind.NAME,
        value: value.name,
      },
      directives: getDirectiveNodes(value, schema, pathToDirectivesInExtensions),
    };
  }
  function makeDeprecatedDirective(deprecationReason) {
    return makeDirectiveNode(
      'deprecated',
      {
        reason: deprecationReason,
      },
      GraphQLDeprecatedDirective
    );
  }
  function makeDirectiveNode(name, args, directive) {
    const directiveArguments = [];
    if (null != directive)
      for (const arg of directive.args) {
        const argName = arg.name;
        const argValue = args[argName];
        if (void 0 !== argValue) {
          const value = astFromValue(argValue, arg.type);
          if (value)
            directiveArguments.push({
              kind: kinds_Kind.ARGUMENT,
              name: {
                kind: kinds_Kind.NAME,
                value: argName,
              },
              value,
            });
        }
      }
    else
      for (const argName in args) {
        const value = astFromValueUntyped(args[argName]);
        if (value)
          directiveArguments.push({
            kind: kinds_Kind.ARGUMENT,
            name: {
              kind: kinds_Kind.NAME,
              value: argName,
            },
            value,
          });
      }
    return {
      kind: kinds_Kind.DIRECTIVE,
      name: {
        kind: kinds_Kind.NAME,
        value: name,
      },
      arguments: directiveArguments,
    };
  }
  function makeDirectiveNodes(schema, directiveValues) {
    const directiveNodes = [];
    for (const directiveName in directiveValues) {
      const arrayOrSingleValue = directiveValues[directiveName];
      const directive = null == schema ? void 0 : schema.getDirective(directiveName);
      if (Array.isArray(arrayOrSingleValue))
        for (const value of arrayOrSingleValue) directiveNodes.push(makeDirectiveNode(directiveName, value, directive));
      else directiveNodes.push(makeDirectiveNode(directiveName, arrayOrSingleValue, directive));
    }
    return directiveNodes;
  }
  let AggregateErrorImpl = globalThis.AggregateError;
  if ('undefined' == typeof AggregateErrorImpl) {
    class AggregateErrorClass extends Error {
      constructor(errors, message = '') {
        super(message);
        this.errors = errors;
        this.name = 'AggregateError';
        Error.captureStackTrace(this, AggregateErrorClass);
      }
    }
    AggregateErrorImpl = function (errors, message) {
      return new AggregateErrorClass(errors, message);
    };
  }
  function getDefinedRootType(schema, operation) {
    let rootType;
    if ('query' === operation) rootType = schema.getQueryType();
    else if ('mutation' === operation) rootType = schema.getMutationType();
    else if ('subscription' === operation) rootType = schema.getSubscriptionType();
    else throw new Error(`Unknown operation "${operation}", cannot get root type.`);
    if (null == rootType) throw new Error(`Root type for operation "${operation}" not defined by the given schema.`);
    return rootType;
  }
  function getRootTypeNames(schema) {
    const rootTypeNames = new Set();
    const queryType = schema.getQueryType();
    const mutationType = schema.getMutationType();
    const subscriptionType = schema.getSubscriptionType();
    for (const rootType of [queryType, mutationType, subscriptionType]) if (rootType) rootTypeNames.add(rootType.name);
    return rootTypeNames;
  }
  function getRootTypes(schema) {
    const rootTypes = new Set();
    const queryType = schema.getQueryType();
    const mutationType = schema.getMutationType();
    const subscriptionType = schema.getSubscriptionType();
    for (const rootType of [queryType, mutationType, subscriptionType]) if (rootType) rootTypes.add(rootType);
    return rootTypes;
  }
  function getRootTypeMap(schema) {
    const rootTypeMap = new Map();
    const queryType = schema.getQueryType();
    if (queryType) rootTypeMap.set('query', queryType);
    const mutationType = schema.getMutationType();
    if (mutationType) rootTypeMap.set('mutation', mutationType);
    const subscriptionType = schema.getSubscriptionType();
    if (subscriptionType) rootTypeMap.set('subscription', subscriptionType);
    return rootTypeMap;
  }
  var utils_MapperKind;
  (function (MapperKind) {
    MapperKind['TYPE'] = 'MapperKind.TYPE';
    MapperKind['SCALAR_TYPE'] = 'MapperKind.SCALAR_TYPE';
    MapperKind['ENUM_TYPE'] = 'MapperKind.ENUM_TYPE';
    MapperKind['COMPOSITE_TYPE'] = 'MapperKind.COMPOSITE_TYPE';
    MapperKind['OBJECT_TYPE'] = 'MapperKind.OBJECT_TYPE';
    MapperKind['INPUT_OBJECT_TYPE'] = 'MapperKind.INPUT_OBJECT_TYPE';
    MapperKind['ABSTRACT_TYPE'] = 'MapperKind.ABSTRACT_TYPE';
    MapperKind['UNION_TYPE'] = 'MapperKind.UNION_TYPE';
    MapperKind['INTERFACE_TYPE'] = 'MapperKind.INTERFACE_TYPE';
    MapperKind['ROOT_OBJECT'] = 'MapperKind.ROOT_OBJECT';
    MapperKind['QUERY'] = 'MapperKind.QUERY';
    MapperKind['MUTATION'] = 'MapperKind.MUTATION';
    MapperKind['SUBSCRIPTION'] = 'MapperKind.SUBSCRIPTION';
    MapperKind['DIRECTIVE'] = 'MapperKind.DIRECTIVE';
    MapperKind['FIELD'] = 'MapperKind.FIELD';
    MapperKind['COMPOSITE_FIELD'] = 'MapperKind.COMPOSITE_FIELD';
    MapperKind['OBJECT_FIELD'] = 'MapperKind.OBJECT_FIELD';
    MapperKind['ROOT_FIELD'] = 'MapperKind.ROOT_FIELD';
    MapperKind['QUERY_ROOT_FIELD'] = 'MapperKind.QUERY_ROOT_FIELD';
    MapperKind['MUTATION_ROOT_FIELD'] = 'MapperKind.MUTATION_ROOT_FIELD';
    MapperKind['SUBSCRIPTION_ROOT_FIELD'] = 'MapperKind.SUBSCRIPTION_ROOT_FIELD';
    MapperKind['INTERFACE_FIELD'] = 'MapperKind.INTERFACE_FIELD';
    MapperKind['INPUT_OBJECT_FIELD'] = 'MapperKind.INPUT_OBJECT_FIELD';
    MapperKind['ARGUMENT'] = 'MapperKind.ARGUMENT';
    MapperKind['ENUM_VALUE'] = 'MapperKind.ENUM_VALUE';
  })(utils_MapperKind || (utils_MapperKind = {}));
  function getObjectTypeFromTypeMap(typeMap, type) {
    if (type) {
      const maybeObjectType = typeMap[type.name];
      if (definition_isObjectType(maybeObjectType)) return maybeObjectType;
    }
  }
  function createNamedStub(name, type) {
    let constructor;
    if ('object' === type) constructor = definition_GraphQLObjectType;
    else if ('interface' === type) constructor = definition_GraphQLInterfaceType;
    else constructor = definition_GraphQLInputObjectType;
    return new constructor({
      name,
      fields: {
        _fake: {
          type: GraphQLString,
        },
      },
    });
  }
  function createStub(node, type) {
    switch (node.kind) {
      case kinds_Kind.LIST_TYPE:
        return new GraphQLList(createStub(node.type, type));

      case kinds_Kind.NON_NULL_TYPE:
        return new GraphQLNonNull(createStub(node.type, type));

      default:
        if ('output' === type) return createNamedStub(node.name.value, 'object');
        return createNamedStub(node.name.value, 'input');
    }
  }
  function isNamedStub(type) {
    if ('getFields' in type) {
      const fields = type.getFields();
      for (const fieldName in fields) return '_fake' === fields[fieldName].name;
    }
    return false;
  }
  function getBuiltInForStub(type) {
    switch (type.name) {
      case GraphQLInt.name:
        return GraphQLInt;

      case GraphQLFloat.name:
        return GraphQLFloat;

      case GraphQLString.name:
        return GraphQLString;

      case GraphQLBoolean.name:
        return GraphQLBoolean;

      case GraphQLID.name:
        return GraphQLID;

      default:
        return type;
    }
  }
  function rewireTypes(originalTypeMap, directives) {
    const referenceTypeMap = Object.create(null);
    for (const typeName in originalTypeMap) referenceTypeMap[typeName] = originalTypeMap[typeName];
    const newTypeMap = Object.create(null);
    for (const typeName in referenceTypeMap) {
      const namedType = referenceTypeMap[typeName];
      if (null == namedType || typeName.startsWith('__')) continue;
      const newName = namedType.name;
      if (newName.startsWith('__')) continue;
      if (null != newTypeMap[newName]) throw new Error(`Duplicate schema type name ${newName}`);
      newTypeMap[newName] = namedType;
    }
    for (const typeName in newTypeMap) newTypeMap[typeName] = rewireNamedType(newTypeMap[typeName]);
    const newDirectives = directives.map(directive => rewireDirective(directive));
    return {
      typeMap: newTypeMap,
      directives: newDirectives,
    };
    function rewireDirective(directive) {
      if (isSpecifiedDirective(directive)) return directive;
      const directiveConfig = directive.toConfig();
      directiveConfig.args = rewireArgs(directiveConfig.args);
      return new GraphQLDirective(directiveConfig);
    }
    function rewireArgs(args) {
      const rewiredArgs = {};
      for (const argName in args) {
        const arg = args[argName];
        const rewiredArgType = rewireType(arg.type);
        if (null != rewiredArgType) {
          arg.type = rewiredArgType;
          rewiredArgs[argName] = arg;
        }
      }
      return rewiredArgs;
    }
    function rewireNamedType(type) {
      if (definition_isObjectType(type)) {
        const config = type.toConfig();
        const newConfig = {
          ...config,
          fields: () => rewireFields(config.fields),
          interfaces: () => rewireNamedTypes(config.interfaces),
        };
        return new definition_GraphQLObjectType(newConfig);
      } else if (definition_isInterfaceType(type)) {
        const config = type.toConfig();
        const newConfig = {
          ...config,
          fields: () => rewireFields(config.fields),
        };
        if ('interfaces' in newConfig) newConfig.interfaces = () => rewireNamedTypes(config.interfaces);
        return new definition_GraphQLInterfaceType(newConfig);
      } else if (definition_isUnionType(type)) {
        const config = type.toConfig();
        const newConfig = {
          ...config,
          types: () => rewireNamedTypes(config.types),
        };
        return new definition_GraphQLUnionType(newConfig);
      } else if (definition_isInputObjectType(type)) {
        const config = type.toConfig();
        const newConfig = {
          ...config,
          fields: () => rewireInputFields(config.fields),
        };
        return new definition_GraphQLInputObjectType(newConfig);
      } else if (definition_isEnumType(type)) {
        const enumConfig = type.toConfig();
        return new definition_GraphQLEnumType(enumConfig);
      } else if (definition_isScalarType(type)) {
        if (scalars_isSpecifiedScalarType(type)) return type;
        const scalarConfig = type.toConfig();
        return new definition_GraphQLScalarType(scalarConfig);
      }
      throw new Error(`Unexpected schema type: ${type}`);
    }
    function rewireFields(fields) {
      const rewiredFields = {};
      for (const fieldName in fields) {
        const field = fields[fieldName];
        const rewiredFieldType = rewireType(field.type);
        if (null != rewiredFieldType && field.args) {
          field.type = rewiredFieldType;
          field.args = rewireArgs(field.args);
          rewiredFields[fieldName] = field;
        }
      }
      return rewiredFields;
    }
    function rewireInputFields(fields) {
      const rewiredFields = {};
      for (const fieldName in fields) {
        const field = fields[fieldName];
        const rewiredFieldType = rewireType(field.type);
        if (null != rewiredFieldType) {
          field.type = rewiredFieldType;
          rewiredFields[fieldName] = field;
        }
      }
      return rewiredFields;
    }
    function rewireNamedTypes(namedTypes) {
      const rewiredTypes = [];
      for (const namedType of namedTypes) {
        const rewiredType = rewireType(namedType);
        if (null != rewiredType) rewiredTypes.push(rewiredType);
      }
      return rewiredTypes;
    }
    function rewireType(type) {
      if (definition_isListType(type)) {
        const rewiredType = rewireType(type.ofType);
        return null != rewiredType ? new GraphQLList(rewiredType) : null;
      } else if (definition_isNonNullType(type)) {
        const rewiredType = rewireType(type.ofType);
        return null != rewiredType ? new GraphQLNonNull(rewiredType) : null;
      } else if (definition_isNamedType(type)) {
        let rewiredType = referenceTypeMap[type.name];
        if (void 0 === rewiredType) {
          rewiredType = isNamedStub(type) ? getBuiltInForStub(type) : rewireNamedType(type);
          newTypeMap[rewiredType.name] = referenceTypeMap[type.name] = rewiredType;
        }
        return null != rewiredType ? newTypeMap[rewiredType.name] : null;
      }
      return null;
    }
  }
  function utils_transformInputValue(
    type,
    value,
    inputLeafValueTransformer = null,
    inputObjectValueTransformer = null
  ) {
    if (null == value) return value;
    const nullableType = definition_getNullableType(type);
    if (definition_isLeafType(nullableType))
      return null != inputLeafValueTransformer ? inputLeafValueTransformer(nullableType, value) : value;
    else if (definition_isListType(nullableType))
      return value.map(listMember =>
        utils_transformInputValue(
          nullableType.ofType,
          listMember,
          inputLeafValueTransformer,
          inputObjectValueTransformer
        )
      );
    else if (definition_isInputObjectType(nullableType)) {
      const fields = nullableType.getFields();
      const newValue = {};
      for (const key in value) {
        const field = fields[key];
        if (null != field)
          newValue[key] = utils_transformInputValue(
            field.type,
            value[key],
            inputLeafValueTransformer,
            inputObjectValueTransformer
          );
      }
      return null != inputObjectValueTransformer ? inputObjectValueTransformer(nullableType, newValue) : newValue;
    }
  }
  function serializeInputValue(type, value) {
    return utils_transformInputValue(type, value, (t, v) => t.serialize(v));
  }
  function parseInputValue(type, value) {
    return utils_transformInputValue(type, value, (t, v) => t.parseValue(v));
  }
  function utils_mapSchema(schema, schemaMapper = {}) {
    const newTypeMap = mapArguments(
      mapFields(
        mapTypes(
          mapDefaultValues(
            mapEnumValues(
              mapTypes(mapDefaultValues(schema.getTypeMap(), schema, serializeInputValue), schema, schemaMapper, type =>
                definition_isLeafType(type)
              ),
              schema,
              schemaMapper
            ),
            schema,
            parseInputValue
          ),
          schema,
          schemaMapper,
          type => !definition_isLeafType(type)
        ),
        schema,
        schemaMapper
      ),
      schema,
      schemaMapper
    );
    const newDirectives = mapDirectives(schema.getDirectives(), schema, schemaMapper);
    const { typeMap, directives } = rewireTypes(newTypeMap, newDirectives);
    return new schema_GraphQLSchema({
      ...schema.toConfig(),
      query: getObjectTypeFromTypeMap(typeMap, getObjectTypeFromTypeMap(newTypeMap, schema.getQueryType())),
      mutation: getObjectTypeFromTypeMap(typeMap, getObjectTypeFromTypeMap(newTypeMap, schema.getMutationType())),
      subscription: getObjectTypeFromTypeMap(
        typeMap,
        getObjectTypeFromTypeMap(newTypeMap, schema.getSubscriptionType())
      ),
      types: Object.values(typeMap),
      directives,
    });
  }
  function mapTypes(originalTypeMap, schema, schemaMapper, testFn = () => true) {
    const newTypeMap = {};
    for (const typeName in originalTypeMap)
      if (!typeName.startsWith('__')) {
        const originalType = originalTypeMap[typeName];
        if (null == originalType || !testFn(originalType)) {
          newTypeMap[typeName] = originalType;
          continue;
        }
        const typeMapper = getTypeMapper(schema, schemaMapper, typeName);
        if (null == typeMapper) {
          newTypeMap[typeName] = originalType;
          continue;
        }
        const maybeNewType = typeMapper(originalType, schema);
        if (void 0 === maybeNewType) {
          newTypeMap[typeName] = originalType;
          continue;
        }
        newTypeMap[typeName] = maybeNewType;
      }
    return newTypeMap;
  }
  function mapEnumValues(originalTypeMap, schema, schemaMapper) {
    const enumValueMapper = getEnumValueMapper(schemaMapper);
    if (!enumValueMapper) return originalTypeMap;
    return mapTypes(
      originalTypeMap,
      schema,
      {
        [utils_MapperKind.ENUM_TYPE]: type => {
          const config = type.toConfig();
          const originalEnumValueConfigMap = config.values;
          const newEnumValueConfigMap = {};
          for (const externalValue in originalEnumValueConfigMap) {
            const originalEnumValueConfig = originalEnumValueConfigMap[externalValue];
            const mappedEnumValue = enumValueMapper(originalEnumValueConfig, type.name, schema, externalValue);
            if (void 0 === mappedEnumValue) newEnumValueConfigMap[externalValue] = originalEnumValueConfig;
            else if (Array.isArray(mappedEnumValue)) {
              const [newExternalValue, newEnumValueConfig] = mappedEnumValue;
              newEnumValueConfigMap[newExternalValue] =
                void 0 === newEnumValueConfig ? originalEnumValueConfig : newEnumValueConfig;
            } else if (null !== mappedEnumValue) newEnumValueConfigMap[externalValue] = mappedEnumValue;
          }
          return correctASTNodes(
            new definition_GraphQLEnumType({
              ...config,
              values: newEnumValueConfigMap,
            })
          );
        },
      },
      type => definition_isEnumType(type)
    );
  }
  function mapDefaultValues(originalTypeMap, schema, fn) {
    const newTypeMap = mapArguments(originalTypeMap, schema, {
      [utils_MapperKind.ARGUMENT]: argumentConfig => {
        if (void 0 === argumentConfig.defaultValue) return argumentConfig;
        const maybeNewType = getNewType(originalTypeMap, argumentConfig.type);
        if (null != maybeNewType)
          return {
            ...argumentConfig,
            defaultValue: fn(maybeNewType, argumentConfig.defaultValue),
          };
      },
    });
    return mapFields(newTypeMap, schema, {
      [utils_MapperKind.INPUT_OBJECT_FIELD]: inputFieldConfig => {
        if (void 0 === inputFieldConfig.defaultValue) return inputFieldConfig;
        const maybeNewType = getNewType(newTypeMap, inputFieldConfig.type);
        if (null != maybeNewType)
          return {
            ...inputFieldConfig,
            defaultValue: fn(maybeNewType, inputFieldConfig.defaultValue),
          };
      },
    });
  }
  function getNewType(newTypeMap, type) {
    if (definition_isListType(type)) {
      const newType = getNewType(newTypeMap, type.ofType);
      return null != newType ? new GraphQLList(newType) : null;
    } else if (definition_isNonNullType(type)) {
      const newType = getNewType(newTypeMap, type.ofType);
      return null != newType ? new GraphQLNonNull(newType) : null;
    } else if (definition_isNamedType(type)) {
      const newType = newTypeMap[type.name];
      return null != newType ? newType : null;
    }
    return null;
  }
  function mapFields(originalTypeMap, schema, schemaMapper) {
    const newTypeMap = {};
    for (const typeName in originalTypeMap)
      if (!typeName.startsWith('__')) {
        const originalType = originalTypeMap[typeName];
        if (
          !definition_isObjectType(originalType) &&
          !definition_isInterfaceType(originalType) &&
          !definition_isInputObjectType(originalType)
        ) {
          newTypeMap[typeName] = originalType;
          continue;
        }
        const fieldMapper = getFieldMapper(schema, schemaMapper, typeName);
        if (null == fieldMapper) {
          newTypeMap[typeName] = originalType;
          continue;
        }
        const config = originalType.toConfig();
        const originalFieldConfigMap = config.fields;
        const newFieldConfigMap = {};
        for (const fieldName in originalFieldConfigMap) {
          const originalFieldConfig = originalFieldConfigMap[fieldName];
          const mappedField = fieldMapper(originalFieldConfig, fieldName, typeName, schema);
          if (void 0 === mappedField) newFieldConfigMap[fieldName] = originalFieldConfig;
          else if (Array.isArray(mappedField)) {
            const [newFieldName, newFieldConfig] = mappedField;
            if (null != newFieldConfig.astNode)
              newFieldConfig.astNode = {
                ...newFieldConfig.astNode,
                name: {
                  ...newFieldConfig.astNode.name,
                  value: newFieldName,
                },
              };
            newFieldConfigMap[newFieldName] = void 0 === newFieldConfig ? originalFieldConfig : newFieldConfig;
          } else if (null !== mappedField) newFieldConfigMap[fieldName] = mappedField;
        }
        if (definition_isObjectType(originalType))
          newTypeMap[typeName] = correctASTNodes(
            new definition_GraphQLObjectType({
              ...config,
              fields: newFieldConfigMap,
            })
          );
        else if (definition_isInterfaceType(originalType))
          newTypeMap[typeName] = correctASTNodes(
            new definition_GraphQLInterfaceType({
              ...config,
              fields: newFieldConfigMap,
            })
          );
        else
          newTypeMap[typeName] = correctASTNodes(
            new definition_GraphQLInputObjectType({
              ...config,
              fields: newFieldConfigMap,
            })
          );
      }
    return newTypeMap;
  }
  function mapArguments(originalTypeMap, schema, schemaMapper) {
    const newTypeMap = {};
    for (const typeName in originalTypeMap)
      if (!typeName.startsWith('__')) {
        const originalType = originalTypeMap[typeName];
        if (!definition_isObjectType(originalType) && !definition_isInterfaceType(originalType)) {
          newTypeMap[typeName] = originalType;
          continue;
        }
        const argumentMapper = getArgumentMapper(schemaMapper);
        if (null == argumentMapper) {
          newTypeMap[typeName] = originalType;
          continue;
        }
        const config = originalType.toConfig();
        const originalFieldConfigMap = config.fields;
        const newFieldConfigMap = {};
        for (const fieldName in originalFieldConfigMap) {
          const originalFieldConfig = originalFieldConfigMap[fieldName];
          const originalArgumentConfigMap = originalFieldConfig.args;
          if (null == originalArgumentConfigMap) {
            newFieldConfigMap[fieldName] = originalFieldConfig;
            continue;
          }
          const argumentNames = Object.keys(originalArgumentConfigMap);
          if (!argumentNames.length) {
            newFieldConfigMap[fieldName] = originalFieldConfig;
            continue;
          }
          const newArgumentConfigMap = {};
          for (const argumentName of argumentNames) {
            const originalArgumentConfig = originalArgumentConfigMap[argumentName];
            const mappedArgument = argumentMapper(originalArgumentConfig, fieldName, typeName, schema);
            if (void 0 === mappedArgument) newArgumentConfigMap[argumentName] = originalArgumentConfig;
            else if (Array.isArray(mappedArgument)) {
              const [newArgumentName, newArgumentConfig] = mappedArgument;
              newArgumentConfigMap[newArgumentName] = newArgumentConfig;
            } else if (null !== mappedArgument) newArgumentConfigMap[argumentName] = mappedArgument;
          }
          newFieldConfigMap[fieldName] = {
            ...originalFieldConfig,
            args: newArgumentConfigMap,
          };
        }
        if (definition_isObjectType(originalType))
          newTypeMap[typeName] = new definition_GraphQLObjectType({
            ...config,
            fields: newFieldConfigMap,
          });
        else if (definition_isInterfaceType(originalType))
          newTypeMap[typeName] = new definition_GraphQLInterfaceType({
            ...config,
            fields: newFieldConfigMap,
          });
        else
          newTypeMap[typeName] = new definition_GraphQLInputObjectType({
            ...config,
            fields: newFieldConfigMap,
          });
      }
    return newTypeMap;
  }
  function mapDirectives(originalDirectives, schema, schemaMapper) {
    const directiveMapper = getDirectiveMapper(schemaMapper);
    if (null == directiveMapper) return originalDirectives.slice();
    const newDirectives = [];
    for (const directive of originalDirectives) {
      const mappedDirective = directiveMapper(directive, schema);
      if (void 0 === mappedDirective) newDirectives.push(directive);
      else if (null !== mappedDirective) newDirectives.push(mappedDirective);
    }
    return newDirectives;
  }
  function getTypeSpecifiers(schema, typeName) {
    var _a, _b, _c;
    const type = schema.getType(typeName);
    const specifiers = [utils_MapperKind.TYPE];
    if (definition_isObjectType(type)) {
      specifiers.push(utils_MapperKind.COMPOSITE_TYPE, utils_MapperKind.OBJECT_TYPE);
      if (typeName === (null === (_a = schema.getQueryType()) || void 0 === _a ? void 0 : _a.name))
        specifiers.push(utils_MapperKind.ROOT_OBJECT, utils_MapperKind.QUERY);
      else if (typeName === (null === (_b = schema.getMutationType()) || void 0 === _b ? void 0 : _b.name))
        specifiers.push(utils_MapperKind.ROOT_OBJECT, utils_MapperKind.MUTATION);
      else if (typeName === (null === (_c = schema.getSubscriptionType()) || void 0 === _c ? void 0 : _c.name))
        specifiers.push(utils_MapperKind.ROOT_OBJECT, utils_MapperKind.SUBSCRIPTION);
    } else if (definition_isInputObjectType(type)) specifiers.push(utils_MapperKind.INPUT_OBJECT_TYPE);
    else if (definition_isInterfaceType(type))
      specifiers.push(utils_MapperKind.COMPOSITE_TYPE, utils_MapperKind.ABSTRACT_TYPE, utils_MapperKind.INTERFACE_TYPE);
    else if (definition_isUnionType(type))
      specifiers.push(utils_MapperKind.COMPOSITE_TYPE, utils_MapperKind.ABSTRACT_TYPE, utils_MapperKind.UNION_TYPE);
    else if (definition_isEnumType(type)) specifiers.push(utils_MapperKind.ENUM_TYPE);
    else if (definition_isScalarType(type)) specifiers.push(utils_MapperKind.SCALAR_TYPE);
    return specifiers;
  }
  function getTypeMapper(schema, schemaMapper, typeName) {
    let typeMapper;
    const stack = [...getTypeSpecifiers(schema, typeName)];
    while (!typeMapper && stack.length > 0) typeMapper = schemaMapper[stack.pop()];
    return null != typeMapper ? typeMapper : null;
  }
  function getFieldSpecifiers(schema, typeName) {
    var _a, _b, _c;
    const type = schema.getType(typeName);
    const specifiers = [utils_MapperKind.FIELD];
    if (definition_isObjectType(type)) {
      specifiers.push(utils_MapperKind.COMPOSITE_FIELD, utils_MapperKind.OBJECT_FIELD);
      if (typeName === (null === (_a = schema.getQueryType()) || void 0 === _a ? void 0 : _a.name))
        specifiers.push(utils_MapperKind.ROOT_FIELD, utils_MapperKind.QUERY_ROOT_FIELD);
      else if (typeName === (null === (_b = schema.getMutationType()) || void 0 === _b ? void 0 : _b.name))
        specifiers.push(utils_MapperKind.ROOT_FIELD, utils_MapperKind.MUTATION_ROOT_FIELD);
      else if (typeName === (null === (_c = schema.getSubscriptionType()) || void 0 === _c ? void 0 : _c.name))
        specifiers.push(utils_MapperKind.ROOT_FIELD, utils_MapperKind.SUBSCRIPTION_ROOT_FIELD);
    } else if (definition_isInterfaceType(type))
      specifiers.push(utils_MapperKind.COMPOSITE_FIELD, utils_MapperKind.INTERFACE_FIELD);
    else if (definition_isInputObjectType(type)) specifiers.push(utils_MapperKind.INPUT_OBJECT_FIELD);
    return specifiers;
  }
  function getFieldMapper(schema, schemaMapper, typeName) {
    let fieldMapper;
    const stack = [...getFieldSpecifiers(schema, typeName)];
    while (!fieldMapper && stack.length > 0) fieldMapper = schemaMapper[stack.pop()];
    return null != fieldMapper ? fieldMapper : null;
  }
  function getArgumentMapper(schemaMapper) {
    const argumentMapper = schemaMapper[utils_MapperKind.ARGUMENT];
    return null != argumentMapper ? argumentMapper : null;
  }
  function getDirectiveMapper(schemaMapper) {
    const directiveMapper = schemaMapper[utils_MapperKind.DIRECTIVE];
    return null != directiveMapper ? directiveMapper : null;
  }
  function getEnumValueMapper(schemaMapper) {
    const enumValueMapper = schemaMapper[utils_MapperKind.ENUM_VALUE];
    return null != enumValueMapper ? enumValueMapper : null;
  }
  function correctASTNodes(type) {
    if (definition_isObjectType(type)) {
      const config = type.toConfig();
      if (null != config.astNode) {
        const fields = [];
        for (const fieldName in config.fields) {
          const fieldConfig = config.fields[fieldName];
          if (null != fieldConfig.astNode) fields.push(fieldConfig.astNode);
        }
        config.astNode = {
          ...config.astNode,
          kind: kinds_Kind.OBJECT_TYPE_DEFINITION,
          fields,
        };
      }
      if (null != config.extensionASTNodes)
        config.extensionASTNodes = config.extensionASTNodes.map(node => ({
          ...node,
          kind: kinds_Kind.OBJECT_TYPE_EXTENSION,
          fields: void 0,
        }));
      return new definition_GraphQLObjectType(config);
    } else if (definition_isInterfaceType(type)) {
      const config = type.toConfig();
      if (null != config.astNode) {
        const fields = [];
        for (const fieldName in config.fields) {
          const fieldConfig = config.fields[fieldName];
          if (null != fieldConfig.astNode) fields.push(fieldConfig.astNode);
        }
        config.astNode = {
          ...config.astNode,
          kind: kinds_Kind.INTERFACE_TYPE_DEFINITION,
          fields,
        };
      }
      if (null != config.extensionASTNodes)
        config.extensionASTNodes = config.extensionASTNodes.map(node => ({
          ...node,
          kind: kinds_Kind.INTERFACE_TYPE_EXTENSION,
          fields: void 0,
        }));
      return new definition_GraphQLInterfaceType(config);
    } else if (definition_isInputObjectType(type)) {
      const config = type.toConfig();
      if (null != config.astNode) {
        const fields = [];
        for (const fieldName in config.fields) {
          const fieldConfig = config.fields[fieldName];
          if (null != fieldConfig.astNode) fields.push(fieldConfig.astNode);
        }
        config.astNode = {
          ...config.astNode,
          kind: kinds_Kind.INPUT_OBJECT_TYPE_DEFINITION,
          fields,
        };
      }
      if (null != config.extensionASTNodes)
        config.extensionASTNodes = config.extensionASTNodes.map(node => ({
          ...node,
          kind: kinds_Kind.INPUT_OBJECT_TYPE_EXTENSION,
          fields: void 0,
        }));
      return new definition_GraphQLInputObjectType(config);
    } else if (definition_isEnumType(type)) {
      const config = type.toConfig();
      if (null != config.astNode) {
        const values = [];
        for (const enumKey in config.values) {
          const enumValueConfig = config.values[enumKey];
          if (null != enumValueConfig.astNode) values.push(enumValueConfig.astNode);
        }
        config.astNode = {
          ...config.astNode,
          values,
        };
      }
      if (null != config.extensionASTNodes)
        config.extensionASTNodes = config.extensionASTNodes.map(node => ({
          ...node,
          values: void 0,
        }));
      return new definition_GraphQLEnumType(config);
    } else return type;
  }
  function filterSchema({
    schema,
    typeFilter = () => true,
    fieldFilter,
    rootFieldFilter,
    objectFieldFilter,
    interfaceFieldFilter,
    inputObjectFieldFilter,
    argumentFilter,
  }) {
    return utils_mapSchema(schema, {
      [utils_MapperKind.QUERY]: type => filterRootFields(type, 'Query', rootFieldFilter, argumentFilter),
      [utils_MapperKind.MUTATION]: type => filterRootFields(type, 'Mutation', rootFieldFilter, argumentFilter),
      [utils_MapperKind.SUBSCRIPTION]: type => filterRootFields(type, 'Subscription', rootFieldFilter, argumentFilter),
      [utils_MapperKind.OBJECT_TYPE]: type =>
        typeFilter(type.name, type)
          ? filterElementFields(definition_GraphQLObjectType, type, objectFieldFilter || fieldFilter, argumentFilter)
          : null,
      [utils_MapperKind.INTERFACE_TYPE]: type =>
        typeFilter(type.name, type)
          ? filterElementFields(
              definition_GraphQLInterfaceType,
              type,
              interfaceFieldFilter || fieldFilter,
              argumentFilter
            )
          : null,
      [utils_MapperKind.INPUT_OBJECT_TYPE]: type =>
        typeFilter(type.name, type)
          ? filterElementFields(definition_GraphQLInputObjectType, type, inputObjectFieldFilter || fieldFilter)
          : null,
      [utils_MapperKind.UNION_TYPE]: type => (typeFilter(type.name, type) ? void 0 : null),
      [utils_MapperKind.ENUM_TYPE]: type => (typeFilter(type.name, type) ? void 0 : null),
      [utils_MapperKind.SCALAR_TYPE]: type => (typeFilter(type.name, type) ? void 0 : null),
    });
  }
  function filterRootFields(type, operation, rootFieldFilter, argumentFilter) {
    if (rootFieldFilter || argumentFilter) {
      const config = type.toConfig();
      for (const fieldName in config.fields) {
        const field = config.fields[fieldName];
        if (rootFieldFilter && !rootFieldFilter(operation, fieldName, config.fields[fieldName]))
          delete config.fields[fieldName];
        else if (argumentFilter && field.args)
          for (const argName in field.args)
            if (!argumentFilter(operation, fieldName, argName, field.args[argName])) delete field.args[argName];
      }
      return new definition_GraphQLObjectType(config);
    }
    return type;
  }
  function filterElementFields(ElementConstructor, type, fieldFilter, argumentFilter) {
    if (fieldFilter || argumentFilter) {
      const config = type.toConfig();
      for (const fieldName in config.fields) {
        const field = config.fields[fieldName];
        if (fieldFilter && !fieldFilter(type.name, fieldName, config.fields[fieldName]))
          delete config.fields[fieldName];
        else if (argumentFilter && 'args' in field)
          for (const argName in field.args)
            if (!argumentFilter(type.name, fieldName, argName, field.args[argName])) delete field.args[argName];
      }
      return new ElementConstructor(config);
    }
  }
  function healSchema(schema) {
    healTypes(schema.getTypeMap(), schema.getDirectives());
    return schema;
  }
  function healTypes(originalTypeMap, directives) {
    const actualNamedTypeMap = Object.create(null);
    for (const typeName in originalTypeMap) {
      const namedType = originalTypeMap[typeName];
      if (null == namedType || typeName.startsWith('__')) continue;
      const actualName = namedType.name;
      if (actualName.startsWith('__')) continue;
      if (actualName in actualNamedTypeMap) throw new Error(`Duplicate schema type name ${actualName}`);
      actualNamedTypeMap[actualName] = namedType;
    }
    for (const typeName in actualNamedTypeMap) {
      const namedType = actualNamedTypeMap[typeName];
      originalTypeMap[typeName] = namedType;
    }
    for (const decl of directives)
      decl.args = decl.args.filter(arg => {
        arg.type = healType(arg.type);
        return null !== arg.type;
      });
    for (const typeName in originalTypeMap) {
      const namedType = originalTypeMap[typeName];
      if (!typeName.startsWith('__') && typeName in actualNamedTypeMap) if (null != namedType) healNamedType(namedType);
    }
    for (const typeName in originalTypeMap)
      if (!typeName.startsWith('__') && !(typeName in actualNamedTypeMap)) delete originalTypeMap[typeName];
    function healNamedType(type) {
      if (definition_isObjectType(type)) {
        healFields(type);
        healInterfaces(type);
        return;
      } else if (definition_isInterfaceType(type)) {
        healFields(type);
        if ('getInterfaces' in type) healInterfaces(type);
        return;
      } else if (definition_isUnionType(type)) {
        healUnderlyingTypes(type);
        return;
      } else if (definition_isInputObjectType(type)) {
        healInputFields(type);
        return;
      } else if (definition_isLeafType(type)) return;
      throw new Error(`Unexpected schema type: ${type}`);
    }
    function healFields(type) {
      const fieldMap = type.getFields();
      for (const [key, field] of Object.entries(fieldMap)) {
        field.args
          .map(arg => {
            arg.type = healType(arg.type);
            return null === arg.type ? null : arg;
          })
          .filter(Boolean);
        field.type = healType(field.type);
        if (null === field.type) delete fieldMap[key];
      }
    }
    function healInterfaces(type) {
      if ('getInterfaces' in type) {
        const interfaces = type.getInterfaces();
        interfaces.push(
          ...interfaces
            .splice(0)
            .map(iface => healType(iface))
            .filter(Boolean)
        );
      }
    }
    function healInputFields(type) {
      const fieldMap = type.getFields();
      for (const [key, field] of Object.entries(fieldMap)) {
        field.type = healType(field.type);
        if (null === field.type) delete fieldMap[key];
      }
    }
    function healUnderlyingTypes(type) {
      const types = type.getTypes();
      types.push(
        ...types
          .splice(0)
          .map(t => healType(t))
          .filter(Boolean)
      );
    }
    function healType(type) {
      if (definition_isListType(type)) {
        const healedType = healType(type.ofType);
        return null != healedType ? new GraphQLList(healedType) : null;
      } else if (definition_isNonNullType(type)) {
        const healedType = healType(type.ofType);
        return null != healedType ? new GraphQLNonNull(healedType) : null;
      } else if (definition_isNamedType(type)) {
        const officialType = originalTypeMap[type.name];
        if (officialType && type !== officialType) return officialType;
      }
      return type;
    }
  }
  function forEachField(schema, fn) {
    const typeMap = schema.getTypeMap();
    for (const typeName in typeMap) {
      const type = typeMap[typeName];
      if (!definition_getNamedType(type).name.startsWith('__') && definition_isObjectType(type)) {
        const fields = type.getFields();
        for (const fieldName in fields) fn(fields[fieldName], typeName, fieldName);
      }
    }
  }
  function forEachDefaultValue(schema, fn) {
    const typeMap = schema.getTypeMap();
    for (const typeName in typeMap) {
      const type = typeMap[typeName];
      if (!definition_getNamedType(type).name.startsWith('__'))
        if (definition_isObjectType(type)) {
          const fields = type.getFields();
          for (const fieldName in fields) {
            const field = fields[fieldName];
            for (const arg of field.args) arg.defaultValue = fn(arg.type, arg.defaultValue);
          }
        } else if (definition_isInputObjectType(type)) {
          const fields = type.getFields();
          for (const fieldName in fields) {
            const field = fields[fieldName];
            field.defaultValue = fn(field.type, field.defaultValue);
          }
        }
    }
  }
  function utils_pruneSchema(schema, options = {}) {
    const pruningContext = {
      schema,
      unusedTypes: Object.create(null),
      implementations: Object.create(null),
    };
    for (const typeName in schema.getTypeMap()) {
      const type = schema.getType(typeName);
      if (type && 'getInterfaces' in type)
        for (const iface of type.getInterfaces()) {
          if (null == getImplementations(pruningContext, iface))
            pruningContext.implementations[iface.name] = Object.create(null);
          pruningContext.implementations[iface.name][type.name] = true;
        }
    }
    visitTypes(pruningContext, schema);
    return utils_mapSchema(schema, {
      [utils_MapperKind.TYPE]: type => {
        if (options.skipPruning && options.skipPruning(type)) return type;
        if (definition_isObjectType(type) || definition_isInputObjectType(type)) {
          if (
            (!Object.keys(type.getFields()).length && !options.skipEmptyCompositeTypePruning) ||
            (pruningContext.unusedTypes[type.name] && !options.skipUnusedTypesPruning)
          )
            return null;
        } else if (definition_isUnionType(type)) {
          if (
            (!type.getTypes().length && !options.skipEmptyUnionPruning) ||
            (pruningContext.unusedTypes[type.name] && !options.skipUnusedTypesPruning)
          )
            return null;
        } else if (definition_isInterfaceType(type)) {
          const implementations = getImplementations(pruningContext, type);
          if (
            (!Object.keys(type.getFields()).length && !options.skipEmptyCompositeTypePruning) ||
            (implementations && !Object.keys(implementations).length && !options.skipUnimplementedInterfacesPruning) ||
            (pruningContext.unusedTypes[type.name] && !options.skipUnusedTypesPruning)
          )
            return null;
        } else if (pruningContext.unusedTypes[type.name] && !options.skipUnusedTypesPruning) return null;
      },
    });
  }
  function visitOutputType(visitedTypes, pruningContext, type) {
    if (visitedTypes[type.name]) return;
    visitedTypes[type.name] = true;
    pruningContext.unusedTypes[type.name] = false;
    if (definition_isObjectType(type) || definition_isInterfaceType(type)) {
      const fields = type.getFields();
      for (const fieldName in fields) {
        const field = fields[fieldName];
        visitOutputType(visitedTypes, pruningContext, definition_getNamedType(field.type));
        for (const arg of field.args) visitInputType(visitedTypes, pruningContext, definition_getNamedType(arg.type));
      }
      if (definition_isInterfaceType(type)) {
        const implementations = getImplementations(pruningContext, type);
        if (implementations)
          for (const typeName in implementations)
            visitOutputType(visitedTypes, pruningContext, pruningContext.schema.getType(typeName));
      }
      if ('getInterfaces' in type)
        for (const iFace of type.getInterfaces()) visitOutputType(visitedTypes, pruningContext, iFace);
    } else if (definition_isUnionType(type)) {
      const types = type.getTypes();
      for (const type of types) visitOutputType(visitedTypes, pruningContext, type);
    }
  }
  function getImplementations(pruningContext, type) {
    return pruningContext.implementations[type.name];
  }
  function visitInputType(visitedTypes, pruningContext, type) {
    if (visitedTypes[type.name]) return;
    pruningContext.unusedTypes[type.name] = false;
    visitedTypes[type.name] = true;
    if (definition_isInputObjectType(type)) {
      const fields = type.getFields();
      for (const fieldName in fields)
        visitInputType(visitedTypes, pruningContext, definition_getNamedType(fields[fieldName].type));
    }
  }
  function visitTypes(pruningContext, schema) {
    for (const typeName in schema.getTypeMap())
      if (!typeName.startsWith('__')) pruningContext.unusedTypes[typeName] = true;
    const visitedTypes = Object.create(null);
    const rootTypes = getRootTypes(schema);
    for (const rootType of rootTypes) visitOutputType(visitedTypes, pruningContext, rootType);
    for (const directive of schema.getDirectives())
      for (const arg of directive.args) visitInputType(visitedTypes, pruningContext, definition_getNamedType(arg.type));
  }
  function mergeDeep(sources, respectPrototype = false) {
    const target = sources[0] || {};
    const output = {};
    if (respectPrototype) Object.setPrototypeOf(output, Object.create(Object.getPrototypeOf(target)));
    for (const source of sources)
      if (isObject(target) && isObject(source)) {
        if (respectPrototype) {
          const outputPrototype = Object.getPrototypeOf(output);
          const sourcePrototype = Object.getPrototypeOf(source);
          if (sourcePrototype)
            for (const key of Object.getOwnPropertyNames(sourcePrototype)) {
              const descriptor = Object.getOwnPropertyDescriptor(sourcePrototype, key);
              if (isSome(descriptor)) Object.defineProperty(outputPrototype, key, descriptor);
            }
        }
        for (const key in source)
          if (isObject(source[key]))
            if (!(key in output))
              Object.assign(output, {
                [key]: source[key],
              });
            else output[key] = mergeDeep([output[key], source[key]], respectPrototype);
          else
            Object.assign(output, {
              [key]: source[key],
            });
      }
    return output;
  }
  function isObject(item) {
    return item && 'object' == typeof item && !Array.isArray(item);
  }
  function utils_parseSelectionSet(selectionSet, options) {
    return parser_parse(selectionSet, options).definitions[0].selectionSet;
  }
  function getResponseKeyFromInfo(info) {
    return null != info.fieldNodes[0].alias ? info.fieldNodes[0].alias.value : info.fieldName;
  }
  function mapAsyncIterator(iterator, callback, rejectCallback) {
    let $return;
    let abruptClose;
    if ('function' == typeof iterator.return) {
      $return = iterator.return;
      abruptClose = error => {
        const rethrow = () => Promise.reject(error);
        return $return.call(iterator).then(rethrow, rethrow);
      };
    }
    function mapResult(result) {
      return result.done ? result : asyncMapValue(result.value, callback).then(iteratorResult, abruptClose);
    }
    let mapReject;
    if (rejectCallback) {
      const reject = rejectCallback;
      mapReject = error => asyncMapValue(error, reject).then(iteratorResult, abruptClose);
    }
    return {
      next: () => iterator.next().then(mapResult, mapReject),
      return: () =>
        $return
          ? $return.call(iterator).then(mapResult, mapReject)
          : Promise.resolve({
              value: void 0,
              done: true,
            }),
      throw(error) {
        if ('function' == typeof iterator.throw) return iterator.throw(error).then(mapResult, mapReject);
        return Promise.reject(error).catch(abruptClose);
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  }
  function asyncMapValue(value, callback) {
    return new Promise(resolve => resolve(callback(value)));
  }
  function iteratorResult(value) {
    return {
      value,
      done: false,
    };
  }
  function utils_updateArgument(argumentNodes, variableDefinitionsMap, variableValues, argName, varName, type, value) {
    argumentNodes[argName] = {
      kind: kinds_Kind.ARGUMENT,
      name: {
        kind: kinds_Kind.NAME,
        value: argName,
      },
      value: {
        kind: kinds_Kind.VARIABLE,
        name: {
          kind: kinds_Kind.NAME,
          value: varName,
        },
      },
    };
    variableDefinitionsMap[varName] = {
      kind: kinds_Kind.VARIABLE_DEFINITION,
      variable: {
        kind: kinds_Kind.VARIABLE,
        name: {
          kind: kinds_Kind.NAME,
          value: varName,
        },
      },
      type: astFromType(type),
    };
    if (void 0 !== value) {
      variableValues[varName] = value;
      return;
    }
    if (varName in variableValues) delete variableValues[varName];
  }
  function utils_createVariableNameGenerator(variableDefinitionMap) {
    let varCounter = 0;
    return argName => {
      let varName;
      do {
        varName = `_v${(varCounter++).toString()}_${argName}`;
      } while (varName in variableDefinitionMap);
      return varName;
    };
  }
  function implementsAbstractType(schema, typeA, typeB) {
    if (null == typeB || null == typeA) return false;
    else if (typeA === typeB) return true;
    else if (isCompositeType(typeA) && isCompositeType(typeB)) return doTypesOverlap(schema, typeA, typeB);
    return false;
  }
  function utils_relocatedError(originalError, path) {
    return new GraphQLError(
      originalError.message,
      originalError.nodes,
      originalError.source,
      originalError.positions,
      null === path ? void 0 : void 0 === path ? originalError.path : path,
      originalError.originalError,
      originalError.extensions
    );
  }
  function utils_visitData(data, enter, leave) {
    if (Array.isArray(data)) return data.map(value => utils_visitData(value, enter, leave));
    else if ('object' == typeof data) {
      const newData = null != enter ? enter(data) : data;
      if (null != newData)
        for (const key in newData) {
          const value = newData[key];
          newData[key] = utils_visitData(value, enter, leave);
        }
      return null != leave ? leave(newData) : newData;
    }
    return data;
  }
  function utils_isAsyncIterable(value) {
    return 'object' == typeof value && null != value && Symbol.asyncIterator in value;
  }
  function isDocumentNode(object) {
    return object && 'object' == typeof object && 'kind' in object && object.kind === kinds_Kind.DOCUMENT;
  }
  let commentsRegistry = {};
  function resetComments() {
    commentsRegistry = {};
  }
  function collectComment(node) {
    var _a;
    const entityName = null === (_a = node.name) || void 0 === _a ? void 0 : _a.value;
    if (null == entityName) return;
    pushComment(node, entityName);
    switch (node.kind) {
      case 'EnumTypeDefinition':
        if (node.values) for (const value of node.values) pushComment(value, entityName, value.name.value);
        break;

      case 'ObjectTypeDefinition':
      case 'InputObjectTypeDefinition':
      case 'InterfaceTypeDefinition':
        if (node.fields)
          for (const field of node.fields) {
            pushComment(field, entityName, field.name.value);
            if (isFieldDefinitionNode(field) && field.arguments)
              for (const arg of field.arguments) pushComment(arg, entityName, field.name.value, arg.name.value);
          }
        break;
    }
  }
  function pushComment(node, entity, field, argument) {
    const comment = getDescription(node, {
      commentDescriptions: true,
    });
    if ('string' != typeof comment || 0 === comment.length) return;
    const keys = [entity];
    if (field) {
      keys.push(field);
      if (argument) keys.push(argument);
    }
    const path = keys.join('.');
    if (!commentsRegistry[path]) commentsRegistry[path] = [];
    commentsRegistry[path].push(comment);
  }
  function printComment(comment) {
    return '\n# ' + comment.replace(/\n/g, '\n# ');
  }
  function utils_join(maybeArray, separator) {
    return maybeArray ? maybeArray.filter(x => x).join(separator || '') : '';
  }
  function utils_hasMultilineItems(maybeArray) {
    var _a;
    return null !== (_a = null == maybeArray ? void 0 : maybeArray.some(str => str.includes('\n'))) && void 0 !== _a
      ? _a
      : false;
  }
  function utils_addDescription(cb) {
    return (node, _key, _parent, path, ancestors) => {
      var _a;
      const keys = [];
      const parent = path.reduce((prev, key) => {
        if (['fields', 'arguments', 'values'].includes(key) && prev.name) keys.push(prev.name.value);
        return prev[key];
      }, ancestors[0]);
      const key = [...keys, null === (_a = null == parent ? void 0 : parent.name) || void 0 === _a ? void 0 : _a.value]
        .filter(Boolean)
        .join('.');
      const items = [];
      if (node.kind.includes('Definition') && commentsRegistry[key]) items.push(...commentsRegistry[key]);
      return utils_join([...items.map(printComment), node.description, cb(node)], '\n');
    };
  }
  function utils_indent(maybeString) {
    return maybeString && `  ${maybeString.replace(/\n/g, '\n  ')}`;
  }
  function utils_block(array) {
    return array && 0 !== array.length ? `{\n${utils_indent(utils_join(array, '\n'))}\n}` : '';
  }
  function utils_wrap(start, maybeString, end) {
    return maybeString ? start + maybeString + (end || '') : '';
  }
  function utils_printBlockString(value, isDescription = false) {
    const escaped = value.replace(/"""/g, '\\"""');
    return (' ' === value[0] || '\t' === value[0]) && -1 === value.indexOf('\n')
      ? `"""${escaped.replace(/"$/, '"\n')}"""`
      : `"""\n${isDescription ? escaped : utils_indent(escaped)}\n"""`;
  }
  const utils_printDocASTReducer = {
    Name: {
      leave: node => node.value,
    },
    Variable: {
      leave: node => '$' + node.name,
    },
    Document: {
      leave: node => utils_join(node.definitions, '\n\n'),
    },
    OperationDefinition: {
      leave: node => {
        const varDefs = utils_wrap('(', utils_join(node.variableDefinitions, ', '), ')');
        return (
          utils_join([node.operation, utils_join([node.name, varDefs]), utils_join(node.directives, ' ')], ' ') +
          ' ' +
          node.selectionSet
        );
      },
    },
    VariableDefinition: {
      leave: ({ variable, type, defaultValue, directives }) =>
        variable + ': ' + type + utils_wrap(' = ', defaultValue) + utils_wrap(' ', utils_join(directives, ' ')),
    },
    SelectionSet: {
      leave: ({ selections }) => utils_block(selections),
    },
    Field: {
      leave({ alias, name, arguments: args, directives, selectionSet }) {
        const prefix = utils_wrap('', alias, ': ') + name;
        let argsLine = prefix + utils_wrap('(', utils_join(args, ', '), ')');
        if (argsLine.length > 80) argsLine = prefix + utils_wrap('(\n', utils_indent(utils_join(args, '\n')), '\n)');
        return utils_join([argsLine, utils_join(directives, ' '), selectionSet], ' ');
      },
    },
    Argument: {
      leave: ({ name, value }) => name + ': ' + value,
    },
    FragmentSpread: {
      leave: ({ name, directives }) => '...' + name + utils_wrap(' ', utils_join(directives, ' ')),
    },
    InlineFragment: {
      leave: ({ typeCondition, directives, selectionSet }) =>
        utils_join(['...', utils_wrap('on ', typeCondition), utils_join(directives, ' '), selectionSet], ' '),
    },
    FragmentDefinition: {
      leave: ({ name, typeCondition, variableDefinitions, directives, selectionSet }) =>
        `fragment ${name}${utils_wrap(
          '(',
          utils_join(variableDefinitions, ', '),
          ')'
        )} on ${typeCondition} ${utils_wrap('', utils_join(directives, ' '), ' ')}` + selectionSet,
    },
    IntValue: {
      leave: ({ value }) => value,
    },
    FloatValue: {
      leave: ({ value }) => value,
    },
    StringValue: {
      leave: ({ value, block: isBlockString }) =>
        isBlockString ? utils_printBlockString(value) : JSON.stringify(value),
    },
    BooleanValue: {
      leave: ({ value }) => (value ? 'true' : 'false'),
    },
    NullValue: {
      leave: () => 'null',
    },
    EnumValue: {
      leave: ({ value }) => value,
    },
    ListValue: {
      leave: ({ values }) => '[' + utils_join(values, ', ') + ']',
    },
    ObjectValue: {
      leave: ({ fields }) => '{' + utils_join(fields, ', ') + '}',
    },
    ObjectField: {
      leave: ({ name, value }) => name + ': ' + value,
    },
    Directive: {
      leave: ({ name, arguments: args }) => '@' + name + utils_wrap('(', utils_join(args, ', '), ')'),
    },
    NamedType: {
      leave: ({ name }) => name,
    },
    ListType: {
      leave: ({ type }) => '[' + type + ']',
    },
    NonNullType: {
      leave: ({ type }) => type + '!',
    },
    SchemaDefinition: {
      leave: ({ description, directives, operationTypes }) =>
        utils_wrap('', description, '\n') +
        utils_join(['schema', utils_join(directives, ' '), utils_block(operationTypes)], ' '),
    },
    OperationTypeDefinition: {
      leave: ({ operation, type }) => operation + ': ' + type,
    },
    ScalarTypeDefinition: {
      leave: ({ description, name, directives }) =>
        utils_wrap('', description, '\n') + utils_join(['scalar', name, utils_join(directives, ' ')], ' '),
    },
    ObjectTypeDefinition: {
      leave: ({ description, name, interfaces, directives, fields }) =>
        utils_wrap('', description, '\n') +
        utils_join(
          [
            'type',
            name,
            utils_wrap('implements ', utils_join(interfaces, ' & ')),
            utils_join(directives, ' '),
            utils_block(fields),
          ],
          ' '
        ),
    },
    FieldDefinition: {
      leave: ({ description, name, arguments: args, type, directives }) =>
        utils_wrap('', description, '\n') +
        name +
        (utils_hasMultilineItems(args)
          ? utils_wrap('(\n', utils_indent(utils_join(args, '\n')), '\n)')
          : utils_wrap('(', utils_join(args, ', '), ')')) +
        ': ' +
        type +
        utils_wrap(' ', utils_join(directives, ' ')),
    },
    InputValueDefinition: {
      leave: ({ description, name, type, defaultValue, directives }) =>
        utils_wrap('', description, '\n') +
        utils_join([name + ': ' + type, utils_wrap('= ', defaultValue), utils_join(directives, ' ')], ' '),
    },
    InterfaceTypeDefinition: {
      leave: ({ description, name, interfaces, directives, fields }) =>
        utils_wrap('', description, '\n') +
        utils_join(
          [
            'interface',
            name,
            utils_wrap('implements ', utils_join(interfaces, ' & ')),
            utils_join(directives, ' '),
            utils_block(fields),
          ],
          ' '
        ),
    },
    UnionTypeDefinition: {
      leave: ({ description, name, directives, types }) =>
        utils_wrap('', description, '\n') +
        utils_join(['union', name, utils_join(directives, ' '), utils_wrap('= ', utils_join(types, ' | '))], ' '),
    },
    EnumTypeDefinition: {
      leave: ({ description, name, directives, values }) =>
        utils_wrap('', description, '\n') +
        utils_join(['enum', name, utils_join(directives, ' '), utils_block(values)], ' '),
    },
    EnumValueDefinition: {
      leave: ({ description, name, directives }) =>
        utils_wrap('', description, '\n') + utils_join([name, utils_join(directives, ' ')], ' '),
    },
    InputObjectTypeDefinition: {
      leave: ({ description, name, directives, fields }) =>
        utils_wrap('', description, '\n') +
        utils_join(['input', name, utils_join(directives, ' '), utils_block(fields)], ' '),
    },
    DirectiveDefinition: {
      leave: ({ description, name, arguments: args, repeatable, locations }) =>
        utils_wrap('', description, '\n') +
        'directive @' +
        name +
        (utils_hasMultilineItems(args)
          ? utils_wrap('(\n', utils_indent(utils_join(args, '\n')), '\n)')
          : utils_wrap('(', utils_join(args, ', '), ')')) +
        (repeatable ? ' repeatable' : '') +
        ' on ' +
        utils_join(locations, ' | '),
    },
    SchemaExtension: {
      leave: ({ directives, operationTypes }) =>
        utils_join(['extend schema', utils_join(directives, ' '), utils_block(operationTypes)], ' '),
    },
    ScalarTypeExtension: {
      leave: ({ name, directives }) => utils_join(['extend scalar', name, utils_join(directives, ' ')], ' '),
    },
    ObjectTypeExtension: {
      leave: ({ name, interfaces, directives, fields }) =>
        utils_join(
          [
            'extend type',
            name,
            utils_wrap('implements ', utils_join(interfaces, ' & ')),
            utils_join(directives, ' '),
            utils_block(fields),
          ],
          ' '
        ),
    },
    InterfaceTypeExtension: {
      leave: ({ name, interfaces, directives, fields }) =>
        utils_join(
          [
            'extend interface',
            name,
            utils_wrap('implements ', utils_join(interfaces, ' & ')),
            utils_join(directives, ' '),
            utils_block(fields),
          ],
          ' '
        ),
    },
    UnionTypeExtension: {
      leave: ({ name, directives, types }) =>
        utils_join(
          ['extend union', name, utils_join(directives, ' '), utils_wrap('= ', utils_join(types, ' | '))],
          ' '
        ),
    },
    EnumTypeExtension: {
      leave: ({ name, directives, values }) =>
        utils_join(['extend enum', name, utils_join(directives, ' '), utils_block(values)], ' '),
    },
    InputObjectTypeExtension: {
      leave: ({ name, directives, fields }) =>
        utils_join(['extend input', name, utils_join(directives, ' '), utils_block(fields)], ' '),
    },
  };
  const printDocASTReducerWithComments = Object.keys(utils_printDocASTReducer).reduce(
    (prev, key) => ({
      ...prev,
      [key]: {
        leave: utils_addDescription(utils_printDocASTReducer[key].leave),
      },
    }),
    {}
  );
  function printWithComments(ast) {
    return visitor_visit(ast, printDocASTReducerWithComments);
  }
  function isFieldDefinitionNode(node) {
    return 'FieldDefinition' === node.kind;
  }
  function mergeResolvers(resolversDefinitions, options) {
    if (!resolversDefinitions || (Array.isArray(resolversDefinitions) && 0 === resolversDefinitions.length)) return {};
    if (!Array.isArray(resolversDefinitions)) return resolversDefinitions;
    if (1 === resolversDefinitions.length) return resolversDefinitions[0] || {};
    const resolvers = new Array();
    for (let resolversDefinition of resolversDefinitions) {
      if (Array.isArray(resolversDefinition)) resolversDefinition = mergeResolvers(resolversDefinition);
      if ('object' == typeof resolversDefinition && resolversDefinition) resolvers.push(resolversDefinition);
    }
    const result = mergeDeep(resolvers, true);
    if (null == options ? void 0 : options.exclusions)
      for (const exclusion of options.exclusions) {
        const [typeName, fieldName] = exclusion.split('.');
        if (!fieldName || '*' === fieldName) delete result[typeName];
        else if (result[typeName]) delete result[typeName][fieldName];
      }
    return result;
  }
  function mergeArguments(args1, args2, config) {
    const result = deduplicateArguments([...args2, ...args1].filter(isSome));
    if (config && config.sort) result.sort(compareNodes);
    return result;
  }
  function deduplicateArguments(args) {
    return args.reduce((acc, current) => {
      if (!acc.find(arg => arg.name.value === current.name.value)) return acc.concat([current]);
      return acc;
    }, []);
  }
  function directiveAlreadyExists(directivesArr, otherDirective) {
    return !!directivesArr.find(directive => directive.name.value === otherDirective.name.value);
  }
  function nameAlreadyExists(name, namesArr) {
    return namesArr.some(({ value }) => value === name.value);
  }
  function mergeArguments$1(a1, a2) {
    const result = [...a2];
    for (const argument of a1) {
      const existingIndex = result.findIndex(a => a.name.value === argument.name.value);
      if (existingIndex > -1) {
        const existingArg = result[existingIndex];
        if ('ListValue' === existingArg.value.kind) {
          const source = existingArg.value.values;
          const target = argument.value.values;
          existingArg.value.values = deduplicateLists(source, target, (targetVal, source) => {
            const value = targetVal.value;
            return !value || !source.some(sourceVal => sourceVal.value === value);
          });
        } else existingArg.value = argument.value;
      } else result.push(argument);
    }
    return result;
  }
  function deduplicateDirectives(directives) {
    return directives
      .map((directive, i, all) => {
        const firstAt = all.findIndex(d => d.name.value === directive.name.value);
        if (firstAt !== i) {
          const dup = all[firstAt];
          directive.arguments = mergeArguments$1(directive.arguments, dup.arguments);
          return null;
        }
        return directive;
      })
      .filter(isSome);
  }
  function mergeDirectives(d1 = [], d2 = [], config) {
    const reverseOrder = config && config.reverseDirectives;
    const asFirst = reverseOrder ? d2 : d1;
    const result = deduplicateDirectives([...(reverseOrder ? d1 : d2)]);
    for (const directive of asFirst)
      if (directiveAlreadyExists(result, directive)) {
        const existingDirectiveIndex = result.findIndex(d => d.name.value === directive.name.value);
        const existingDirective = result[existingDirectiveIndex];
        result[existingDirectiveIndex].arguments = mergeArguments$1(
          directive.arguments || [],
          existingDirective.arguments || []
        );
      } else result.push(directive);
    return result;
  }
  function validateInputs(node, existingNode) {
    const printedNode = printer_print({
      ...node,
      description: void 0,
    });
    const printedExistingNode = printer_print({
      ...existingNode,
      description: void 0,
    });
    const leaveInputs = new RegExp('(directive @w*d*)|( on .*$)', 'g');
    if (!(printedNode.replace(leaveInputs, '') === printedExistingNode.replace(leaveInputs, '')))
      throw new Error(
        `Unable to merge GraphQL directive "${node.name.value}". \nExisting directive:  \n\t${printedExistingNode} \nReceived directive: \n\t${printedNode}`
      );
  }
  function mergeDirective(node, existingNode) {
    if (existingNode) {
      validateInputs(node, existingNode);
      return {
        ...node,
        locations: [
          ...existingNode.locations,
          ...node.locations.filter(name => !nameAlreadyExists(name, existingNode.locations)),
        ],
      };
    }
    return node;
  }
  function deduplicateLists(source, target, filterFn) {
    return source.concat(target.filter(val => filterFn(val, source)));
  }
  function mergeEnumValues(first, second, config) {
    if (null == config ? void 0 : config.consistentEnumMerge) {
      const reversed = [];
      if (first) reversed.push(...first);
      first = second;
      second = reversed;
    }
    const enumValueMap = new Map();
    if (first) for (const firstValue of first) enumValueMap.set(firstValue.name.value, firstValue);
    if (second)
      for (const secondValue of second) {
        const enumValue = secondValue.name.value;
        if (enumValueMap.has(enumValue)) {
          const firstValue = enumValueMap.get(enumValue);
          firstValue.description = secondValue.description || firstValue.description;
          firstValue.directives = mergeDirectives(secondValue.directives, firstValue.directives);
        } else enumValueMap.set(enumValue, secondValue);
      }
    const result = [...enumValueMap.values()];
    if (config && config.sort) result.sort(compareNodes);
    return result;
  }
  function mergeEnum(e1, e2, config) {
    if (e2)
      return {
        name: e1.name,
        description: e1['description'] || e2['description'],
        kind:
          (config && config.convertExtensions) || 'EnumTypeDefinition' === e1.kind || 'EnumTypeDefinition' === e2.kind
            ? 'EnumTypeDefinition'
            : 'EnumTypeExtension',
        loc: e1.loc,
        directives: mergeDirectives(e1.directives, e2.directives, config),
        values: mergeEnumValues(e1.values, e2.values, config),
      };
    return config && config.convertExtensions
      ? {
          ...e1,
          kind: 'EnumTypeDefinition',
        }
      : e1;
  }
  function isStringTypes(types) {
    return 'string' == typeof types;
  }
  function isSourceTypes(types) {
    return types instanceof source_Source;
  }
  function extractType(type) {
    let visitedType = type;
    while (visitedType.kind === kinds_Kind.LIST_TYPE || 'NonNullType' === visitedType.kind)
      visitedType = visitedType.type;
    return visitedType;
  }
  function isWrappingTypeNode(type) {
    return type.kind !== kinds_Kind.NAMED_TYPE;
  }
  function isListTypeNode(type) {
    return type.kind === kinds_Kind.LIST_TYPE;
  }
  function isNonNullTypeNode(type) {
    return type.kind === kinds_Kind.NON_NULL_TYPE;
  }
  function printTypeNode(type) {
    if (isListTypeNode(type)) return `[${printTypeNode(type.type)}]`;
    if (isNonNullTypeNode(type)) return `${printTypeNode(type.type)}!`;
    return type.name.value;
  }
  var CompareVal;
  (function (CompareVal) {
    CompareVal[(CompareVal['A_SMALLER_THAN_B'] = -1)] = 'A_SMALLER_THAN_B';
    CompareVal[(CompareVal['A_EQUALS_B'] = 0)] = 'A_EQUALS_B';
    CompareVal[(CompareVal['A_GREATER_THAN_B'] = 1)] = 'A_GREATER_THAN_B';
  })(CompareVal || (CompareVal = {}));
  function defaultStringComparator(a, b) {
    if (null == a && null == b) return CompareVal.A_EQUALS_B;
    if (null == a) return CompareVal.A_SMALLER_THAN_B;
    if (null == b) return CompareVal.A_GREATER_THAN_B;
    if (a < b) return CompareVal.A_SMALLER_THAN_B;
    if (a > b) return CompareVal.A_GREATER_THAN_B;
    return CompareVal.A_EQUALS_B;
  }
  function fieldAlreadyExists(fieldsArr, otherField, config) {
    const result = fieldsArr.find(field => field.name.value === otherField.name.value);
    if (result && !(null == config ? void 0 : config.ignoreFieldConflicts)) {
      const t1 = extractType(result.type);
      const t2 = extractType(otherField.type);
      if (t1.name.value !== t2.name.value)
        throw new Error(
          `Field "${otherField.name.value}" already defined with a different type. Declared as "${t1.name.value}", but you tried to override with "${t2.name.value}"`
        );
    }
    return !!result;
  }
  function mergeFields(type, f1, f2, config) {
    const result = [];
    if (null != f2) result.push(...f2);
    if (null != f1)
      for (const field of f1)
        if (fieldAlreadyExists(result, field, config)) {
          const existing = result.find(f => f.name.value === field.name.value);
          if (!(null == config ? void 0 : config.ignoreFieldConflicts)) {
            if (null == config ? void 0 : config.throwOnConflict) preventConflicts(type, existing, field, false);
            else preventConflicts(type, existing, field, true);
            if (isNonNullTypeNode(field.type) && !isNonNullTypeNode(existing.type)) existing.type = field.type;
          }
          existing.arguments = mergeArguments(field['arguments'] || [], existing.arguments || [], config);
          existing.directives = mergeDirectives(field.directives, existing.directives, config);
          existing.description = field.description || existing.description;
        } else result.push(field);
    if (config && config.sort) result.sort(compareNodes);
    if (config && config.exclusions) {
      const exclusions = config.exclusions;
      return result.filter(field => !exclusions.includes(`${type.name.value}.${field.name.value}`));
    }
    return result;
  }
  function preventConflicts(type, a, b, ignoreNullability = false) {
    const aType = printTypeNode(a.type);
    const bType = printTypeNode(b.type);
    if (isNotEqual(aType, bType))
      if (false === safeChangeForFieldType(a.type, b.type, ignoreNullability))
        throw new Error(`Field '${type.name.value}.${a.name.value}' changed type from '${aType}' to '${bType}'`);
  }
  function safeChangeForFieldType(oldType, newType, ignoreNullability = false) {
    if (!isWrappingTypeNode(oldType) && !isWrappingTypeNode(newType)) return oldType.toString() === newType.toString();
    if (isNonNullTypeNode(newType))
      return safeChangeForFieldType(isNonNullTypeNode(oldType) ? oldType.type : oldType, newType.type);
    if (isNonNullTypeNode(oldType)) return safeChangeForFieldType(newType, oldType, ignoreNullability);
    if (isListTypeNode(oldType))
      return (
        (isListTypeNode(newType) && safeChangeForFieldType(oldType.type, newType.type)) ||
        (isNonNullTypeNode(newType) && safeChangeForFieldType(oldType, newType['type']))
      );
    return false;
  }
  function mergeInputType(node, existingNode, config) {
    if (existingNode)
      try {
        return {
          name: node.name,
          description: node['description'] || existingNode['description'],
          kind:
            (config && config.convertExtensions) ||
            'InputObjectTypeDefinition' === node.kind ||
            'InputObjectTypeDefinition' === existingNode.kind
              ? 'InputObjectTypeDefinition'
              : 'InputObjectTypeExtension',
          loc: node.loc,
          fields: mergeFields(node, node.fields, existingNode.fields, config),
          directives: mergeDirectives(node.directives, existingNode.directives, config),
        };
      } catch (e) {
        throw new Error(`Unable to merge GraphQL input type "${node.name.value}": ${e.message}`);
      }
    return config && config.convertExtensions
      ? {
          ...node,
          kind: 'InputObjectTypeDefinition',
        }
      : node;
  }
  function mergeInterface(node, existingNode, config) {
    if (existingNode)
      try {
        return {
          name: node.name,
          description: node['description'] || existingNode['description'],
          kind:
            (config && config.convertExtensions) ||
            'InterfaceTypeDefinition' === node.kind ||
            'InterfaceTypeDefinition' === existingNode.kind
              ? 'InterfaceTypeDefinition'
              : 'InterfaceTypeExtension',
          loc: node.loc,
          fields: mergeFields(node, node.fields, existingNode.fields, config),
          directives: mergeDirectives(node.directives, existingNode.directives, config),
        };
      } catch (e) {
        throw new Error(`Unable to merge GraphQL interface "${node.name.value}": ${e.message}`);
      }
    return config && config.convertExtensions
      ? {
          ...node,
          kind: 'InterfaceTypeDefinition',
        }
      : node;
  }
  function alreadyExists(arr, other) {
    return !!arr.find(i => i.name.value === other.name.value);
  }
  function mergeNamedTypeArray(first = [], second = [], config = {}) {
    const result = [...second, ...first.filter(d => !alreadyExists(second, d))];
    if (config && config.sort) result.sort(compareNodes);
    return result;
  }
  function mergeType(node, existingNode, config) {
    if (existingNode)
      try {
        return {
          name: node.name,
          description: node['description'] || existingNode['description'],
          kind:
            (config && config.convertExtensions) ||
            'ObjectTypeDefinition' === node.kind ||
            'ObjectTypeDefinition' === existingNode.kind
              ? 'ObjectTypeDefinition'
              : 'ObjectTypeExtension',
          loc: node.loc,
          fields: mergeFields(node, node.fields, existingNode.fields, config),
          directives: mergeDirectives(node.directives, existingNode.directives, config),
          interfaces: mergeNamedTypeArray(node.interfaces, existingNode.interfaces, config),
        };
      } catch (e) {
        throw new Error(`Unable to merge GraphQL type "${node.name.value}": ${e.message}`);
      }
    return config && config.convertExtensions
      ? {
          ...node,
          kind: 'ObjectTypeDefinition',
        }
      : node;
  }
  function mergeScalar(node, existingNode, config) {
    if (existingNode)
      return {
        name: node.name,
        description: node['description'] || existingNode['description'],
        kind:
          (config && config.convertExtensions) ||
          'ScalarTypeDefinition' === node.kind ||
          'ScalarTypeDefinition' === existingNode.kind
            ? 'ScalarTypeDefinition'
            : 'ScalarTypeExtension',
        loc: node.loc,
        directives: mergeDirectives(node.directives, existingNode.directives, config),
      };
    return config && config.convertExtensions
      ? {
          ...node,
          kind: 'ScalarTypeDefinition',
        }
      : node;
  }
  function mergeUnion(first, second, config) {
    if (second)
      return {
        name: first.name,
        description: first['description'] || second['description'],
        directives: mergeDirectives(first.directives, second.directives, config),
        kind:
          (config && config.convertExtensions) ||
          'UnionTypeDefinition' === first.kind ||
          'UnionTypeDefinition' === second.kind
            ? 'UnionTypeDefinition'
            : 'UnionTypeExtension',
        loc: first.loc,
        types: mergeNamedTypeArray(first.types, second.types, config),
      };
    return config && config.convertExtensions
      ? {
          ...first,
          kind: 'UnionTypeDefinition',
        }
      : first;
  }
  const DEFAULT_OPERATION_TYPE_NAME_MAP = {
    query: 'Query',
    mutation: 'Mutation',
    subscription: 'Subscription',
  };
  function mergeOperationTypes(opNodeList = [], existingOpNodeList = []) {
    const finalOpNodeList = [];
    for (const opNodeType in DEFAULT_OPERATION_TYPE_NAME_MAP) {
      const opNode =
        opNodeList.find(n => n.operation === opNodeType) || existingOpNodeList.find(n => n.operation === opNodeType);
      if (opNode) finalOpNodeList.push(opNode);
    }
    return finalOpNodeList;
  }
  function mergeSchemaDefs(node, existingNode, config) {
    if (existingNode)
      return {
        kind:
          node.kind === kinds_Kind.SCHEMA_DEFINITION || existingNode.kind === kinds_Kind.SCHEMA_DEFINITION
            ? kinds_Kind.SCHEMA_DEFINITION
            : kinds_Kind.SCHEMA_EXTENSION,
        description: node['description'] || existingNode['description'],
        directives: mergeDirectives(node.directives, existingNode.directives, config),
        operationTypes: mergeOperationTypes(node.operationTypes, existingNode.operationTypes),
      };
    return (null == config ? void 0 : config.convertExtensions)
      ? {
          ...node,
          kind: kinds_Kind.SCHEMA_EXTENSION,
        }
      : node;
  }
  function isNamedDefinitionNode(definitionNode) {
    return 'name' in definitionNode;
  }
  function mergeGraphQLNodes(nodes, config) {
    var _a, _b, _c;
    const mergedResultMap = {};
    for (const nodeDefinition of nodes)
      if (isNamedDefinitionNode(nodeDefinition)) {
        const name = null === (_a = nodeDefinition.name) || void 0 === _a ? void 0 : _a.value;
        if (null == config ? void 0 : config.commentDescriptions) collectComment(nodeDefinition);
        if (null == name) continue;
        if (
          (null === (_b = null == config ? void 0 : config.exclusions) || void 0 === _b
            ? void 0
            : _b.includes(name + '.*')) ||
          (null === (_c = null == config ? void 0 : config.exclusions) || void 0 === _c ? void 0 : _c.includes(name))
        )
          delete mergedResultMap[name];
        else
          switch (nodeDefinition.kind) {
            case kinds_Kind.OBJECT_TYPE_DEFINITION:
            case kinds_Kind.OBJECT_TYPE_EXTENSION:
              mergedResultMap[name] = mergeType(nodeDefinition, mergedResultMap[name], config);
              break;

            case kinds_Kind.ENUM_TYPE_DEFINITION:
            case kinds_Kind.ENUM_TYPE_EXTENSION:
              mergedResultMap[name] = mergeEnum(nodeDefinition, mergedResultMap[name], config);
              break;

            case kinds_Kind.UNION_TYPE_DEFINITION:
            case kinds_Kind.UNION_TYPE_EXTENSION:
              mergedResultMap[name] = mergeUnion(nodeDefinition, mergedResultMap[name], config);
              break;

            case kinds_Kind.SCALAR_TYPE_DEFINITION:
            case kinds_Kind.SCALAR_TYPE_EXTENSION:
              mergedResultMap[name] = mergeScalar(nodeDefinition, mergedResultMap[name], config);
              break;

            case kinds_Kind.INPUT_OBJECT_TYPE_DEFINITION:
            case kinds_Kind.INPUT_OBJECT_TYPE_EXTENSION:
              mergedResultMap[name] = mergeInputType(nodeDefinition, mergedResultMap[name], config);
              break;

            case kinds_Kind.INTERFACE_TYPE_DEFINITION:
            case kinds_Kind.INTERFACE_TYPE_EXTENSION:
              mergedResultMap[name] = mergeInterface(nodeDefinition, mergedResultMap[name], config);
              break;

            case kinds_Kind.DIRECTIVE_DEFINITION:
              mergedResultMap[name] = mergeDirective(nodeDefinition, mergedResultMap[name]);
              break;
          }
      } else if (
        nodeDefinition.kind === kinds_Kind.SCHEMA_DEFINITION ||
        nodeDefinition.kind === kinds_Kind.SCHEMA_EXTENSION
      )
        mergedResultMap['SCHEMA_DEF_SYMBOL'] = mergeSchemaDefs(
          nodeDefinition,
          mergedResultMap['SCHEMA_DEF_SYMBOL'],
          config
        );
    return mergedResultMap;
  }
  function mergeTypeDefs(typeSource, config) {
    resetComments();
    const doc = {
      kind: kinds_Kind.DOCUMENT,
      definitions: mergeGraphQLTypes(typeSource, {
        useSchemaDefinition: true,
        forceSchemaDefinition: false,
        throwOnConflict: false,
        commentDescriptions: false,
        ...config,
      }),
    };
    let result;
    if (config && config.commentDescriptions) result = printWithComments(doc);
    else result = doc;
    resetComments();
    return result;
  }
  function visitTypeSources(typeSource, options, allNodes = [], visitedTypeSources = new Set()) {
    if (typeSource && !visitedTypeSources.has(typeSource)) {
      visitedTypeSources.add(typeSource);
      if ('function' == typeof typeSource) visitTypeSources(typeSource(), options, allNodes, visitedTypeSources);
      else if (Array.isArray(typeSource))
        for (const type of typeSource) visitTypeSources(type, options, allNodes, visitedTypeSources);
      else if (isSchema(typeSource))
        visitTypeSources(
          getDocumentNodeFromSchema(typeSource, options).definitions,
          options,
          allNodes,
          visitedTypeSources
        );
      else if (isStringTypes(typeSource) || isSourceTypes(typeSource))
        visitTypeSources(parser_parse(typeSource, options).definitions, options, allNodes, visitedTypeSources);
      else if ('object' == typeof typeSource && isDefinitionNode(typeSource)) allNodes.push(typeSource);
      else if (isDocumentNode(typeSource))
        visitTypeSources(typeSource.definitions, options, allNodes, visitedTypeSources);
      else
        throw new Error(
          'typeDefs must contain only strings, documents, schemas, or functions, got ' + typeof typeSource
        );
    }
    return allNodes;
  }
  function mergeGraphQLTypes(typeSource, config) {
    var _a, _b, _c;
    resetComments();
    const mergedNodes = mergeGraphQLNodes(visitTypeSources(typeSource, config), config);
    if (null == config ? void 0 : config.useSchemaDefinition) {
      const schemaDef = mergedNodes['SCHEMA_DEF_SYMBOL'] || {
        kind: kinds_Kind.SCHEMA_DEFINITION,
        operationTypes: [],
      };
      const operationTypes = schemaDef.operationTypes;
      for (const opTypeDefNodeType in DEFAULT_OPERATION_TYPE_NAME_MAP)
        if (!operationTypes.find(operationType => operationType.operation === opTypeDefNodeType)) {
          const existingPossibleRootType = mergedNodes[DEFAULT_OPERATION_TYPE_NAME_MAP[opTypeDefNodeType]];
          if (null != existingPossibleRootType && null != existingPossibleRootType.name)
            operationTypes.push({
              kind: kinds_Kind.OPERATION_TYPE_DEFINITION,
              type: {
                kind: kinds_Kind.NAMED_TYPE,
                name: existingPossibleRootType.name,
              },
              operation: opTypeDefNodeType,
            });
        }
      if (
        null !=
          (null === (_a = null == schemaDef ? void 0 : schemaDef.operationTypes) || void 0 === _a
            ? void 0
            : _a.length) &&
        schemaDef.operationTypes.length > 0
      )
        mergedNodes['SCHEMA_DEF_SYMBOL'] = schemaDef;
    }
    if (
      (null == config ? void 0 : config.forceSchemaDefinition) &&
      !(null ===
        (_c = null === (_b = mergedNodes['SCHEMA_DEF_SYMBOL']) || void 0 === _b ? void 0 : _b.operationTypes) ||
      void 0 === _c
        ? void 0
        : _c.length)
    )
      mergedNodes['SCHEMA_DEF_SYMBOL'] = {
        kind: kinds_Kind.SCHEMA_DEFINITION,
        operationTypes: [
          {
            kind: kinds_Kind.OPERATION_TYPE_DEFINITION,
            operation: 'query',
            type: {
              kind: kinds_Kind.NAMED_TYPE,
              name: {
                kind: kinds_Kind.NAME,
                value: 'Query',
              },
            },
          },
        ],
      };
    const mergedNodeDefinitions = Object.values(mergedNodes);
    if (null == config ? void 0 : config.sort) {
      const sortFn = 'function' == typeof config.sort ? config.sort : defaultStringComparator;
      mergedNodeDefinitions.sort((a, b) => {
        var _a, _b;
        return sortFn(
          null === (_a = a.name) || void 0 === _a ? void 0 : _a.value,
          null === (_b = b.name) || void 0 === _b ? void 0 : _b.value
        );
      });
    }
    return mergedNodeDefinitions;
  }
  function mergeExtensions(extensions) {
    return mergeDeep(extensions);
  }
  function applyExtensionObject(obj, extensions) {
    if (!obj) return;
    obj.extensions = mergeDeep([obj.extensions || {}, extensions || {}]);
  }
  function applyExtensions(schema, extensions) {
    applyExtensionObject(schema, extensions.schemaExtensions);
    for (const [typeName, data] of Object.entries(extensions.types || {})) {
      const type = schema.getType(typeName);
      if (type) {
        applyExtensionObject(type, data.extensions);
        if ('object' === data.type || 'interface' === data.type)
          for (const [fieldName, fieldData] of Object.entries(data.fields)) {
            const field = type.getFields()[fieldName];
            if (field) {
              applyExtensionObject(field, fieldData.extensions);
              for (const [arg, argData] of Object.entries(fieldData.arguments))
                applyExtensionObject(
                  field.args.find(a => a.name === arg),
                  argData
                );
            }
          }
        else if ('input' === data.type)
          for (const [fieldName, fieldData] of Object.entries(data.fields))
            applyExtensionObject(type.getFields()[fieldName], fieldData.extensions);
        else if ('enum' === data.type)
          for (const [valueName, valueData] of Object.entries(data.values))
            applyExtensionObject(type.getValue(valueName), valueData);
      }
    }
    return schema;
  }
  function assertResolversPresent(schema, resolverValidationOptions = {}) {
    const { requireResolversForArgs, requireResolversForNonScalar, requireResolversForAllFields } =
      resolverValidationOptions;
    if (requireResolversForAllFields && (requireResolversForArgs || requireResolversForNonScalar))
      throw new TypeError(
        'requireResolversForAllFields takes precedence over the more specific assertions. Please configure either requireResolversForAllFields or requireResolversForArgs / requireResolversForNonScalar, but not a combination of them.'
      );
    forEachField(schema, (field, typeName, fieldName) => {
      if (requireResolversForAllFields)
        expectResolver('requireResolversForAllFields', requireResolversForAllFields, field, typeName, fieldName);
      if (requireResolversForArgs && field.args.length > 0)
        expectResolver('requireResolversForArgs', requireResolversForArgs, field, typeName, fieldName);
      if ('ignore' !== requireResolversForNonScalar && !definition_isScalarType(definition_getNamedType(field.type)))
        expectResolver('requireResolversForNonScalar', requireResolversForNonScalar, field, typeName, fieldName);
    });
  }
  function expectResolver(validator, behavior, field, typeName, fieldName) {
    if (!field.resolve) {
      const message = `Resolver missing for "${typeName}.${fieldName}".\nTo disable this validator, use:\n  resolverValidationOptions: {\n    ${validator}: 'ignore'\n  }`;
      if ('error' === behavior) throw new Error(message);
      if ('warn' === behavior) console.warn(message);
      return;
    }
    if ('function' != typeof field.resolve) throw new Error(`Resolver "${typeName}.${fieldName}" must be a function`);
  }
  function checkForResolveTypeResolver(schema, requireResolversForResolveType) {
    utils_mapSchema(schema, {
      [utils_MapperKind.ABSTRACT_TYPE]: type => {
        if (!type.resolveType) {
          const message = `Type "${type.name}" is missing a "__resolveType" resolver. Pass 'ignore' into "resolverValidationOptions.requireResolversForResolveType" to disable this error.`;
          if ('error' === requireResolversForResolveType) throw new Error(message);
          if ('warn' === requireResolversForResolveType) console.warn(message);
        }
        return;
      },
    });
  }
  function extendResolversFromInterfaces(schema, resolvers) {
    const extendedResolvers = {};
    const typeMap = schema.getTypeMap();
    for (const typeName in typeMap) {
      const type = typeMap[typeName];
      if ('getInterfaces' in type) {
        extendedResolvers[typeName] = {};
        for (const iFace of type.getInterfaces())
          if (resolvers[iFace.name])
            for (const fieldName in resolvers[iFace.name])
              if ('__isTypeOf' === fieldName || !fieldName.startsWith('__'))
                extendedResolvers[typeName][fieldName] = resolvers[iFace.name][fieldName];
        const typeResolvers = resolvers[typeName];
        extendedResolvers[typeName] = {
          ...extendedResolvers[typeName],
          ...typeResolvers,
        };
      } else {
        const typeResolvers = resolvers[typeName];
        if (null != typeResolvers) extendedResolvers[typeName] = typeResolvers;
      }
    }
    return extendedResolvers;
  }
  function addResolversToSchema(schemaOrOptions, legacyInputResolvers, legacyInputValidationOptions) {
    const options = isSchema(schemaOrOptions)
      ? {
          schema: schemaOrOptions,
          resolvers: null != legacyInputResolvers ? legacyInputResolvers : {},
          resolverValidationOptions: legacyInputValidationOptions,
        }
      : schemaOrOptions;
    let {
      schema,
      resolvers: inputResolvers,
      defaultFieldResolver,
      resolverValidationOptions = {},
      inheritResolversFromInterfaces = false,
      updateResolversInPlace = false,
    } = options;
    const { requireResolversToMatchSchema = 'error', requireResolversForResolveType } = resolverValidationOptions;
    const resolvers = inheritResolversFromInterfaces
      ? extendResolversFromInterfaces(schema, inputResolvers)
      : inputResolvers;
    for (const typeName in resolvers) {
      const resolverValue = resolvers[typeName];
      if ('object' != typeof resolverValue)
        throw new Error(
          `"${typeName}" defined in resolvers, but has invalid value "${resolverValue}". The resolver's value must be of type object.`
        );
      const type = schema.getType(typeName);
      if (null == type) {
        if ('ignore' === requireResolversToMatchSchema) break;
        throw new Error(`"${typeName}" defined in resolvers, but not in schema`);
      } else if (scalars_isSpecifiedScalarType(type))
        for (const fieldName in resolverValue)
          if (fieldName.startsWith('__')) type[fieldName.substring(2)] = resolverValue[fieldName];
          else type[fieldName] = resolverValue[fieldName];
      else if (definition_isEnumType(type)) {
        const values = type.getValues();
        for (const fieldName in resolverValue)
          if (
            !fieldName.startsWith('__') &&
            !values.some(value => value.name === fieldName) &&
            requireResolversToMatchSchema &&
            'ignore' !== requireResolversToMatchSchema
          )
            throw new Error(`${type.name}.${fieldName} was defined in resolvers, but not present within ${type.name}`);
      } else if (definition_isUnionType(type)) {
        for (const fieldName in resolverValue)
          if (
            !fieldName.startsWith('__') &&
            requireResolversToMatchSchema &&
            'ignore' !== requireResolversToMatchSchema
          )
            throw new Error(
              `${type.name}.${fieldName} was defined in resolvers, but ${type.name} is not an object or interface type`
            );
      } else if (definition_isObjectType(type) || definition_isInterfaceType(type))
        for (const fieldName in resolverValue)
          if (!fieldName.startsWith('__'))
            if (null == type.getFields()[fieldName]) {
              if (requireResolversToMatchSchema && 'ignore' !== requireResolversToMatchSchema)
                throw new Error(`${typeName}.${fieldName} defined in resolvers, but not in schema`);
            } else {
              const fieldResolve = resolverValue[fieldName];
              if ('function' != typeof fieldResolve && 'object' != typeof fieldResolve)
                throw new Error(`Resolver ${typeName}.${fieldName} must be object or function`);
            }
    }
    schema = updateResolversInPlace
      ? addResolversToExistingSchema(schema, resolvers, defaultFieldResolver)
      : createNewSchemaWithResolvers(schema, resolvers, defaultFieldResolver);
    if (requireResolversForResolveType && 'ignore' !== requireResolversForResolveType)
      checkForResolveTypeResolver(schema, requireResolversForResolveType);
    return schema;
  }
  function addResolversToExistingSchema(schema, resolvers, defaultFieldResolver) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
    const typeMap = schema.getTypeMap();
    for (const typeName in resolvers) {
      const type = schema.getType(typeName);
      const resolverValue = resolvers[typeName];
      if (definition_isScalarType(type))
        for (const fieldName in resolverValue)
          if (fieldName.startsWith('__')) type[fieldName.substring(2)] = resolverValue[fieldName];
          else if ('astNode' === fieldName && null != type.astNode)
            type.astNode = {
              ...type.astNode,
              description:
                null !==
                  (_c =
                    null === (_b = null === (_a = resolverValue) || void 0 === _a ? void 0 : _a.astNode) ||
                    void 0 === _b
                      ? void 0
                      : _b.description) && void 0 !== _c
                  ? _c
                  : type.astNode.description,
              directives: (null !== (_d = type.astNode.directives) && void 0 !== _d ? _d : []).concat(
                null !==
                  (_g =
                    null === (_f = null === (_e = resolverValue) || void 0 === _e ? void 0 : _e.astNode) ||
                    void 0 === _f
                      ? void 0
                      : _f.directives) && void 0 !== _g
                  ? _g
                  : []
              ),
            };
          else if ('extensionASTNodes' === fieldName && null != type.extensionASTNodes)
            type.extensionASTNodes = type.extensionASTNodes.concat(
              null !== (_j = null === (_h = resolverValue) || void 0 === _h ? void 0 : _h.extensionASTNodes) &&
                void 0 !== _j
                ? _j
                : []
            );
          else if ('extensions' === fieldName && null != type.extensions && null != resolverValue.extensions)
            type.extensions = Object.assign({}, type.extensions, resolverValue.extensions);
          else type[fieldName] = resolverValue[fieldName];
      else if (definition_isEnumType(type)) {
        const config = type.toConfig();
        const enumValueConfigMap = config.values;
        for (const fieldName in resolverValue)
          if (fieldName.startsWith('__')) config[fieldName.substring(2)] = resolverValue[fieldName];
          else if ('astNode' === fieldName && null != config.astNode)
            config.astNode = {
              ...config.astNode,
              description:
                null !==
                  (_m =
                    null === (_l = null === (_k = resolverValue) || void 0 === _k ? void 0 : _k.astNode) ||
                    void 0 === _l
                      ? void 0
                      : _l.description) && void 0 !== _m
                  ? _m
                  : config.astNode.description,
              directives: (null !== (_o = config.astNode.directives) && void 0 !== _o ? _o : []).concat(
                null !==
                  (_r =
                    null === (_q = null === (_p = resolverValue) || void 0 === _p ? void 0 : _p.astNode) ||
                    void 0 === _q
                      ? void 0
                      : _q.directives) && void 0 !== _r
                  ? _r
                  : []
              ),
            };
          else if ('extensionASTNodes' === fieldName && null != config.extensionASTNodes)
            config.extensionASTNodes = config.extensionASTNodes.concat(
              null !== (_t = null === (_s = resolverValue) || void 0 === _s ? void 0 : _s.extensionASTNodes) &&
                void 0 !== _t
                ? _t
                : []
            );
          else if ('extensions' === fieldName && null != type.extensions && null != resolverValue.extensions)
            type.extensions = Object.assign({}, type.extensions, resolverValue.extensions);
          else if (enumValueConfigMap[fieldName]) enumValueConfigMap[fieldName].value = resolverValue[fieldName];
        typeMap[typeName] = new definition_GraphQLEnumType(config);
      } else if (definition_isUnionType(type)) {
        for (const fieldName in resolverValue)
          if (fieldName.startsWith('__')) type[fieldName.substring(2)] = resolverValue[fieldName];
      } else if (definition_isObjectType(type) || definition_isInterfaceType(type))
        for (const fieldName in resolverValue) {
          if (fieldName.startsWith('__')) {
            type[fieldName.substring(2)] = resolverValue[fieldName];
            break;
          }
          const field = type.getFields()[fieldName];
          if (null != field) {
            const fieldResolve = resolverValue[fieldName];
            if ('function' == typeof fieldResolve) field.resolve = fieldResolve.bind(resolverValue);
            else setFieldProperties(field, fieldResolve);
          }
        }
    }
    forEachDefaultValue(schema, serializeInputValue);
    healSchema(schema);
    forEachDefaultValue(schema, parseInputValue);
    if (null != defaultFieldResolver)
      forEachField(schema, field => {
        if (!field.resolve) field.resolve = defaultFieldResolver;
      });
    return schema;
  }
  function createNewSchemaWithResolvers(schema, resolvers, defaultFieldResolver) {
    schema = utils_mapSchema(schema, {
      [utils_MapperKind.SCALAR_TYPE]: type => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const config = type.toConfig();
        const resolverValue = resolvers[type.name];
        if (!scalars_isSpecifiedScalarType(type) && null != resolverValue) {
          for (const fieldName in resolverValue)
            if (fieldName.startsWith('__')) config[fieldName.substring(2)] = resolverValue[fieldName];
            else if ('astNode' === fieldName && null != config.astNode)
              config.astNode = {
                ...config.astNode,
                description:
                  null !==
                    (_c =
                      null === (_b = null === (_a = resolverValue) || void 0 === _a ? void 0 : _a.astNode) ||
                      void 0 === _b
                        ? void 0
                        : _b.description) && void 0 !== _c
                    ? _c
                    : config.astNode.description,
                directives: (null !== (_d = config.astNode.directives) && void 0 !== _d ? _d : []).concat(
                  null !==
                    (_g =
                      null === (_f = null === (_e = resolverValue) || void 0 === _e ? void 0 : _e.astNode) ||
                      void 0 === _f
                        ? void 0
                        : _f.directives) && void 0 !== _g
                    ? _g
                    : []
                ),
              };
            else if ('extensionASTNodes' === fieldName && null != config.extensionASTNodes)
              config.extensionASTNodes = config.extensionASTNodes.concat(
                null !== (_j = null === (_h = resolverValue) || void 0 === _h ? void 0 : _h.extensionASTNodes) &&
                  void 0 !== _j
                  ? _j
                  : []
              );
            else if ('extensions' === fieldName && null != config.extensions && null != resolverValue.extensions)
              config.extensions = Object.assign({}, type.extensions, resolverValue.extensions);
            else config[fieldName] = resolverValue[fieldName];
          return new definition_GraphQLScalarType(config);
        }
      },
      [utils_MapperKind.ENUM_TYPE]: type => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const resolverValue = resolvers[type.name];
        const config = type.toConfig();
        const enumValueConfigMap = config.values;
        if (null != resolverValue) {
          for (const fieldName in resolverValue)
            if (fieldName.startsWith('__')) config[fieldName.substring(2)] = resolverValue[fieldName];
            else if ('astNode' === fieldName && null != config.astNode)
              config.astNode = {
                ...config.astNode,
                description:
                  null !==
                    (_c =
                      null === (_b = null === (_a = resolverValue) || void 0 === _a ? void 0 : _a.astNode) ||
                      void 0 === _b
                        ? void 0
                        : _b.description) && void 0 !== _c
                    ? _c
                    : config.astNode.description,
                directives: (null !== (_d = config.astNode.directives) && void 0 !== _d ? _d : []).concat(
                  null !==
                    (_g =
                      null === (_f = null === (_e = resolverValue) || void 0 === _e ? void 0 : _e.astNode) ||
                      void 0 === _f
                        ? void 0
                        : _f.directives) && void 0 !== _g
                    ? _g
                    : []
                ),
              };
            else if ('extensionASTNodes' === fieldName && null != config.extensionASTNodes)
              config.extensionASTNodes = config.extensionASTNodes.concat(
                null !== (_j = null === (_h = resolverValue) || void 0 === _h ? void 0 : _h.extensionASTNodes) &&
                  void 0 !== _j
                  ? _j
                  : []
              );
            else if ('extensions' === fieldName && null != config.extensions && null != resolverValue.extensions)
              config.extensions = Object.assign({}, type.extensions, resolverValue.extensions);
            else if (enumValueConfigMap[fieldName]) enumValueConfigMap[fieldName].value = resolverValue[fieldName];
          return new definition_GraphQLEnumType(config);
        }
      },
      [utils_MapperKind.UNION_TYPE]: type => {
        const resolverValue = resolvers[type.name];
        if (null != resolverValue) {
          const config = type.toConfig();
          if (resolverValue['__resolveType']) config.resolveType = resolverValue['__resolveType'];
          return new definition_GraphQLUnionType(config);
        }
      },
      [utils_MapperKind.OBJECT_TYPE]: type => {
        const resolverValue = resolvers[type.name];
        if (null != resolverValue) {
          const config = type.toConfig();
          if (resolverValue['__isTypeOf']) config.isTypeOf = resolverValue['__isTypeOf'];
          return new definition_GraphQLObjectType(config);
        }
      },
      [utils_MapperKind.INTERFACE_TYPE]: type => {
        const resolverValue = resolvers[type.name];
        if (null != resolverValue) {
          const config = type.toConfig();
          if (resolverValue['__resolveType']) config.resolveType = resolverValue['__resolveType'];
          return new definition_GraphQLInterfaceType(config);
        }
      },
      [utils_MapperKind.COMPOSITE_FIELD]: (fieldConfig, fieldName, typeName) => {
        const resolverValue = resolvers[typeName];
        if (null != resolverValue) {
          const fieldResolve = resolverValue[fieldName];
          if (null != fieldResolve) {
            const newFieldConfig = {
              ...fieldConfig,
            };
            if ('function' == typeof fieldResolve) newFieldConfig.resolve = fieldResolve.bind(resolverValue);
            else setFieldProperties(newFieldConfig, fieldResolve);
            return newFieldConfig;
          }
        }
      },
    });
    if (null != defaultFieldResolver)
      schema = utils_mapSchema(schema, {
        [utils_MapperKind.OBJECT_FIELD]: fieldConfig => ({
          ...fieldConfig,
          resolve: null != fieldConfig.resolve ? fieldConfig.resolve : defaultFieldResolver,
        }),
      });
    return schema;
  }
  function setFieldProperties(field, propertiesObj) {
    for (const propertyName in propertiesObj) field[propertyName] = propertiesObj[propertyName];
  }
  function schema_makeExecutableSchema({
    typeDefs,
    resolvers = {},
    resolverValidationOptions = {},
    parseOptions = {},
    inheritResolversFromInterfaces = false,
    pruningOptions,
    updateResolversInPlace = false,
    schemaExtensions,
  }) {
    if ('object' != typeof resolverValidationOptions)
      throw new Error('Expected `resolverValidationOptions` to be an object');
    if (!typeDefs) throw new Error('Must provide typeDefs');
    let schema;
    if (isSchema(typeDefs)) schema = typeDefs;
    else if (null == parseOptions ? void 0 : parseOptions.commentDescriptions)
      schema = buildSchema(
        mergeTypeDefs(typeDefs, {
          ...parseOptions,
          commentDescriptions: true,
        }),
        parseOptions
      );
    else schema = buildASTSchema_buildASTSchema(mergeTypeDefs(typeDefs, parseOptions), parseOptions);
    if (pruningOptions) schema = utils_pruneSchema(schema);
    schema = addResolversToSchema({
      schema,
      resolvers: mergeResolvers(resolvers),
      resolverValidationOptions,
      inheritResolversFromInterfaces,
      updateResolversInPlace,
    });
    if (Object.keys(resolverValidationOptions).length > 0) assertResolversPresent(schema, resolverValidationOptions);
    if (schemaExtensions)
      applyExtensions(schema, (schemaExtensions = mergeExtensions(utils_asArray(schemaExtensions))));
    return schema;
  }
  function isPromise_isPromise(value) {
    return 'function' == typeof (null == value ? void 0 : value.then);
  }
  function promiseReduce(values, callback, initialValue) {
    return values.reduce(function (previous, value) {
      return isPromise_isPromise(previous)
        ? previous.then(function (resolved) {
            return callback(resolved, value);
          })
        : callback(previous, value);
    }, initialValue);
  }
  function promiseForObject(object) {
    var keys = Object.keys(object);
    var valuesAndPromises = keys.map(function (name) {
      return object[name];
    });
    return Promise.all(valuesAndPromises).then(function (values) {
      return values.reduce(function (resolvedObject, value, i) {
        resolvedObject[keys[i]] = value;
        return resolvedObject;
      }, Object.create(null));
    });
  }
  function getOperationRootType_getOperationRootType(schema, operation) {
    if ('query' === operation.operation) {
      var queryType = schema.getQueryType();
      if (!queryType) throw new GraphQLError('Schema does not define the required query root type.', operation);
      return queryType;
    }
    if ('mutation' === operation.operation) {
      var mutationType = schema.getMutationType();
      if (!mutationType) throw new GraphQLError('Schema is not configured for mutations.', operation);
      return mutationType;
    }
    if ('subscription' === operation.operation) {
      var subscriptionType = schema.getSubscriptionType();
      if (!subscriptionType) throw new GraphQLError('Schema is not configured for subscriptions.', operation);
      return subscriptionType;
    }
    throw new GraphQLError('Can only have query, mutation and subscription operations.', operation);
  }
  function execute(
    argsOrSchema,
    document,
    rootValue,
    contextValue,
    variableValues,
    operationName,
    fieldResolver,
    typeResolver
  ) {
    return 1 === arguments.length
      ? executeImpl(argsOrSchema)
      : executeImpl({
          schema: argsOrSchema,
          document,
          rootValue,
          contextValue,
          variableValues,
          operationName,
          fieldResolver,
          typeResolver,
        });
  }
  function executeImpl(args) {
    var schema = args.schema,
      document = args.document,
      rootValue = args.rootValue,
      contextValue = args.contextValue,
      variableValues = args.variableValues,
      operationName = args.operationName,
      fieldResolver = args.fieldResolver,
      typeResolver = args.typeResolver;
    assertValidExecutionArguments(schema, document, variableValues);
    var exeContext = buildExecutionContext(
      schema,
      document,
      rootValue,
      contextValue,
      variableValues,
      operationName,
      fieldResolver,
      typeResolver
    );
    if (Array.isArray(exeContext))
      return {
        errors: exeContext,
      };
    return buildResponse(exeContext, executeOperation(exeContext, exeContext.operation, rootValue));
  }
  function buildResponse(exeContext, data) {
    if (isPromise_isPromise(data))
      return data.then(function (resolved) {
        return buildResponse(exeContext, resolved);
      });
    return 0 === exeContext.errors.length
      ? {
          data,
        }
      : {
          errors: exeContext.errors,
          data,
        };
  }
  function assertValidExecutionArguments(schema, document, rawVariableValues) {
    document || devAssert(0, 'Must provide document.');
    assertValidSchema(schema);
    null == rawVariableValues ||
      isObjectLike(rawVariableValues) ||
      devAssert(
        0,
        'Variables must be provided as an Object where each property is a variable value. Perhaps look to see if an unparsed JSON string was provided.'
      );
  }
  function buildExecutionContext(
    schema,
    document,
    rootValue,
    contextValue,
    rawVariableValues,
    operationName,
    fieldResolver,
    typeResolver
  ) {
    var _definition$name, _operation$variableDe;
    var operation;
    var fragments = Object.create(null);
    for (var _i2 = 0, _document$definitions2 = document.definitions; _i2 < _document$definitions2.length; _i2++) {
      var definition = _document$definitions2[_i2];
      switch (definition.kind) {
        case kinds_Kind.OPERATION_DEFINITION:
          if (null == operationName) {
            if (void 0 !== operation)
              return [new GraphQLError('Must provide operation name if query contains multiple operations.')];
            operation = definition;
          } else if (
            (null === (_definition$name = definition.name) || void 0 === _definition$name
              ? void 0
              : _definition$name.value) === operationName
          )
            operation = definition;
          break;

        case kinds_Kind.FRAGMENT_DEFINITION:
          fragments[definition.name.value] = definition;
          break;
      }
    }
    if (!operation) {
      if (null != operationName) return [new GraphQLError('Unknown operation named "'.concat(operationName, '".'))];
      return [new GraphQLError('Must provide an operation.')];
    }
    var coercedVariableValues = getVariableValues(
      schema,
      null !== (_operation$variableDe = operation.variableDefinitions) && void 0 !== _operation$variableDe
        ? _operation$variableDe
        : [],
      null != rawVariableValues ? rawVariableValues : {},
      {
        maxErrors: 50,
      }
    );
    if (coercedVariableValues.errors) return coercedVariableValues.errors;
    return {
      schema,
      fragments,
      rootValue,
      contextValue,
      operation,
      variableValues: coercedVariableValues.coerced,
      fieldResolver: null != fieldResolver ? fieldResolver : execute_defaultFieldResolver,
      typeResolver: null != typeResolver ? typeResolver : defaultTypeResolver,
      errors: [],
    };
  }
  function executeOperation(exeContext, operation, rootValue) {
    var type = getOperationRootType_getOperationRootType(exeContext.schema, operation);
    var fields = execute_collectFields(
      exeContext,
      type,
      operation.selectionSet,
      Object.create(null),
      Object.create(null)
    );
    try {
      var result =
        'mutation' === operation.operation
          ? executeFieldsSerially(exeContext, type, rootValue, void 0, fields)
          : executeFields(exeContext, type, rootValue, void 0, fields);
      if (isPromise_isPromise(result))
        return result.then(void 0, function (error) {
          exeContext.errors.push(error);
          return Promise.resolve(null);
        });
      return result;
    } catch (error) {
      exeContext.errors.push(error);
      return null;
    }
  }
  function executeFieldsSerially(exeContext, parentType, sourceValue, path, fields) {
    return promiseReduce(
      Object.keys(fields),
      function (results, responseName) {
        var fieldNodes = fields[responseName];
        var fieldPath = addPath(path, responseName, parentType.name);
        var result = execute_resolveField(exeContext, parentType, sourceValue, fieldNodes, fieldPath);
        if (void 0 === result) return results;
        if (isPromise_isPromise(result))
          return result.then(function (resolvedResult) {
            results[responseName] = resolvedResult;
            return results;
          });
        results[responseName] = result;
        return results;
      },
      Object.create(null)
    );
  }
  function executeFields(exeContext, parentType, sourceValue, path, fields) {
    var results = Object.create(null);
    var containsPromise = false;
    for (var _i4 = 0, _Object$keys2 = Object.keys(fields); _i4 < _Object$keys2.length; _i4++) {
      var responseName = _Object$keys2[_i4];
      var result = execute_resolveField(
        exeContext,
        parentType,
        sourceValue,
        fields[responseName],
        addPath(path, responseName, parentType.name)
      );
      if (void 0 !== result) {
        results[responseName] = result;
        if (isPromise_isPromise(result)) containsPromise = true;
      }
    }
    if (!containsPromise) return results;
    return promiseForObject(results);
  }
  function execute_collectFields(exeContext, runtimeType, selectionSet, fields, visitedFragmentNames) {
    for (var _i6 = 0, _selectionSet$selecti2 = selectionSet.selections; _i6 < _selectionSet$selecti2.length; _i6++) {
      var selection = _selectionSet$selecti2[_i6];
      switch (selection.kind) {
        case kinds_Kind.FIELD:
          if (!shouldIncludeNode(exeContext, selection)) continue;
          var name = getFieldEntryKey(selection);
          if (!fields[name]) fields[name] = [];
          fields[name].push(selection);
          break;

        case kinds_Kind.INLINE_FRAGMENT:
          if (
            !shouldIncludeNode(exeContext, selection) ||
            !doesFragmentConditionMatch(exeContext, selection, runtimeType)
          )
            continue;
          execute_collectFields(exeContext, runtimeType, selection.selectionSet, fields, visitedFragmentNames);
          break;

        case kinds_Kind.FRAGMENT_SPREAD:
          var fragName = selection.name.value;
          if (visitedFragmentNames[fragName] || !shouldIncludeNode(exeContext, selection)) continue;
          visitedFragmentNames[fragName] = true;
          var fragment = exeContext.fragments[fragName];
          if (!fragment || !doesFragmentConditionMatch(exeContext, fragment, runtimeType)) continue;
          execute_collectFields(exeContext, runtimeType, fragment.selectionSet, fields, visitedFragmentNames);
          break;
      }
    }
    return fields;
  }
  function shouldIncludeNode(exeContext, node) {
    var skip = getDirectiveValues(GraphQLSkipDirective, node, exeContext.variableValues);
    if (true === (null == skip ? void 0 : skip.if)) return false;
    var include = getDirectiveValues(GraphQLIncludeDirective, node, exeContext.variableValues);
    if (false === (null == include ? void 0 : include.if)) return false;
    return true;
  }
  function doesFragmentConditionMatch(exeContext, fragment, type) {
    var typeConditionNode = fragment.typeCondition;
    if (!typeConditionNode) return true;
    var conditionalType = typeFromAST_typeFromAST(exeContext.schema, typeConditionNode);
    if (conditionalType === type) return true;
    if (definition_isAbstractType(conditionalType)) return exeContext.schema.isSubType(conditionalType, type);
    return false;
  }
  function getFieldEntryKey(node) {
    return node.alias ? node.alias.value : node.name.value;
  }
  function execute_resolveField(exeContext, parentType, source, fieldNodes, path) {
    var _fieldDef$resolve;
    var fieldName = fieldNodes[0].name.value;
    var fieldDef = execute_getFieldDef(exeContext.schema, parentType, fieldName);
    if (!fieldDef) return;
    var returnType = fieldDef.type;
    var resolveFn =
      null !== (_fieldDef$resolve = fieldDef.resolve) && void 0 !== _fieldDef$resolve
        ? _fieldDef$resolve
        : exeContext.fieldResolver;
    var info = buildResolveInfo(exeContext, fieldDef, fieldNodes, parentType, path);
    try {
      var result = resolveFn(
        source,
        values_getArgumentValues(fieldDef, fieldNodes[0], exeContext.variableValues),
        exeContext.contextValue,
        info
      );
      var completed;
      if (isPromise_isPromise(result))
        completed = result.then(function (resolved) {
          return completeValue(exeContext, returnType, fieldNodes, info, path, resolved);
        });
      else completed = completeValue(exeContext, returnType, fieldNodes, info, path, result);
      if (isPromise_isPromise(completed))
        return completed.then(void 0, function (rawError) {
          return handleFieldError(locatedError(rawError, fieldNodes, pathToArray(path)), returnType, exeContext);
        });
      return completed;
    } catch (rawError) {
      return handleFieldError(locatedError(rawError, fieldNodes, pathToArray(path)), returnType, exeContext);
    }
  }
  function buildResolveInfo(exeContext, fieldDef, fieldNodes, parentType, path) {
    return {
      fieldName: fieldDef.name,
      fieldNodes,
      returnType: fieldDef.type,
      parentType,
      path,
      schema: exeContext.schema,
      fragments: exeContext.fragments,
      rootValue: exeContext.rootValue,
      operation: exeContext.operation,
      variableValues: exeContext.variableValues,
    };
  }
  function handleFieldError(error, returnType, exeContext) {
    if (definition_isNonNullType(returnType)) throw error;
    exeContext.errors.push(error);
    return null;
  }
  function completeValue(exeContext, returnType, fieldNodes, info, path, result) {
    if (result instanceof Error) throw result;
    if (definition_isNonNullType(returnType)) {
      var completed = completeValue(exeContext, returnType.ofType, fieldNodes, info, path, result);
      if (null === completed)
        throw new Error(
          'Cannot return null for non-nullable field '.concat(info.parentType.name, '.').concat(info.fieldName, '.')
        );
      return completed;
    }
    if (null == result) return null;
    if (definition_isListType(returnType))
      return completeListValue(exeContext, returnType, fieldNodes, info, path, result);
    if (definition_isLeafType(returnType)) return completeLeafValue(returnType, result);
    if (definition_isAbstractType(returnType))
      return completeAbstractValue(exeContext, returnType, fieldNodes, info, path, result);
    if (definition_isObjectType(returnType))
      return completeObjectValue(exeContext, returnType, fieldNodes, info, path, result);
    invariant(0, 'Cannot complete value of unexpected output type: ' + inspect_inspect(returnType));
  }
  function completeListValue(exeContext, returnType, fieldNodes, info, path, result) {
    var itemType = returnType.ofType;
    var containsPromise = false;
    var completedResults = safeArrayFrom(result, function (item, index) {
      var itemPath = addPath(path, index, void 0);
      try {
        var completedItem;
        if (isPromise_isPromise(item))
          completedItem = item.then(function (resolved) {
            return completeValue(exeContext, itemType, fieldNodes, info, itemPath, resolved);
          });
        else completedItem = completeValue(exeContext, itemType, fieldNodes, info, itemPath, item);
        if (isPromise_isPromise(completedItem)) {
          containsPromise = true;
          return completedItem.then(void 0, function (rawError) {
            return handleFieldError(locatedError(rawError, fieldNodes, pathToArray(itemPath)), itemType, exeContext);
          });
        }
        return completedItem;
      } catch (rawError) {
        return handleFieldError(locatedError(rawError, fieldNodes, pathToArray(itemPath)), itemType, exeContext);
      }
    });
    if (null == completedResults)
      throw new GraphQLError(
        'Expected Iterable, but did not find one for field "'
          .concat(info.parentType.name, '.')
          .concat(info.fieldName, '".')
      );
    return containsPromise ? Promise.all(completedResults) : completedResults;
  }
  function completeLeafValue(returnType, result) {
    var serializedResult = returnType.serialize(result);
    if (void 0 === serializedResult)
      throw new Error(
        'Expected a value of type "'.concat(inspect_inspect(returnType), '" but ') +
          'received: '.concat(inspect_inspect(result))
      );
    return serializedResult;
  }
  function completeAbstractValue(exeContext, returnType, fieldNodes, info, path, result) {
    var _returnType$resolveTy;
    var resolveTypeFn =
      null !== (_returnType$resolveTy = returnType.resolveType) && void 0 !== _returnType$resolveTy
        ? _returnType$resolveTy
        : exeContext.typeResolver;
    var contextValue = exeContext.contextValue;
    var runtimeType = resolveTypeFn(result, contextValue, info, returnType);
    if (isPromise_isPromise(runtimeType))
      return runtimeType.then(function (resolvedRuntimeType) {
        return completeObjectValue(
          exeContext,
          ensureValidRuntimeType(resolvedRuntimeType, exeContext, returnType, fieldNodes, info, result),
          fieldNodes,
          info,
          path,
          result
        );
      });
    return completeObjectValue(
      exeContext,
      ensureValidRuntimeType(runtimeType, exeContext, returnType, fieldNodes, info, result),
      fieldNodes,
      info,
      path,
      result
    );
  }
  function ensureValidRuntimeType(runtimeTypeOrName, exeContext, returnType, fieldNodes, info, result) {
    if (null == runtimeTypeOrName)
      throw new GraphQLError(
        'Abstract type "'
          .concat(returnType.name, '" must resolve to an Object type at runtime for field "')
          .concat(info.parentType.name, '.')
          .concat(info.fieldName, '". Either the "')
          .concat(
            returnType.name,
            '" type should provide a "resolveType" function or each possible type should provide an "isTypeOf" function.'
          ),
        fieldNodes
      );
    var runtimeTypeName = definition_isNamedType(runtimeTypeOrName) ? runtimeTypeOrName.name : runtimeTypeOrName;
    if ('string' != typeof runtimeTypeName)
      throw new GraphQLError(
        'Abstract type "'
          .concat(returnType.name, '" must resolve to an Object type at runtime for field "')
          .concat(info.parentType.name, '.')
          .concat(info.fieldName, '" with ') +
          'value '.concat(inspect_inspect(result), ', received "').concat(inspect_inspect(runtimeTypeOrName), '".')
      );
    var runtimeType = exeContext.schema.getType(runtimeTypeName);
    if (null == runtimeType)
      throw new GraphQLError(
        'Abstract type "'
          .concat(returnType.name, '" was resolve to a type "')
          .concat(runtimeTypeName, '" that does not exist inside schema.'),
        fieldNodes
      );
    if (!definition_isObjectType(runtimeType))
      throw new GraphQLError(
        'Abstract type "'.concat(returnType.name, '" was resolve to a non-object type "').concat(runtimeTypeName, '".'),
        fieldNodes
      );
    if (!exeContext.schema.isSubType(returnType, runtimeType))
      throw new GraphQLError(
        'Runtime Object type "'
          .concat(runtimeType.name, '" is not a possible type for "')
          .concat(returnType.name, '".'),
        fieldNodes
      );
    return runtimeType;
  }
  function completeObjectValue(exeContext, returnType, fieldNodes, info, path, result) {
    if (returnType.isTypeOf) {
      var isTypeOf = returnType.isTypeOf(result, exeContext.contextValue, info);
      if (isPromise_isPromise(isTypeOf))
        return isTypeOf.then(function (resolvedIsTypeOf) {
          if (!resolvedIsTypeOf) throw invalidReturnTypeError(returnType, result, fieldNodes);
          return collectAndExecuteSubfields(exeContext, returnType, fieldNodes, path, result);
        });
      if (!isTypeOf) throw invalidReturnTypeError(returnType, result, fieldNodes);
    }
    return collectAndExecuteSubfields(exeContext, returnType, fieldNodes, path, result);
  }
  function invalidReturnTypeError(returnType, result, fieldNodes) {
    return new GraphQLError(
      'Expected value of type "'.concat(returnType.name, '" but got: ').concat(inspect_inspect(result), '.'),
      fieldNodes
    );
  }
  function collectAndExecuteSubfields(exeContext, returnType, fieldNodes, path, result) {
    return executeFields(exeContext, returnType, result, path, collectSubfields(exeContext, returnType, fieldNodes));
  }
  var collectSubfields = (function (fn) {
    var cache0;
    return function (a1, a2, a3) {
      if (!cache0) cache0 = new WeakMap();
      var cache1 = cache0.get(a1);
      var cache2;
      if (cache1) {
        if ((cache2 = cache1.get(a2))) {
          var cachedValue = cache2.get(a3);
          if (void 0 !== cachedValue) return cachedValue;
        }
      } else {
        cache1 = new WeakMap();
        cache0.set(a1, cache1);
      }
      if (!cache2) {
        cache2 = new WeakMap();
        cache1.set(a2, cache2);
      }
      var newValue = fn(a1, a2, a3);
      cache2.set(a3, newValue);
      return newValue;
    };
  })(function (exeContext, returnType, fieldNodes) {
    var subFieldNodes = Object.create(null);
    var visitedFragmentNames = Object.create(null);
    for (var _i8 = 0; _i8 < fieldNodes.length; _i8++) {
      var node = fieldNodes[_i8];
      if (node.selectionSet)
        subFieldNodes = execute_collectFields(
          exeContext,
          returnType,
          node.selectionSet,
          subFieldNodes,
          visitedFragmentNames
        );
    }
    return subFieldNodes;
  });
  var defaultTypeResolver = function (value, contextValue, info, abstractType) {
    if (isObjectLike(value) && 'string' == typeof value.__typename) return value.__typename;
    var possibleTypes = info.schema.getPossibleTypes(abstractType);
    var promisedIsTypeOfResults = [];
    for (var i = 0; i < possibleTypes.length; i++) {
      var type = possibleTypes[i];
      if (type.isTypeOf) {
        var isTypeOfResult = type.isTypeOf(value, contextValue, info);
        if (isPromise_isPromise(isTypeOfResult)) promisedIsTypeOfResults[i] = isTypeOfResult;
        else if (isTypeOfResult) return type.name;
      }
    }
    if (promisedIsTypeOfResults.length)
      return Promise.all(promisedIsTypeOfResults).then(function (isTypeOfResults) {
        for (var _i9 = 0; _i9 < isTypeOfResults.length; _i9++) if (isTypeOfResults[_i9]) return possibleTypes[_i9].name;
      });
  };
  var execute_defaultFieldResolver = function (source, args, contextValue, info) {
    if (isObjectLike(source) || 'function' == typeof source) {
      var property = source[info.fieldName];
      if ('function' == typeof property) return source[info.fieldName](args, contextValue, info);
      return property;
    }
  };
  function execute_getFieldDef(schema, parentType, fieldName) {
    if (fieldName === SchemaMetaFieldDef.name && schema.getQueryType() === parentType) return SchemaMetaFieldDef;
    else if (fieldName === TypeMetaFieldDef.name && schema.getQueryType() === parentType) return TypeMetaFieldDef;
    else if (fieldName === introspection_TypeNameMetaFieldDef.name) return introspection_TypeNameMetaFieldDef;
    return parentType.getFields()[fieldName];
  }
  function getOperationAST_getOperationAST(documentAST, operationName) {
    var operation = null;
    for (var _i2 = 0, _documentAST$definiti2 = documentAST.definitions; _i2 < _documentAST$definiti2.length; _i2++) {
      var definition = _documentAST$definiti2[_i2];
      if (definition.kind === kinds_Kind.OPERATION_DEFINITION) {
        var _definition$name;
        if (null == operationName) {
          if (operation) return null;
          operation = definition;
        } else if (
          (null === (_definition$name = definition.name) || void 0 === _definition$name
            ? void 0
            : _definition$name.value) === operationName
        )
          return definition;
      }
    }
    return operation;
  }
  function isAsyncIterable_isAsyncIterable(maybeAsyncIterable) {
    return 'function' == typeof (null == maybeAsyncIterable ? void 0 : maybeAsyncIterable[SYMBOL_ASYNC_ITERATOR]);
  }
  function mapAsyncIterator_defineProperty(obj, key, value) {
    if (key in obj)
      Object.defineProperty(obj, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    else obj[key] = value;
    return obj;
  }
  function mapAsyncIterator_mapAsyncIterator(iterable, callback, rejectCallback) {
    var iterator = iterable[SYMBOL_ASYNC_ITERATOR].call(iterable);
    var $return;
    var abruptClose;
    if ('function' == typeof iterator.return) {
      $return = iterator.return;
      abruptClose = function (error) {
        var rethrow = function () {
          return Promise.reject(error);
        };
        return $return.call(iterator).then(rethrow, rethrow);
      };
    }
    function mapResult(result) {
      return result.done
        ? result
        : mapAsyncIterator_asyncMapValue(result.value, callback).then(mapAsyncIterator_iteratorResult, abruptClose);
    }
    var mapReject;
    if (rejectCallback) {
      var reject = rejectCallback;
      mapReject = function (error) {
        return mapAsyncIterator_asyncMapValue(error, reject).then(mapAsyncIterator_iteratorResult, abruptClose);
      };
    }
    return mapAsyncIterator_defineProperty(
      {
        next: function () {
          return iterator.next().then(mapResult, mapReject);
        },
        return: function () {
          return $return
            ? $return.call(iterator).then(mapResult, mapReject)
            : Promise.resolve({
                value: void 0,
                done: true,
              });
        },
        throw: function (error) {
          if ('function' == typeof iterator.throw) return iterator.throw(error).then(mapResult, mapReject);
          return Promise.reject(error).catch(abruptClose);
        },
      },
      SYMBOL_ASYNC_ITERATOR,
      function () {
        return this;
      }
    );
  }
  function mapAsyncIterator_asyncMapValue(value, callback) {
    return new Promise(function (resolve) {
      return resolve(callback(value));
    });
  }
  function mapAsyncIterator_iteratorResult(value) {
    return {
      value,
      done: false,
    };
  }
  function subscribe(
    argsOrSchema,
    document,
    rootValue,
    contextValue,
    variableValues,
    operationName,
    fieldResolver,
    subscribeFieldResolver
  ) {
    return 1 === arguments.length
      ? subscribeImpl(argsOrSchema)
      : subscribeImpl({
          schema: argsOrSchema,
          document,
          rootValue,
          contextValue,
          variableValues,
          operationName,
          fieldResolver,
          subscribeFieldResolver,
        });
  }
  function reportGraphQLError(error) {
    if (error instanceof GraphQLError)
      return {
        errors: [error],
      };
    throw error;
  }
  function subscribeImpl(args) {
    var schema = args.schema,
      document = args.document,
      rootValue = args.rootValue,
      contextValue = args.contextValue,
      variableValues = args.variableValues,
      operationName = args.operationName,
      fieldResolver = args.fieldResolver,
      subscribeFieldResolver = args.subscribeFieldResolver;
    var sourcePromise = createSourceEventStream(
      schema,
      document,
      rootValue,
      contextValue,
      variableValues,
      operationName,
      subscribeFieldResolver
    );
    var mapSourceToResponse = function (payload) {
      return execute({
        schema,
        document,
        rootValue: payload,
        contextValue,
        variableValues,
        operationName,
        fieldResolver,
      });
    };
    return sourcePromise.then(function (resultOrStream) {
      return isAsyncIterable_isAsyncIterable(resultOrStream)
        ? mapAsyncIterator_mapAsyncIterator(resultOrStream, mapSourceToResponse, reportGraphQLError)
        : resultOrStream;
    });
  }
  function createSourceEventStream(
    schema,
    document,
    rootValue,
    contextValue,
    variableValues,
    operationName,
    fieldResolver
  ) {
    assertValidExecutionArguments(schema, document, variableValues);
    return new Promise(function (resolve) {
      var exeContext = buildExecutionContext(
        schema,
        document,
        rootValue,
        contextValue,
        variableValues,
        operationName,
        fieldResolver
      );
      resolve(
        Array.isArray(exeContext)
          ? {
              errors: exeContext,
            }
          : executeSubscription(exeContext)
      );
    }).catch(reportGraphQLError);
  }
  function executeSubscription(exeContext) {
    var schema = exeContext.schema,
      operation = exeContext.operation,
      variableValues = exeContext.variableValues,
      rootValue = exeContext.rootValue;
    var type = getOperationRootType_getOperationRootType(schema, operation);
    var fields = execute_collectFields(
      exeContext,
      type,
      operation.selectionSet,
      Object.create(null),
      Object.create(null)
    );
    var responseName = Object.keys(fields)[0];
    var fieldNodes = fields[responseName];
    var fieldName = fieldNodes[0].name.value;
    var fieldDef = execute_getFieldDef(schema, type, fieldName);
    if (!fieldDef)
      throw new GraphQLError('The subscription field "'.concat(fieldName, '" is not defined.'), fieldNodes);
    var path = addPath(void 0, responseName, type.name);
    var info = buildResolveInfo(exeContext, fieldDef, fieldNodes, type, path);
    return new Promise(function (resolveResult) {
      var _fieldDef$subscribe;
      var args = values_getArgumentValues(fieldDef, fieldNodes[0], variableValues);
      var contextValue = exeContext.contextValue;
      resolveResult(
        (null !== (_fieldDef$subscribe = fieldDef.subscribe) && void 0 !== _fieldDef$subscribe
          ? _fieldDef$subscribe
          : exeContext.fieldResolver)(rootValue, args, contextValue, info)
      );
    }).then(
      function (eventStream) {
        if (eventStream instanceof Error) throw locatedError(eventStream, fieldNodes, pathToArray(path));
        if (!isAsyncIterable_isAsyncIterable(eventStream))
          throw new Error(
            'Subscription field must return Async Iterable. ' + 'Received: '.concat(inspect_inspect(eventStream), '.')
          );
        return eventStream;
      },
      function (error) {
        throw locatedError(error, fieldNodes, pathToArray(path));
      }
    );
  }
  var execution_execute = __webpack_require__('../../node_modules/graphql/execution/execute.js');
  function isPromiseLike(object) {
    return null != object && 'function' == typeof object.then;
  }
  const defaultOnRejectedFn = reason => {
    throw reason;
  };
  class ValueOrPromise_ValueOrPromise {
    constructor(executor) {
      let value;
      try {
        value = executor();
      } catch (reason) {
        this.state = {
          status: 'rejected',
          value: reason,
        };
        return;
      }
      if (isPromiseLike(value)) {
        this.state = {
          status: 'pending',
          value,
        };
        return;
      }
      this.state = {
        status: 'fulfilled',
        value,
      };
    }
    then(onFulfilled, onRejected) {
      const state = this.state;
      if ('pending' === state.status)
        return new ValueOrPromise_ValueOrPromise(() => state.value.then(onFulfilled, onRejected));
      const onRejectedFn = 'function' == typeof onRejected ? onRejected : defaultOnRejectedFn;
      if ('rejected' === state.status) return new ValueOrPromise_ValueOrPromise(() => onRejectedFn(state.value));
      try {
        const onFulfilledFn = 'function' == typeof onFulfilled ? onFulfilled : void 0;
        return void 0 === onFulfilledFn
          ? new ValueOrPromise_ValueOrPromise(() => state.value)
          : new ValueOrPromise_ValueOrPromise(() => onFulfilledFn(state.value));
      } catch (e) {
        return new ValueOrPromise_ValueOrPromise(() => onRejectedFn(e));
      }
    }
    catch(onRejected) {
      return this.then(void 0, onRejected);
    }
    resolve() {
      const state = this.state;
      if ('pending' === state.status) return Promise.resolve(state.value);
      if ('rejected' === state.status) throw state.value;
      return state.value;
    }
    static all(valueOrPromises) {
      const values = [];
      for (let i = 0; i < valueOrPromises.length; i++) {
        const state = valueOrPromises[i].state;
        if ('rejected' === state.status)
          return new ValueOrPromise_ValueOrPromise(() => {
            throw state.value;
          });
        if ('pending' === state.status)
          return new ValueOrPromise_ValueOrPromise(() =>
            Promise.all(valueOrPromises.slice(i)).then(resolvedPromises => values.concat(resolvedPromises))
          );
        values.push(state.value);
      }
      return new ValueOrPromise_ValueOrPromise(() => values);
    }
  }
  var dataloader = __webpack_require__('../../node_modules/dataloader/index.js');
  function createPrefix(index) {
    return `graphqlTools${index}_`;
  }
  function parseKey(prefixedKey) {
    const match = /^graphqlTools([\d]+)_(.*)$/.exec(prefixedKey);
    if (match && 3 === match.length && !isNaN(Number(match[1])) && match[2])
      return {
        index: Number(match[1]),
        originalKey: match[2],
      };
    throw new Error(`Key ${prefixedKey} is not correctly prefixed`);
  }
  function mergeRequests(requests, extensionsReducer) {
    const mergedVariables = Object.create(null);
    const mergedVariableDefinitions = [];
    const mergedSelections = [];
    const mergedFragmentDefinitions = [];
    let mergedExtensions = Object.create(null);
    for (const index in requests) {
      const request = requests[index];
      const prefixedRequests = prefixRequest(createPrefix(index), request);
      for (const def of prefixedRequests.document.definitions) {
        if (isOperationDefinition(def)) {
          mergedSelections.push(...def.selectionSet.selections);
          if (def.variableDefinitions) mergedVariableDefinitions.push(...def.variableDefinitions);
        }
        if (isFragmentDefinition(def)) mergedFragmentDefinitions.push(def);
      }
      Object.assign(mergedVariables, prefixedRequests.variables);
      mergedExtensions = extensionsReducer(mergedExtensions, request);
    }
    const mergedOperationDefinition = {
      kind: kinds_Kind.OPERATION_DEFINITION,
      operation: requests[0].operationType,
      variableDefinitions: mergedVariableDefinitions,
      selectionSet: {
        kind: kinds_Kind.SELECTION_SET,
        selections: mergedSelections,
      },
    };
    return {
      document: {
        kind: kinds_Kind.DOCUMENT,
        definitions: [mergedOperationDefinition, ...mergedFragmentDefinitions],
      },
      variables: mergedVariables,
      extensions: mergedExtensions,
      context: requests[0].context,
      info: requests[0].info,
      operationType: requests[0].operationType,
    };
  }
  function prefixRequest(prefix, request) {
    var _a;
    const executionVariables = null !== (_a = request.variables) && void 0 !== _a ? _a : {};
    function prefixNode(node) {
      return prefixNodeName(node, prefix);
    }
    let prefixedDocument = aliasTopLevelFields(prefix, request.document);
    const executionVariableNames = Object.keys(executionVariables);
    if (executionVariableNames.length > 0)
      prefixedDocument = visitor_visit(prefixedDocument, {
        [kinds_Kind.VARIABLE]: prefixNode,
        [kinds_Kind.FRAGMENT_DEFINITION]: prefixNode,
        [kinds_Kind.FRAGMENT_SPREAD]: prefixNode,
      });
    const prefixedVariables = {};
    for (const variableName of executionVariableNames)
      prefixedVariables[prefix + variableName] = executionVariables[variableName];
    return {
      document: prefixedDocument,
      variables: prefixedVariables,
      operationType: request.operationType,
    };
  }
  function aliasTopLevelFields(prefix, document) {
    const transformer = {
      [kinds_Kind.OPERATION_DEFINITION]: def => {
        const { selections } = def.selectionSet;
        return {
          ...def,
          selectionSet: {
            ...def.selectionSet,
            selections: aliasFieldsInSelection(prefix, selections, document),
          },
        };
      },
    };
    return visitor_visit(document, transformer, {
      [kinds_Kind.DOCUMENT]: ['definitions'],
    });
  }
  function aliasFieldsInSelection(prefix, selections, document) {
    return selections.map(selection => {
      switch (selection.kind) {
        case kinds_Kind.INLINE_FRAGMENT:
          return aliasFieldsInInlineFragment(prefix, selection, document);

        case kinds_Kind.FRAGMENT_SPREAD: {
          const inlineFragment = inlineFragmentSpread(selection, document);
          return aliasFieldsInInlineFragment(prefix, inlineFragment, document);
        }

        case kinds_Kind.FIELD:
        default:
          return aliasField(selection, prefix);
      }
    });
  }
  function aliasFieldsInInlineFragment(prefix, fragment, document) {
    const { selections } = fragment.selectionSet;
    return {
      ...fragment,
      selectionSet: {
        ...fragment.selectionSet,
        selections: aliasFieldsInSelection(prefix, selections, document),
      },
    };
  }
  function inlineFragmentSpread(spread, document) {
    const fragment = document.definitions.find(
      def => isFragmentDefinition(def) && def.name.value === spread.name.value
    );
    if (!fragment) throw new Error(`Fragment ${spread.name.value} does not exist`);
    const { typeCondition, selectionSet } = fragment;
    return {
      kind: kinds_Kind.INLINE_FRAGMENT,
      typeCondition,
      selectionSet,
      directives: spread.directives,
    };
  }
  function prefixNodeName(namedNode, prefix) {
    return {
      ...namedNode,
      name: {
        ...namedNode.name,
        value: prefix + namedNode.name.value,
      },
    };
  }
  function aliasField(field, aliasPrefix) {
    const aliasNode = field.alias ? field.alias : field.name;
    return {
      ...field,
      alias: {
        ...aliasNode,
        value: aliasPrefix + aliasNode.value,
      },
    };
  }
  function isOperationDefinition(def) {
    return def.kind === kinds_Kind.OPERATION_DEFINITION;
  }
  function isFragmentDefinition(def) {
    return def.kind === kinds_Kind.FRAGMENT_DEFINITION;
  }
  function splitResult({ data, errors }, numResults) {
    const splitResults = [];
    for (let i = 0; i < numResults; i++) splitResults.push({});
    if (data)
      for (const prefixedKey in data) {
        const { index, originalKey } = parseKey(prefixedKey);
        const result = splitResults[index];
        if (null == result) continue;
        if (null == result.data)
          result.data = {
            [originalKey]: data[prefixedKey],
          };
        else result.data[originalKey] = data[prefixedKey];
      }
    if (errors)
      for (const error of errors)
        if (error.path) {
          const parsedKey = parseKey(error.path[0]);
          const { index, originalKey } = parsedKey;
          const newError = utils_relocatedError(error, [originalKey, ...error.path.slice(1)]);
          (splitResults[index].errors = splitResults[index].errors || []).push(newError);
        }
    return splitResults;
  }
  function createBatchingExecutor(executor, dataLoaderOptions, extensionsReducer = defaultExtensionsReducer) {
    const loader = new dataloader(createLoadFn(executor, extensionsReducer), dataLoaderOptions);
    return request => ('subscription' === request.operationType ? executor(request) : loader.load(request));
  }
  function createLoadFn(executor, extensionsReducer) {
    return async function (requests) {
      const execBatches = [];
      let index = 0;
      const request = requests[index];
      let currentBatch = [request];
      execBatches.push(currentBatch);
      const operationType = request.operationType;
      while (++index < requests.length) {
        const currentOperationType = requests[index].operationType;
        if (null == operationType) throw new Error('Could not identify operation type of document.');
        if (operationType === currentOperationType) currentBatch.push(requests[index]);
        else {
          currentBatch = [requests[index]];
          execBatches.push(currentBatch);
        }
      }
      return (
        await Promise.all(
          execBatches.map(async execBatch => {
            const mergedRequests = mergeRequests(execBatch, extensionsReducer);
            return splitResult(await executor(mergedRequests), execBatch.length);
          })
        )
      ).flat();
    };
  }
  function defaultExtensionsReducer(mergedExtensions, request) {
    const newExtensions = request.extensions;
    if (null != newExtensions) Object.assign(mergedExtensions, newExtensions);
    return mergedExtensions;
  }
  const getBatchingExecutor = (function (fn) {
    let cache1;
    return function (a1, a2, a3, a4) {
      if (!cache1) {
        cache1 = new WeakMap();
        const cache2 = new WeakMap();
        cache1.set(a1, cache2);
        const newValue = fn(0, a2, a3, a4);
        cache2.set(a2, newValue);
        return newValue;
      }
      let cache2 = cache1.get(a1);
      if (!cache2) {
        cache2 = new WeakMap();
        cache1.set(a1, cache2);
        const newValue = fn(0, a2, a3, a4);
        cache2.set(a2, newValue);
        return newValue;
      }
      const cachedValue = cache2.get(a2);
      if (void 0 === cachedValue) {
        const newValue = fn(0, a2, a3, a4);
        cache2.set(a2, newValue);
        return newValue;
      }
      return cachedValue;
    };
  })(function (_context, executor, dataLoaderOptions, extensionsReducer) {
    return createBatchingExecutor(executor, dataLoaderOptions, extensionsReducer);
  });
  function applySchemaTransforms(originalWrappingSchema, subschemaConfig, transformedSchema) {
    const schemaTransforms = subschemaConfig.transforms;
    if (null == schemaTransforms) return originalWrappingSchema;
    return schemaTransforms.reduce(
      (schema, transform) =>
        null != transform.transformSchema
          ? transform.transformSchema(schema, subschemaConfig, transformedSchema)
          : schema,
      originalWrappingSchema
    );
  }
  class Subschema {
    constructor(config) {
      var _a;
      this.schema = config.schema;
      this.executor = config.executor;
      this.batch = config.batch;
      this.batchingOptions = config.batchingOptions;
      this.createProxyingResolver = config.createProxyingResolver;
      this.transforms = null !== (_a = config.transforms) && void 0 !== _a ? _a : [];
      this.transformedSchema = applySchemaTransforms(this.schema, config);
      this.merge = config.merge;
    }
  }
  function delegate_memoize3(fn) {
    let cache1;
    return function (a1, a2, a3) {
      if (!cache1) {
        cache1 = new WeakMap();
        const cache2 = new WeakMap();
        cache1.set(a1, cache2);
        const cache3 = new WeakMap();
        cache2.set(a2, cache3);
        const newValue = fn(a1, a2, a3);
        cache3.set(a3, newValue);
        return newValue;
      }
      let cache2 = cache1.get(a1);
      if (!cache2) {
        cache2 = new WeakMap();
        cache1.set(a1, cache2);
        const cache3 = new WeakMap();
        cache2.set(a2, cache3);
        const newValue = fn(a1, a2, a3);
        cache3.set(a3, newValue);
        return newValue;
      }
      let cache3 = cache2.get(a2);
      if (!cache3) {
        cache3 = new WeakMap();
        cache2.set(a2, cache3);
        const newValue = fn(a1, a2, a3);
        cache3.set(a3, newValue);
        return newValue;
      }
      const cachedValue = cache3.get(a3);
      if (void 0 === cachedValue) {
        const newValue = fn(a1, a2, a3);
        cache3.set(a3, newValue);
        return newValue;
      }
      return cachedValue;
    };
  }
  function getDocumentMetadata(document) {
    const operations = [];
    const fragments = [];
    const fragmentNames = new Set();
    for (let i = 0; i < document.definitions.length; i++) {
      const def = document.definitions[i];
      if (def.kind === kinds_Kind.FRAGMENT_DEFINITION) {
        fragments.push(def);
        fragmentNames.add(def.name.value);
      } else if (def.kind === kinds_Kind.OPERATION_DEFINITION) operations.push(def);
    }
    return {
      operations,
      fragments,
      fragmentNames,
    };
  }
  function prepareGatewayDocument(originalDocument, transformedSchema, returnType, infoSchema) {
    const wrappedConcreteTypesDocument = wrapConcreteTypes(returnType, transformedSchema, originalDocument);
    if (null == infoSchema) return wrappedConcreteTypesDocument;
    const {
      possibleTypesMap,
      reversePossibleTypesMap,
      interfaceExtensionsMap,
      fieldNodesByType,
      fieldNodesByField,
      dynamicSelectionSetsByField,
    } = getSchemaMetaData(infoSchema, transformedSchema);
    const { operations, fragments, fragmentNames } = getDocumentMetadata(wrappedConcreteTypesDocument);
    const { expandedFragments, fragmentReplacements } = getExpandedFragments(
      fragments,
      fragmentNames,
      possibleTypesMap
    );
    const typeInfo = new TypeInfo_TypeInfo(transformedSchema);
    return visitor_visit(
      {
        kind: kinds_Kind.DOCUMENT,
        definitions: [...operations, ...fragments, ...expandedFragments],
      },
      TypeInfo_visitWithTypeInfo(typeInfo, {
        [kinds_Kind.SELECTION_SET]: node =>
          visitSelectionSet(
            node,
            fragmentReplacements,
            transformedSchema,
            typeInfo,
            possibleTypesMap,
            reversePossibleTypesMap,
            interfaceExtensionsMap,
            fieldNodesByType,
            fieldNodesByField,
            dynamicSelectionSetsByField
          ),
      }),
      {
        Name: [],
        Document: ['definitions'],
        OperationDefinition: ['selectionSet'],
        VariableDefinition: [],
        Variable: [],
        SelectionSet: ['selections'],
        Field: ['selectionSet'],
        Argument: [],
        FragmentSpread: [],
        InlineFragment: ['selectionSet'],
        FragmentDefinition: ['selectionSet'],
        IntValue: [],
        FloatValue: [],
        StringValue: [],
        BooleanValue: [],
        NullValue: [],
        EnumValue: [],
        ListValue: [],
        ObjectValue: [],
        ObjectField: [],
        Directive: [],
        NamedType: [],
        ListType: [],
        NonNullType: [],
        SchemaDefinition: [],
        OperationTypeDefinition: [],
        ScalarTypeDefinition: [],
        ObjectTypeDefinition: [],
        FieldDefinition: [],
        InputValueDefinition: [],
        InterfaceTypeDefinition: [],
        UnionTypeDefinition: [],
        EnumTypeDefinition: [],
        EnumValueDefinition: [],
        InputObjectTypeDefinition: [],
        DirectiveDefinition: [],
        SchemaExtension: [],
        ScalarTypeExtension: [],
        ObjectTypeExtension: [],
        InterfaceTypeExtension: [],
        UnionTypeExtension: [],
        EnumTypeExtension: [],
        InputObjectTypeExtension: [],
      }
    );
  }
  function visitSelectionSet(
    node,
    fragmentReplacements,
    schema,
    typeInfo,
    possibleTypesMap,
    reversePossibleTypesMap,
    interfaceExtensionsMap,
    fieldNodesByType,
    fieldNodesByField,
    dynamicSelectionSetsByField
  ) {
    var _a, _b;
    const newSelections = new Set();
    const maybeType = typeInfo.getParentType();
    if (null != maybeType) {
      const parentType = definition_getNamedType(maybeType);
      const parentTypeName = parentType.name;
      const fieldNodes = fieldNodesByType[parentTypeName];
      if (fieldNodes) for (const fieldNode of fieldNodes) newSelections.add(fieldNode);
      const interfaceExtensions = interfaceExtensionsMap[parentType.name];
      const interfaceExtensionFields = [];
      for (const selection of node.selections)
        if (selection.kind === kinds_Kind.INLINE_FRAGMENT) {
          if (null != selection.typeCondition) {
            const possibleTypes = possibleTypesMap[selection.typeCondition.name.value];
            if (null == possibleTypes) {
              newSelections.add(selection);
              continue;
            }
            for (const possibleTypeName of possibleTypes) {
              const maybePossibleType = schema.getType(possibleTypeName);
              if (null != maybePossibleType && implementsAbstractType(schema, parentType, maybePossibleType))
                newSelections.add(generateInlineFragment(possibleTypeName, selection.selectionSet));
            }
          }
        } else if (selection.kind === kinds_Kind.FRAGMENT_SPREAD) {
          const fragmentName = selection.name.value;
          if (!fragmentReplacements[fragmentName]) {
            newSelections.add(selection);
            continue;
          }
          for (const replacement of fragmentReplacements[fragmentName]) {
            const typeName = replacement.typeName;
            if (null != schema.getType(typeName) && implementsAbstractType(schema, parentType, maybeType))
              newSelections.add({
                kind: kinds_Kind.FRAGMENT_SPREAD,
                name: {
                  kind: kinds_Kind.NAME,
                  value: replacement.fragmentName,
                },
              });
          }
        } else {
          const fieldName = selection.name.value;
          const fieldNodes =
            null === (_a = fieldNodesByField[parentTypeName]) || void 0 === _a ? void 0 : _a[fieldName];
          if (null != fieldNodes) for (const fieldNode of fieldNodes) newSelections.add(fieldNode);
          const dynamicSelectionSets =
            null === (_b = dynamicSelectionSetsByField[parentTypeName]) || void 0 === _b ? void 0 : _b[fieldName];
          if (null != dynamicSelectionSets)
            for (const selectionSetFn of dynamicSelectionSets) {
              const selectionSet = selectionSetFn(selection);
              if (null != selectionSet) for (const selection of selectionSet.selections) newSelections.add(selection);
            }
          if (null == interfaceExtensions ? void 0 : interfaceExtensions[fieldName])
            interfaceExtensionFields.push(selection);
          else newSelections.add(selection);
        }
      if (reversePossibleTypesMap[parentType.name])
        newSelections.add({
          kind: kinds_Kind.FIELD,
          name: {
            kind: kinds_Kind.NAME,
            value: '__typename',
          },
        });
      if (interfaceExtensionFields.length) {
        const possibleTypes = possibleTypesMap[parentType.name];
        if (null != possibleTypes)
          for (const possibleType of possibleTypes)
            newSelections.add(
              generateInlineFragment(possibleType, {
                kind: kinds_Kind.SELECTION_SET,
                selections: interfaceExtensionFields,
              })
            );
      }
      return {
        ...node,
        selections: Array.from(newSelections),
      };
    }
    return node;
  }
  function generateInlineFragment(typeName, selectionSet) {
    return {
      kind: kinds_Kind.INLINE_FRAGMENT,
      typeCondition: {
        kind: kinds_Kind.NAMED_TYPE,
        name: {
          kind: kinds_Kind.NAME,
          value: typeName,
        },
      },
      selectionSet,
    };
  }
  const getSchemaMetaData = (sourceSchema, targetSchema) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const typeMap = sourceSchema.getTypeMap();
    const targetTypeMap = targetSchema.getTypeMap();
    const possibleTypesMap = Object.create(null);
    const interfaceExtensionsMap = Object.create(null);
    for (const typeName in typeMap) {
      const type = typeMap[typeName];
      if (definition_isAbstractType(type)) {
        const targetType = targetTypeMap[typeName];
        if (definition_isInterfaceType(type) && definition_isInterfaceType(targetType)) {
          const targetTypeFields = targetType.getFields();
          const sourceTypeFields = type.getFields();
          const extensionFields = Object.create(null);
          let isExtensionFieldsEmpty = true;
          for (const fieldName in sourceTypeFields)
            if (!targetTypeFields[fieldName]) {
              extensionFields[fieldName] = true;
              isExtensionFieldsEmpty = false;
            }
          if (!isExtensionFieldsEmpty) interfaceExtensionsMap[typeName] = extensionFields;
        }
        if (interfaceExtensionsMap[typeName] || !definition_isAbstractType(targetType)) {
          const implementations = sourceSchema.getPossibleTypes(type);
          possibleTypesMap[typeName] = [];
          for (const impl of implementations) if (targetTypeMap[impl.name]) possibleTypesMap[typeName].push(impl.name);
        }
      }
    }
    return {
      possibleTypesMap,
      reversePossibleTypesMap: reversePossibleTypesMap(possibleTypesMap),
      interfaceExtensionsMap,
      fieldNodesByType:
        null !==
          (_c =
            null === (_b = null === (_a = sourceSchema.extensions) || void 0 === _a ? void 0 : _a['stitchingInfo']) ||
            void 0 === _b
              ? void 0
              : _b.fieldNodesByType) && void 0 !== _c
          ? _c
          : {},
      fieldNodesByField:
        null !==
          (_f =
            null === (_e = null === (_d = sourceSchema.extensions) || void 0 === _d ? void 0 : _d['stitchingInfo']) ||
            void 0 === _e
              ? void 0
              : _e.fieldNodesByField) && void 0 !== _f
          ? _f
          : {},
      dynamicSelectionSetsByField:
        null !==
          (_j =
            null === (_h = null === (_g = sourceSchema.extensions) || void 0 === _g ? void 0 : _g['stitchingInfo']) ||
            void 0 === _h
              ? void 0
              : _h.dynamicSelectionSetsByField) && void 0 !== _j
          ? _j
          : {},
    };
  };
  function reversePossibleTypesMap(possibleTypesMap) {
    const result = Object.create(null);
    for (const typeName in possibleTypesMap) {
      const toTypeNames = possibleTypesMap[typeName];
      for (const toTypeName of toTypeNames) {
        if (!result[toTypeName]) result[toTypeName] = [];
        result[toTypeName].push(typeName);
      }
    }
    return result;
  }
  function getExpandedFragments(fragments, fragmentNames, possibleTypesMap) {
    let fragmentCounter = 0;
    function generateFragmentName(typeName) {
      let fragmentName;
      do {
        fragmentName = `_${typeName}_Fragment${fragmentCounter.toString()}`;
        fragmentCounter++;
      } while (fragmentNames.has(fragmentName));
      return fragmentName;
    }
    const expandedFragments = [];
    const fragmentReplacements = Object.create(null);
    for (const fragment of fragments) {
      const possibleTypes = possibleTypesMap[fragment.typeCondition.name.value];
      if (null != possibleTypes) {
        const fragmentName = fragment.name.value;
        fragmentReplacements[fragmentName] = [];
        for (const possibleTypeName of possibleTypes) {
          const name = generateFragmentName(possibleTypeName);
          fragmentNames.add(name);
          expandedFragments.push({
            kind: kinds_Kind.FRAGMENT_DEFINITION,
            name: {
              kind: kinds_Kind.NAME,
              value: name,
            },
            typeCondition: {
              kind: kinds_Kind.NAMED_TYPE,
              name: {
                kind: kinds_Kind.NAME,
                value: possibleTypeName,
              },
            },
            selectionSet: fragment.selectionSet,
          });
          fragmentReplacements[fragmentName].push({
            fragmentName: name,
            typeName: possibleTypeName,
          });
        }
      }
    }
    return {
      expandedFragments,
      fragmentReplacements,
    };
  }
  function wrapConcreteTypes(returnType, targetSchema, document) {
    const namedType = definition_getNamedType(returnType);
    if (!definition_isObjectType(namedType)) return document;
    const rootTypeNames = getRootTypeNames(targetSchema);
    const typeInfo = new TypeInfo_TypeInfo(targetSchema);
    return visitor_visit(
      document,
      TypeInfo_visitWithTypeInfo(typeInfo, {
        [kinds_Kind.FRAGMENT_DEFINITION]: node => {
          const typeName = node.typeCondition.name.value;
          if (!rootTypeNames.has(typeName)) return false;
        },
        [kinds_Kind.FIELD]: node => {
          const type = typeInfo.getType();
          if (null != type && definition_isAbstractType(definition_getNamedType(type)))
            return {
              ...node,
              selectionSet: {
                kind: kinds_Kind.SELECTION_SET,
                selections: [
                  {
                    kind: kinds_Kind.INLINE_FRAGMENT,
                    typeCondition: {
                      kind: kinds_Kind.NAMED_TYPE,
                      name: {
                        kind: kinds_Kind.NAME,
                        value: namedType.name,
                      },
                    },
                    selectionSet: node.selectionSet,
                  },
                ],
              },
            };
        },
      }),
      {
        Name: [],
        Document: ['definitions'],
        OperationDefinition: ['selectionSet'],
        VariableDefinition: [],
        Variable: [],
        SelectionSet: ['selections'],
        Field: [],
        Argument: [],
        FragmentSpread: [],
        InlineFragment: ['selectionSet'],
        FragmentDefinition: ['selectionSet'],
        IntValue: [],
        FloatValue: [],
        StringValue: [],
        BooleanValue: [],
        NullValue: [],
        EnumValue: [],
        ListValue: [],
        ObjectValue: [],
        ObjectField: [],
        Directive: [],
        NamedType: [],
        ListType: [],
        NonNullType: [],
        SchemaDefinition: [],
        OperationTypeDefinition: [],
        ScalarTypeDefinition: [],
        ObjectTypeDefinition: [],
        FieldDefinition: [],
        InputValueDefinition: [],
        InterfaceTypeDefinition: [],
        UnionTypeDefinition: [],
        EnumTypeDefinition: [],
        EnumValueDefinition: [],
        InputObjectTypeDefinition: [],
        DirectiveDefinition: [],
        SchemaExtension: [],
        ScalarTypeExtension: [],
        ObjectTypeExtension: [],
        InterfaceTypeExtension: [],
        UnionTypeExtension: [],
        EnumTypeExtension: [],
        InputObjectTypeExtension: [],
      }
    );
  }
  function finalizeGatewayDocument(targetSchema, fragments, operations) {
    var _a;
    let usedVariables = [];
    let usedFragments = [];
    const newOperations = [];
    let newFragments = [];
    const validFragments = [];
    const validFragmentsWithType = Object.create(null);
    for (const fragment of fragments) {
      const typeName = fragment.typeCondition.name.value;
      const type = targetSchema.getType(typeName);
      if (null != type) {
        validFragments.push(fragment);
        validFragmentsWithType[fragment.name.value] = type;
      }
    }
    let fragmentSet = Object.create(null);
    for (const operation of operations) {
      const type = getDefinedRootType(targetSchema, operation.operation);
      const {
        selectionSet,
        usedFragments: operationUsedFragments,
        usedVariables: operationUsedVariables,
      } = finalizeSelectionSet(targetSchema, type, validFragmentsWithType, operation.selectionSet);
      usedFragments = union(usedFragments, operationUsedFragments);
      const {
        usedVariables: collectedUsedVariables,
        newFragments: collectedNewFragments,
        fragmentSet: collectedFragmentSet,
      } = collectFragmentVariables(targetSchema, fragmentSet, validFragments, validFragmentsWithType, usedFragments);
      const operationOrFragmentVariables = union(operationUsedVariables, collectedUsedVariables);
      usedVariables = union(usedVariables, operationOrFragmentVariables);
      newFragments = collectedNewFragments;
      fragmentSet = collectedFragmentSet;
      const variableDefinitions = (null !== (_a = operation.variableDefinitions) && void 0 !== _a ? _a : []).filter(
        variable => -1 !== operationOrFragmentVariables.indexOf(variable.variable.name.value)
      );
      newOperations.push({
        kind: kinds_Kind.OPERATION_DEFINITION,
        operation: operation.operation,
        name: operation.name,
        directives: operation.directives,
        variableDefinitions,
        selectionSet,
      });
    }
    return {
      usedVariables,
      newDocument: {
        kind: kinds_Kind.DOCUMENT,
        definitions: [...newOperations, ...newFragments],
      },
    };
  }
  function finalizeGatewayRequest(originalRequest, delegationContext) {
    let { document, variables } = originalRequest;
    let { operations, fragments } = getDocumentMetadata(document);
    const { targetSchema, args } = delegationContext;
    if (args) {
      const requestWithNewVariables = addVariablesToRootFields(targetSchema, operations, args);
      operations = requestWithNewVariables.newOperations;
      variables = Object.assign({}, null != variables ? variables : {}, requestWithNewVariables.newVariables);
    }
    const { usedVariables, newDocument } = finalizeGatewayDocument(targetSchema, fragments, operations);
    const newVariables = {};
    if (null != variables)
      for (const variableName of usedVariables) {
        const variableValue = variables[variableName];
        if (void 0 !== variableValue) newVariables[variableName] = variableValue;
      }
    return {
      ...originalRequest,
      document: newDocument,
      variables: newVariables,
    };
  }
  function addVariablesToRootFields(targetSchema, operations, args) {
    const newVariables = Object.create(null);
    return {
      newOperations: operations.map(operation => {
        var _a, _b;
        const variableDefinitionMap = (null !== (_a = operation.variableDefinitions) && void 0 !== _a ? _a : []).reduce(
          (prev, def) => ({
            ...prev,
            [def.variable.name.value]: def,
          }),
          {}
        );
        const type = getDefinedRootType(targetSchema, operation.operation);
        const newSelectionSet = [];
        for (const selection of operation.selectionSet.selections)
          if (selection.kind === kinds_Kind.FIELD) {
            const argumentNodeMap = (null !== (_b = selection.arguments) && void 0 !== _b ? _b : []).reduce(
              (prev, argument) => ({
                ...prev,
                [argument.name.value]: argument,
              }),
              {}
            );
            const targetField = type.getFields()[selection.name.value];
            if (null != targetField)
              updateArguments(targetField, argumentNodeMap, variableDefinitionMap, newVariables, args);
            newSelectionSet.push({
              ...selection,
              arguments: Object.values(argumentNodeMap),
            });
          } else newSelectionSet.push(selection);
        return {
          ...operation,
          variableDefinitions: Object.values(variableDefinitionMap),
          selectionSet: {
            kind: kinds_Kind.SELECTION_SET,
            selections: newSelectionSet,
          },
        };
      }),
      newVariables,
    };
  }
  function updateArguments(targetField, argumentNodeMap, variableDefinitionMap, variableValues, newArgs) {
    const generateVariableName = utils_createVariableNameGenerator(variableDefinitionMap);
    for (const argument of targetField.args) {
      const argName = argument.name;
      const argType = argument.type;
      if (argName in newArgs)
        utils_updateArgument(
          argumentNodeMap,
          variableDefinitionMap,
          variableValues,
          argName,
          generateVariableName(argName),
          argType,
          serializeInputValue(argType, newArgs[argName])
        );
    }
  }
  function collectFragmentVariables(targetSchema, fragmentSet, validFragments, validFragmentsWithType, usedFragments) {
    let remainingFragments = usedFragments.slice();
    let usedVariables = [];
    const newFragments = [];
    while (0 !== remainingFragments.length) {
      const nextFragmentName = remainingFragments.pop();
      const fragment = validFragments.find(fr => fr.name.value === nextFragmentName);
      if (null != fragment) {
        const name = nextFragmentName;
        const typeName = fragment.typeCondition.name.value;
        const type = targetSchema.getType(typeName);
        if (null == type)
          throw new Error(
            `Fragment reference type "${typeName}", but the type is not contained within the target schema.`
          );
        const {
          selectionSet,
          usedFragments: fragmentUsedFragments,
          usedVariables: fragmentUsedVariables,
        } = finalizeSelectionSet(targetSchema, type, validFragmentsWithType, fragment.selectionSet);
        remainingFragments = union(remainingFragments, fragmentUsedFragments);
        usedVariables = union(usedVariables, fragmentUsedVariables);
        if (name && !(name in fragmentSet)) {
          fragmentSet[name] = true;
          newFragments.push({
            kind: kinds_Kind.FRAGMENT_DEFINITION,
            name: {
              kind: kinds_Kind.NAME,
              value: name,
            },
            typeCondition: fragment.typeCondition,
            selectionSet,
          });
        }
      }
    }
    return {
      usedVariables,
      newFragments,
      fragmentSet,
    };
  }
  const filteredSelectionSetVisitorKeys = {
    SelectionSet: ['selections'],
    Field: ['selectionSet'],
    InlineFragment: ['selectionSet'],
    FragmentDefinition: ['selectionSet'],
  };
  const variablesVisitorKeys = {
    SelectionSet: ['selections'],
    Field: ['arguments', 'directives', 'selectionSet'],
    Argument: ['value'],
    InlineFragment: ['directives', 'selectionSet'],
    FragmentSpread: ['directives'],
    FragmentDefinition: ['selectionSet'],
    ObjectValue: ['fields'],
    ObjectField: ['name', 'value'],
    Directive: ['arguments'],
    ListValue: ['values'],
  };
  function finalizeSelectionSet(schema, type, validFragments, selectionSet) {
    const usedFragments = [];
    const usedVariables = [];
    const typeInfo = new TypeInfo_TypeInfo(schema, void 0, type);
    const filteredSelectionSet = visitor_visit(
      selectionSet,
      TypeInfo_visitWithTypeInfo(typeInfo, {
        [kinds_Kind.FIELD]: {
          enter: node => {
            const parentType = typeInfo.getParentType();
            if (definition_isObjectType(parentType) || definition_isInterfaceType(parentType)) {
              const fields = parentType.getFields();
              const field =
                '__typename' === node.name.value ? introspection_TypeNameMetaFieldDef : fields[node.name.value];
              if (!field) return null;
              const args = null != field.args ? field.args : [];
              const argsMap = Object.create(null);
              for (const arg of args) argsMap[arg.name] = arg;
              if (null != node.arguments) {
                const newArgs = [];
                for (const arg of node.arguments) if (arg.name.value in argsMap) newArgs.push(arg);
                if (newArgs.length !== node.arguments.length)
                  return {
                    ...node,
                    arguments: newArgs,
                  };
              }
            }
          },
          leave: node => {
            const type = typeInfo.getType();
            if (null == type) throw new Error(`No type was found for field node ${node}.`);
            const namedType = definition_getNamedType(type);
            if (null == !schema.getType(namedType.name)) return null;
            if (definition_isObjectType(namedType) || definition_isInterfaceType(namedType)) {
              const selections = null != node.selectionSet ? node.selectionSet.selections : null;
              if (null == selections || 0 === selections.length) return null;
            }
          },
        },
        [kinds_Kind.FRAGMENT_SPREAD]: {
          enter: node => {
            if (!(node.name.value in validFragments)) return null;
            const parentType = typeInfo.getParentType();
            const innerType = validFragments[node.name.value];
            if (!implementsAbstractType(schema, parentType, innerType)) return null;
            usedFragments.push(node.name.value);
          },
        },
        [kinds_Kind.INLINE_FRAGMENT]: {
          enter: node => {
            if (null != node.typeCondition) {
              const parentType = typeInfo.getParentType();
              const innerType = schema.getType(node.typeCondition.name.value);
              if (!implementsAbstractType(schema, parentType, innerType)) return null;
            }
          },
        },
        [kinds_Kind.SELECTION_SET]: {
          leave: node => {
            const parentType = typeInfo.getParentType();
            if (null != parentType && definition_isAbstractType(parentType)) {
              const selections = node.selections.concat([
                {
                  kind: kinds_Kind.FIELD,
                  name: {
                    kind: kinds_Kind.NAME,
                    value: '__typename',
                  },
                },
              ]);
              return {
                ...node,
                selections,
              };
            }
          },
        },
      }),
      filteredSelectionSetVisitorKeys
    );
    visitor_visit(
      filteredSelectionSet,
      {
        [kinds_Kind.VARIABLE]: variableNode => {
          usedVariables.push(variableNode.name.value);
        },
      },
      variablesVisitorKeys
    );
    return {
      selectionSet: filteredSelectionSet,
      usedFragments,
      usedVariables,
    };
  }
  function union(...arrays) {
    const cache = Object.create(null);
    const result = [];
    for (const array of arrays)
      for (const item of array)
        if (!(item in cache)) {
          cache[item] = true;
          result.push(item);
        }
    return result;
  }
  const UNPATHED_ERRORS_SYMBOL = Symbol('subschemaErrors');
  const OBJECT_SUBSCHEMA_SYMBOL = Symbol('initialSubschema');
  const FIELD_SUBSCHEMA_MAP_SYMBOL = Symbol('subschemaMap');
  const sortSubschemasByProxiability = (function (fn) {
    let cache1;
    return function (a1, a2, a3, a4) {
      if (!cache1) {
        cache1 = new WeakMap();
        const cache2 = new WeakMap();
        cache1.set(a1, cache2);
        const cache3 = new WeakMap();
        cache2.set(a2, cache3);
        const cache4 = new WeakMap();
        cache3.set(a3, cache4);
        const newValue = fn(a1, a2, a3, a4);
        cache4.set(a4, newValue);
        return newValue;
      }
      let cache2 = cache1.get(a1);
      if (!cache2) {
        cache2 = new WeakMap();
        cache1.set(a1, cache2);
        const cache3 = new WeakMap();
        cache2.set(a2, cache3);
        const cache4 = new WeakMap();
        cache3.set(a3, cache4);
        const newValue = fn(a1, a2, a3, a4);
        cache4.set(a4, newValue);
        return newValue;
      }
      let cache3 = cache2.get(a2);
      if (!cache3) {
        cache3 = new WeakMap();
        cache2.set(a2, cache3);
        const cache4 = new WeakMap();
        cache3.set(a3, cache4);
        const newValue = fn(a1, a2, a3, a4);
        cache4.set(a4, newValue);
        return newValue;
      }
      const cache4 = cache3.get(a3);
      if (!cache4) {
        const cache4 = new WeakMap();
        cache3.set(a3, cache4);
        const newValue = fn(a1, a2, a3, a4);
        cache4.set(a4, newValue);
        return newValue;
      }
      const cachedValue = cache4.get(a4);
      if (void 0 === cachedValue) {
        const newValue = fn(a1, a2, a3, a4);
        cache4.set(a4, newValue);
        return newValue;
      }
      return cachedValue;
    };
  })(function (mergedTypeInfo, sourceSubschemaOrSourceSubschemas, targetSubschemas, fieldNodes) {
    const proxiableSubschemas = [];
    const nonProxiableSubschemas = [];
    for (const t of targetSubschemas) {
      const selectionSet = mergedTypeInfo.selectionSets.get(t);
      const fieldSelectionSets = mergedTypeInfo.fieldSelectionSets.get(t);
      if (
        null != selectionSet &&
        !subschemaTypesContainSelectionSet(mergedTypeInfo, sourceSubschemaOrSourceSubschemas, selectionSet)
      )
        nonProxiableSubschemas.push(t);
      else if (
        null == fieldSelectionSets ||
        fieldNodes.every(fieldNode => {
          const fieldName = fieldNode.name.value;
          const fieldSelectionSet = fieldSelectionSets[fieldName];
          return (
            null == fieldSelectionSet ||
            subschemaTypesContainSelectionSet(mergedTypeInfo, sourceSubschemaOrSourceSubschemas, fieldSelectionSet)
          );
        })
      )
        proxiableSubschemas.push(t);
      else nonProxiableSubschemas.push(t);
    }
    return {
      proxiableSubschemas,
      nonProxiableSubschemas,
    };
  });
  const buildDelegationPlan = delegate_memoize3(function (mergedTypeInfo, fieldNodes, proxiableSubschemas) {
    var _a;
    const { uniqueFields, nonUniqueFields } = mergedTypeInfo;
    const unproxiableFieldNodes = [];
    const delegationMap = new Map();
    for (const fieldNode of fieldNodes) {
      if ('__typename' === fieldNode.name.value) continue;
      const uniqueSubschema = uniqueFields[fieldNode.name.value];
      if (null != uniqueSubschema) {
        if (!proxiableSubschemas.includes(uniqueSubschema)) {
          unproxiableFieldNodes.push(fieldNode);
          continue;
        }
        const existingSubschema =
          null === (_a = delegationMap.get(uniqueSubschema)) || void 0 === _a ? void 0 : _a.selections;
        if (null != existingSubschema) existingSubschema.push(fieldNode);
        else
          delegationMap.set(uniqueSubschema, {
            kind: kinds_Kind.SELECTION_SET,
            selections: [fieldNode],
          });
        continue;
      }
      let nonUniqueSubschemas = nonUniqueFields[fieldNode.name.value];
      if (null == nonUniqueSubschemas) {
        unproxiableFieldNodes.push(fieldNode);
        continue;
      }
      nonUniqueSubschemas = nonUniqueSubschemas.filter(s => proxiableSubschemas.includes(s));
      if (!nonUniqueSubschemas.length) {
        unproxiableFieldNodes.push(fieldNode);
        continue;
      }
      const existingSubschema = nonUniqueSubschemas.find(s => delegationMap.has(s));
      if (null != existingSubschema) delegationMap.get(existingSubschema).selections.push(fieldNode);
      else
        delegationMap.set(nonUniqueSubschemas[0], {
          kind: kinds_Kind.SELECTION_SET,
          selections: [fieldNode],
        });
    }
    return {
      delegationMap,
      unproxiableFieldNodes,
    };
  });
  const combineSubschemas = function (subschemaOrSubschemas, additionalSubschemas) {
    return Array.isArray(subschemaOrSubschemas)
      ? subschemaOrSubschemas.concat(additionalSubschemas)
      : [subschemaOrSubschemas].concat(additionalSubschemas);
  };
  function isExternalObject(data) {
    return void 0 !== data[UNPATHED_ERRORS_SYMBOL];
  }
  function annotateExternalObject(object, errors, subschema) {
    Object.defineProperties(object, {
      [OBJECT_SUBSCHEMA_SYMBOL]: {
        value: subschema,
      },
      [FIELD_SUBSCHEMA_MAP_SYMBOL]: {
        value: Object.create(null),
      },
      [UNPATHED_ERRORS_SYMBOL]: {
        value: errors,
      },
    });
    return object;
  }
  function getSubschema(object, responseKey) {
    var _a;
    return null !== (_a = object[FIELD_SUBSCHEMA_MAP_SYMBOL][responseKey]) && void 0 !== _a
      ? _a
      : object[OBJECT_SUBSCHEMA_SYMBOL];
  }
  function getUnpathedErrors(object) {
    return object[UNPATHED_ERRORS_SYMBOL];
  }
  async function delegate_mergeFields(
    mergedTypeInfo,
    typeName,
    object,
    fieldNodes,
    sourceSubschemaOrSourceSubschemas,
    targetSubschemas,
    context,
    info
  ) {
    var _a;
    if (!fieldNodes.length) return object;
    const { proxiableSubschemas, nonProxiableSubschemas } = sortSubschemasByProxiability(
      mergedTypeInfo,
      sourceSubschemaOrSourceSubschemas,
      targetSubschemas,
      fieldNodes
    );
    const { delegationMap, unproxiableFieldNodes } = buildDelegationPlan(
      mergedTypeInfo,
      fieldNodes,
      proxiableSubschemas
    );
    if (!delegationMap.size) return object;
    const combinedErrors = object[UNPATHED_ERRORS_SYMBOL] || [];
    const path = pathToArray(info.path);
    const newFieldSubschemaMap =
      null !== (_a = object[FIELD_SUBSCHEMA_MAP_SYMBOL]) && void 0 !== _a ? _a : Object.create(null);
    const type = info.schema.getType(object.__typename);
    const results = await Promise.all(
      [...delegationMap.entries()].map(async ([s, selectionSet]) => {
        var _a;
        const resolver = mergedTypeInfo.resolvers.get(s);
        if (resolver) {
          let source;
          try {
            source = await resolver(object, context, info, s, selectionSet);
          } catch (error) {
            source = error;
          }
          if (source instanceof Error || null === source) {
            const fieldNodes = (0, execution_execute.gd)(
              {
                schema: info.schema,
                variableValues: {},
                fragments: {},
              },
              type,
              selectionSet,
              Object.create(null),
              Object.create(null)
            );
            const nullResult = {};
            for (const responseKey in fieldNodes) {
              const combinedPath = [...path, responseKey];
              if (source instanceof GraphQLError) nullResult[responseKey] = utils_relocatedError(source, combinedPath);
              else if (source instanceof Error)
                nullResult[responseKey] = locatedError(source, fieldNodes[responseKey], combinedPath);
              else nullResult[responseKey] = null;
            }
            source = nullResult;
          } else if (source[UNPATHED_ERRORS_SYMBOL]) combinedErrors.push(...source[UNPATHED_ERRORS_SYMBOL]);
          const objectSubschema = source[OBJECT_SUBSCHEMA_SYMBOL];
          const fieldSubschemaMap = source[FIELD_SUBSCHEMA_MAP_SYMBOL];
          for (const responseKey in source)
            newFieldSubschemaMap[responseKey] =
              null !== (_a = null == fieldSubschemaMap ? void 0 : fieldSubschemaMap[responseKey]) && void 0 !== _a
                ? _a
                : objectSubschema;
          return source;
        }
      })
    );
    const combinedResult = Object.assign({}, object, ...results);
    combinedResult[FIELD_SUBSCHEMA_MAP_SYMBOL] = newFieldSubschemaMap;
    combinedResult[OBJECT_SUBSCHEMA_SYMBOL] = object[OBJECT_SUBSCHEMA_SYMBOL];
    combinedResult[UNPATHED_ERRORS_SYMBOL] = combinedErrors;
    return delegate_mergeFields(
      mergedTypeInfo,
      typeName,
      combinedResult,
      unproxiableFieldNodes,
      combineSubschemas(sourceSubschemaOrSourceSubschemas, proxiableSubschemas),
      nonProxiableSubschemas,
      context,
      info
    );
  }
  const subschemaTypesContainSelectionSet = delegate_memoize3(function (
    mergedTypeInfo,
    sourceSubschemaOrSourceSubschemas,
    selectionSet
  ) {
    if (Array.isArray(sourceSubschemaOrSourceSubschemas))
      return typesContainSelectionSet(
        sourceSubschemaOrSourceSubschemas.map(sourceSubschema =>
          sourceSubschema.transformedSchema.getType(mergedTypeInfo.typeName)
        ),
        selectionSet
      );
    return typesContainSelectionSet(
      [sourceSubschemaOrSourceSubschemas.transformedSchema.getType(mergedTypeInfo.typeName)],
      selectionSet
    );
  });
  function typesContainSelectionSet(types, selectionSet) {
    var _a;
    const fieldMaps = types.map(type => type.getFields());
    for (const selection of selectionSet.selections)
      if (selection.kind === kinds_Kind.FIELD) {
        const fields = fieldMaps.map(fieldMap => fieldMap[selection.name.value]).filter(field => null != field);
        if (!fields.length) return false;
        if (null != selection.selectionSet)
          return typesContainSelectionSet(
            fields.map(field => definition_getNamedType(field.type)),
            selection.selectionSet
          );
      } else if (
        selection.kind === kinds_Kind.INLINE_FRAGMENT &&
        (null === (_a = selection.typeCondition) || void 0 === _a ? void 0 : _a.name.value) === types[0].name
      )
        return typesContainSelectionSet(types, selection.selectionSet);
    return true;
  }
  function isSubschemaConfig(value) {
    return Boolean(null == value ? void 0 : value.schema);
  }
  function cloneSubschemaConfig(subschemaConfig) {
    var _a, _b;
    const newSubschemaConfig = {
      ...subschemaConfig,
      transforms: null != subschemaConfig.transforms ? [...subschemaConfig.transforms] : void 0,
    };
    if (null != newSubschemaConfig.merge) {
      newSubschemaConfig.merge = {
        ...subschemaConfig.merge,
      };
      for (const typeName in newSubschemaConfig.merge) {
        const mergedTypeConfig = (newSubschemaConfig.merge[typeName] = {
          ...(null !== (_b = null === (_a = subschemaConfig.merge) || void 0 === _a ? void 0 : _a[typeName]) &&
          void 0 !== _b
            ? _b
            : {}),
        });
        if (null != mergedTypeConfig.entryPoints)
          mergedTypeConfig.entryPoints = mergedTypeConfig.entryPoints.map(entryPoint => ({
            ...entryPoint,
          }));
        if (null != mergedTypeConfig.fields) {
          const fields = (mergedTypeConfig.fields = {
            ...mergedTypeConfig.fields,
          });
          for (const fieldName in fields)
            fields[fieldName] = {
              ...fields[fieldName],
            };
        }
      }
    }
    return newSubschemaConfig;
  }
  function delegate_collectSubFields(info, typeName) {
    let subFieldNodes = Object.create(null);
    const visitedFragmentNames = Object.create(null);
    const type = info.schema.getType(typeName);
    const partialExecutionContext = {
      schema: info.schema,
      variableValues: info.variableValues,
      fragments: info.fragments,
    };
    for (const fieldNode of info.fieldNodes)
      if (fieldNode.selectionSet)
        subFieldNodes = (0, execution_execute.gd)(
          partialExecutionContext,
          type,
          fieldNode.selectionSet,
          subFieldNodes,
          visitedFragmentNames
        );
    return subFieldNodes;
  }
  const getFieldsNotInSubschema = (function (fn) {
    let cache1;
    return function (a1, a2, a3) {
      if (!cache1) {
        cache1 = new WeakMap();
        const cache2 = new WeakMap();
        cache1.set(a1.fieldNodes, cache2);
        const cache3 = new WeakMap();
        cache2.set(a2, cache3);
        const newValue = fn(a1, a2, a3);
        cache3.set(a3, newValue);
        return newValue;
      }
      let cache2 = cache1.get(a1.fieldNodes);
      if (!cache2) {
        cache2 = new WeakMap();
        cache1.set(a1.fieldNodes, cache2);
        const cache3 = new WeakMap();
        cache2.set(a2, cache3);
        const newValue = fn(a1, a2, a3);
        cache3.set(a3, newValue);
        return newValue;
      }
      let cache3 = cache2.get(a2);
      if (!cache3) {
        cache3 = new WeakMap();
        cache2.set(a2, cache3);
        const newValue = fn(a1, a2, a3);
        cache3.set(a3, newValue);
        return newValue;
      }
      const cachedValue = cache3.get(a3);
      if (void 0 === cachedValue) {
        const newValue = fn(a1, a2, a3);
        cache3.set(a3, newValue);
        return newValue;
      }
      return cachedValue;
    };
  })(function (info, subschema, mergedTypeInfo) {
    var _a, _b;
    const typeMap = isSubschemaConfig(subschema) ? mergedTypeInfo.typeMaps.get(subschema) : subschema.getTypeMap();
    if (!typeMap) return [];
    const typeName = mergedTypeInfo.typeName;
    const fields = typeMap[typeName].getFields();
    const subFieldNodes = delegate_collectSubFields(info, typeName);
    const stitchingInfo = null === (_a = info.schema.extensions) || void 0 === _a ? void 0 : _a['stitchingInfo'];
    const fieldNodesByField = null == stitchingInfo ? void 0 : stitchingInfo.fieldNodesByField;
    const fieldsNotInSchema = new Set();
    for (const responseKey in subFieldNodes) {
      const subFieldNodesForResponseKey = subFieldNodes[responseKey];
      const fieldName = subFieldNodesForResponseKey[0].name.value;
      if (!fields[fieldName])
        for (const subFieldNodeForResponseKey of subFieldNodesForResponseKey)
          fieldsNotInSchema.add(subFieldNodeForResponseKey);
      const fieldNodesForField =
        null === (_b = null == fieldNodesByField ? void 0 : fieldNodesByField[typeName]) || void 0 === _b
          ? void 0
          : _b[fieldName];
      if (fieldNodesForField)
        for (const fieldNode of fieldNodesForField) if (!fields[fieldNode.name.value]) fieldsNotInSchema.add(fieldNode);
    }
    return Array.from(fieldsNotInSchema);
  });
  function resolveExternalValue(
    result,
    unpathedErrors,
    subschema,
    context,
    info,
    returnType = getReturnType(info),
    skipTypeMerging
  ) {
    const type = definition_getNullableType(returnType);
    if (result instanceof Error) return result;
    if (null == result) return reportUnpathedErrorsViaNull(unpathedErrors);
    if ('parseValue' in type) return type.parseValue(result);
    else if (isCompositeType(type))
      return resolveExternalObject(type, result, unpathedErrors, subschema, context, info, skipTypeMerging);
    else if (definition_isListType(type))
      return resolveExternalList(type, result, unpathedErrors, subschema, context, info, skipTypeMerging);
  }
  function resolveExternalObject(type, object, unpathedErrors, subschema, context, info, skipTypeMerging) {
    var _a;
    if (!isExternalObject(object)) annotateExternalObject(object, unpathedErrors, subschema);
    if (skipTypeMerging || null == info) return object;
    const stitchingInfo = null === (_a = info.schema.extensions) || void 0 === _a ? void 0 : _a['stitchingInfo'];
    if (null == stitchingInfo) return object;
    let typeName;
    if (definition_isAbstractType(type)) {
      const resolvedType = info.schema.getType(object.__typename);
      if (null == resolvedType)
        throw new Error(
          `Unable to resolve type '${object.__typename}'. Did you forget to include a transform that renames types? Did you delegate to the original subschema rather that the subschema config object containing the transform?`
        );
      typeName = resolvedType.name;
    } else typeName = type.name;
    const mergedTypeInfo = stitchingInfo.mergedTypes[typeName];
    let targetSubschemas;
    if (null != mergedTypeInfo) targetSubschemas = mergedTypeInfo.targetSubschemas.get(subschema);
    if (!targetSubschemas) return object;
    return delegate_mergeFields(
      mergedTypeInfo,
      typeName,
      object,
      getFieldsNotInSubschema(info, subschema, mergedTypeInfo),
      subschema,
      targetSubschemas,
      context,
      info
    );
  }
  function resolveExternalList(type, list, unpathedErrors, subschema, context, info, skipTypeMerging) {
    return list.map(listMember =>
      resolveExternalListMember(
        definition_getNullableType(type.ofType),
        listMember,
        unpathedErrors,
        subschema,
        context,
        info,
        skipTypeMerging
      )
    );
  }
  function resolveExternalListMember(type, listMember, unpathedErrors, subschema, context, info, skipTypeMerging) {
    if (listMember instanceof Error) return listMember;
    if (null == listMember) return reportUnpathedErrorsViaNull(unpathedErrors);
    if (definition_isLeafType(type)) return type.parseValue(listMember);
    else if (isCompositeType(type))
      return resolveExternalObject(type, listMember, unpathedErrors, subschema, context, info, skipTypeMerging);
    else if (definition_isListType(type))
      return resolveExternalList(type, listMember, unpathedErrors, subschema, context, info, skipTypeMerging);
  }
  const reportedErrors = new WeakMap();
  function reportUnpathedErrorsViaNull(unpathedErrors) {
    if (unpathedErrors.length) {
      const unreportedErrors = [];
      for (const error of unpathedErrors)
        if (!reportedErrors.has(error)) {
          unreportedErrors.push(error);
          reportedErrors.set(error, true);
        }
      if (unreportedErrors.length) {
        if (1 === unreportedErrors.length) return unreportedErrors[0];
        return locatedError(new AggregateErrorImpl(unreportedErrors), void 0, unreportedErrors[0].path);
      }
    }
    return null;
  }
  function getReturnType(info) {
    if (null == info) throw new Error('Return type cannot be inferred without a source schema.');
    return info.returnType;
  }
  function checkResultAndHandleErrors(result, delegationContext) {
    const {
      context,
      info,
      fieldName: responseKey = getResponseKey(info),
      subschema,
      returnType = getReturnType$1(info),
      skipTypeMerging,
      onLocatedError,
    } = delegationContext;
    const { data, unpathedErrors } = mergeDataAndErrors(
      null == result.data ? void 0 : result.data[responseKey],
      null == result.errors ? [] : result.errors,
      null != info && info.path ? pathToArray(info.path) : void 0,
      onLocatedError
    );
    return resolveExternalValue(data, unpathedErrors, subschema, context, info, returnType, skipTypeMerging);
  }
  function mergeDataAndErrors(data, errors, path, onLocatedError, index = 1) {
    var _a;
    if (null == data) {
      if (!errors.length)
        return {
          data: null,
          unpathedErrors: [],
        };
      if (1 === errors.length) {
        const error = onLocatedError ? onLocatedError(errors[0]) : errors[0];
        const newPath = void 0 === path ? error.path : void 0 === error.path ? path : path.concat(error.path.slice(1));
        return {
          data: utils_relocatedError(errors[0], newPath),
          unpathedErrors: [],
        };
      }
      return {
        data: locatedError(new AggregateErrorImpl(errors), void 0, path),
        unpathedErrors: [],
      };
    }
    if (!errors.length)
      return {
        data,
        unpathedErrors: [],
      };
    const unpathedErrors = [];
    const errorMap = new Map();
    for (const error of errors) {
      const pathSegment = null === (_a = error.path) || void 0 === _a ? void 0 : _a[index];
      if (null != pathSegment) {
        let pathSegmentErrors = errorMap.get(pathSegment);
        if (void 0 === pathSegmentErrors) {
          pathSegmentErrors = [error];
          errorMap.set(pathSegment, pathSegmentErrors);
        } else pathSegmentErrors.push(error);
      } else unpathedErrors.push(error);
    }
    for (const [pathSegment, pathSegmentErrors] of errorMap)
      if (void 0 !== data[pathSegment]) {
        const { data: newData, unpathedErrors: newErrors } = mergeDataAndErrors(
          data[pathSegment],
          pathSegmentErrors,
          path,
          onLocatedError,
          index + 1
        );
        data[pathSegment] = newData;
        unpathedErrors.push(...newErrors);
      } else unpathedErrors.push(...pathSegmentErrors);
    return {
      data,
      unpathedErrors,
    };
  }
  function getResponseKey(info) {
    if (null == info) throw new Error('Data cannot be extracted from result without an explicit key or source schema.');
    return getResponseKeyFromInfo(info);
  }
  function getReturnType$1(info) {
    if (null == info) throw new Error('Return type cannot be inferred without a source schema.');
    return info.returnType;
  }
  class Transformer {
    constructor(context) {
      this.transformations = [];
      this.delegationContext = context;
      const delegationTransforms = context.transforms.slice().reverse();
      for (const transform of delegationTransforms) this.addTransform(transform, {});
    }
    addTransform(transform, context = {}) {
      this.transformations.push({
        transform,
        context,
      });
    }
    transformRequest(originalRequest) {
      var _a;
      let request = {
        ...originalRequest,
        document: prepareGatewayDocument(
          originalRequest.document,
          this.delegationContext.transformedSchema,
          this.delegationContext.returnType,
          null === (_a = this.delegationContext.info) || void 0 === _a ? void 0 : _a.schema
        ),
      };
      for (const transformation of this.transformations)
        if (transformation.transform.transformRequest)
          request = transformation.transform.transformRequest(request, this.delegationContext, transformation.context);
      return finalizeGatewayRequest(request, this.delegationContext);
    }
    transformResult(originalResult) {
      let result = originalResult;
      for (let i = this.transformations.length - 1; i >= 0; i--) {
        const transformation = this.transformations[i];
        if (transformation.transform.transformResult)
          result = transformation.transform.transformResult(result, this.delegationContext, transformation.context);
      }
      return checkResultAndHandleErrors(result, this.delegationContext);
    }
  }
  function getDelegatingOperation(parentType, schema) {
    if (parentType === schema.getMutationType()) return 'mutation';
    else if (parentType === schema.getSubscriptionType()) return 'subscription';
    return 'query';
  }
  function createRequestFromInfo({
    info,
    rootValue,
    operationName,
    operation = getDelegatingOperation(info.parentType, info.schema),
    fieldName = info.fieldName,
    selectionSet,
    fieldNodes = info.fieldNodes,
    context,
  }) {
    return createRequest({
      sourceSchema: info.schema,
      sourceParentType: info.parentType,
      sourceFieldName: info.fieldName,
      fragments: info.fragments,
      variableDefinitions: info.operation.variableDefinitions,
      variableValues: info.variableValues,
      targetRootValue: rootValue,
      targetOperationName: operationName,
      targetOperation: operation,
      targetFieldName: fieldName,
      selectionSet,
      fieldNodes,
      context,
      info,
    });
  }
  function createRequest({
    sourceSchema,
    sourceParentType,
    sourceFieldName,
    fragments,
    variableDefinitions,
    variableValues,
    targetRootValue,
    targetOperationName,
    targetOperation,
    targetFieldName,
    selectionSet,
    fieldNodes,
    context,
    info,
  }) {
    var _a, _b;
    let newSelectionSet;
    const argumentNodeMap = Object.create(null);
    if (null != selectionSet) newSelectionSet = selectionSet;
    else {
      const selections = [];
      for (const fieldNode of fieldNodes || [])
        if (fieldNode.selectionSet)
          for (const selection of fieldNode.selectionSet.selections) selections.push(selection);
      newSelectionSet = selections.length
        ? {
            kind: kinds_Kind.SELECTION_SET,
            selections,
          }
        : void 0;
      const args = null === (_a = null == fieldNodes ? void 0 : fieldNodes[0]) || void 0 === _a ? void 0 : _a.arguments;
      if (args) for (const argNode of args) argumentNodeMap[argNode.name.value] = argNode;
    }
    const newVariables = Object.create(null);
    const variableDefinitionMap = Object.create(null);
    if (null != sourceSchema && null != variableDefinitions)
      for (const def of variableDefinitions) {
        const varName = def.variable.name.value;
        variableDefinitionMap[varName] = def;
        const serializedValue = serializeInputValue(
          typeFromAST_typeFromAST(sourceSchema, def.type),
          null == variableValues ? void 0 : variableValues[varName]
        );
        if (void 0 !== serializedValue) newVariables[varName] = serializedValue;
      }
    if (null != sourceParentType && null != sourceFieldName)
      updateArgumentsWithDefaults(
        sourceParentType,
        sourceFieldName,
        argumentNodeMap,
        variableDefinitionMap,
        newVariables
      );
    const rootFieldName =
      null != targetFieldName
        ? targetFieldName
        : null === (_b = null == fieldNodes ? void 0 : fieldNodes[0]) || void 0 === _b
        ? void 0
        : _b.name.value;
    if (void 0 === rootFieldName)
      throw new Error('Either "targetFieldName" or a non empty "fieldNodes" array must be provided.');
    const rootfieldNode = {
      kind: kinds_Kind.FIELD,
      arguments: Object.values(argumentNodeMap),
      name: {
        kind: kinds_Kind.NAME,
        value: rootFieldName,
      },
      selectionSet: newSelectionSet,
    };
    const operationName = targetOperationName
      ? {
          kind: kinds_Kind.NAME,
          value: targetOperationName,
        }
      : void 0;
    const definitions = [
      {
        kind: kinds_Kind.OPERATION_DEFINITION,
        name: operationName,
        operation: targetOperation,
        variableDefinitions: Object.values(variableDefinitionMap),
        selectionSet: {
          kind: kinds_Kind.SELECTION_SET,
          selections: [rootfieldNode],
        },
      },
    ];
    if (null != fragments)
      for (const fragmentName in fragments) {
        const fragment = fragments[fragmentName];
        definitions.push(fragment);
      }
    return {
      document: {
        kind: kinds_Kind.DOCUMENT,
        definitions,
      },
      variables: newVariables,
      rootValue: targetRootValue,
      operationName: targetOperationName,
      operationType: targetOperation,
      context,
      info,
    };
  }
  function updateArgumentsWithDefaults(
    sourceParentType,
    sourceFieldName,
    argumentNodeMap,
    variableDefinitionMap,
    variableValues
  ) {
    const generateVariableName = utils_createVariableNameGenerator(variableDefinitionMap);
    const sourceField = sourceParentType.getFields()[sourceFieldName];
    for (const argument of sourceField.args) {
      const argName = argument.name;
      const sourceArgType = argument.type;
      if (void 0 === argumentNodeMap[argName]) {
        const defaultValue = argument.defaultValue;
        if (void 0 !== defaultValue)
          utils_updateArgument(
            argumentNodeMap,
            variableDefinitionMap,
            variableValues,
            argName,
            generateVariableName(argName),
            sourceArgType,
            serializeInputValue(sourceArgType, defaultValue)
          );
      }
    }
  }
  function delegate_defaultMergedResolver(parent, args, context, info) {
    if (!parent) return null;
    const responseKey = getResponseKeyFromInfo(info);
    if (!isExternalObject(parent)) return execute_defaultFieldResolver(parent, args, context, info);
    return resolveExternalValue(
      parent[responseKey],
      getUnpathedErrors(parent),
      getSubschema(parent, responseKey),
      context,
      info
    );
  }
  function delegateToSchema(options) {
    const {
      info,
      schema,
      rootValue,
      operationName,
      operation = getDelegatingOperation(info.parentType, info.schema),
      fieldName = info.fieldName,
      selectionSet,
      fieldNodes,
      context,
    } = options;
    const request = createRequestFromInfo({
      info,
      operation,
      fieldName,
      selectionSet,
      fieldNodes,
      rootValue: null != rootValue ? rootValue : schema.rootValue,
      operationName,
      context,
    });
    return delegateRequest({
      ...options,
      request,
    });
  }
  function getDelegationReturnType(targetSchema, operation, fieldName) {
    return getDefinedRootType(targetSchema, operation).getFields()[fieldName].type;
  }
  function delegateRequest(options) {
    const delegationContext = getDelegationContext(options);
    const transformer = new Transformer(delegationContext);
    const processedRequest = transformer.transformRequest(options.request);
    if (options.validateRequest) validateRequest(delegationContext, processedRequest.document);
    const executor = getExecutor(delegationContext);
    return new ValueOrPromise_ValueOrPromise(() => executor(processedRequest))
      .then(originalResult => {
        if (utils_isAsyncIterable(originalResult))
          return mapAsyncIterator(originalResult, result => transformer.transformResult(result));
        return transformer.transformResult(originalResult);
      })
      .resolve();
  }
  function getDelegationContext({
    request,
    schema,
    fieldName,
    returnType,
    args,
    info,
    transforms = [],
    transformedSchema,
    skipTypeMerging = false,
  }) {
    var _a, _b, _c, _d;
    const { operationType: operation, context, operationName, document } = request;
    let operationDefinition;
    let targetFieldName;
    if (null == fieldName) {
      operationDefinition = getOperationAST_getOperationAST(document, operationName);
      if (null == operationDefinition) throw new Error('Cannot infer main operation from the provided document.');
      targetFieldName = (null == operationDefinition ? void 0 : operationDefinition.selectionSet.selections[0]).name
        .value;
    } else targetFieldName = fieldName;
    const stitchingInfo =
      null === (_a = null == info ? void 0 : info.schema.extensions) || void 0 === _a ? void 0 : _a['stitchingInfo'];
    const subschemaOrSubschemaConfig =
      null !== (_b = null == stitchingInfo ? void 0 : stitchingInfo.subschemaMap.get(schema)) && void 0 !== _b
        ? _b
        : schema;
    if (isSubschemaConfig(subschemaOrSubschemaConfig)) {
      const targetSchema = subschemaOrSubschemaConfig.schema;
      return {
        subschema: schema,
        subschemaConfig: subschemaOrSubschemaConfig,
        targetSchema,
        operation,
        fieldName: targetFieldName,
        args,
        context,
        info,
        returnType:
          null !== (_c = null != returnType ? returnType : null == info ? void 0 : info.returnType) && void 0 !== _c
            ? _c
            : getDelegationReturnType(targetSchema, operation, targetFieldName),
        transforms:
          null != subschemaOrSubschemaConfig.transforms
            ? subschemaOrSubschemaConfig.transforms.concat(transforms)
            : transforms,
        transformedSchema:
          null != transformedSchema
            ? transformedSchema
            : subschemaOrSubschemaConfig instanceof Subschema
            ? subschemaOrSubschemaConfig.transformedSchema
            : targetSchema,
        skipTypeMerging,
      };
    }
    return {
      subschema: schema,
      subschemaConfig: void 0,
      targetSchema: subschemaOrSubschemaConfig,
      operation,
      fieldName: targetFieldName,
      args,
      context,
      info,
      returnType:
        null !== (_d = null != returnType ? returnType : null == info ? void 0 : info.returnType) && void 0 !== _d
          ? _d
          : getDelegationReturnType(subschemaOrSubschemaConfig, operation, targetFieldName),
      transforms,
      transformedSchema: null != transformedSchema ? transformedSchema : subschemaOrSubschemaConfig,
      skipTypeMerging,
    };
  }
  function validateRequest(delegationContext, document) {
    const errors = validate_validate(delegationContext.targetSchema, document);
    if (errors.length > 0) {
      if (errors.length > 1) throw new AggregateErrorImpl(errors);
      const error = errors[0];
      throw error.originalError || error;
    }
  }
  function getExecutor(delegationContext) {
    var _a, _b;
    const { subschemaConfig, targetSchema, context } = delegationContext;
    let executor = (null == subschemaConfig ? void 0 : subschemaConfig.executor) || createDefaultExecutor(targetSchema);
    if (null == subschemaConfig ? void 0 : subschemaConfig.batch) {
      const batchingOptions = null == subschemaConfig ? void 0 : subschemaConfig.batchingOptions;
      executor = getBatchingExecutor(
        null !== (_b = null !== (_a = null != context ? context : globalThis) && void 0 !== _a ? _a : window) &&
          void 0 !== _b
          ? _b
          : global,
        executor,
        null == batchingOptions ? void 0 : batchingOptions.dataLoaderOptions,
        null == batchingOptions ? void 0 : batchingOptions.extensionsReducer
      );
    }
    return executor;
  }
  const defaultExecutorCache = new WeakMap();
  function createDefaultExecutor(schema) {
    let defaultExecutor = defaultExecutorCache.get(schema);
    if (!defaultExecutor) {
      defaultExecutor = function ({ document, context, variables, rootValue, operationName, operationType }) {
        const executionArgs = {
          schema,
          document,
          contextValue: context,
          variableValues: variables,
          rootValue,
          operationName,
        };
        if ('subscription' === operationType) return subscribe(executionArgs);
        return execute(executionArgs);
      };
      defaultExecutorCache.set(schema, defaultExecutor);
    }
    return defaultExecutor;
  }
  function generateProxyingResolvers(subschemaConfig) {
    var _a;
    const targetSchema = subschemaConfig.schema;
    const createProxyingResolver =
      null !== (_a = subschemaConfig.createProxyingResolver) && void 0 !== _a ? _a : defaultCreateProxyingResolver;
    const transformedSchema = applySchemaTransforms(targetSchema, subschemaConfig);
    const rootTypeMap = getRootTypeMap(targetSchema);
    const resolvers = {};
    for (const [operation, rootType] of rootTypeMap.entries()) {
      const typeName = rootType.name;
      const fields = rootType.getFields();
      resolvers[typeName] = {};
      for (const fieldName in fields) {
        const finalResolver = createPossiblyNestedProxyingResolver(
          subschemaConfig,
          createProxyingResolver({
            subschemaConfig,
            transformedSchema,
            operation,
            fieldName,
          })
        );
        if ('subscription' === operation)
          resolvers[typeName][fieldName] = {
            subscribe: finalResolver,
            resolve: identical,
          };
        else
          resolvers[typeName][fieldName] = {
            resolve: finalResolver,
          };
      }
    }
    return resolvers;
  }
  function identical(value) {
    return value;
  }
  function createPossiblyNestedProxyingResolver(subschemaConfig, proxyingResolver) {
    return function (parent, args, context, info) {
      if (null != parent) {
        const responseKey = getResponseKeyFromInfo(info);
        if (isExternalObject(parent)) {
          const unpathedErrors = getUnpathedErrors(parent);
          const subschema = getSubschema(parent, responseKey);
          if (subschemaConfig === subschema && void 0 !== parent[responseKey])
            return resolveExternalValue(parent[responseKey], unpathedErrors, subschema, context, info);
        }
      }
      return proxyingResolver(parent, args, context, info);
    };
  }
  function defaultCreateProxyingResolver({ subschemaConfig, operation, transformedSchema }) {
    return function (_parent, _args, context, info) {
      return delegateToSchema({
        schema: subschemaConfig,
        operation,
        context,
        info,
        transformedSchema,
      });
    };
  }
  function wrapSchema(subschemaConfig) {
    const schema = createWrappingSchema(subschemaConfig.schema, generateProxyingResolvers(subschemaConfig));
    const transformedSchema = applySchemaTransforms(schema, subschemaConfig);
    return applySchemaTransforms(schema, subschemaConfig, transformedSchema);
  }
  function createWrappingSchema(schema, proxyingResolvers) {
    return utils_mapSchema(schema, {
      [utils_MapperKind.ROOT_OBJECT]: type => {
        var _a;
        const config = type.toConfig();
        const fieldConfigMap = config.fields;
        for (const fieldName in fieldConfigMap) {
          const field = fieldConfigMap[fieldName];
          if (null == field) continue;
          fieldConfigMap[fieldName] = {
            ...field,
            ...(null === (_a = proxyingResolvers[type.name]) || void 0 === _a ? void 0 : _a[fieldName]),
          };
        }
        return new definition_GraphQLObjectType(config);
      },
      [utils_MapperKind.OBJECT_TYPE]: type => {
        const config = type.toConfig();
        config.isTypeOf = void 0;
        for (const fieldName in config.fields) {
          const field = config.fields[fieldName];
          if (null == field) continue;
          field.resolve = delegate_defaultMergedResolver;
          field.subscribe = void 0;
        }
        return new definition_GraphQLObjectType(config);
      },
      [utils_MapperKind.INTERFACE_TYPE]: type => {
        const config = type.toConfig();
        delete config.resolveType;
        return new definition_GraphQLInterfaceType(config);
      },
      [utils_MapperKind.UNION_TYPE]: type => {
        const config = type.toConfig();
        delete config.resolveType;
        return new definition_GraphQLUnionType(config);
      },
    });
  }
  class TransformCompositeFields {
    constructor(fieldTransformer, fieldNodeTransformer, dataTransformer, errorsTransformer) {
      this.fieldTransformer = fieldTransformer;
      this.fieldNodeTransformer = fieldNodeTransformer;
      this.dataTransformer = dataTransformer;
      this.errorsTransformer = errorsTransformer;
      this.mapping = {};
    }
    _getTypeInfo() {
      const typeInfo = this.typeInfo;
      if (void 0 === typeInfo)
        throw new Error(
          'The TransformCompositeFields transform\'s  "transformRequest" and "transformResult" methods cannot be used without first calling "transformSchema".'
        );
      return typeInfo;
    }
    transformSchema(originalWrappingSchema, _subschemaConfig, _transformedSchema) {
      var _a;
      this.transformedSchema = utils_mapSchema(originalWrappingSchema, {
        [utils_MapperKind.COMPOSITE_FIELD]: (fieldConfig, fieldName, typeName) => {
          const transformedField = this.fieldTransformer(typeName, fieldName, fieldConfig);
          if (Array.isArray(transformedField)) {
            const newFieldName = transformedField[0];
            if (newFieldName !== fieldName) {
              if (!(typeName in this.mapping)) this.mapping[typeName] = {};
              this.mapping[typeName][newFieldName] = fieldName;
            }
          }
          return transformedField;
        },
      });
      this.typeInfo = new TypeInfo_TypeInfo(this.transformedSchema);
      this.subscriptionTypeName =
        null === (_a = originalWrappingSchema.getSubscriptionType()) || void 0 === _a ? void 0 : _a.name;
      return this.transformedSchema;
    }
    transformRequest(originalRequest, _delegationContext, transformationContext) {
      const document = originalRequest.document;
      return {
        ...originalRequest,
        document: this.transformDocument(document, transformationContext),
      };
    }
    transformResult(result, _delegationContext, transformationContext) {
      const dataTransformer = this.dataTransformer;
      if (null != dataTransformer)
        result.data = utils_visitData(result.data, value => dataTransformer(value, transformationContext));
      if (null != this.errorsTransformer && Array.isArray(result.errors))
        result.errors = this.errorsTransformer(result.errors, transformationContext);
      return result;
    }
    transformDocument(document, transformationContext) {
      const fragments = Object.create(null);
      for (const def of document.definitions)
        if (def.kind === kinds_Kind.FRAGMENT_DEFINITION) fragments[def.name.value] = def;
      return visitor_visit(
        document,
        TypeInfo_visitWithTypeInfo(this._getTypeInfo(), {
          leave: {
            [kinds_Kind.SELECTION_SET]: node =>
              this.transformSelectionSet(node, this._getTypeInfo(), fragments, transformationContext),
          },
        })
      );
    }
    transformSelectionSet(node, typeInfo, fragments, transformationContext) {
      var _a, _b;
      const parentType = typeInfo.getParentType();
      if (null == parentType) return;
      const parentTypeName = parentType.name;
      let newSelections = [];
      for (const selection of node.selections) {
        if (selection.kind !== kinds_Kind.FIELD) {
          newSelections.push(selection);
          continue;
        }
        const newName = selection.name.value;
        if (
          !(
            (null == this.dataTransformer && null == this.errorsTransformer) ||
            (null != this.subscriptionTypeName && parentTypeName === this.subscriptionTypeName)
          )
        )
          newSelections.push({
            kind: kinds_Kind.FIELD,
            name: {
              kind: kinds_Kind.NAME,
              value: '__typename',
            },
          });
        let transformedSelection;
        if (null == this.fieldNodeTransformer) transformedSelection = selection;
        else {
          transformedSelection = this.fieldNodeTransformer(
            parentTypeName,
            newName,
            selection,
            fragments,
            transformationContext
          );
          transformedSelection = void 0 === transformedSelection ? selection : transformedSelection;
        }
        if (null == transformedSelection) continue;
        else if (Array.isArray(transformedSelection)) {
          newSelections = newSelections.concat(transformedSelection);
          continue;
        } else if (transformedSelection.kind !== kinds_Kind.FIELD) {
          newSelections.push(transformedSelection);
          continue;
        }
        if (null == this.mapping[parentTypeName]) {
          newSelections.push(transformedSelection);
          continue;
        }
        const oldName = this.mapping[parentTypeName][newName];
        if (null == oldName) {
          newSelections.push(transformedSelection);
          continue;
        }
        newSelections.push({
          ...transformedSelection,
          name: {
            kind: kinds_Kind.NAME,
            value: oldName,
          },
          alias: {
            kind: kinds_Kind.NAME,
            value:
              null !== (_b = null === (_a = transformedSelection.alias) || void 0 === _a ? void 0 : _a.value) &&
              void 0 !== _b
                ? _b
                : newName,
          },
        });
      }
      return {
        ...node,
        selections: newSelections,
      };
    }
  }
  const cache1 = new WeakMap();
  function createBatchFn(options) {
    var _a, _b;
    const argsFromKeys =
      null !== (_a = options.argsFromKeys) && void 0 !== _a
        ? _a
        : keys => ({
            ids: keys,
          });
    const fieldName = null !== (_b = options.fieldName) && void 0 !== _b ? _b : options.info.fieldName;
    const { valuesFromResults, lazyOptionsFn } = options;
    return async keys => {
      const results = await delegateToSchema({
        returnType: new GraphQLList(definition_getNamedType(options.info.returnType)),
        onLocatedError: originalError => {
          if (null == originalError.path) return originalError;
          const [pathFieldName, pathNumber] = originalError.path;
          if (pathFieldName !== fieldName) return originalError;
          if ('number' != typeof pathNumber) return originalError;
          return utils_relocatedError(
            originalError,
            originalError.path.slice(0, 0).concat(originalError.path.slice(2))
          );
        },
        args: argsFromKeys(keys),
        ...(null == lazyOptionsFn ? options : lazyOptionsFn(options)),
      });
      if (results instanceof Error) return keys.map(() => results);
      const values = null == valuesFromResults ? results : valuesFromResults(results, keys);
      return Array.isArray(values) ? values : keys.map(() => values);
    };
  }
  const cacheKeyFn = key => ('object' == typeof key ? JSON.stringify(key) : key);
  function getLoader(options) {
    var _a;
    const fieldName = null !== (_a = options.fieldName) && void 0 !== _a ? _a : options.info.fieldName;
    let cache2 = cache1.get(options.info.fieldNodes);
    const dataLoaderOptions = {
      cacheKeyFn,
      ...options.dataLoaderOptions,
    };
    if (void 0 === cache2) {
      cache2 = new WeakMap();
      cache1.set(options.info.fieldNodes, cache2);
      const loaders = Object.create(null);
      cache2.set(options.schema, loaders);
      const batchFn = createBatchFn(options);
      const loader = new dataloader(keys => batchFn(keys), dataLoaderOptions);
      loaders[fieldName] = loader;
      return loader;
    }
    let loaders = cache2.get(options.schema);
    if (void 0 === loaders) {
      loaders = Object.create(null);
      cache2.set(options.schema, loaders);
      const batchFn = createBatchFn(options);
      const loader = new dataloader(keys => batchFn(keys), dataLoaderOptions);
      loaders[fieldName] = loader;
      return loader;
    }
    let loader = loaders[fieldName];
    if (void 0 === loader) {
      const batchFn = createBatchFn(options);
      loader = new dataloader(keys => batchFn(keys), dataLoaderOptions);
      loaders[fieldName] = loader;
    }
    return loader;
  }
  function batchDelegateToSchema(options) {
    const key = options.key;
    if (null == key) return null;
    else if (Array.isArray(key) && !key.length) return [];
    const loader = getLoader(options);
    return Array.isArray(key) ? loader.loadMany(key) : loader.load(key);
  }
  const backcompatOptions = {
    commentDescriptions: true,
  };
  function stitch_typeFromAST(node) {
    switch (node.kind) {
      case kinds_Kind.OBJECT_TYPE_DEFINITION:
        return makeObjectType(node);

      case kinds_Kind.INTERFACE_TYPE_DEFINITION:
        return makeInterfaceType(node);

      case kinds_Kind.ENUM_TYPE_DEFINITION:
        return makeEnumType(node);

      case kinds_Kind.UNION_TYPE_DEFINITION:
        return makeUnionType(node);

      case kinds_Kind.SCALAR_TYPE_DEFINITION:
        return makeScalarType(node);

      case kinds_Kind.INPUT_OBJECT_TYPE_DEFINITION:
        return makeInputObjectType(node);

      case kinds_Kind.DIRECTIVE_DEFINITION:
        return makeDirective(node);

      default:
        return null;
    }
  }
  function makeObjectType(node) {
    const config = {
      name: node.name.value,
      description: stitch_getDescription(node, backcompatOptions),
      interfaces: () => {
        var _a;
        return null === (_a = node.interfaces) || void 0 === _a
          ? void 0
          : _a.map(iface => createNamedStub(iface.name.value, 'interface'));
      },
      fields: () => (null != node.fields ? makeFields(node.fields) : {}),
      astNode: node,
    };
    return new definition_GraphQLObjectType(config);
  }
  function makeInterfaceType(node) {
    var _a;
    const config = {
      name: node.name.value,
      description: stitch_getDescription(node, backcompatOptions),
      interfaces:
        null === (_a = node.interfaces) || void 0 === _a
          ? void 0
          : _a.map(iface => createNamedStub(iface.name.value, 'interface')),
      fields: () => (null != node.fields ? makeFields(node.fields) : {}),
      astNode: node,
    };
    return new definition_GraphQLInterfaceType(config);
  }
  function makeEnumType(node) {
    var _a, _b;
    const values =
      null !==
        (_b =
          null === (_a = node.values) || void 0 === _a
            ? void 0
            : _a.reduce(
                (prev, value) => ({
                  ...prev,
                  [value.name.value]: {
                    description: stitch_getDescription(value, backcompatOptions),
                    deprecationReason: stitch_getDeprecationReason(value),
                    astNode: value,
                  },
                }),
                {}
              )) && void 0 !== _b
        ? _b
        : {};
    return new definition_GraphQLEnumType({
      name: node.name.value,
      description: stitch_getDescription(node, backcompatOptions),
      values,
      astNode: node,
    });
  }
  function makeUnionType(node) {
    return new definition_GraphQLUnionType({
      name: node.name.value,
      description: stitch_getDescription(node, backcompatOptions),
      types: () => {
        var _a, _b;
        return null !==
          (_b =
            null === (_a = node.types) || void 0 === _a
              ? void 0
              : _a.map(type => createNamedStub(type.name.value, 'object'))) && void 0 !== _b
          ? _b
          : [];
      },
      astNode: node,
    });
  }
  function makeScalarType(node) {
    return new definition_GraphQLScalarType({
      name: node.name.value,
      description: stitch_getDescription(node, backcompatOptions),
      astNode: node,
      serialize: value => value,
    });
  }
  function makeInputObjectType(node) {
    return new definition_GraphQLInputObjectType({
      name: node.name.value,
      description: stitch_getDescription(node, backcompatOptions),
      fields: () => (node.fields ? makeValues(node.fields) : {}),
      astNode: node,
    });
  }
  function makeFields(nodes) {
    return nodes.reduce((prev, node) => {
      var _a;
      return {
        ...prev,
        [node.name.value]: {
          type: createStub(node.type, 'output'),
          description: stitch_getDescription(node, backcompatOptions),
          args: makeValues(null !== (_a = node.arguments) && void 0 !== _a ? _a : []),
          deprecationReason: stitch_getDeprecationReason(node),
          astNode: node,
        },
      };
    }, {});
  }
  function makeValues(nodes) {
    return nodes.reduce(
      (prev, node) => ({
        ...prev,
        [node.name.value]: {
          type: createStub(node.type, 'input'),
          defaultValue: void 0 !== node.defaultValue ? valueFromASTUntyped(node.defaultValue) : void 0,
          description: stitch_getDescription(node, backcompatOptions),
          astNode: node,
        },
      }),
      {}
    );
  }
  function makeDirective(node) {
    var _a;
    const locations = [];
    for (const location of node.locations) if (location.value in DirectiveLocation) locations.push(location.value);
    return new GraphQLDirective({
      name: node.name.value,
      description: null != node.description ? node.description.value : null,
      locations,
      isRepeatable: node.repeatable,
      args: makeValues(null !== (_a = node.arguments) && void 0 !== _a ? _a : []),
      astNode: node,
    });
  }
  function stitch_getDescription(node, options) {
    if (null != node.description) return node.description.value;
    if (null == options ? void 0 : options.commentDescriptions) {
      const rawValue = stitch_getLeadingCommentBlock(node);
      if (void 0 !== rawValue) return stitch_dedentBlockStringValue(`\n${rawValue}`);
    }
  }
  function stitch_getLeadingCommentBlock(node) {
    const loc = node.loc;
    if (!loc) return;
    const comments = [];
    let token = loc.startToken.prev;
    while (
      null != token &&
      token.kind === tokenKind_TokenKind.COMMENT &&
      null != token.next &&
      null != token.prev &&
      token.line + 1 === token.next.line &&
      token.line !== token.prev.line
    ) {
      const value = String(token.value);
      comments.push(value);
      token = token.prev;
    }
    return comments.length > 0 ? comments.reverse().join('\n') : void 0;
  }
  function stitch_dedentBlockStringValue(rawString) {
    const lines = rawString.split(/\r\n|[\n\r]/g);
    const commonIndent = stitch_getBlockStringIndentation(lines);
    if (0 !== commonIndent) for (let i = 1; i < lines.length; i++) lines[i] = lines[i].slice(commonIndent);
    while (lines.length > 0 && stitch_isBlank(lines[0])) lines.shift();
    while (lines.length > 0 && stitch_isBlank(lines[lines.length - 1])) lines.pop();
    return lines.join('\n');
  }
  function stitch_getBlockStringIndentation(lines) {
    let commonIndent = null;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const indent = leadingWhitespace(line);
      if (indent === line.length) continue;
      if (null === commonIndent || indent < commonIndent) {
        commonIndent = indent;
        if (0 === commonIndent) break;
      }
    }
    return null === commonIndent ? 0 : commonIndent;
  }
  function leadingWhitespace(str) {
    let i = 0;
    while (i < str.length && (' ' === str[i] || '\t' === str[i])) i++;
    return i;
  }
  function stitch_isBlank(str) {
    return leadingWhitespace(str) === str.length;
  }
  function stitch_getDeprecationReason(node) {
    const deprecated = getDirectiveValues(GraphQLDeprecatedDirective, node);
    return null == deprecated ? void 0 : deprecated['reason'];
  }
  var ValidationLevel;
  (function (ValidationLevel) {
    ValidationLevel['Error'] = 'error';
    ValidationLevel['Warn'] = 'warn';
    ValidationLevel['Off'] = 'off';
  })(ValidationLevel || (ValidationLevel = {}));
  function validateFieldConsistency(finalFieldConfig, candidates, typeMergingOptions) {
    const fieldNamespace = `${candidates[0].type.name}.${candidates[0].fieldName}`;
    const finalFieldNull = definition_isNonNullType(finalFieldConfig.type);
    validateTypeConsistency(
      finalFieldConfig,
      candidates.map(c => c.fieldConfig),
      'field',
      fieldNamespace,
      typeMergingOptions
    );
    if (
      getValidationSettings(fieldNamespace, typeMergingOptions).strictNullComparison &&
      candidates.some(c => finalFieldNull !== definition_isNonNullType(c.fieldConfig.type))
    )
      validationMessage(
        `Nullability of field "${fieldNamespace}" does not match across subschemas. Disable typeMergingOptions.validationSettings.strictNullComparison to permit safe divergences.`,
        fieldNamespace,
        typeMergingOptions
      );
    else if (finalFieldNull && candidates.some(c => !definition_isNonNullType(c.fieldConfig.type)))
      validationMessage(
        `Canonical definition of field "${fieldNamespace}" is not-null while some subschemas permit null. This will be an automatic error in future versions.`,
        fieldNamespace,
        typeMergingOptions
      );
    const argCandidatesMap = Object.create(null);
    for (const { fieldConfig } of candidates) {
      if (null == fieldConfig.args) continue;
      for (const argName in fieldConfig.args) {
        const arg = fieldConfig.args[argName];
        argCandidatesMap[argName] = argCandidatesMap[argName] || [];
        argCandidatesMap[argName].push(arg);
      }
    }
    if (Object.values(argCandidatesMap).some(argCandidates => candidates.length !== argCandidates.length))
      validationMessage(
        `Canonical definition of field "${fieldNamespace}" implements inconsistent argument names across subschemas. Input may be filtered from some requests.`,
        fieldNamespace,
        typeMergingOptions
      );
    for (const argName in argCandidatesMap) {
      if (null == finalFieldConfig.args) continue;
      const argCandidates = argCandidatesMap[argName];
      const argNamespace = `${fieldNamespace}.${argName}`;
      const finalArgConfig = finalFieldConfig.args[argName] || argCandidates[argCandidates.length - 1];
      const finalArgType = definition_getNamedType(finalArgConfig.type);
      const finalArgNull = definition_isNonNullType(finalArgConfig.type);
      validateTypeConsistency(finalArgConfig, argCandidates, 'argument', argNamespace, typeMergingOptions);
      if (
        getValidationSettings(argNamespace, typeMergingOptions).strictNullComparison &&
        argCandidates.some(c => finalArgNull !== definition_isNonNullType(c.type))
      )
        validationMessage(
          `Nullability of argument "${argNamespace}" does not match across subschemas. Disable typeMergingOptions.validationSettings.strictNullComparison to permit safe divergences.`,
          argNamespace,
          typeMergingOptions
        );
      else if (!finalArgNull && argCandidates.some(c => definition_isNonNullType(c.type)))
        validationMessage(
          `Canonical definition of argument "${argNamespace}" permits null while some subschemas require not-null. This will be an automatic error in future versions.`,
          argNamespace,
          typeMergingOptions
        );
      if (definition_isEnumType(finalArgType))
        validateInputEnumConsistency(finalArgType, argCandidates, typeMergingOptions);
    }
  }
  function validateInputObjectConsistency(fieldInclusionMap, candidates, typeMergingOptions) {
    for (const fieldName in fieldInclusionMap) {
      const count = fieldInclusionMap[fieldName];
      if (candidates.length !== count) {
        const namespace = `${candidates[0].type.name}.${fieldName}`;
        validationMessage(
          `Definition of input field "${namespace}" is not implemented by all subschemas. Input may be filtered from some requests.`,
          namespace,
          typeMergingOptions
        );
      }
    }
  }
  function validateInputFieldConsistency(finalInputFieldConfig, candidates, typeMergingOptions) {
    const inputFieldNamespace = `${candidates[0].type.name}.${candidates[0].fieldName}`;
    const inputFieldConfigs = candidates.map(c => c.inputFieldConfig);
    const finalInputFieldType = definition_getNamedType(finalInputFieldConfig.type);
    const finalInputFieldNull = definition_isNonNullType(finalInputFieldConfig.type);
    validateTypeConsistency(
      finalInputFieldConfig,
      inputFieldConfigs,
      'input field',
      inputFieldNamespace,
      typeMergingOptions
    );
    if (
      getValidationSettings(inputFieldNamespace, typeMergingOptions).strictNullComparison &&
      candidates.some(c => finalInputFieldNull !== definition_isNonNullType(c.inputFieldConfig.type))
    )
      validationMessage(
        `Nullability of input field "${inputFieldNamespace}" does not match across subschemas. Disable typeMergingOptions.validationSettings.strictNullComparison to permit safe divergences.`,
        inputFieldNamespace,
        typeMergingOptions
      );
    else if (!finalInputFieldNull && candidates.some(c => definition_isNonNullType(c.inputFieldConfig.type)))
      validationMessage(
        `Canonical definition of input field "${inputFieldNamespace}" permits null while some subschemas require not-null. This will be an automatic error in future versions.`,
        inputFieldNamespace,
        typeMergingOptions
      );
    if (definition_isEnumType(finalInputFieldType))
      validateInputEnumConsistency(finalInputFieldType, inputFieldConfigs, typeMergingOptions);
  }
  function validateTypeConsistency(
    finalElementConfig,
    candidates,
    definitionType,
    settingNamespace,
    typeMergingOptions
  ) {
    var _a, _b, _c;
    const finalNamedType = definition_getNamedType(finalElementConfig.type);
    const finalIsScalar = definition_isScalarType(finalNamedType);
    const finalIsList = hasListType(finalElementConfig.type);
    for (const c of candidates) {
      if (finalIsList !== hasListType(c.type))
        throw new Error(
          `Definitions of ${definitionType} "${settingNamespace}" implement inconsistent list types across subschemas and cannot be merged.`
        );
      const currentNamedType = definition_getNamedType(c.type);
      if (finalNamedType.toString() !== currentNamedType.toString()) {
        const proxiableScalar = !!(null ===
          (_c =
            null ===
              (_b =
                null === (_a = null == typeMergingOptions ? void 0 : typeMergingOptions.validationSettings) ||
                void 0 === _a
                  ? void 0
                  : _a.proxiableScalars) || void 0 === _b
              ? void 0
              : _b[finalNamedType.toString()]) || void 0 === _c
          ? void 0
          : _c.includes(currentNamedType.toString()));
        const bothScalars = finalIsScalar && definition_isScalarType(currentNamedType);
        const permitScalar = proxiableScalar && bothScalars;
        if (proxiableScalar && !bothScalars)
          throw new Error(`Types ${finalNamedType} and ${currentNamedType} are not proxiable scalars.`);
        if (!permitScalar)
          validationMessage(
            `Definitions of ${definitionType} "${settingNamespace}" implement inconsistent named types across subschemas. This will be an automatic error in future versions.`,
            settingNamespace,
            typeMergingOptions
          );
      }
    }
  }
  function hasListType(type) {
    return definition_isListType(definition_getNullableType(type));
  }
  function validateInputEnumConsistency(inputEnumType, candidates, typeMergingOptions) {
    const enumValueInclusionMap = Object.create(null);
    for (const candidate of candidates) {
      const enumType = definition_getNamedType(candidate.type);
      if (definition_isEnumType(enumType))
        for (const { value } of enumType.getValues()) {
          enumValueInclusionMap[value] = enumValueInclusionMap[value] || 0;
          enumValueInclusionMap[value] += 1;
        }
    }
    if (Object.values(enumValueInclusionMap).some(count => candidates.length !== count))
      validationMessage(
        `Enum "${inputEnumType.name}" is used as an input with inconsistent values across subschemas. This will be an automatic error in future versions.`,
        inputEnumType.name,
        typeMergingOptions
      );
  }
  function validationMessage(message, settingNamespace, typeMergingOptions) {
    var _a;
    const override = `typeMergingOptions.validationScopes['${settingNamespace}'].validationLevel`;
    switch (
      null !== (_a = getValidationSettings(settingNamespace, typeMergingOptions).validationLevel) && void 0 !== _a
        ? _a
        : ValidationLevel.Warn
    ) {
      case ValidationLevel.Off:
        return;

      case ValidationLevel.Error:
        throw new Error(
          `${message} If this is intentional, you may disable this error by setting ${override} = "warn|off"`
        );

      default:
        console.warn(`${message} To disable this warning or elevate it to an error, set ${override} = "error|off"`);
    }
  }
  function getValidationSettings(settingNamespace, typeMergingOptions) {
    var _a, _b, _c;
    return {
      ...(null !== (_a = null == typeMergingOptions ? void 0 : typeMergingOptions.validationSettings) && void 0 !== _a
        ? _a
        : {}),
      ...(null !==
        (_c =
          null === (_b = null == typeMergingOptions ? void 0 : typeMergingOptions.validationScopes) || void 0 === _b
            ? void 0
            : _b[settingNamespace]) && void 0 !== _c
        ? _c
        : {}),
    };
  }
  function mergeCandidates(typeName, candidates, typeMergingOptions) {
    const initialCandidateType = candidates[0].type;
    if (candidates.some(candidate => candidate.type.constructor !== initialCandidateType.constructor))
      throw new Error(`Cannot merge different type categories into common type ${typeName}.`);
    if (definition_isObjectType(initialCandidateType))
      return mergeObjectTypeCandidates(typeName, candidates, typeMergingOptions);
    else if (definition_isInputObjectType(initialCandidateType))
      return mergeInputObjectTypeCandidates(typeName, candidates, typeMergingOptions);
    else if (definition_isInterfaceType(initialCandidateType))
      return mergeInterfaceTypeCandidates(typeName, candidates, typeMergingOptions);
    else if (definition_isUnionType(initialCandidateType))
      return mergeUnionTypeCandidates(typeName, candidates, typeMergingOptions);
    else if (definition_isEnumType(initialCandidateType))
      return mergeEnumTypeCandidates(typeName, candidates, typeMergingOptions);
    else if (definition_isScalarType(initialCandidateType))
      return mergeScalarTypeCandidates(typeName, candidates, typeMergingOptions);
    else throw new Error(`Type ${typeName} has unknown GraphQL type.`);
  }
  function mergeObjectTypeCandidates(typeName, candidates, typeMergingOptions) {
    const description = mergeTypeDescriptions(
      (candidates = orderedTypeCandidates(candidates, typeMergingOptions)),
      typeMergingOptions
    );
    const fields = fieldConfigMapFromTypeCandidates(candidates, typeMergingOptions);
    const interfaceMap = candidates
      .map(candidate => candidate.type.toConfig())
      .map(typeConfig => typeConfig.interfaces)
      .reduce((acc, interfaces) => {
        if (null != interfaces) for (const iface of interfaces) acc[iface.name] = iface;
        return acc;
      }, Object.create(null));
    const interfaces = Object.values(interfaceMap);
    const astNodes = pluck('astNode', candidates);
    const fieldAstNodes = canonicalFieldNamesForType(candidates)
      .map(fieldName => {
        var _a;
        return null === (_a = fields[fieldName]) || void 0 === _a ? void 0 : _a.astNode;
      })
      .filter(n => null != n);
    if (astNodes.length > 1 && fieldAstNodes.length)
      astNodes.push({
        ...astNodes[astNodes.length - 1],
        fields: JSON.parse(JSON.stringify(fieldAstNodes)),
      });
    const astNode = astNodes.slice(1).reduce(
      (acc, astNode) =>
        mergeType(astNode, acc, {
          ignoreFieldConflicts: true,
        }),
      astNodes[0]
    );
    const extensionASTNodes = pluck('extensionASTNodes', candidates);
    const extensions = Object.assign({}, ...pluck('extensions', candidates));
    return new definition_GraphQLObjectType({
      name: typeName,
      description,
      fields,
      interfaces,
      astNode,
      extensionASTNodes,
      extensions,
    });
  }
  function mergeInputObjectTypeCandidates(typeName, candidates, typeMergingOptions) {
    const description = mergeTypeDescriptions(
      (candidates = orderedTypeCandidates(candidates, typeMergingOptions)),
      typeMergingOptions
    );
    const fields = inputFieldConfigMapFromTypeCandidates(candidates, typeMergingOptions);
    const astNodes = pluck('astNode', candidates);
    const fieldAstNodes = canonicalFieldNamesForType(candidates)
      .map(fieldName => {
        var _a;
        return null === (_a = fields[fieldName]) || void 0 === _a ? void 0 : _a.astNode;
      })
      .filter(n => null != n);
    if (astNodes.length > 1 && fieldAstNodes.length)
      astNodes.push({
        ...astNodes[astNodes.length - 1],
        fields: JSON.parse(JSON.stringify(fieldAstNodes)),
      });
    const astNode = astNodes.slice(1).reduce(
      (acc, astNode) =>
        mergeInputType(astNode, acc, {
          ignoreFieldConflicts: true,
        }),
      astNodes[0]
    );
    const extensionASTNodes = pluck('extensionASTNodes', candidates);
    const extensions = Object.assign({}, ...pluck('extensions', candidates));
    return new definition_GraphQLInputObjectType({
      name: typeName,
      description,
      fields,
      astNode,
      extensionASTNodes,
      extensions,
    });
  }
  function pluck(typeProperty, candidates) {
    return candidates.map(candidate => candidate.type[typeProperty]).filter(value => null != value);
  }
  function mergeInterfaceTypeCandidates(typeName, candidates, typeMergingOptions) {
    const description = mergeTypeDescriptions(
      (candidates = orderedTypeCandidates(candidates, typeMergingOptions)),
      typeMergingOptions
    );
    const fields = fieldConfigMapFromTypeCandidates(candidates, typeMergingOptions);
    const interfaceMap = candidates
      .map(candidate => candidate.type.toConfig())
      .map(typeConfig => ('interfaces' in typeConfig ? typeConfig.interfaces : []))
      .reduce((acc, interfaces) => {
        if (null != interfaces) for (const iface of interfaces) acc[iface.name] = iface;
        return acc;
      }, Object.create(null));
    const interfaces = Object.values(interfaceMap);
    const astNodes = pluck('astNode', candidates);
    const fieldAstNodes = canonicalFieldNamesForType(candidates)
      .map(fieldName => {
        var _a;
        return null === (_a = fields[fieldName]) || void 0 === _a ? void 0 : _a.astNode;
      })
      .filter(n => null != n);
    if (astNodes.length > 1 && fieldAstNodes.length)
      astNodes.push({
        ...astNodes[astNodes.length - 1],
        fields: JSON.parse(JSON.stringify(fieldAstNodes)),
      });
    const astNode = astNodes.slice(1).reduce(
      (acc, astNode) =>
        mergeInterface(astNode, acc, {
          ignoreFieldConflicts: true,
        }),
      astNodes[0]
    );
    const extensionASTNodes = pluck('extensionASTNodes', candidates);
    const extensions = Object.assign({}, ...pluck('extensions', candidates));
    return new definition_GraphQLInterfaceType({
      name: typeName,
      description,
      fields,
      interfaces,
      astNode,
      extensionASTNodes,
      extensions,
    });
  }
  function mergeUnionTypeCandidates(typeName, candidates, typeMergingOptions) {
    const description = mergeTypeDescriptions(
      (candidates = orderedTypeCandidates(candidates, typeMergingOptions)),
      typeMergingOptions
    );
    const typeMap = candidates
      .map(candidate => {
        if (!definition_isUnionType(candidate.type)) throw new Error(`Expected ${candidate.type} to be a union type!`);
        return candidate.type.toConfig();
      })
      .reduce((acc, typeConfig) => {
        for (const type of typeConfig.types) acc[type.name] = type;
        return acc;
      }, Object.create(null));
    const types = Object.values(typeMap);
    const astNodes = pluck('astNode', candidates);
    const astNode = astNodes.slice(1).reduce((acc, astNode) => mergeUnion(astNode, acc), astNodes[0]);
    const extensionASTNodes = pluck('extensionASTNodes', candidates);
    const extensions = Object.assign({}, ...pluck('extensions', candidates));
    return new definition_GraphQLUnionType({
      name: typeName,
      description,
      types,
      astNode,
      extensionASTNodes,
      extensions,
    });
  }
  function mergeEnumTypeCandidates(typeName, candidates, typeMergingOptions) {
    const description = mergeTypeDescriptions(
      (candidates = orderedTypeCandidates(candidates, typeMergingOptions)),
      typeMergingOptions
    );
    const values = enumValueConfigMapFromTypeCandidates(candidates, typeMergingOptions);
    const astNodes = pluck('astNode', candidates);
    const astNode = astNodes.slice(1).reduce(
      (acc, astNode) =>
        mergeEnum(astNode, acc, {
          consistentEnumMerge: true,
        }),
      astNodes[0]
    );
    const extensionASTNodes = pluck('extensionASTNodes', candidates);
    const extensions = Object.assign({}, ...pluck('extensions', candidates));
    return new definition_GraphQLEnumType({
      name: typeName,
      description,
      values,
      astNode,
      extensionASTNodes,
      extensions,
    });
  }
  function enumValueConfigMapFromTypeCandidates(candidates, typeMergingOptions) {
    var _a;
    const enumValueConfigCandidatesMap = Object.create(null);
    for (const candidate of candidates) {
      const valueMap = candidate.type.toConfig().values;
      for (const enumValue in valueMap) {
        const enumValueConfigCandidate = {
          enumValueConfig: valueMap[enumValue],
          enumValue,
          type: candidate.type,
          subschema: candidate.subschema,
          transformedSubschema: candidate.transformedSubschema,
        };
        if (enumValue in enumValueConfigCandidatesMap)
          enumValueConfigCandidatesMap[enumValue].push(enumValueConfigCandidate);
        else enumValueConfigCandidatesMap[enumValue] = [enumValueConfigCandidate];
      }
    }
    const enumValueConfigMap = Object.create(null);
    for (const enumValue in enumValueConfigCandidatesMap) {
      const enumValueConfigMerger =
        null !== (_a = null == typeMergingOptions ? void 0 : typeMergingOptions.enumValueConfigMerger) && void 0 !== _a
          ? _a
          : defaultEnumValueConfigMerger;
      enumValueConfigMap[enumValue] = enumValueConfigMerger(enumValueConfigCandidatesMap[enumValue]);
    }
    return enumValueConfigMap;
  }
  function defaultEnumValueConfigMerger(candidates) {
    return (
      candidates.find(({ type, transformedSubschema }) => {
        var _a, _b;
        return (
          isSubschemaConfig(transformedSubschema) &&
          (null === (_b = null === (_a = transformedSubschema.merge) || void 0 === _a ? void 0 : _a[type.name]) ||
          void 0 === _b
            ? void 0
            : _b.canonical)
        );
      }) || candidates[candidates.length - 1]
    ).enumValueConfig;
  }
  function mergeScalarTypeCandidates(typeName, candidates, typeMergingOptions) {
    const description = mergeTypeDescriptions(
      (candidates = orderedTypeCandidates(candidates, typeMergingOptions)),
      typeMergingOptions
    );
    const serializeFns = pluck('serialize', candidates);
    const serialize = serializeFns[serializeFns.length - 1];
    const parseValueFns = pluck('parseValue', candidates);
    const parseValue = parseValueFns[parseValueFns.length - 1];
    const parseLiteralFns = pluck('parseLiteral', candidates);
    const parseLiteral = parseLiteralFns[parseLiteralFns.length - 1];
    const astNodes = pluck('astNode', candidates);
    const astNode = astNodes.slice(1).reduce((acc, astNode) => mergeScalar(astNode, acc), astNodes[0]);
    const extensionASTNodes = pluck('extensionASTNodes', candidates);
    const extensions = Object.assign({}, ...pluck('extensions', candidates));
    return new definition_GraphQLScalarType({
      name: typeName,
      description,
      serialize,
      parseValue,
      parseLiteral,
      astNode,
      extensionASTNodes,
      extensions,
    });
  }
  function orderedTypeCandidates(candidates, typeMergingOptions) {
    var _a;
    const candidate = (
      null !== (_a = null == typeMergingOptions ? void 0 : typeMergingOptions.typeCandidateMerger) && void 0 !== _a
        ? _a
        : defaultTypeCandidateMerger
    )(candidates);
    return candidates.filter(c => c !== candidate).concat([candidate]);
  }
  function defaultTypeCandidateMerger(candidates) {
    const canonical = candidates.filter(({ type, transformedSubschema }) => {
      var _a, _b;
      return isSubschemaConfig(transformedSubschema)
        ? null === (_b = null === (_a = transformedSubschema.merge) || void 0 === _a ? void 0 : _a[type.name]) ||
          void 0 === _b
          ? void 0
          : _b.canonical
        : false;
    });
    if (canonical.length > 1) throw new Error(`Multiple canonical definitions for "${canonical[0].type.name}"`);
    else if (canonical.length) return canonical[0];
    return candidates[candidates.length - 1];
  }
  function mergeTypeDescriptions(candidates, typeMergingOptions) {
    var _a;
    return (
      null !== (_a = null == typeMergingOptions ? void 0 : typeMergingOptions.typeDescriptionsMerger) && void 0 !== _a
        ? _a
        : defaultTypeDescriptionMerger
    )(candidates);
  }
  function defaultTypeDescriptionMerger(candidates) {
    return candidates[candidates.length - 1].type.description;
  }
  function fieldConfigMapFromTypeCandidates(candidates, typeMergingOptions) {
    const fieldConfigCandidatesMap = Object.create(null);
    for (const candidate of candidates) {
      const fieldConfigMap = candidate.type.toConfig().fields;
      for (const fieldName in fieldConfigMap) {
        const fieldConfigCandidate = {
          fieldConfig: fieldConfigMap[fieldName],
          fieldName,
          type: candidate.type,
          subschema: candidate.subschema,
          transformedSubschema: candidate.transformedSubschema,
        };
        if (fieldName in fieldConfigCandidatesMap) fieldConfigCandidatesMap[fieldName].push(fieldConfigCandidate);
        else fieldConfigCandidatesMap[fieldName] = [fieldConfigCandidate];
      }
    }
    const fieldConfigMap = Object.create(null);
    for (const fieldName in fieldConfigCandidatesMap)
      fieldConfigMap[fieldName] = mergeFieldConfigs(fieldConfigCandidatesMap[fieldName], typeMergingOptions);
    return fieldConfigMap;
  }
  function mergeFieldConfigs(candidates, typeMergingOptions) {
    var _a;
    const finalFieldConfig = (
      null !== (_a = null == typeMergingOptions ? void 0 : typeMergingOptions.fieldConfigMerger) && void 0 !== _a
        ? _a
        : defaultFieldConfigMerger
    )(candidates);
    validateFieldConsistency(finalFieldConfig, candidates, typeMergingOptions);
    return finalFieldConfig;
  }
  function defaultFieldConfigMerger(candidates) {
    var _a, _b, _c, _d, _e, _f;
    const canonicalByField = [];
    const canonicalByType = [];
    for (const { type, fieldName, fieldConfig, transformedSubschema } of candidates) {
      if (!isSubschemaConfig(transformedSubschema)) continue;
      if (
        null ===
          (_d =
            null ===
              (_c =
                null === (_b = null === (_a = transformedSubschema.merge) || void 0 === _a ? void 0 : _a[type.name]) ||
                void 0 === _b
                  ? void 0
                  : _b.fields) || void 0 === _c
              ? void 0
              : _c[fieldName]) || void 0 === _d
          ? void 0
          : _d.canonical
      )
        canonicalByField.push(fieldConfig);
      else if (
        null === (_f = null === (_e = transformedSubschema.merge) || void 0 === _e ? void 0 : _e[type.name]) ||
        void 0 === _f
          ? void 0
          : _f.canonical
      )
        canonicalByType.push(fieldConfig);
    }
    if (canonicalByField.length > 1)
      throw new Error(`Multiple canonical definitions for "${candidates[0].type.name}.${candidates[0].fieldName}"`);
    else if (canonicalByField.length) return canonicalByField[0];
    else if (canonicalByType.length) return canonicalByType[0];
    return candidates[candidates.length - 1].fieldConfig;
  }
  function inputFieldConfigMapFromTypeCandidates(candidates, typeMergingOptions) {
    var _a;
    const inputFieldConfigCandidatesMap = Object.create(null);
    const fieldInclusionMap = Object.create(null);
    for (const candidate of candidates) {
      const inputFieldConfigMap = candidate.type.toConfig().fields;
      for (const fieldName in inputFieldConfigMap) {
        const inputFieldConfig = inputFieldConfigMap[fieldName];
        fieldInclusionMap[fieldName] = fieldInclusionMap[fieldName] || 0;
        fieldInclusionMap[fieldName] += 1;
        const inputFieldConfigCandidate = {
          inputFieldConfig,
          fieldName,
          type: candidate.type,
          subschema: candidate.subschema,
          transformedSubschema: candidate.transformedSubschema,
        };
        if (fieldName in inputFieldConfigCandidatesMap)
          inputFieldConfigCandidatesMap[fieldName].push(inputFieldConfigCandidate);
        else inputFieldConfigCandidatesMap[fieldName] = [inputFieldConfigCandidate];
      }
    }
    validateInputObjectConsistency(fieldInclusionMap, candidates, typeMergingOptions);
    const inputFieldConfigMap = Object.create(null);
    for (const fieldName in inputFieldConfigCandidatesMap) {
      const inputFieldConfigMerger =
        null !== (_a = null == typeMergingOptions ? void 0 : typeMergingOptions.inputFieldConfigMerger) && void 0 !== _a
          ? _a
          : defaultInputFieldConfigMerger;
      inputFieldConfigMap[fieldName] = inputFieldConfigMerger(inputFieldConfigCandidatesMap[fieldName]);
      validateInputFieldConsistency(
        inputFieldConfigMap[fieldName],
        inputFieldConfigCandidatesMap[fieldName],
        typeMergingOptions
      );
    }
    return inputFieldConfigMap;
  }
  function defaultInputFieldConfigMerger(candidates) {
    var _a, _b, _c, _d, _e, _f;
    const canonicalByField = [];
    const canonicalByType = [];
    for (const { type, fieldName, inputFieldConfig, transformedSubschema } of candidates) {
      if (!isSubschemaConfig(transformedSubschema)) continue;
      if (
        null ===
          (_d =
            null ===
              (_c =
                null === (_b = null === (_a = transformedSubschema.merge) || void 0 === _a ? void 0 : _a[type.name]) ||
                void 0 === _b
                  ? void 0
                  : _b.fields) || void 0 === _c
              ? void 0
              : _c[fieldName]) || void 0 === _d
          ? void 0
          : _d.canonical
      )
        canonicalByField.push(inputFieldConfig);
      else if (
        null === (_f = null === (_e = transformedSubschema.merge) || void 0 === _e ? void 0 : _e[type.name]) ||
        void 0 === _f
          ? void 0
          : _f.canonical
      )
        canonicalByType.push(inputFieldConfig);
    }
    if (canonicalByField.length > 1)
      throw new Error(`Multiple canonical definitions for "${candidates[0].type.name}.${candidates[0].fieldName}"`);
    else if (canonicalByField.length) return canonicalByField[0];
    else if (canonicalByType.length) return canonicalByType[0];
    return candidates[candidates.length - 1].inputFieldConfig;
  }
  function canonicalFieldNamesForType(candidates) {
    var _a;
    const canonicalFieldNames = Object.create(null);
    for (const { type, transformedSubschema } of candidates) {
      if (!isSubschemaConfig(transformedSubschema)) continue;
      const mergeConfig = null === (_a = transformedSubschema.merge) || void 0 === _a ? void 0 : _a[type.name];
      if (null != mergeConfig && null != mergeConfig.fields && !mergeConfig.canonical)
        for (const fieldName in mergeConfig.fields)
          if (mergeConfig.fields[fieldName].canonical) canonicalFieldNames[fieldName] = true;
    }
    return Object.keys(canonicalFieldNames);
  }
  function extractDefinitions(ast) {
    const typeDefinitions = [];
    const directiveDefs = [];
    const schemaDefs = [];
    const schemaExtensions = [];
    const extensionDefs = [];
    for (const def of ast.definitions)
      switch (def.kind) {
        case kinds_Kind.OBJECT_TYPE_DEFINITION:
        case kinds_Kind.INTERFACE_TYPE_DEFINITION:
        case kinds_Kind.INPUT_OBJECT_TYPE_DEFINITION:
        case kinds_Kind.UNION_TYPE_DEFINITION:
        case kinds_Kind.ENUM_TYPE_DEFINITION:
        case kinds_Kind.SCALAR_TYPE_DEFINITION:
          typeDefinitions.push(def);
          break;

        case kinds_Kind.DIRECTIVE_DEFINITION:
          directiveDefs.push(def);
          break;

        case kinds_Kind.SCHEMA_DEFINITION:
          schemaDefs.push(def);
          break;

        case kinds_Kind.SCHEMA_EXTENSION:
          schemaExtensions.push(def);
          break;

        case kinds_Kind.OBJECT_TYPE_EXTENSION:
        case kinds_Kind.INTERFACE_TYPE_EXTENSION:
        case kinds_Kind.INPUT_OBJECT_TYPE_EXTENSION:
        case kinds_Kind.UNION_TYPE_EXTENSION:
        case kinds_Kind.ENUM_TYPE_EXTENSION:
        case kinds_Kind.SCALAR_TYPE_EXTENSION:
          extensionDefs.push(def);
          break;
      }
    return {
      typeDefinitions,
      directiveDefs,
      schemaDefs,
      schemaExtensions,
      extensionDefs,
    };
  }
  function buildTypeCandidates({
    subschemas,
    originalSubschemaMap,
    types,
    typeDefs,
    parseOptions,
    extensions,
    directiveMap,
    schemaDefs,
    mergeDirectives,
  }) {
    const typeCandidates = Object.create(null);
    let schemaDef;
    let schemaExtensions = [];
    let document;
    let extraction;
    if ((typeDefs && !Array.isArray(typeDefs)) || (Array.isArray(typeDefs) && typeDefs.length)) {
      document = mergeTypeDefs(typeDefs, parseOptions);
      extraction = extractDefinitions(document);
      schemaDef = extraction.schemaDefs[0];
      schemaExtensions = schemaExtensions.concat(extraction.schemaExtensions);
    }
    schemaDefs.schemaDef = null != schemaDef ? schemaDef : schemaDefs.schemaDef;
    schemaDefs.schemaExtensions = schemaExtensions;
    const rootTypeNameMap = getRootTypeNameMap(schemaDefs);
    for (const subschema of subschemas) {
      const schema = wrapSchema(subschema);
      const rootTypeMap = getRootTypeMap(schema);
      const rootTypes = Array.from(rootTypeMap.values());
      for (const [operation, rootType] of rootTypeMap.entries())
        addTypeCandidate(typeCandidates, rootTypeNameMap[operation], {
          type: rootType,
          subschema: originalSubschemaMap.get(subschema),
          transformedSubschema: subschema,
        });
      if (true === mergeDirectives)
        for (const directive of schema.getDirectives()) directiveMap[directive.name] = directive;
      const originalTypeMap = schema.getTypeMap();
      for (const typeName in originalTypeMap) {
        const type = originalTypeMap[typeName];
        if (
          definition_isNamedType(type) &&
          '__' !== definition_getNamedType(type).name.slice(0, 2) &&
          !rootTypes.includes(type)
        )
          addTypeCandidate(typeCandidates, type.name, {
            type,
            subschema: originalSubschemaMap.get(subschema),
            transformedSubschema: subschema,
          });
      }
    }
    if (null != document && null != extraction) {
      for (const def of extraction.typeDefinitions) {
        const type = stitch_typeFromAST(def);
        if (!definition_isNamedType(type))
          throw new Error(`Expected to get named typed but got ${JSON.stringify(def)}`);
        if (null != type)
          addTypeCandidate(typeCandidates, type.name, {
            type,
          });
      }
      for (const def of extraction.directiveDefs) {
        const directive = stitch_typeFromAST(def);
        if (!directives_isDirective(directive))
          throw new Error(`Expected to get directive type but got ${JSON.stringify(def)}`);
        directiveMap[directive.name] = directive;
      }
      if (extraction.extensionDefs.length > 0)
        extensions.push({
          ...document,
          definitions: extraction.extensionDefs,
        });
    }
    for (const type of types)
      addTypeCandidate(typeCandidates, type.name, {
        type,
      });
    return [typeCandidates, rootTypeNameMap];
  }
  function getRootTypeNameMap({ schemaDef, schemaExtensions }) {
    const rootTypeNameMap = {
      query: 'Query',
      mutation: 'Mutation',
      subscription: 'Subscription',
    };
    const allNodes = schemaExtensions.slice();
    if (null != schemaDef) allNodes.unshift(schemaDef);
    for (const node of allNodes)
      if (null != node.operationTypes)
        for (const operationType of node.operationTypes)
          rootTypeNameMap[operationType.operation] = operationType.type.name.value;
    return rootTypeNameMap;
  }
  function addTypeCandidate(typeCandidates, name, typeCandidate) {
    if (!(name in typeCandidates)) typeCandidates[name] = [];
    typeCandidates[name].push(typeCandidate);
  }
  function buildTypes({
    typeCandidates,
    directives,
    stitchingInfo,
    rootTypeNames,
    onTypeConflict,
    mergeTypes,
    typeMergingOptions,
  }) {
    const typeMap = Object.create(null);
    for (const typeName in typeCandidates)
      if (
        rootTypeNames.includes(typeName) ||
        (true === mergeTypes &&
          !typeCandidates[typeName].some(candidate => scalars_isSpecifiedScalarType(candidate.type))) ||
        ('function' == typeof mergeTypes && mergeTypes(typeCandidates[typeName], typeName)) ||
        (Array.isArray(mergeTypes) && mergeTypes.includes(typeName)) ||
        (null != stitchingInfo && typeName in stitchingInfo.mergedTypes)
      )
        typeMap[typeName] = mergeCandidates(typeName, typeCandidates[typeName], typeMergingOptions);
      else {
        const candidateSelector =
          null != onTypeConflict ? onTypeConflictToCandidateSelector(onTypeConflict) : cands => cands[cands.length - 1];
        typeMap[typeName] = candidateSelector(typeCandidates[typeName]).type;
      }
    return rewireTypes(typeMap, directives);
  }
  function onTypeConflictToCandidateSelector(onTypeConflict) {
    return cands =>
      cands.reduce((prev, next) => {
        const type = onTypeConflict(prev.type, next.type, {
          left: {
            subschema: prev.subschema,
            transformedSubschema: prev.transformedSubschema,
          },
          right: {
            subschema: next.subschema,
            transformedSubschema: next.transformedSubschema,
          },
        });
        if (prev.type === type) return prev;
        else if (next.type === type) return next;
        return {
          schemaName: 'unknown',
          type,
        };
      });
  }
  function createMergedTypeResolver(mergedTypeResolverOptions) {
    const { fieldName, argsFromKeys, valuesFromResults, args } = mergedTypeResolverOptions;
    if (null != argsFromKeys)
      return (originalResult, context, info, subschema, selectionSet, key) => {
        var _a;
        return batchDelegateToSchema({
          schema: subschema,
          operation: 'query',
          fieldName,
          returnType: new GraphQLList(
            definition_getNamedType(
              null !== (_a = info.schema.getType(originalResult.__typename)) && void 0 !== _a ? _a : info.returnType
            )
          ),
          key,
          argsFromKeys,
          valuesFromResults,
          selectionSet,
          context,
          info,
          skipTypeMerging: true,
        });
      };
    if (null != args)
      return (originalResult, context, info, subschema, selectionSet) => {
        var _a;
        return delegateToSchema({
          schema: subschema,
          operation: 'query',
          fieldName,
          returnType: definition_getNamedType(
            null !== (_a = info.schema.getType(originalResult.__typename)) && void 0 !== _a ? _a : info.returnType
          ),
          args: args(originalResult),
          selectionSet,
          context,
          info,
          skipTypeMerging: true,
        });
      };
    return;
  }
  function createStitchingInfo(subschemaMap, typeCandidates, mergeTypes) {
    const mergedTypes = createMergedTypes(typeCandidates, mergeTypes);
    return {
      subschemaMap,
      fieldNodesByType: Object.create(null),
      fieldNodesByField: Object.create(null),
      dynamicSelectionSetsByField: Object.create(null),
      mergedTypes,
    };
  }
  function createMergedTypes(typeCandidates, mergeTypes) {
    var _a, _b;
    const mergedTypes = Object.create(null);
    for (const typeName in typeCandidates)
      if (
        typeCandidates[typeName].length > 1 &&
        (definition_isObjectType(typeCandidates[typeName][0].type) ||
          definition_isInterfaceType(typeCandidates[typeName][0].type))
      ) {
        const typeCandidatesWithMergedTypeConfig = typeCandidates[typeName].filter(
          typeCandidate =>
            null != typeCandidate.transformedSubschema &&
            null != typeCandidate.transformedSubschema.merge &&
            typeName in typeCandidate.transformedSubschema.merge
        );
        if (
          true === mergeTypes ||
          ('function' == typeof mergeTypes && mergeTypes(typeCandidates[typeName], typeName)) ||
          (Array.isArray(mergeTypes) && mergeTypes.includes(typeName)) ||
          typeCandidatesWithMergedTypeConfig.length
        ) {
          const targetSubschemas = [];
          const typeMaps = new Map();
          const supportedBySubschemas = Object.create({});
          const selectionSets = new Map();
          const fieldSelectionSets = new Map();
          const resolvers = new Map();
          for (const typeCandidate of typeCandidates[typeName]) {
            const subschema = typeCandidate.transformedSubschema;
            if (null == subschema) continue;
            typeMaps.set(subschema, subschema.transformedSchema.getTypeMap());
            const mergedTypeConfig =
              null === (_a = null == subschema ? void 0 : subschema.merge) || void 0 === _a ? void 0 : _a[typeName];
            if (null == mergedTypeConfig) continue;
            if (mergedTypeConfig.selectionSet) {
              const selectionSet = utils_parseSelectionSet(mergedTypeConfig.selectionSet, {
                noLocation: true,
              });
              selectionSets.set(subschema, selectionSet);
            }
            if (mergedTypeConfig.fields) {
              const parsedFieldSelectionSets = Object.create(null);
              for (const fieldName in mergedTypeConfig.fields)
                if (mergedTypeConfig.fields[fieldName].selectionSet) {
                  const rawFieldSelectionSet = mergedTypeConfig.fields[fieldName].selectionSet;
                  parsedFieldSelectionSets[fieldName] = rawFieldSelectionSet
                    ? utils_parseSelectionSet(rawFieldSelectionSet, {
                        noLocation: true,
                      })
                    : void 0;
                }
              fieldSelectionSets.set(subschema, parsedFieldSelectionSets);
            }
            const resolver =
              null !== (_b = mergedTypeConfig.resolve) && void 0 !== _b
                ? _b
                : createMergedTypeResolver(mergedTypeConfig);
            if (null == resolver) continue;
            const keyFn = mergedTypeConfig.key;
            resolvers.set(
              subschema,
              keyFn
                ? (originalResult, context, info, subschema, selectionSet) => {
                    const key = keyFn(originalResult);
                    return resolver(originalResult, context, info, subschema, selectionSet, key);
                  }
                : resolver
            );
            targetSubschemas.push(subschema);
            const fieldMap = subschema.transformedSchema.getType(typeName).getFields();
            const selectionSet = selectionSets.get(subschema);
            for (const fieldName in fieldMap) {
              const fieldType = definition_getNamedType(fieldMap[fieldName].type);
              if (
                selectionSet &&
                definition_isLeafType(fieldType) &&
                selectionSetContainsTopLevelField(selectionSet, fieldName)
              )
                continue;
              if (!(fieldName in supportedBySubschemas)) supportedBySubschemas[fieldName] = [];
              supportedBySubschemas[fieldName].push(subschema);
            }
          }
          const sourceSubschemas = typeCandidates[typeName]
            .map(typeCandidate => (null == typeCandidate ? void 0 : typeCandidate.transformedSubschema))
            .filter(isSome);
          const targetSubschemasBySubschema = new Map();
          for (const subschema of sourceSubschemas) {
            const filteredSubschemas = targetSubschemas.filter(s => s !== subschema);
            if (filteredSubschemas.length) targetSubschemasBySubschema.set(subschema, filteredSubschemas);
          }
          mergedTypes[typeName] = {
            typeName,
            targetSubschemas: targetSubschemasBySubschema,
            typeMaps,
            selectionSets,
            fieldSelectionSets,
            uniqueFields: Object.create({}),
            nonUniqueFields: Object.create({}),
            resolvers,
          };
          for (const fieldName in supportedBySubschemas)
            if (1 === supportedBySubschemas[fieldName].length)
              mergedTypes[typeName].uniqueFields[fieldName] = supportedBySubschemas[fieldName][0];
            else mergedTypes[typeName].nonUniqueFields[fieldName] = supportedBySubschemas[fieldName];
        }
      }
    return mergedTypes;
  }
  function completeStitchingInfo(stitchingInfo, resolvers, schema) {
    const { fieldNodesByType, fieldNodesByField, dynamicSelectionSetsByField, mergedTypes } = stitchingInfo;
    const rootTypes = [schema.getQueryType(), schema.getMutationType()];
    for (const rootType of rootTypes)
      if (rootType)
        fieldNodesByType[rootType.name] = [
          utils_parseSelectionSet('{ __typename }', {
            noLocation: true,
          }).selections[0],
        ];
    const selectionSetsByField = Object.create(null);
    for (const typeName in mergedTypes) {
      const mergedTypeInfo = mergedTypes[typeName];
      if (null == mergedTypeInfo.selectionSets && null == mergedTypeInfo.fieldSelectionSets) continue;
      for (const [subschemaConfig, selectionSet] of mergedTypeInfo.selectionSets) {
        const fields = subschemaConfig.transformedSchema.getType(typeName).getFields();
        for (const fieldName in fields) {
          const fieldType = definition_getNamedType(fields[fieldName].type);
          if (
            selectionSet &&
            definition_isLeafType(fieldType) &&
            selectionSetContainsTopLevelField(selectionSet, fieldName)
          )
            continue;
          updateSelectionSetMap(selectionSetsByField, typeName, fieldName, selectionSet, true);
        }
      }
      for (const [, selectionSetFieldMap] of mergedTypeInfo.fieldSelectionSets)
        for (const fieldName in selectionSetFieldMap)
          updateSelectionSetMap(selectionSetsByField, typeName, fieldName, selectionSetFieldMap[fieldName], true);
    }
    for (const typeName in resolvers) {
      const type = schema.getType(typeName);
      if (
        void 0 === type ||
        definition_isLeafType(type) ||
        definition_isInputObjectType(type) ||
        definition_isUnionType(type)
      )
        continue;
      const resolver = resolvers[typeName];
      for (const fieldName in resolver) {
        const field = resolver[fieldName];
        if ('function' == typeof field.selectionSet) {
          if (!(typeName in dynamicSelectionSetsByField)) dynamicSelectionSetsByField[typeName] = Object.create(null);
          if (!(fieldName in dynamicSelectionSetsByField[typeName]))
            dynamicSelectionSetsByField[typeName][fieldName] = [];
          dynamicSelectionSetsByField[typeName][fieldName].push(field.selectionSet);
        } else if (field.selectionSet)
          updateSelectionSetMap(
            selectionSetsByField,
            typeName,
            fieldName,
            utils_parseSelectionSet(field.selectionSet, {
              noLocation: true,
            })
          );
      }
    }
    const partialExecutionContext = {
      schema,
      variableValues: Object.create(null),
      fragments: Object.create(null),
    };
    const fieldNodeMap = Object.create(null);
    for (const typeName in selectionSetsByField) {
      const type = schema.getType(typeName);
      for (const fieldName in selectionSetsByField[typeName])
        for (const selectionSet of selectionSetsByField[typeName][fieldName]) {
          const fieldNodes = (0, execution_execute.gd)(
            partialExecutionContext,
            type,
            selectionSet,
            Object.create(null),
            Object.create(null)
          );
          for (const responseKey in fieldNodes)
            for (const fieldNode of fieldNodes[responseKey]) {
              const key = printer_print(fieldNode);
              if (null == fieldNodeMap[key]) {
                fieldNodeMap[key] = fieldNode;
                updateArrayMap(fieldNodesByField, typeName, fieldName, fieldNode);
              } else updateArrayMap(fieldNodesByField, typeName, fieldName, fieldNodeMap[key]);
            }
        }
    }
    return stitchingInfo;
  }
  function updateSelectionSetMap(map, typeName, fieldName, selectionSet, includeTypename) {
    if (includeTypename) {
      updateArrayMap(
        map,
        typeName,
        fieldName,
        selectionSet,
        utils_parseSelectionSet('{ __typename }', {
          noLocation: true,
        })
      );
      return;
    }
    updateArrayMap(map, typeName, fieldName, selectionSet);
  }
  function updateArrayMap(map, typeName, fieldName, value, initialValue) {
    if (null == map[typeName]) {
      const initialItems = void 0 === initialValue ? [value] : [initialValue, value];
      map[typeName] = {
        [fieldName]: initialItems,
      };
    } else if (null == map[typeName][fieldName]) {
      const initialItems = void 0 === initialValue ? [value] : [initialValue, value];
      map[typeName][fieldName] = initialItems;
    } else map[typeName][fieldName].push(value);
  }
  function addStitchingInfo(stitchedSchema, stitchingInfo) {
    return new schema_GraphQLSchema({
      ...stitchedSchema.toConfig(),
      extensions: {
        ...stitchedSchema.extensions,
        stitchingInfo,
      },
    });
  }
  function selectionSetContainsTopLevelField(selectionSet, fieldName) {
    return selectionSet.selections.some(
      selection => selection.kind === kinds_Kind.FIELD && selection.name.value === fieldName
    );
  }
  function filterBaseSubschema(subschemaConfig, isolatedSchemaTypes) {
    var _a;
    const schema = subschemaConfig.schema;
    const typesForInterface = {};
    const filteredSchema = utils_pruneSchema(
      filterSchema({
        schema,
        objectFieldFilter: (typeName, fieldName) => {
          var _a, _b;
          return !(null ===
            (_b = null === (_a = isolatedSchemaTypes[typeName]) || void 0 === _a ? void 0 : _a.fields) || void 0 === _b
            ? void 0
            : _b[fieldName]);
        },
        interfaceFieldFilter: (typeName, fieldName) => {
          if (!typesForInterface[typeName]) typesForInterface[typeName] = getImplementingTypes(typeName, schema);
          return !typesForInterface[typeName].some(implementingTypeName => {
            var _a, _b;
            return null ===
              (_b = null === (_a = isolatedSchemaTypes[implementingTypeName]) || void 0 === _a ? void 0 : _a.fields) ||
              void 0 === _b
              ? void 0
              : _b[fieldName];
          });
        },
      })
    );
    const filteredFields = {};
    for (const typeName in filteredSchema.getTypeMap()) {
      const type = filteredSchema.getType(typeName);
      if (definition_isObjectType(type) || definition_isInterfaceType(type)) {
        filteredFields[typeName] = {
          __typename: true,
        };
        const fieldMap = type.getFields();
        for (const fieldName in fieldMap) filteredFields[typeName][fieldName] = true;
      }
    }
    const filteredSubschema = {
      ...subschemaConfig,
      merge: subschemaConfig.merge
        ? {
            ...subschemaConfig.merge,
          }
        : void 0,
      transforms: (null !== (_a = subschemaConfig.transforms) && void 0 !== _a ? _a : []).concat([
        new TransformCompositeFields(
          (typeName, fieldName) => {
            var _a;
            return (null === (_a = filteredFields[typeName]) || void 0 === _a ? void 0 : _a[fieldName]) ? void 0 : null;
          },
          (typeName, fieldName) => {
            var _a;
            return (null === (_a = filteredFields[typeName]) || void 0 === _a ? void 0 : _a[fieldName]) ? void 0 : null;
          }
        ),
      ]),
    };
    const remainingTypes = filteredSchema.getTypeMap();
    const mergeConfig = filteredSubschema.merge;
    if (mergeConfig) {
      for (const mergeType in mergeConfig) if (!remainingTypes[mergeType]) delete mergeConfig[mergeType];
      if (!Object.keys(mergeConfig).length) delete filteredSubschema.merge;
    }
    return filteredSubschema;
  }
  function filterIsolatedSubschema(subschemaConfig) {
    var _a, _b, _c;
    const rootFields = {};
    for (const typeName in subschemaConfig.merge) {
      const mergedTypeConfig = subschemaConfig.merge[typeName];
      const entryPoints = null !== (_a = mergedTypeConfig.entryPoints) && void 0 !== _a ? _a : [mergedTypeConfig];
      for (const entryPoint of entryPoints) if (null != entryPoint.fieldName) rootFields[entryPoint.fieldName] = true;
    }
    const interfaceFields = {};
    for (const typeName in subschemaConfig.merge) {
      const type = subschemaConfig.schema.getType(typeName);
      if (!type || !('getInterfaces' in type)) throw new Error(`${typeName} expected to have 'getInterfaces' method`);
      for (const int of type.getInterfaces()) {
        const intType = subschemaConfig.schema.getType(int.name);
        if (!intType || !('getFields' in intType)) throw new Error(`${int.name} expected to have 'getFields' method`);
        for (const intFieldName in intType.getFields())
          if (null === (_b = subschemaConfig.merge[typeName].fields) || void 0 === _b ? void 0 : _b[intFieldName]) {
            interfaceFields[int.name] = interfaceFields[int.name] || {};
            interfaceFields[int.name][intFieldName] = true;
          }
      }
    }
    const filteredSchema = utils_pruneSchema(
      filterSchema({
        schema: subschemaConfig.schema,
        rootFieldFilter: (operation, fieldName) => 'Query' === operation && null != rootFields[fieldName],
        objectFieldFilter: (typeName, fieldName) => {
          var _a, _b;
          return (
            null !=
            (null === (_b = null === (_a = subschemaConfig.merge[typeName]) || void 0 === _a ? void 0 : _a.fields) ||
            void 0 === _b
              ? void 0
              : _b[fieldName])
          );
        },
        interfaceFieldFilter: (typeName, fieldName) => {
          var _a;
          return null != (null === (_a = interfaceFields[typeName]) || void 0 === _a ? void 0 : _a[fieldName]);
        },
      })
    );
    const filteredFields = {};
    for (const typeName in filteredSchema.getTypeMap()) {
      const type = filteredSchema.getType(typeName);
      if (definition_isObjectType(type) || definition_isInterfaceType(type)) {
        filteredFields[typeName] = {
          __typename: true,
        };
        const fieldMap = type.getFields();
        for (const fieldName in fieldMap) filteredFields[typeName][fieldName] = true;
      }
    }
    return {
      ...subschemaConfig,
      transforms: (null !== (_c = subschemaConfig.transforms) && void 0 !== _c ? _c : []).concat([
        new TransformCompositeFields(
          (typeName, fieldName) => {
            var _a;
            return (null === (_a = filteredFields[typeName]) || void 0 === _a ? void 0 : _a[fieldName]) ? void 0 : null;
          },
          (typeName, fieldName) => {
            var _a;
            return (null === (_a = filteredFields[typeName]) || void 0 === _a ? void 0 : _a[fieldName]) ? void 0 : null;
          }
        ),
      ]),
    };
  }
  const defaultSubschemaConfigTransforms = [
    (function (computedDirectiveName) {
      return subschemaConfig => {
        const newSubschemaConfig = cloneSubschemaConfig(subschemaConfig);
        utils_mapSchema(subschemaConfig.schema, {
          [utils_MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName, schema) => {
            var _a, _b, _c, _d, _e;
            const mergeTypeConfig = null === (_a = newSubschemaConfig.merge) || void 0 === _a ? void 0 : _a[typeName];
            if (null == mergeTypeConfig) return;
            const computed =
              null === (_b = getDirective(schema, fieldConfig, 'computed')) || void 0 === _b ? void 0 : _b[0];
            if (null == computed) return;
            const selectionSet = null != computed['fields'] ? `{ ${computed['fields']} }` : computed['selectionSet'];
            if (null == selectionSet) return;
            mergeTypeConfig.fields = null !== (_c = mergeTypeConfig.fields) && void 0 !== _c ? _c : {};
            mergeTypeConfig.fields[fieldName] =
              null !== (_d = mergeTypeConfig.fields[fieldName]) && void 0 !== _d ? _d : {};
            const mergeFieldConfig = mergeTypeConfig.fields[fieldName];
            mergeFieldConfig.selectionSet =
              null !== (_e = mergeFieldConfig.selectionSet) && void 0 !== _e ? _e : selectionSet;
            mergeFieldConfig.computed = true;
            return;
          },
        });
        return newSubschemaConfig;
      };
    })(),
  ];
  const subschemaConfigTransformerPresets = [
    function (subschemaConfig) {
      var _a, _b;
      if (null == subschemaConfig.merge) return [subschemaConfig];
      const baseSchemaTypes = Object.create(null);
      const isolatedSchemaTypes = Object.create(null);
      for (const typeName in subschemaConfig.merge) {
        const mergedTypeConfig = subschemaConfig.merge[typeName];
        baseSchemaTypes[typeName] = mergedTypeConfig;
        if (mergedTypeConfig.computedFields) {
          const mergeConfigFields = null !== (_a = mergedTypeConfig.fields) && void 0 !== _a ? _a : Object.create(null);
          for (const fieldName in mergedTypeConfig.computedFields) {
            const mergedFieldConfig = mergedTypeConfig.computedFields[fieldName];
            console.warn(
              `The "computedFields" setting is deprecated. Update your @graphql-tools/stitching-directives package, and/or update static merged type config to "${typeName}.fields.${fieldName} = { selectionSet: '${mergedFieldConfig.selectionSet}', computed: true }"`
            );
            mergeConfigFields[fieldName] = {
              ...(null !== (_b = mergeConfigFields[fieldName]) && void 0 !== _b ? _b : {}),
              ...mergedFieldConfig,
              computed: true,
            };
          }
          delete mergedTypeConfig.computedFields;
          mergedTypeConfig.fields = mergeConfigFields;
        }
        if (mergedTypeConfig.fields) {
          const baseFields = Object.create(null);
          const isolatedFields = Object.create(null);
          for (const fieldName in mergedTypeConfig.fields) {
            const mergedFieldConfig = mergedTypeConfig.fields[fieldName];
            if (mergedFieldConfig.computed && mergedFieldConfig.selectionSet)
              isolatedFields[fieldName] = mergedFieldConfig;
            else if (mergedFieldConfig.computed)
              throw new Error(`A selectionSet is required for computed field "${typeName}.${fieldName}"`);
            else baseFields[fieldName] = mergedFieldConfig;
          }
          const isolatedFieldCount = Object.keys(isolatedFields).length;
          const objectType = subschemaConfig.schema.getType(typeName);
          if (isolatedFieldCount && isolatedFieldCount !== Object.keys(objectType.getFields()).length) {
            baseSchemaTypes[typeName] = {
              ...mergedTypeConfig,
              fields: baseFields,
            };
            isolatedSchemaTypes[typeName] = {
              ...mergedTypeConfig,
              fields: isolatedFields,
              canonical: void 0,
            };
          }
        }
      }
      if (Object.keys(isolatedSchemaTypes).length)
        return [
          filterBaseSubschema(
            {
              ...subschemaConfig,
              merge: baseSchemaTypes,
            },
            isolatedSchemaTypes
          ),
          filterIsolatedSubschema({
            ...subschemaConfig,
            merge: isolatedSchemaTypes,
          }),
        ];
      return [subschemaConfig];
    },
    function (subschemaConfig) {
      var _a, _b, _c, _d;
      if (!subschemaConfig.merge) return [subschemaConfig];
      const maxEntryPoints = Object.values(subschemaConfig.merge).reduce((max, mergedTypeConfig) => {
        var _a, _b;
        return Math.max(
          max,
          null !==
            (_b =
              null === (_a = null == mergedTypeConfig ? void 0 : mergedTypeConfig.entryPoints) || void 0 === _a
                ? void 0
                : _a.length) && void 0 !== _b
            ? _b
            : 0
        );
      }, 0);
      if (0 === maxEntryPoints) return [subschemaConfig];
      const subschemaPermutations = [];
      for (let i = 0; i < maxEntryPoints; i += 1) {
        const subschemaPermutation = cloneSubschemaConfig(subschemaConfig);
        const mergedTypesCopy = null !== (_a = subschemaPermutation.merge) && void 0 !== _a ? _a : Object.create(null);
        let currentMerge = mergedTypesCopy;
        if (i > 0) subschemaPermutation.merge = currentMerge = Object.create(null);
        for (const typeName in mergedTypesCopy) {
          const mergedTypeConfig = mergedTypesCopy[typeName];
          const mergedTypeEntryPoint =
            null === (_b = null == mergedTypeConfig ? void 0 : mergedTypeConfig.entryPoints) || void 0 === _b
              ? void 0
              : _b[i];
          if (mergedTypeEntryPoint) {
            if (
              null !==
                (_d =
                  null !== (_c = mergedTypeConfig.selectionSet) && void 0 !== _c ? _c : mergedTypeConfig.fieldName) &&
              void 0 !== _d
                ? _d
                : mergedTypeConfig.resolve
            )
              throw new Error(
                `Merged type ${typeName} may not define entryPoints in addition to selectionSet, fieldName, or resolve`
              );
            Object.assign(mergedTypeConfig, mergedTypeEntryPoint);
            delete mergedTypeConfig.entryPoints;
            if (i > 0) {
              delete mergedTypeConfig.canonical;
              if (null != mergedTypeConfig.fields)
                for (const mergedFieldName in mergedTypeConfig.fields)
                  delete mergedTypeConfig.fields[mergedFieldName].canonical;
            }
            currentMerge[typeName] = mergedTypeConfig;
          }
        }
        subschemaPermutations.push(subschemaPermutation);
      }
      return subschemaPermutations;
    },
  ];
  function applySubschemaConfigTransforms(
    subschemaConfigTransforms,
    subschemaOrSubschemaConfig,
    subschemaMap,
    originalSubschemaMap
  ) {
    let subschemaConfig;
    if (isSubschemaConfig(subschemaOrSubschemaConfig)) subschemaConfig = subschemaOrSubschemaConfig;
    else if (subschemaOrSubschemaConfig instanceof schema_GraphQLSchema)
      subschemaConfig = {
        schema: subschemaOrSubschemaConfig,
      };
    else throw new TypeError('Received invalid input.');
    const transformedSubschemas = subschemaConfigTransforms
      .concat(subschemaConfigTransformerPresets)
      .reduce(
        (transformedSubschemaConfigs, subschemaConfigTransform) =>
          transformedSubschemaConfigs.map(ssConfig => subschemaConfigTransform(ssConfig)).flat(),
        [subschemaConfig]
      )
      .map(ssConfig => new Subschema(ssConfig));
    const baseSubschema = transformedSubschemas[0];
    subschemaMap.set(subschemaOrSubschemaConfig, baseSubschema);
    for (const subschema of transformedSubschemas) originalSubschemaMap.set(subschema, subschemaOrSubschemaConfig);
    return transformedSubschemas;
  }
  function graphql(
    argsOrSchema,
    source,
    rootValue,
    contextValue,
    variableValues,
    operationName,
    fieldResolver,
    typeResolver
  ) {
    var _arguments = arguments;
    return new Promise(function (resolve) {
      return resolve(
        1 === _arguments.length
          ? graphqlImpl(argsOrSchema)
          : graphqlImpl({
              schema: argsOrSchema,
              source,
              rootValue,
              contextValue,
              variableValues,
              operationName,
              fieldResolver,
              typeResolver,
            })
      );
    });
  }
  function graphqlImpl(args) {
    var schema = args.schema,
      source = args.source,
      rootValue = args.rootValue,
      contextValue = args.contextValue,
      variableValues = args.variableValues,
      operationName = args.operationName,
      fieldResolver = args.fieldResolver,
      typeResolver = args.typeResolver;
    var schemaValidationErrors = validateSchema(schema);
    if (schemaValidationErrors.length > 0)
      return {
        errors: schemaValidationErrors,
      };
    var document;
    try {
      document = parser_parse(source);
    } catch (syntaxError) {
      return {
        errors: [syntaxError],
      };
    }
    var validationErrors = validate_validate(schema, document);
    if (validationErrors.length > 0)
      return {
        errors: validationErrors,
      };
    return execute({
      schema,
      document,
      rootValue,
      contextValue,
      variableValues,
      operationName,
      fieldResolver,
      typeResolver,
    });
  }
  async function invokeGraphQL(serviceName, functionName, query, context, variables) {
    if (query.includes('userTags'))
      return {
        data: {
          __typename: 'Query',
          userTags: [
            {
              user: {
                __typename: 'User',
                userId: 'u2',
              },
            },
          ],
        },
      };
    if (query.startsWith('query ($graphqlTools0__v0_userId: ID!)'))
      return {
        data: {
          graphqlTools0___typename: 'Query',
          graphqlTools0_user: {
            __typename: 'User',
            userId: 'u2',
            firstName: 'Two',
          },
        },
      };
    return {};
  }
  function createLambdaExecutor(serviceName, functionName = 'graphqlServer') {
    return async ({ document, variables, context }) => {
      console.log('DOCUMENT', printer_print(document));
      const result = await invokeGraphQL(0, 0, printer_print(document));
      console.log('RESULT', result);
      return result;
    };
  }
  const schema = (function ({
    subschemas = [],
    types = [],
    typeDefs,
    onTypeConflict,
    mergeDirectives,
    mergeTypes = true,
    typeMergingOptions,
    subschemaConfigTransforms = defaultSubschemaConfigTransforms,
    resolvers = {},
    inheritResolversFromInterfaces = false,
    resolverValidationOptions = {},
    parseOptions = {},
    pruningOptions,
    updateResolversInPlace,
    schemaExtensions,
  }) {
    if ('object' != typeof resolverValidationOptions)
      throw new Error('Expected `resolverValidationOptions` to be an object');
    const transformedSubschemas = [];
    const subschemaMap = new Map();
    const originalSubschemaMap = new Map();
    for (const subschemaOrSubschemaArray of subschemas)
      if (Array.isArray(subschemaOrSubschemaArray))
        for (const s of subschemaOrSubschemaArray)
          for (const transformedSubschemaConfig of applySubschemaConfigTransforms(
            subschemaConfigTransforms,
            s,
            subschemaMap,
            originalSubschemaMap
          ))
            transformedSubschemas.push(transformedSubschemaConfig);
      else
        for (const transformedSubschemaConfig of applySubschemaConfigTransforms(
          subschemaConfigTransforms,
          subschemaOrSubschemaArray,
          subschemaMap,
          originalSubschemaMap
        ))
          transformedSubschemas.push(transformedSubschemaConfig);
    const extensions = [];
    const directiveMap = Object.create(null);
    for (const directive of specifiedDirectives) directiveMap[directive.name] = directive;
    const schemaDefs = Object.create(null);
    const [typeCandidates, rootTypeNameMap] = buildTypeCandidates({
      subschemas: transformedSubschemas,
      originalSubschemaMap,
      types,
      typeDefs: typeDefs || [],
      parseOptions,
      extensions,
      directiveMap,
      schemaDefs,
      mergeDirectives,
    });
    let stitchingInfo = createStitchingInfo(subschemaMap, typeCandidates, mergeTypes);
    const { typeMap: newTypeMap, directives: newDirectives } = buildTypes({
      typeCandidates,
      directives: Object.values(directiveMap),
      stitchingInfo,
      rootTypeNames: Object.values(rootTypeNameMap),
      onTypeConflict,
      mergeTypes,
      typeMergingOptions,
    });
    let schema = new schema_GraphQLSchema({
      query: newTypeMap[rootTypeNameMap.query],
      mutation: newTypeMap[rootTypeNameMap.mutation],
      subscription: newTypeMap[rootTypeNameMap.subscription],
      types: Object.values(newTypeMap),
      directives: newDirectives,
      astNode: schemaDefs.schemaDef,
      extensionASTNodes: schemaDefs.schemaExtensions,
      extensions: null,
    });
    for (const extension of extensions)
      schema = extendSchema(schema, extension, {
        commentDescriptions: true,
      });
    const resolverMap = mergeResolvers(resolvers);
    const finalResolvers = inheritResolversFromInterfaces
      ? extendResolversFromInterfaces(schema, resolverMap)
      : resolverMap;
    stitchingInfo = completeStitchingInfo(stitchingInfo, finalResolvers, schema);
    schema = addResolversToSchema({
      schema,
      defaultFieldResolver: delegate_defaultMergedResolver,
      resolvers: finalResolvers,
      resolverValidationOptions,
      inheritResolversFromInterfaces: false,
      updateResolversInPlace,
    });
    if (
      Object.keys(resolverValidationOptions).length > 0 &&
      Object.values(resolverValidationOptions).some(o => 'ignore' !== o)
    )
      assertResolversPresent(schema, resolverValidationOptions);
    schema = addStitchingInfo(schema, stitchingInfo);
    if (pruningOptions) schema = utils_pruneSchema(schema, pruningOptions);
    if (schemaExtensions) {
      if (Array.isArray(schemaExtensions)) schemaExtensions = mergeExtensions(schemaExtensions);
      applyExtensions(schema, schemaExtensions);
    }
    return schema;
  })({
    subschemas: [
      {
        batch: true,
        executor: createLambdaExecutor(),
        schema: schema_makeExecutableSchema({
          typeDefs:
            '\n  interface UserInterface {\n    firstName: String\n    lastName: String\n    userId: ID!\n  }\n\n  type User implements UserInterface {\n    displayName: String\n    firstName: String\n    lastName: String\n    userId: ID!\n  }\n\n  type Query {\n    user(userId: ID!): User\n  }\n',
        }),
        merge: {
          User: {
            args: ({ userId }) => ({
              userId,
            }),
            fieldName: 'user',
            selectionSet: '{ userId }',
          },
        },
      },
      {
        executor: createLambdaExecutor(),
        schema: schema_makeExecutableSchema({
          typeDefs:
            '\n  # Minimal User type that is merged with the auth service\n  type User {\n    userId: ID!\n  }\n\n  type UserTag {\n    tagId: ID!\n    user: User!\n    userId: ID!\n  }\n\n  type Query {\n    userTags(userId: ID!): [UserTag!]!\n  }\n',
        }),
      },
    ],
  });
  const graphqlServer = async event => {
    const request =
      event.body && 'POST' === event.httpMethod ? JSON.parse(event.body) : event.queryStringParameters || {};
    const result = await graphql(schema, request.query);
    return {
      body: JSON.stringify(result),
      headers: {
        'Content-Type': 'application/json',
      },
      statusCode: 200,
    };
  };
})();
module.exports = __webpack_exports__;
