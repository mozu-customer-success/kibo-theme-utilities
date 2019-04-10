define(['hyprlivecontext', 'modules/jquery-mozu', 'underscore'], function (hyprContext, jqueryMozu, underscore) { 'use strict';

  hyprContext = hyprContext && hyprContext.hasOwnProperty('default') ? hyprContext['default'] : hyprContext;
  jqueryMozu = jqueryMozu && jqueryMozu.hasOwnProperty('default') ? jqueryMozu['default'] : jqueryMozu;
  underscore = underscore && underscore.hasOwnProperty('default') ? underscore['default'] : underscore;

  var hasOwnProperty = {}.hasOwnProperty;

  var has = function (it, key) {
    return hasOwnProperty.call(it, key);
  };

  var fails = function (exec) {
    try {
      return !!exec();
    } catch (e) {
      return true;
    }
  };

  var toString = {}.toString;

  var classofRaw = function (it) {
    return toString.call(it).slice(8, -1);
  };

  // fallback for non-array-like ES3 and non-enumerable old V8 strings


  var split = ''.split;

  var indexedObject = fails(function () {
    // throws an error in rhino, see https://github.com/mozilla/rhino/issues/346
    // eslint-disable-next-line no-prototype-builtins
    return !Object('z').propertyIsEnumerable(0);
  }) ? function (it) {
    return classofRaw(it) == 'String' ? split.call(it, '') : Object(it);
  } : Object;

  // `RequireObjectCoercible` abstract operation
  // https://tc39.github.io/ecma262/#sec-requireobjectcoercible
  var requireObjectCoercible = function (it) {
    if (it == undefined) throw TypeError("Can't call method on " + it);
    return it;
  };

  // toObject with fallback for non-array-like ES3 strings



  var toIndexedObject = function (it) {
    return indexedObject(requireObjectCoercible(it));
  };

  var ceil = Math.ceil;
  var floor = Math.floor;

  // `ToInteger` abstract operation
  // https://tc39.github.io/ecma262/#sec-tointeger
  var toInteger = function (argument) {
    return isNaN(argument = +argument) ? 0 : (argument > 0 ? floor : ceil)(argument);
  };

  var min = Math.min;

  // `ToLength` abstract operation
  // https://tc39.github.io/ecma262/#sec-tolength
  var toLength = function (argument) {
    return argument > 0 ? min(toInteger(argument), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
  };

  var max = Math.max;
  var min$1 = Math.min;

  // Helper for a popular repeating case of the spec:
  // Let integer be ? ToInteger(index).
  // If integer < 0, let result be max((length + integer), 0); else let result be min(length, length).
  var toAbsoluteIndex = function (index, length) {
    var integer = toInteger(index);
    return integer < 0 ? max(integer + length, 0) : min$1(integer, length);
  };

  // `Array.prototype.{ indexOf, includes }` methods implementation
  // false -> Array#indexOf
  // https://tc39.github.io/ecma262/#sec-array.prototype.indexof
  // true  -> Array#includes
  // https://tc39.github.io/ecma262/#sec-array.prototype.includes
  var arrayIncludes = function (IS_INCLUDES) {
    return function ($this, el, fromIndex) {
      var O = toIndexedObject($this);
      var length = toLength(O.length);
      var index = toAbsoluteIndex(fromIndex, length);
      var value;
      // Array#includes uses SameValueZero equality algorithm
      // eslint-disable-next-line no-self-compare
      if (IS_INCLUDES && el != el) while (length > index) {
        value = O[index++];
        // eslint-disable-next-line no-self-compare
        if (value != value) return true;
      // Array#indexOf ignores holes, Array#includes - not
      } else for (;length > index; index++) if (IS_INCLUDES || index in O) {
        if (O[index] === el) return IS_INCLUDES || index || 0;
      } return !IS_INCLUDES && -1;
    };
  };

  var hiddenKeys = {};

  var arrayIndexOf = arrayIncludes(false);


  var objectKeysInternal = function (object, names) {
    var O = toIndexedObject(object);
    var i = 0;
    var result = [];
    var key;
    for (key in O) !has(hiddenKeys, key) && has(O, key) && result.push(key);
    // Don't enum bug & hidden keys
    while (names.length > i) if (has(O, key = names[i++])) {
      ~arrayIndexOf(result, key) || result.push(key);
    }
    return result;
  };

  // IE8- don't enum bug keys
  var enumBugKeys = [
    'constructor',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toLocaleString',
    'toString',
    'valueOf'
  ];

  // 19.1.2.14 / 15.2.3.14 Object.keys(O)



  var objectKeys = Object.keys || function keys(O) {
    return objectKeysInternal(O, enumBugKeys);
  };

  var f = Object.getOwnPropertySymbols;

  var objectGetOwnPropertySymbols = {
  	f: f
  };

  var nativePropertyIsEnumerable = {}.propertyIsEnumerable;
  var nativeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

  // Nashorn ~ JDK8 bug
  var NASHORN_BUG = nativeGetOwnPropertyDescriptor && !nativePropertyIsEnumerable.call({ 1: 2 }, 1);

  var f$1 = NASHORN_BUG ? function propertyIsEnumerable(V) {
    var descriptor = nativeGetOwnPropertyDescriptor(this, V);
    return !!descriptor && descriptor.enumerable;
  } : nativePropertyIsEnumerable;

  var objectPropertyIsEnumerable = {
  	f: f$1
  };

  // `ToObject` abstract operation
  // https://tc39.github.io/ecma262/#sec-toobject
  var toObject = function (argument) {
    return Object(requireObjectCoercible(argument));
  };

  // 19.1.2.1 Object.assign(target, source, ...)





  var nativeAssign = Object.assign;

  // should work with symbols and should have deterministic property order (V8 bug)
  var objectAssign = !nativeAssign || fails(function () {
    var A = {};
    var B = {};
    // eslint-disable-next-line no-undef
    var symbol = Symbol();
    var alphabet = 'abcdefghijklmnopqrst';
    A[symbol] = 7;
    alphabet.split('').forEach(function (chr) { B[chr] = chr; });
    return nativeAssign({}, A)[symbol] != 7 || objectKeys(nativeAssign({}, B)).join('') != alphabet;
  }) ? function assign(target, source) { // eslint-disable-line no-unused-vars
    var T = toObject(target);
    var argumentsLength = arguments.length;
    var index = 1;
    var getOwnPropertySymbols = objectGetOwnPropertySymbols.f;
    var propertyIsEnumerable = objectPropertyIsEnumerable.f;
    while (argumentsLength > index) {
      var S = indexedObject(arguments[index++]);
      var keys = getOwnPropertySymbols ? objectKeys(S).concat(getOwnPropertySymbols(S)) : objectKeys(S);
      var length = keys.length;
      var j = 0;
      var key;
      while (length > j) if (propertyIsEnumerable.call(S, key = keys[j++])) T[key] = S[key];
    } return T;
  } : nativeAssign;

  // https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
  var global$1 = typeof window == 'object' && window && window.Math == Math ? window
    : typeof self == 'object' && self && self.Math == Math ? self
    // eslint-disable-next-line no-new-func
    : Function('return this')();

  // Thank's IE8 for his funny defineProperty
  var descriptors = !fails(function () {
    return Object.defineProperty({}, 'a', { get: function () { return 7; } }).a != 7;
  });

  var createPropertyDescriptor = function (bitmap, value) {
    return {
      enumerable: !(bitmap & 1),
      configurable: !(bitmap & 2),
      writable: !(bitmap & 4),
      value: value
    };
  };

  var isObject = function (it) {
    return typeof it === 'object' ? it !== null : typeof it === 'function';
  };

  // 7.1.1 ToPrimitive(input [, PreferredType])

  // instead of the ES6 spec version, we didn't implement @@toPrimitive case
  // and the second argument - flag - preferred type is a string
  var toPrimitive = function (it, S) {
    if (!isObject(it)) return it;
    var fn, val;
    if (S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
    if (typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it))) return val;
    if (!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
    throw TypeError("Can't convert object to primitive value");
  };

  var document$1 = global$1.document;
  // typeof document.createElement is 'object' in old IE
  var exist = isObject(document$1) && isObject(document$1.createElement);

  var documentCreateElement = function (it) {
    return exist ? document$1.createElement(it) : {};
  };

  // Thank's IE8 for his funny defineProperty
  var ie8DomDefine = !descriptors && !fails(function () {
    return Object.defineProperty(documentCreateElement('div'), 'a', {
      get: function () { return 7; }
    }).a != 7;
  });

  var nativeGetOwnPropertyDescriptor$1 = Object.getOwnPropertyDescriptor;

  var f$2 = descriptors ? nativeGetOwnPropertyDescriptor$1 : function getOwnPropertyDescriptor(O, P) {
    O = toIndexedObject(O);
    P = toPrimitive(P, true);
    if (ie8DomDefine) try {
      return nativeGetOwnPropertyDescriptor$1(O, P);
    } catch (e) { /* empty */ }
    if (has(O, P)) return createPropertyDescriptor(!objectPropertyIsEnumerable.f.call(O, P), O[P]);
  };

  var objectGetOwnPropertyDescriptor = {
  	f: f$2
  };

  var anObject = function (it) {
    if (!isObject(it)) {
      throw TypeError(String(it) + ' is not an object');
    } return it;
  };

  var nativeDefineProperty = Object.defineProperty;

  var f$3 = descriptors ? nativeDefineProperty : function defineProperty(O, P, Attributes) {
    anObject(O);
    P = toPrimitive(P, true);
    anObject(Attributes);
    if (ie8DomDefine) try {
      return nativeDefineProperty(O, P, Attributes);
    } catch (e) { /* empty */ }
    if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported');
    if ('value' in Attributes) O[P] = Attributes.value;
    return O;
  };

  var objectDefineProperty = {
  	f: f$3
  };

  var hide = descriptors ? function (object, key, value) {
    return objectDefineProperty.f(object, key, createPropertyDescriptor(1, value));
  } : function (object, key, value) {
    object[key] = value;
    return object;
  };

  var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function unwrapExports (x) {
  	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x.default : x;
  }

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var setGlobal = function (key, value) {
    try {
      hide(global$1, key, value);
    } catch (e) {
      global$1[key] = value;
    } return value;
  };

  var isPure = false;

  var shared = createCommonjsModule(function (module) {
  var SHARED = '__core-js_shared__';
  var store = global$1[SHARED] || setGlobal(SHARED, {});

  (module.exports = function (key, value) {
    return store[key] || (store[key] = value !== undefined ? value : {});
  })('versions', []).push({
    version: '3.0.0',
    mode: 'global',
    copyright: '© 2019 Denis Pushkarev (zloirock.ru)'
  });
  });

  var functionToString = shared('native-function-to-string', Function.toString);

  var WeakMap = global$1.WeakMap;

  var nativeWeakMap = typeof WeakMap === 'function' && /native code/.test(functionToString.call(WeakMap));

  var id = 0;
  var postfix = Math.random();

  var uid = function (key) {
    return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + postfix).toString(36));
  };

  var shared$1 = shared('keys');


  var sharedKey = function (key) {
    return shared$1[key] || (shared$1[key] = uid(key));
  };

  var WeakMap$1 = global$1.WeakMap;
  var set, get, has$1;

  var enforce = function (it) {
    return has$1(it) ? get(it) : set(it, {});
  };

  var getterFor = function (TYPE) {
    return function (it) {
      var state;
      if (!isObject(it) || (state = get(it)).type !== TYPE) {
        throw TypeError('Incompatible receiver, ' + TYPE + ' required');
      } return state;
    };
  };

  if (nativeWeakMap) {
    var store = new WeakMap$1();
    var wmget = store.get;
    var wmhas = store.has;
    var wmset = store.set;
    set = function (it, metadata) {
      wmset.call(store, it, metadata);
      return metadata;
    };
    get = function (it) {
      return wmget.call(store, it) || {};
    };
    has$1 = function (it) {
      return wmhas.call(store, it);
    };
  } else {
    var STATE = sharedKey('state');
    hiddenKeys[STATE] = true;
    set = function (it, metadata) {
      hide(it, STATE, metadata);
      return metadata;
    };
    get = function (it) {
      return has(it, STATE) ? it[STATE] : {};
    };
    has$1 = function (it) {
      return has(it, STATE);
    };
  }

  var internalState = {
    set: set,
    get: get,
    has: has$1,
    enforce: enforce,
    getterFor: getterFor
  };

  var redefine = createCommonjsModule(function (module) {
  var getInternalState = internalState.get;
  var enforceInternalState = internalState.enforce;
  var TEMPLATE = String(functionToString).split('toString');

  shared('inspectSource', function (it) {
    return functionToString.call(it);
  });

  (module.exports = function (O, key, value, options) {
    var unsafe = options ? !!options.unsafe : false;
    var simple = options ? !!options.enumerable : false;
    var noTargetGet = options ? !!options.noTargetGet : false;
    if (typeof value == 'function') {
      if (typeof key == 'string' && !has(value, 'name')) hide(value, 'name', key);
      enforceInternalState(value).source = TEMPLATE.join(typeof key == 'string' ? key : '');
    }
    if (O === global$1) {
      if (simple) O[key] = value;
      else setGlobal(key, value);
      return;
    } else if (!unsafe) {
      delete O[key];
    } else if (!noTargetGet && O[key]) {
      simple = true;
    }
    if (simple) O[key] = value;
    else hide(O, key, value);
  // add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
  })(Function.prototype, 'toString', function toString() {
    return typeof this == 'function' && getInternalState(this).source || functionToString.call(this);
  });
  });

  // 19.1.2.7 / 15.2.3.4 Object.getOwnPropertyNames(O)

  var hiddenKeys$1 = enumBugKeys.concat('length', 'prototype');

  var f$4 = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
    return objectKeysInternal(O, hiddenKeys$1);
  };

  var objectGetOwnPropertyNames = {
  	f: f$4
  };

  var Reflect = global$1.Reflect;

  // all object keys, includes non-enumerable and symbols
  var ownKeys = Reflect && Reflect.ownKeys || function ownKeys(it) {
    var keys = objectGetOwnPropertyNames.f(anObject(it));
    var getOwnPropertySymbols = objectGetOwnPropertySymbols.f;
    return getOwnPropertySymbols ? keys.concat(getOwnPropertySymbols(it)) : keys;
  };

  var copyConstructorProperties = function (target, source) {
    var keys = ownKeys(source);
    var defineProperty = objectDefineProperty.f;
    var getOwnPropertyDescriptor = objectGetOwnPropertyDescriptor.f;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (!has(target, key)) defineProperty(target, key, getOwnPropertyDescriptor(source, key));
    }
  };

  var replacement = /#|\.prototype\./;

  var isForced = function (feature, detection) {
    var value = data[normalize(feature)];
    return value == POLYFILL ? true
      : value == NATIVE ? false
      : typeof detection == 'function' ? fails(detection)
      : !!detection;
  };

  var normalize = isForced.normalize = function (string) {
    return String(string).replace(replacement, '.').toLowerCase();
  };

  var data = isForced.data = {};
  var NATIVE = isForced.NATIVE = 'N';
  var POLYFILL = isForced.POLYFILL = 'P';

  var isForced_1 = isForced;

  var getOwnPropertyDescriptor = objectGetOwnPropertyDescriptor.f;






  /*
    options.target      - name of the target object
    options.global      - target is the global object
    options.stat        - export as static methods of target
    options.proto       - export as prototype methods of target
    options.real        - real prototype method for the `pure` version
    options.forced      - export even if the native feature is available
    options.bind        - bind methods to the target, required for the `pure` version
    options.wrap        - wrap constructors to preventing global pollution, required for the `pure` version
    options.unsafe      - use the simple assignment of property instead of delete + defineProperty
    options.sham        - add a flag to not completely full polyfills
    options.enumerable  - export as enumerable property
    options.noTargetGet - prevent calling a getter on target
  */
  var _export = function (options, source) {
    var TARGET = options.target;
    var GLOBAL = options.global;
    var STATIC = options.stat;
    var FORCED, target, key, targetProperty, sourceProperty, descriptor;
    if (GLOBAL) {
      target = global$1;
    } else if (STATIC) {
      target = global$1[TARGET] || setGlobal(TARGET, {});
    } else {
      target = (global$1[TARGET] || {}).prototype;
    }
    if (target) for (key in source) {
      sourceProperty = source[key];
      if (options.noTargetGet) {
        descriptor = getOwnPropertyDescriptor(target, key);
        targetProperty = descriptor && descriptor.value;
      } else targetProperty = target[key];
      FORCED = isForced_1(GLOBAL ? key : TARGET + (STATIC ? '.' : '#') + key, options.forced);
      // contained in target
      if (!FORCED && targetProperty !== undefined) {
        if (typeof sourceProperty === typeof targetProperty) continue;
        copyConstructorProperties(sourceProperty, targetProperty);
      }
      // add a flag to not completely full polyfills
      if (options.sham || (targetProperty && targetProperty.sham)) {
        hide(sourceProperty, 'sham', true);
      }
      // extend global
      redefine(target, key, sourceProperty, options);
    }
  };

  // `Object.assign` method
  // https://tc39.github.io/ecma262/#sec-object.assign
  _export({ target: 'Object', stat: true, forced: Object.assign !== objectAssign }, { assign: objectAssign });

  var locals = hyprContext.locals || {};
  var context = locals;

  // `IsArray` abstract operation
  // https://tc39.github.io/ecma262/#sec-isarray
  var isArray = Array.isArray || function isArray(arg) {
    return classofRaw(arg) == 'Array';
  };

  var createProperty = function (object, key, value) {
    var propertyKey = toPrimitive(key);
    if (propertyKey in object) objectDefineProperty.f(object, propertyKey, createPropertyDescriptor(0, value));
    else object[propertyKey] = value;
  };

  // Chrome 38 Symbol has incorrect toString conversion
  var nativeSymbol = !fails(function () {
  });

  var store$1 = shared('wks');

  var Symbol$1 = global$1.Symbol;


  var wellKnownSymbol = function (name) {
    return store$1[name] || (store$1[name] = nativeSymbol && Symbol$1[name]
      || (nativeSymbol ? Symbol$1 : uid)('Symbol.' + name));
  };

  var SPECIES = wellKnownSymbol('species');

  // `ArraySpeciesCreate` abstract operation
  // https://tc39.github.io/ecma262/#sec-arrayspeciescreate
  var arraySpeciesCreate = function (originalArray, length) {
    var C;
    if (isArray(originalArray)) {
      C = originalArray.constructor;
      // cross-realm fallback
      if (typeof C == 'function' && (C === Array || isArray(C.prototype))) C = undefined;
      else if (isObject(C)) {
        C = C[SPECIES];
        if (C === null) C = undefined;
      }
    } return new (C === undefined ? Array : C)(length === 0 ? 0 : length);
  };

  var SPECIES$1 = wellKnownSymbol('species');

  var arrayMethodHasSpeciesSupport = function (METHOD_NAME) {
    return !fails(function () {
      var array = [];
      var constructor = array.constructor = {};
      constructor[SPECIES$1] = function () {
        return { foo: 1 };
      };
      return array[METHOD_NAME](Boolean).foo !== 1;
    });
  };

  var IS_CONCAT_SPREADABLE = wellKnownSymbol('isConcatSpreadable');
  var MAX_SAFE_INTEGER = 0x1fffffffffffff;
  var MAXIMUM_ALLOWED_INDEX_EXCEEDED = 'Maximum allowed index exceeded';

  var IS_CONCAT_SPREADABLE_SUPPORT = !fails(function () {
    var array = [];
    array[IS_CONCAT_SPREADABLE] = false;
    return array.concat()[0] !== array;
  });

  var SPECIES_SUPPORT = arrayMethodHasSpeciesSupport('concat');

  var isConcatSpreadable = function (O) {
    if (!isObject(O)) return false;
    var spreadable = O[IS_CONCAT_SPREADABLE];
    return spreadable !== undefined ? !!spreadable : isArray(O);
  };

  var FORCED = !IS_CONCAT_SPREADABLE_SUPPORT || !SPECIES_SUPPORT;

  // `Array.prototype.concat` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.concat
  // with adding support of @@isConcatSpreadable and @@species
  _export({ target: 'Array', proto: true, forced: FORCED }, {
    concat: function concat(arg) { // eslint-disable-line no-unused-vars
      var O = toObject(this);
      var A = arraySpeciesCreate(O, 0);
      var n = 0;
      var i, k, length, len, E;
      for (i = -1, length = arguments.length; i < length; i++) {
        E = i === -1 ? O : arguments[i];
        if (isConcatSpreadable(E)) {
          len = toLength(E.length);
          if (n + len > MAX_SAFE_INTEGER) throw TypeError(MAXIMUM_ALLOWED_INDEX_EXCEEDED);
          for (k = 0; k < len; k++, n++) if (k in E) createProperty(A, n, E[k]);
        } else {
          if (n >= MAX_SAFE_INTEGER) throw TypeError(MAXIMUM_ALLOWED_INDEX_EXCEEDED);
          createProperty(A, n++, E);
        }
      }
      A.length = n;
      return A;
    }
  });

  var aFunction = function (it) {
    if (typeof it != 'function') {
      throw TypeError(String(it) + ' is not a function');
    } return it;
  };

  // optional / simple context binding
  var bindContext = function (fn, that, length) {
    aFunction(fn);
    if (that === undefined) return fn;
    switch (length) {
      case 0: return function () {
        return fn.call(that);
      };
      case 1: return function (a) {
        return fn.call(that, a);
      };
      case 2: return function (a, b) {
        return fn.call(that, a, b);
      };
      case 3: return function (a, b, c) {
        return fn.call(that, a, b, c);
      };
    }
    return function (/* ...args */) {
      return fn.apply(that, arguments);
    };
  };

  // `Array.prototype.{ forEach, map, filter, some, every, find, findIndex }` methods implementation
  // 0 -> Array#forEach
  // https://tc39.github.io/ecma262/#sec-array.prototype.foreach
  // 1 -> Array#map
  // https://tc39.github.io/ecma262/#sec-array.prototype.map
  // 2 -> Array#filter
  // https://tc39.github.io/ecma262/#sec-array.prototype.filter
  // 3 -> Array#some
  // https://tc39.github.io/ecma262/#sec-array.prototype.some
  // 4 -> Array#every
  // https://tc39.github.io/ecma262/#sec-array.prototype.every
  // 5 -> Array#find
  // https://tc39.github.io/ecma262/#sec-array.prototype.find
  // 6 -> Array#findIndex
  // https://tc39.github.io/ecma262/#sec-array.prototype.findIndex
  var arrayMethods = function (TYPE, specificCreate) {
    var IS_MAP = TYPE == 1;
    var IS_FILTER = TYPE == 2;
    var IS_SOME = TYPE == 3;
    var IS_EVERY = TYPE == 4;
    var IS_FIND_INDEX = TYPE == 6;
    var NO_HOLES = TYPE == 5 || IS_FIND_INDEX;
    var create = specificCreate || arraySpeciesCreate;
    return function ($this, callbackfn, that) {
      var O = toObject($this);
      var self = indexedObject(O);
      var boundFunction = bindContext(callbackfn, that, 3);
      var length = toLength(self.length);
      var index = 0;
      var target = IS_MAP ? create($this, length) : IS_FILTER ? create($this, 0) : undefined;
      var value, result;
      for (;length > index; index++) if (NO_HOLES || index in self) {
        value = self[index];
        result = boundFunction(value, index, O);
        if (TYPE) {
          if (IS_MAP) target[index] = result; // map
          else if (result) switch (TYPE) {
            case 3: return true;              // some
            case 5: return value;             // find
            case 6: return index;             // findIndex
            case 2: target.push(value);       // filter
          } else if (IS_EVERY) return false;  // every
        }
      }
      return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : target;
    };
  };

  var internalMap = arrayMethods(1);

  var SPECIES_SUPPORT$1 = arrayMethodHasSpeciesSupport('map');

  // `Array.prototype.map` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.map
  // with adding support of @@species
  _export({ target: 'Array', proto: true, forced: !SPECIES_SUPPORT$1 }, {
    map: function map(callbackfn /* , thisArg */) {
      return internalMap(this, callbackfn, arguments[1]);
    }
  });

  // `Array.prototype.{ reduce, reduceRight }` methods implementation
  // https://tc39.github.io/ecma262/#sec-array.prototype.reduce
  // https://tc39.github.io/ecma262/#sec-array.prototype.reduceright
  var arrayReduce = function (that, callbackfn, argumentsLength, memo, isRight) {
    aFunction(callbackfn);
    var O = toObject(that);
    var self = indexedObject(O);
    var length = toLength(O.length);
    var index = isRight ? length - 1 : 0;
    var i = isRight ? -1 : 1;
    if (argumentsLength < 2) while (true) {
      if (index in self) {
        memo = self[index];
        index += i;
        break;
      }
      index += i;
      if (isRight ? index < 0 : length <= index) {
        throw TypeError('Reduce of empty array with no initial value');
      }
    }
    for (;isRight ? index >= 0 : length > index; index += i) if (index in self) {
      memo = callbackfn(memo, self[index], index, O);
    }
    return memo;
  };

  var sloppyArrayMethod = function (METHOD_NAME, argument) {
    var method = [][METHOD_NAME];
    return !method || !fails(function () {
      // eslint-disable-next-line no-useless-call
      method.call(null, argument || function () { throw Error(); }, 1);
    });
  };

  var SLOPPY_METHOD = sloppyArrayMethod('reduce');

  // `Array.prototype.reduce` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.reduce
  _export({ target: 'Array', proto: true, forced: SLOPPY_METHOD }, {
    reduce: function reduce(callbackfn /* , initialValue */) {
      return arrayReduce(this, callbackfn, arguments.length, arguments[1], false);
    }
  });

  var SPECIES$2 = wellKnownSymbol('species');
  var nativeSlice = [].slice;
  var max$1 = Math.max;

  var SPECIES_SUPPORT$2 = arrayMethodHasSpeciesSupport('slice');

  // `Array.prototype.slice` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.slice
  // fallback for not array-like ES3 strings and DOM objects
  _export({ target: 'Array', proto: true, forced: !SPECIES_SUPPORT$2 }, {
    slice: function slice(start, end) {
      var O = toIndexedObject(this);
      var length = toLength(O.length);
      var k = toAbsoluteIndex(start, length);
      var fin = toAbsoluteIndex(end === undefined ? length : end, length);
      // inline `ArraySpeciesCreate` for usage native `Array#slice` where it's possible
      var Constructor, result, n;
      if (isArray(O)) {
        Constructor = O.constructor;
        // cross-realm fallback
        if (typeof Constructor == 'function' && (Constructor === Array || isArray(Constructor.prototype))) {
          Constructor = undefined;
        } else if (isObject(Constructor)) {
          Constructor = Constructor[SPECIES$2];
          if (Constructor === null) Constructor = undefined;
        }
        if (Constructor === Array || Constructor === undefined) {
          return nativeSlice.call(O, k, fin);
        }
      }
      result = new (Constructor === undefined ? Array : Constructor)(max$1(fin - k, 0));
      for (n = 0; k < fin; k++, n++) if (k in O) createProperty(result, n, O[k]);
      result.length = n;
      return result;
    }
  });

  var DatePrototype = Date.prototype;
  var INVALID_DATE = 'Invalid Date';
  var TO_STRING = 'toString';
  var nativeDateToString = DatePrototype[TO_STRING];
  var getTime = DatePrototype.getTime;

  // `Date.prototype.toString` method
  // https://tc39.github.io/ecma262/#sec-date.prototype.tostring
  if (new Date(NaN) + '' != INVALID_DATE) {
    redefine(DatePrototype, TO_STRING, function toString() {
      var value = getTime.call(this);
      // eslint-disable-next-line no-self-compare
      return value === value ? nativeDateToString.call(this) : INVALID_DATE;
    });
  }

  var TO_STRING_TAG = wellKnownSymbol('toStringTag');
  // ES3 wrong here
  var CORRECT_ARGUMENTS = classofRaw(function () { return arguments; }()) == 'Arguments';

  // fallback for IE11 Script Access Denied error
  var tryGet = function (it, key) {
    try {
      return it[key];
    } catch (e) { /* empty */ }
  };

  // getting tag from ES6+ `Object.prototype.toString`
  var classof = function (it) {
    var O, tag, result;
    return it === undefined ? 'Undefined' : it === null ? 'Null'
      // @@toStringTag case
      : typeof (tag = tryGet(O = Object(it), TO_STRING_TAG)) == 'string' ? tag
      // builtinTag case
      : CORRECT_ARGUMENTS ? classofRaw(O)
      // ES3 arguments fallback
      : (result = classofRaw(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : result;
  };

  var TO_STRING_TAG$1 = wellKnownSymbol('toStringTag');
  var test = {};

  test[TO_STRING_TAG$1] = 'z';

  // `Object.prototype.toString` method implementation
  // https://tc39.github.io/ecma262/#sec-object.prototype.tostring
  var objectToString = String(test) !== '[object z]' ? function toString() {
    return '[object ' + classof(this) + ']';
  } : test.toString;

  var ObjectPrototype = Object.prototype;

  // `Object.prototype.toString` method
  // https://tc39.github.io/ecma262/#sec-object.prototype.tostring
  if (objectToString !== ObjectPrototype.toString) {
    redefine(ObjectPrototype, 'toString', objectToString, { unsafe: true });
  }

  // a string of all valid unicode whitespaces
  // eslint-disable-next-line max-len
  var whitespaces = '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF';

  var whitespace = '[' + whitespaces + ']';
  var ltrim = RegExp('^' + whitespace + whitespace + '*');
  var rtrim = RegExp(whitespace + whitespace + '*$');

  // 1 -> String#trimStart
  // 2 -> String#trimEnd
  // 3 -> String#trim
  var stringTrim = function (string, TYPE) {
    string = String(requireObjectCoercible(string));
    if (TYPE & 1) string = string.replace(ltrim, '');
    if (TYPE & 2) string = string.replace(rtrim, '');
    return string;
  };

  var nativeParseFloat = global$1.parseFloat;


  var FORCED$1 = 1 / nativeParseFloat(whitespaces + '-0') !== -Infinity;

  var _parseFloat = FORCED$1 ? function parseFloat(str) {
    var string = stringTrim(String(str), 3);
    var result = nativeParseFloat(string);
    return result === 0 && string.charAt(0) == '-' ? -0 : result;
  } : nativeParseFloat;

  // `parseFloat` method
  // https://tc39.github.io/ecma262/#sec-parsefloat-string
  _export({ global: true, forced: parseFloat != _parseFloat }, {
    parseFloat: _parseFloat
  });

  var anInstance = function (it, Constructor, name) {
    if (!(it instanceof Constructor)) {
      throw TypeError('Incorrect ' + (name ? name + ' ' : '') + 'invocation');
    } return it;
  };

  var iterators = {};

  // check on default Array iterator

  var ITERATOR = wellKnownSymbol('iterator');
  var ArrayPrototype = Array.prototype;

  var isArrayIteratorMethod = function (it) {
    return it !== undefined && (iterators.Array === it || ArrayPrototype[ITERATOR] === it);
  };

  var ITERATOR$1 = wellKnownSymbol('iterator');


  var getIteratorMethod = function (it) {
    if (it != undefined) return it[ITERATOR$1]
      || it['@@iterator']
      || iterators[classof(it)];
  };

  // call something on iterator step with safe closing on error
  var callWithSafeIterationClosing = function (iterator, fn, value, ENTRIES) {
    try {
      return ENTRIES ? fn(anObject(value)[0], value[1]) : fn(value);
    // 7.4.6 IteratorClose(iterator, completion)
    } catch (e) {
      var returnMethod = iterator['return'];
      if (returnMethod !== undefined) anObject(returnMethod.call(iterator));
      throw e;
    }
  };

  var iterate = createCommonjsModule(function (module) {
  var BREAK = {};

  var exports = module.exports = function (iterable, fn, that, ENTRIES, ITERATOR) {
    var boundFunction = bindContext(fn, that, ENTRIES ? 2 : 1);
    var iterator, iterFn, index, length, result, step;

    if (ITERATOR) {
      iterator = iterable;
    } else {
      iterFn = getIteratorMethod(iterable);
      if (typeof iterFn != 'function') throw TypeError('Target is not iterable');
      // optimisation for array iterators
      if (isArrayIteratorMethod(iterFn)) {
        for (index = 0, length = toLength(iterable.length); length > index; index++) {
          result = ENTRIES ? boundFunction(anObject(step = iterable[index])[0], step[1]) : boundFunction(iterable[index]);
          if (result === BREAK) return BREAK;
        } return;
      }
      iterator = iterFn.call(iterable);
    }

    while (!(step = iterator.next()).done) {
      if (callWithSafeIterationClosing(iterator, boundFunction, step.value, ENTRIES) === BREAK) return BREAK;
    }
  };

  exports.BREAK = BREAK;
  });

  var ITERATOR$2 = wellKnownSymbol('iterator');
  var SAFE_CLOSING = false;

  try {
    var called = 0;
    var iteratorWithReturn = {
      next: function () {
        return { done: !!called++ };
      },
      'return': function () {
        SAFE_CLOSING = true;
      }
    };
    iteratorWithReturn[ITERATOR$2] = function () {
      return this;
    };
  } catch (e) { /* empty */ }

  var checkCorrectnessOfIteration = function (exec, SKIP_CLOSING) {
    if (!SKIP_CLOSING && !SAFE_CLOSING) return false;
    var ITERATION_SUPPORT = false;
    try {
      var object = {};
      object[ITERATOR$2] = function () {
        return {
          next: function () {
            return { done: ITERATION_SUPPORT = true };
          }
        };
      };
      exec(object);
    } catch (e) { /* empty */ }
    return ITERATION_SUPPORT;
  };

  var SPECIES$3 = wellKnownSymbol('species');

  // `SpeciesConstructor` abstract operation
  // https://tc39.github.io/ecma262/#sec-speciesconstructor
  var speciesConstructor = function (O, defaultConstructor) {
    var C = anObject(O).constructor;
    var S;
    return C === undefined || (S = anObject(C)[SPECIES$3]) == undefined ? defaultConstructor : aFunction(S);
  };

  var document$2 = global$1.document;

  var html = document$2 && document$2.documentElement;

  var set$1 = global$1.setImmediate;
  var clear = global$1.clearImmediate;
  var process = global$1.process;
  var MessageChannel = global$1.MessageChannel;
  var Dispatch = global$1.Dispatch;
  var counter = 0;
  var queue = {};
  var ONREADYSTATECHANGE = 'onreadystatechange';
  var defer, channel, port;

  var run = function () {
    var id = +this;
    // eslint-disable-next-line no-prototype-builtins
    if (queue.hasOwnProperty(id)) {
      var fn = queue[id];
      delete queue[id];
      fn();
    }
  };

  var listener = function (event) {
    run.call(event.data);
  };

  // Node.js 0.9+ & IE10+ has setImmediate, otherwise:
  if (!set$1 || !clear) {
    set$1 = function setImmediate(fn) {
      var args = [];
      var i = 1;
      while (arguments.length > i) args.push(arguments[i++]);
      queue[++counter] = function () {
        // eslint-disable-next-line no-new-func
        (typeof fn == 'function' ? fn : Function(fn)).apply(undefined, args);
      };
      defer(counter);
      return counter;
    };
    clear = function clearImmediate(id) {
      delete queue[id];
    };
    // Node.js 0.8-
    if (classofRaw(process) == 'process') {
      defer = function (id) {
        process.nextTick(bindContext(run, id, 1));
      };
    // Sphere (JS game engine) Dispatch API
    } else if (Dispatch && Dispatch.now) {
      defer = function (id) {
        Dispatch.now(bindContext(run, id, 1));
      };
    // Browsers with MessageChannel, includes WebWorkers
    } else if (MessageChannel) {
      channel = new MessageChannel();
      port = channel.port2;
      channel.port1.onmessage = listener;
      defer = bindContext(port.postMessage, port, 1);
    // Browsers with postMessage, skip WebWorkers
    // IE8 has postMessage, but it's sync & typeof its postMessage is 'object'
    } else if (global$1.addEventListener && typeof postMessage == 'function' && !global$1.importScripts) {
      defer = function (id) {
        global$1.postMessage(id + '', '*');
      };
      global$1.addEventListener('message', listener, false);
    // IE8-
    } else if (ONREADYSTATECHANGE in documentCreateElement('script')) {
      defer = function (id) {
        html.appendChild(documentCreateElement('script'))[ONREADYSTATECHANGE] = function () {
          html.removeChild(this);
          run.call(id);
        };
      };
    // Rest old browsers
    } else {
      defer = function (id) {
        setTimeout(bindContext(run, id, 1), 0);
      };
    }
  }

  var task = {
    set: set$1,
    clear: clear
  };

  var navigator = global$1.navigator;

  var userAgent = navigator && navigator.userAgent || '';

  var getOwnPropertyDescriptor$1 = objectGetOwnPropertyDescriptor.f;

  var macrotask = task.set;

  var MutationObserver = global$1.MutationObserver || global$1.WebKitMutationObserver;
  var process$1 = global$1.process;
  var Promise$1 = global$1.Promise;
  var IS_NODE = classofRaw(process$1) == 'process';
  // Node.js 11 shows ExperimentalWarning on getting `queueMicrotask`
  var queueMicrotaskDescriptor = getOwnPropertyDescriptor$1(global$1, 'queueMicrotask');
  var queueMicrotask = queueMicrotaskDescriptor && queueMicrotaskDescriptor.value;

  var flush, head, last, notify, toggle, node, promise;

  // modern engines have queueMicrotask method
  if (!queueMicrotask) {
    flush = function () {
      var parent, fn;
      if (IS_NODE && (parent = process$1.domain)) parent.exit();
      while (head) {
        fn = head.fn;
        head = head.next;
        try {
          fn();
        } catch (e) {
          if (head) notify();
          else last = undefined;
          throw e;
        }
      } last = undefined;
      if (parent) parent.enter();
    };

    // Node.js
    if (IS_NODE) {
      notify = function () {
        process$1.nextTick(flush);
      };
    // browsers with MutationObserver, except iOS - https://github.com/zloirock/core-js/issues/339
    } else if (MutationObserver && !/(iPhone|iPod|iPad).*AppleWebKit/i.test(userAgent)) {
      toggle = true;
      node = document.createTextNode('');
      new MutationObserver(flush).observe(node, { characterData: true }); // eslint-disable-line no-new
      notify = function () {
        node.data = toggle = !toggle;
      };
    // environments with maybe non-completely correct, but existent Promise
    } else if (Promise$1 && Promise$1.resolve) {
      // Promise.resolve without an argument throws an error in LG WebOS 2
      promise = Promise$1.resolve(undefined);
      notify = function () {
        promise.then(flush);
      };
    // for other environments - macrotask based on:
    // - setImmediate
    // - MessageChannel
    // - window.postMessag
    // - onreadystatechange
    // - setTimeout
    } else {
      notify = function () {
        // strange IE + webpack dev server bug - use .call(global)
        macrotask.call(global$1, flush);
      };
    }
  }

  var microtask = queueMicrotask || function (fn) {
    var task = { fn: fn, next: undefined };
    if (last) last.next = task;
    if (!head) {
      head = task;
      notify();
    } last = task;
  };

  // 25.4.1.5 NewPromiseCapability(C)


  var PromiseCapability = function (C) {
    var resolve, reject;
    this.promise = new C(function ($$resolve, $$reject) {
      if (resolve !== undefined || reject !== undefined) throw TypeError('Bad Promise constructor');
      resolve = $$resolve;
      reject = $$reject;
    });
    this.resolve = aFunction(resolve);
    this.reject = aFunction(reject);
  };

  var f$5 = function (C) {
    return new PromiseCapability(C);
  };

  var newPromiseCapability = {
  	f: f$5
  };

  var promiseResolve = function (C, x) {
    anObject(C);
    if (isObject(x) && x.constructor === C) return x;
    var promiseCapability = newPromiseCapability.f(C);
    var resolve = promiseCapability.resolve;
    resolve(x);
    return promiseCapability.promise;
  };

  var hostReportErrors = function (a, b) {
    var console = global$1.console;
    if (console && console.error) {
      arguments.length === 1 ? console.error(a) : console.error(a, b);
    }
  };

  var perform = function (exec) {
    try {
      return { e: false, v: exec() };
    } catch (e) {
      return { e: true, v: e };
    }
  };

  var redefineAll = function (target, src, options) {
    for (var key in src) redefine(target, key, src[key], options);
    return target;
  };

  var defineProperty = objectDefineProperty.f;

  var TO_STRING_TAG$2 = wellKnownSymbol('toStringTag');

  var setToStringTag = function (it, TAG, STATIC) {
    if (it && !has(it = STATIC ? it : it.prototype, TO_STRING_TAG$2)) {
      defineProperty(it, TO_STRING_TAG$2, { configurable: true, value: TAG });
    }
  };

  var path = global$1;

  var aFunction$1 = function (variable) {
    return typeof variable == 'function' ? variable : undefined;
  };

  var getBuiltIn = function (namespace, method) {
    return arguments.length < 2 ? aFunction$1(path[namespace]) || aFunction$1(global$1[namespace])
      : path[namespace] && path[namespace][method] || global$1[namespace] && global$1[namespace][method];
  };

  var SPECIES$4 = wellKnownSymbol('species');

  var setSpecies = function (CONSTRUCTOR_NAME) {
    var C = getBuiltIn(CONSTRUCTOR_NAME);
    var defineProperty = objectDefineProperty.f;
    if (descriptors && C && !C[SPECIES$4]) defineProperty(C, SPECIES$4, {
      configurable: true,
      get: function () { return this; }
    });
  };

  var PROMISE = 'Promise';










  var task$1 = task.set;






  var SPECIES$5 = wellKnownSymbol('species');


  var getInternalState = internalState.get;
  var setInternalState = internalState.set;
  var getInternalPromiseState = internalState.getterFor(PROMISE);
  var PromiseConstructor = global$1[PROMISE];
  var TypeError$1 = global$1.TypeError;
  var document$3 = global$1.document;
  var process$2 = global$1.process;
  var $fetch = global$1.fetch;
  var versions = process$2 && process$2.versions;
  var v8 = versions && versions.v8 || '';
  var newPromiseCapability$1 = newPromiseCapability.f;
  var newGenericPromiseCapability = newPromiseCapability$1;
  var IS_NODE$1 = classofRaw(process$2) == 'process';
  var DISPATCH_EVENT = !!(document$3 && document$3.createEvent && global$1.dispatchEvent);
  var UNHANDLED_REJECTION = 'unhandledrejection';
  var REJECTION_HANDLED = 'rejectionhandled';
  var PENDING = 0;
  var FULFILLED = 1;
  var REJECTED = 2;
  var HANDLED = 1;
  var UNHANDLED = 2;
  var Internal, OwnPromiseCapability, PromiseWrapper;

  var FORCED$2 = isForced_1(PROMISE, function () {
    // correct subclassing with @@species support
    var promise = PromiseConstructor.resolve(1);
    var empty = function () { /* empty */ };
    var FakePromise = (promise.constructor = {})[SPECIES$5] = function (exec) {
      exec(empty, empty);
    };
    // unhandled rejections tracking support, NodeJS Promise without it fails @@species test
    return !((IS_NODE$1 || typeof PromiseRejectionEvent == 'function')
      && (!isPure || promise['finally'])
      && promise.then(empty) instanceof FakePromise
      // v8 6.6 (Node 10 and Chrome 66) have a bug with resolving custom thenables
      // https://bugs.chromium.org/p/chromium/issues/detail?id=830565
      // we can't detect it synchronously, so just check versions
      && v8.indexOf('6.6') !== 0
      && userAgent.indexOf('Chrome/66') === -1);
  });

  var INCORRECT_ITERATION = FORCED$2 || !checkCorrectnessOfIteration(function (iterable) {
    PromiseConstructor.all(iterable)['catch'](function () { /* empty */ });
  });

  // helpers
  var isThenable = function (it) {
    var then;
    return isObject(it) && typeof (then = it.then) == 'function' ? then : false;
  };

  var notify$1 = function (promise, state, isReject) {
    if (state.notified) return;
    state.notified = true;
    var chain = state.reactions;
    microtask(function () {
      var value = state.value;
      var ok = state.state == FULFILLED;
      var i = 0;
      var run = function (reaction) {
        var handler = ok ? reaction.ok : reaction.fail;
        var resolve = reaction.resolve;
        var reject = reaction.reject;
        var domain = reaction.domain;
        var result, then, exited;
        try {
          if (handler) {
            if (!ok) {
              if (state.rejection === UNHANDLED) onHandleUnhandled(promise, state);
              state.rejection = HANDLED;
            }
            if (handler === true) result = value;
            else {
              if (domain) domain.enter();
              result = handler(value); // may throw
              if (domain) {
                domain.exit();
                exited = true;
              }
            }
            if (result === reaction.promise) {
              reject(TypeError$1('Promise-chain cycle'));
            } else if (then = isThenable(result)) {
              then.call(result, resolve, reject);
            } else resolve(result);
          } else reject(value);
        } catch (e) {
          if (domain && !exited) domain.exit();
          reject(e);
        }
      };
      while (chain.length > i) run(chain[i++]); // variable length - can't use forEach
      state.reactions = [];
      state.notified = false;
      if (isReject && !state.rejection) onUnhandled(promise, state);
    });
  };

  var dispatchEvent = function (name, promise, reason) {
    var event, handler;
    if (DISPATCH_EVENT) {
      event = document$3.createEvent('Event');
      event.promise = promise;
      event.reason = reason;
      event.initEvent(name, false, true);
      global$1.dispatchEvent(event);
    } else event = { promise: promise, reason: reason };
    if (handler = global$1['on' + name]) handler(event);
    else if (name === UNHANDLED_REJECTION) hostReportErrors('Unhandled promise rejection', reason);
  };

  var onUnhandled = function (promise, state) {
    task$1.call(global$1, function () {
      var value = state.value;
      var IS_UNHANDLED = isUnhandled(state);
      var result;
      if (IS_UNHANDLED) {
        result = perform(function () {
          if (IS_NODE$1) {
            process$2.emit('unhandledRejection', value, promise);
          } else dispatchEvent(UNHANDLED_REJECTION, promise, value);
        });
        // Browsers should not trigger `rejectionHandled` event if it was handled here, NodeJS - should
        state.rejection = IS_NODE$1 || isUnhandled(state) ? UNHANDLED : HANDLED;
      }
      if (IS_UNHANDLED && result.e) throw result.v;
    });
  };

  var isUnhandled = function (state) {
    return state.rejection !== HANDLED && !state.parent;
  };

  var onHandleUnhandled = function (promise, state) {
    task$1.call(global$1, function () {
      if (IS_NODE$1) {
        process$2.emit('rejectionHandled', promise);
      } else dispatchEvent(REJECTION_HANDLED, promise, state.value);
    });
  };

  var bind = function (fn, promise, state, unwrap) {
    return function (value) {
      fn(promise, state, value, unwrap);
    };
  };

  var internalReject = function (promise, state, value, unwrap) {
    if (state.done) return;
    state.done = true;
    if (unwrap) state = unwrap;
    state.value = value;
    state.state = REJECTED;
    notify$1(promise, state, true);
  };

  var internalResolve = function (promise, state, value, unwrap) {
    if (state.done) return;
    state.done = true;
    if (unwrap) state = unwrap;
    try {
      if (promise === value) throw TypeError$1("Promise can't be resolved itself");
      var then = isThenable(value);
      if (then) {
        microtask(function () {
          var wrapper = { done: false };
          try {
            then.call(value,
              bind(internalResolve, promise, wrapper, state),
              bind(internalReject, promise, wrapper, state)
            );
          } catch (e) {
            internalReject(promise, wrapper, e, state);
          }
        });
      } else {
        state.value = value;
        state.state = FULFILLED;
        notify$1(promise, state, false);
      }
    } catch (e) {
      internalReject(promise, { done: false }, e, state);
    }
  };

  // constructor polyfill
  if (FORCED$2) {
    // 25.4.3.1 Promise(executor)
    PromiseConstructor = function Promise(executor) {
      anInstance(this, PromiseConstructor, PROMISE);
      aFunction(executor);
      Internal.call(this);
      var state = getInternalState(this);
      try {
        executor(bind(internalResolve, this, state), bind(internalReject, this, state));
      } catch (err) {
        internalReject(this, state, err);
      }
    };
    // eslint-disable-next-line no-unused-vars
    Internal = function Promise(executor) {
      setInternalState(this, {
        type: PROMISE,
        done: false,
        notified: false,
        parent: false,
        reactions: [],
        rejection: false,
        state: PENDING,
        value: undefined
      });
    };
    Internal.prototype = redefineAll(PromiseConstructor.prototype, {
      // `Promise.prototype.then` method
      // https://tc39.github.io/ecma262/#sec-promise.prototype.then
      then: function then(onFulfilled, onRejected) {
        var state = getInternalPromiseState(this);
        var reaction = newPromiseCapability$1(speciesConstructor(this, PromiseConstructor));
        reaction.ok = typeof onFulfilled == 'function' ? onFulfilled : true;
        reaction.fail = typeof onRejected == 'function' && onRejected;
        reaction.domain = IS_NODE$1 ? process$2.domain : undefined;
        state.parent = true;
        state.reactions.push(reaction);
        if (state.state != PENDING) notify$1(this, state, false);
        return reaction.promise;
      },
      // `Promise.prototype.catch` method
      // https://tc39.github.io/ecma262/#sec-promise.prototype.catch
      'catch': function (onRejected) {
        return this.then(undefined, onRejected);
      }
    });
    OwnPromiseCapability = function () {
      var promise = new Internal();
      var state = getInternalState(promise);
      this.promise = promise;
      this.resolve = bind(internalResolve, promise, state);
      this.reject = bind(internalReject, promise, state);
    };
    newPromiseCapability.f = newPromiseCapability$1 = function (C) {
      return C === PromiseConstructor || C === PromiseWrapper
        ? new OwnPromiseCapability(C)
        : newGenericPromiseCapability(C);
    };

    // wrap fetch result
    if (typeof $fetch == 'function') _export({ global: true, enumerable: true, forced: true }, {
      // eslint-disable-next-line no-unused-vars
      fetch: function fetch(input) {
        return promiseResolve(PromiseConstructor, $fetch.apply(global$1, arguments));
      }
    });
  }

  _export({ global: true, wrap: true, forced: FORCED$2 }, { Promise: PromiseConstructor });

  setToStringTag(PromiseConstructor, PROMISE, false, true);
  setSpecies(PROMISE);

  PromiseWrapper = path[PROMISE];

  // statics
  _export({ target: PROMISE, stat: true, forced: FORCED$2 }, {
    // `Promise.reject` method
    // https://tc39.github.io/ecma262/#sec-promise.reject
    reject: function reject(r) {
      var capability = newPromiseCapability$1(this);
      capability.reject.call(undefined, r);
      return capability.promise;
    }
  });

  _export({ target: PROMISE, stat: true, forced: FORCED$2 }, {
    // `Promise.resolve` method
    // https://tc39.github.io/ecma262/#sec-promise.resolve
    resolve: function resolve(x) {
      return promiseResolve(this, x);
    }
  });

  _export({ target: PROMISE, stat: true, forced: INCORRECT_ITERATION }, {
    // `Promise.all` method
    // https://tc39.github.io/ecma262/#sec-promise.all
    all: function all(iterable) {
      var C = this;
      var capability = newPromiseCapability$1(C);
      var resolve = capability.resolve;
      var reject = capability.reject;
      var result = perform(function () {
        var values = [];
        var counter = 0;
        var remaining = 1;
        iterate(iterable, function (promise) {
          var index = counter++;
          var alreadyCalled = false;
          values.push(undefined);
          remaining++;
          C.resolve(promise).then(function (value) {
            if (alreadyCalled) return;
            alreadyCalled = true;
            values[index] = value;
            --remaining || resolve(values);
          }, reject);
        });
        --remaining || resolve(values);
      });
      if (result.e) reject(result.v);
      return capability.promise;
    },
    // `Promise.race` method
    // https://tc39.github.io/ecma262/#sec-promise.race
    race: function race(iterable) {
      var C = this;
      var capability = newPromiseCapability$1(C);
      var reject = capability.reject;
      var result = perform(function () {
        iterate(iterable, function (promise) {
          C.resolve(promise).then(capability.resolve, reject);
        });
      });
      if (result.e) reject(result.v);
      return capability.promise;
    }
  });

  // `RegExp.prototype.flags` getter implementation
  // https://tc39.github.io/ecma262/#sec-get-regexp.prototype.flags
  var regexpFlags = function () {
    var that = anObject(this);
    var result = '';
    if (that.global) result += 'g';
    if (that.ignoreCase) result += 'i';
    if (that.multiline) result += 'm';
    if (that.unicode) result += 'u';
    if (that.sticky) result += 'y';
    return result;
  };

  var nativeExec = RegExp.prototype.exec;
  // This always refers to the native implementation, because the
  // String#replace polyfill uses ./fix-regexp-well-known-symbol-logic.js,
  // which loads this file before patching the method.
  var nativeReplace = String.prototype.replace;

  var patchedExec = nativeExec;

  var UPDATES_LAST_INDEX_WRONG = (function () {
    var re1 = /a/;
    var re2 = /b*/g;
    nativeExec.call(re1, 'a');
    nativeExec.call(re2, 'a');
    return re1.lastIndex !== 0 || re2.lastIndex !== 0;
  })();

  // nonparticipating capturing group, copied from es5-shim's String#split patch.
  var NPCG_INCLUDED = /()??/.exec('')[1] !== undefined;

  var PATCH = UPDATES_LAST_INDEX_WRONG || NPCG_INCLUDED;

  if (PATCH) {
    patchedExec = function exec(str) {
      var re = this;
      var lastIndex, reCopy, match, i;

      if (NPCG_INCLUDED) {
        reCopy = new RegExp('^' + re.source + '$(?!\\s)', regexpFlags.call(re));
      }
      if (UPDATES_LAST_INDEX_WRONG) lastIndex = re.lastIndex;

      match = nativeExec.call(re, str);

      if (UPDATES_LAST_INDEX_WRONG && match) {
        re.lastIndex = re.global ? match.index + match[0].length : lastIndex;
      }
      if (NPCG_INCLUDED && match && match.length > 1) {
        // Fix browsers whose `exec` methods don't consistently return `undefined`
        // for NPCG, like IE8. NOTE: This doesn' work for /(.?)?/
        nativeReplace.call(match[0], reCopy, function () {
          for (i = 1; i < arguments.length - 2; i++) {
            if (arguments[i] === undefined) match[i] = undefined;
          }
        });
      }

      return match;
    };
  }

  var regexpExec = patchedExec;

  _export({ target: 'RegExp', proto: true, forced: /./.exec !== regexpExec }, {
    exec: regexpExec
  });

  var TO_STRING$1 = 'toString';
  var nativeToString = /./[TO_STRING$1];

  var NOT_GENERIC = fails(function () { return nativeToString.call({ source: 'a', flags: 'b' }) != '/a/b'; });
  // FF44- RegExp#toString has a wrong name
  var INCORRECT_NAME = nativeToString.name != TO_STRING$1;

  // `RegExp.prototype.toString` method
  // https://tc39.github.io/ecma262/#sec-regexp.prototype.tostring
  if (NOT_GENERIC || INCORRECT_NAME) {
    redefine(RegExp.prototype, TO_STRING$1, function toString() {
      var R = anObject(this);
      return '/'.concat(R.source, '/',
        'flags' in R ? R.flags : !descriptors && R instanceof RegExp ? regexpFlags.call(R) : undefined);
    }, { unsafe: true });
  }

  var MATCH = wellKnownSymbol('match');

  // `IsRegExp` abstract operation
  // https://tc39.github.io/ecma262/#sec-isregexp
  var isRegexp = function (it) {
    var isRegExp;
    return isObject(it) && ((isRegExp = it[MATCH]) !== undefined ? !!isRegExp : classofRaw(it) == 'RegExp');
  };

  // CONVERT_TO_STRING: true  -> String#at
  // CONVERT_TO_STRING: false -> String#codePointAt
  var stringAt = function (that, pos, CONVERT_TO_STRING) {
    var S = String(requireObjectCoercible(that));
    var position = toInteger(pos);
    var size = S.length;
    var first, second;
    if (position < 0 || position >= size) return CONVERT_TO_STRING ? '' : undefined;
    first = S.charCodeAt(position);
    return first < 0xd800 || first > 0xdbff || position + 1 === size
      || (second = S.charCodeAt(position + 1)) < 0xdc00 || second > 0xdfff
        ? CONVERT_TO_STRING ? S.charAt(position) : first
        : CONVERT_TO_STRING ? S.slice(position, position + 2) : (first - 0xd800 << 10) + (second - 0xdc00) + 0x10000;
  };

  // `AdvanceStringIndex` abstract operation
  // https://tc39.github.io/ecma262/#sec-advancestringindex
  var advanceStringIndex = function (S, index, unicode) {
    return index + (unicode ? stringAt(S, index, true).length : 1);
  };

  // `RegExpExec` abstract operation
  // https://tc39.github.io/ecma262/#sec-regexpexec
  var regexpExecAbstract = function (R, S) {
    var exec = R.exec;
    if (typeof exec === 'function') {
      var result = exec.call(R, S);
      if (typeof result !== 'object') {
        throw TypeError('RegExp exec method returned something other than an Object or null');
      }
      return result;
    }

    if (classofRaw(R) !== 'RegExp') {
      throw TypeError('RegExp#exec called on incompatible receiver');
    }

    return regexpExec.call(R, S);
  };

  var SPECIES$6 = wellKnownSymbol('species');

  var REPLACE_SUPPORTS_NAMED_GROUPS = !fails(function () {
    // #replace needs built-in support for named groups.
    // #match works fine because it just return the exec results, even if it has
    // a "grops" property.
    var re = /./;
    re.exec = function () {
      var result = [];
      result.groups = { a: '7' };
      return result;
    };
    return ''.replace(re, '$<a>') !== '7';
  });

  // Chrome 51 has a buggy "split" implementation when RegExp#exec !== nativeExec
  // Weex JS has frozen built-in prototypes, so use try / catch wrapper
  var SPLIT_WORKS_WITH_OVERWRITTEN_EXEC = !fails(function () {
    var re = /(?:)/;
    var originalExec = re.exec;
    re.exec = function () { return originalExec.apply(this, arguments); };
    var result = 'ab'.split(re);
    return result.length !== 2 || result[0] !== 'a' || result[1] !== 'b';
  });

  var fixRegexpWellKnownSymbolLogic = function (KEY, length, exec, sham) {
    var SYMBOL = wellKnownSymbol(KEY);

    var DELEGATES_TO_SYMBOL = !fails(function () {
      // String methods call symbol-named RegEp methods
      var O = {};
      O[SYMBOL] = function () { return 7; };
      return ''[KEY](O) != 7;
    });

    var DELEGATES_TO_EXEC = DELEGATES_TO_SYMBOL && !fails(function () {
      // Symbol-named RegExp methods call .exec
      var execCalled = false;
      var re = /a/;
      re.exec = function () { execCalled = true; return null; };

      if (KEY === 'split') {
        // RegExp[@@split] doesn't call the regex's exec method, but first creates
        // a new one. We need to return the patched regex when creating the new one.
        re.constructor = {};
        re.constructor[SPECIES$6] = function () { return re; };
      }

      re[SYMBOL]('');
      return !execCalled;
    });

    if (
      !DELEGATES_TO_SYMBOL ||
      !DELEGATES_TO_EXEC ||
      (KEY === 'replace' && !REPLACE_SUPPORTS_NAMED_GROUPS) ||
      (KEY === 'split' && !SPLIT_WORKS_WITH_OVERWRITTEN_EXEC)
    ) {
      var nativeRegExpMethod = /./[SYMBOL];
      var methods = exec(SYMBOL, ''[KEY], function (nativeMethod, regexp, str, arg2, forceStringMethod) {
        if (regexp.exec === regexpExec) {
          if (DELEGATES_TO_SYMBOL && !forceStringMethod) {
            // The native String method already delegates to @@method (this
            // polyfilled function), leasing to infinite recursion.
            // We avoid it by directly calling the native @@method method.
            return { done: true, value: nativeRegExpMethod.call(regexp, str, arg2) };
          }
          return { done: true, value: nativeMethod.call(str, regexp, arg2) };
        }
        return { done: false };
      });
      var stringMethod = methods[0];
      var regexMethod = methods[1];

      redefine(String.prototype, KEY, stringMethod);
      redefine(RegExp.prototype, SYMBOL, length == 2
        // 21.2.5.8 RegExp.prototype[@@replace](string, replaceValue)
        // 21.2.5.11 RegExp.prototype[@@split](string, limit)
        ? function (string, arg) { return regexMethod.call(string, this, arg); }
        // 21.2.5.6 RegExp.prototype[@@match](string)
        // 21.2.5.9 RegExp.prototype[@@search](string)
        : function (string) { return regexMethod.call(string, this); }
      );
      if (sham) hide(RegExp.prototype[SYMBOL], 'sham', true);
    }
  };

  var arrayPush = [].push;
  var min$2 = Math.min;
  var MAX_UINT32 = 0xffffffff;

  // babel-minify transpiles RegExp('x', 'y') -> /x/y and it causes SyntaxError
  var SUPPORTS_Y = !fails(function () { return !RegExp(MAX_UINT32, 'y'); });

  // @@split logic
  fixRegexpWellKnownSymbolLogic(
    'split',
    2,
    function (SPLIT, nativeSplit, maybeCallNative) {
      var internalSplit;
      if (
        'abbc'.split(/(b)*/)[1] == 'c' ||
        'test'.split(/(?:)/, -1).length != 4 ||
        'ab'.split(/(?:ab)*/).length != 2 ||
        '.'.split(/(.?)(.?)/).length != 4 ||
        '.'.split(/()()/).length > 1 ||
        ''.split(/.?/).length
      ) {
        // based on es5-shim implementation, need to rework it
        internalSplit = function (separator, limit) {
          var string = String(requireObjectCoercible(this));
          var lim = limit === undefined ? MAX_UINT32 : limit >>> 0;
          if (lim === 0) return [];
          if (separator === undefined) return [string];
          // If `separator` is not a regex, use native split
          if (!isRegexp(separator)) {
            return nativeSplit.call(string, separator, lim);
          }
          var output = [];
          var flags = (separator.ignoreCase ? 'i' : '') +
                      (separator.multiline ? 'm' : '') +
                      (separator.unicode ? 'u' : '') +
                      (separator.sticky ? 'y' : '');
          var lastLastIndex = 0;
          // Make `global` and avoid `lastIndex` issues by working with a copy
          var separatorCopy = new RegExp(separator.source, flags + 'g');
          var match, lastIndex, lastLength;
          while (match = regexpExec.call(separatorCopy, string)) {
            lastIndex = separatorCopy.lastIndex;
            if (lastIndex > lastLastIndex) {
              output.push(string.slice(lastLastIndex, match.index));
              if (match.length > 1 && match.index < string.length) arrayPush.apply(output, match.slice(1));
              lastLength = match[0].length;
              lastLastIndex = lastIndex;
              if (output.length >= lim) break;
            }
            if (separatorCopy.lastIndex === match.index) separatorCopy.lastIndex++; // Avoid an infinite loop
          }
          if (lastLastIndex === string.length) {
            if (lastLength || !separatorCopy.test('')) output.push('');
          } else output.push(string.slice(lastLastIndex));
          return output.length > lim ? output.slice(0, lim) : output;
        };
      // Chakra, V8
      } else if ('0'.split(undefined, 0).length) {
        internalSplit = function (separator, limit) {
          return separator === undefined && limit === 0 ? [] : nativeSplit.call(this, separator, limit);
        };
      } else internalSplit = nativeSplit;

      return [
        // `String.prototype.split` method
        // https://tc39.github.io/ecma262/#sec-string.prototype.split
        function split(separator, limit) {
          var O = requireObjectCoercible(this);
          var splitter = separator == undefined ? undefined : separator[SPLIT];
          return splitter !== undefined
            ? splitter.call(separator, O, limit)
            : internalSplit.call(String(O), separator, limit);
        },
        // `RegExp.prototype[@@split]` method
        // https://tc39.github.io/ecma262/#sec-regexp.prototype-@@split
        //
        // NOTE: This cannot be properly polyfilled in engines that don't support
        // the 'y' flag.
        function (regexp, limit) {
          var res = maybeCallNative(internalSplit, regexp, this, limit, internalSplit !== nativeSplit);
          if (res.done) return res.value;

          var rx = anObject(regexp);
          var S = String(this);
          var C = speciesConstructor(rx, RegExp);

          var unicodeMatching = rx.unicode;
          var flags = (rx.ignoreCase ? 'i' : '') +
                      (rx.multiline ? 'm' : '') +
                      (rx.unicode ? 'u' : '') +
                      (SUPPORTS_Y ? 'y' : 'g');

          // ^(? + rx + ) is needed, in combination with some S slicing, to
          // simulate the 'y' flag.
          var splitter = new C(SUPPORTS_Y ? rx : '^(?:' + rx.source + ')', flags);
          var lim = limit === undefined ? MAX_UINT32 : limit >>> 0;
          if (lim === 0) return [];
          if (S.length === 0) return regexpExecAbstract(splitter, S) === null ? [S] : [];
          var p = 0;
          var q = 0;
          var A = [];
          while (q < S.length) {
            splitter.lastIndex = SUPPORTS_Y ? q : 0;
            var z = regexpExecAbstract(splitter, SUPPORTS_Y ? S : S.slice(q));
            var e;
            if (
              z === null ||
              (e = min$2(toLength(splitter.lastIndex + (SUPPORTS_Y ? 0 : q)), S.length)) === p
            ) {
              q = advanceStringIndex(S, q, unicodeMatching);
            } else {
              A.push(S.slice(p, q));
              if (A.length === lim) return A;
              for (var i = 1; i <= z.length - 1; i++) {
                A.push(z[i]);
                if (A.length === lim) return A;
              }
              q = p = e;
            }
          }
          A.push(S.slice(p));
          return A;
        }
      ];
    },
    !SUPPORTS_Y
  );

  function _typeof(obj) {
    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _taggedTemplateLiteral(strings, raw) {
    if (!raw) {
      raw = strings.slice(0);
    }

    return Object.freeze(Object.defineProperties(strings, {
      raw: {
        value: Object.freeze(raw)
      }
    }));
  }

  function _slicedToArray(arr, i) {
    return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest();
  }

  function _arrayWithHoles(arr) {
    if (Array.isArray(arr)) return arr;
  }

  function _iterableToArrayLimit(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"] != null) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance");
  }

  function _cloneRegExp(pattern) {
                                    return new RegExp(pattern.source, (pattern.global ? 'g' : '') + (pattern.ignoreCase ? 'i' : '') + (pattern.multiline ? 'm' : '') + (pattern.sticky ? 'y' : '') + (pattern.unicode ? 'u' : ''));
  }
  var _cloneRegExp_1 = _cloneRegExp;

  function _isPlaceholder(a) {
         return a != null && typeof a === 'object' && a['@@functional/placeholder'] === true;
  }
  var _isPlaceholder_1 = _isPlaceholder;

  /**
   * Optimized internal one-arity curry function.
   *
   * @private
   * @category Function
   * @param {Function} fn The function to curry.
   * @return {Function} The curried function.
   */


  function _curry1(fn) {
    return function f1(a) {
      if (arguments.length === 0 || _isPlaceholder_1(a)) {
        return f1;
      } else {
        return fn.apply(this, arguments);
      }
    };
  }
  var _curry1_1 = _curry1;

  /**
   * Gives a single-word string description of the (native) type of a value,
   * returning such answers as 'Object', 'Number', 'Array', or 'Null'. Does not
   * attempt to distinguish user Object types any further, reporting them all as
   * 'Object'.
   *
   * @func
   * @memberOf R
   * @since v0.8.0
   * @category Type
   * @sig (* -> {*}) -> String
   * @param {*} val The value to test
   * @return {String}
   * @example
   *
   *      R.type({}); //=> "Object"
   *      R.type(1); //=> "Number"
   *      R.type(false); //=> "Boolean"
   *      R.type('s'); //=> "String"
   *      R.type(null); //=> "Null"
   *      R.type([]); //=> "Array"
   *      R.type(/[A-z]/); //=> "RegExp"
   *      R.type(() => {}); //=> "Function"
   *      R.type(undefined); //=> "Undefined"
   */


  var type$1 = /*#__PURE__*/_curry1_1(function type(val) {
    return val === null ? 'Null' : val === undefined ? 'Undefined' : Object.prototype.toString.call(val).slice(8, -1);
  });
  var type_1 = type$1;

  /**
   * Copies an object.
   *
   * @private
   * @param {*} value The value to be copied
   * @param {Array} refFrom Array containing the source references
   * @param {Array} refTo Array containing the copied source references
   * @param {Boolean} deep Whether or not to perform deep cloning.
   * @return {*} The copied value.
   */


  function _clone(value, refFrom, refTo, deep) {
    var copy = function copy(copiedValue) {
      var len = refFrom.length;
      var idx = 0;
      while (idx < len) {
        if (value === refFrom[idx]) {
          return refTo[idx];
        }
        idx += 1;
      }
      refFrom[idx + 1] = value;
      refTo[idx + 1] = copiedValue;
      for (var key in value) {
        copiedValue[key] = deep ? _clone(value[key], refFrom, refTo, true) : value[key];
      }
      return copiedValue;
    };
    switch (type_1(value)) {
      case 'Object':
        return copy({});
      case 'Array':
        return copy([]);
      case 'Date':
        return new Date(value.valueOf());
      case 'RegExp':
        return _cloneRegExp_1(value);
      default:
        return value;
    }
  }
  var _clone_1 = _clone;

  /**
   * Creates a deep copy of the value which may contain (nested) `Array`s and
   * `Object`s, `Number`s, `String`s, `Boolean`s and `Date`s. `Function`s are
   * assigned by reference rather than copied
   *
   * Dispatches to a `clone` method if present.
   *
   * @func
   * @memberOf R
   * @since v0.1.0
   * @category Object
   * @sig {*} -> {*}
   * @param {*} value The object or array to clone
   * @return {*} A deeply cloned copy of `val`
   * @example
   *
   *      const objects = [{}, {}, {}];
   *      const objectsClone = R.clone(objects);
   *      objects === objectsClone; //=> false
   *      objects[0] === objectsClone[0]; //=> false
   */


  var clone = /*#__PURE__*/_curry1_1(function clone(value) {
    return value != null && typeof value.clone === 'function' ? value.clone() : _clone_1(value, [], [], true);
  });
  var clone_1 = clone;

  function _arity(n, fn) {
    /* eslint-disable no-unused-vars */
    switch (n) {
      case 0:
        return function () {
          return fn.apply(this, arguments);
        };
      case 1:
        return function (a0) {
          return fn.apply(this, arguments);
        };
      case 2:
        return function (a0, a1) {
          return fn.apply(this, arguments);
        };
      case 3:
        return function (a0, a1, a2) {
          return fn.apply(this, arguments);
        };
      case 4:
        return function (a0, a1, a2, a3) {
          return fn.apply(this, arguments);
        };
      case 5:
        return function (a0, a1, a2, a3, a4) {
          return fn.apply(this, arguments);
        };
      case 6:
        return function (a0, a1, a2, a3, a4, a5) {
          return fn.apply(this, arguments);
        };
      case 7:
        return function (a0, a1, a2, a3, a4, a5, a6) {
          return fn.apply(this, arguments);
        };
      case 8:
        return function (a0, a1, a2, a3, a4, a5, a6, a7) {
          return fn.apply(this, arguments);
        };
      case 9:
        return function (a0, a1, a2, a3, a4, a5, a6, a7, a8) {
          return fn.apply(this, arguments);
        };
      case 10:
        return function (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
          return fn.apply(this, arguments);
        };
      default:
        throw new Error('First argument to _arity must be a non-negative integer no greater than ten');
    }
  }
  var _arity_1 = _arity;

  /**
   * Optimized internal two-arity curry function.
   *
   * @private
   * @category Function
   * @param {Function} fn The function to curry.
   * @return {Function} The curried function.
   */


  function _curry2(fn) {
    return function f2(a, b) {
      switch (arguments.length) {
        case 0:
          return f2;
        case 1:
          return _isPlaceholder_1(a) ? f2 : _curry1_1(function (_b) {
            return fn(a, _b);
          });
        default:
          return _isPlaceholder_1(a) && _isPlaceholder_1(b) ? f2 : _isPlaceholder_1(a) ? _curry1_1(function (_a) {
            return fn(_a, b);
          }) : _isPlaceholder_1(b) ? _curry1_1(function (_b) {
            return fn(a, _b);
          }) : fn(a, b);
      }
    };
  }
  var _curry2_1 = _curry2;

  /**
   * Internal curryN function.
   *
   * @private
   * @category Function
   * @param {Number} length The arity of the curried function.
   * @param {Array} received An array of arguments received thus far.
   * @param {Function} fn The function to curry.
   * @return {Function} The curried function.
   */


  function _curryN(length, received, fn) {
    return function () {
      var combined = [];
      var argsIdx = 0;
      var left = length;
      var combinedIdx = 0;
      while (combinedIdx < received.length || argsIdx < arguments.length) {
        var result;
        if (combinedIdx < received.length && (!_isPlaceholder_1(received[combinedIdx]) || argsIdx >= arguments.length)) {
          result = received[combinedIdx];
        } else {
          result = arguments[argsIdx];
          argsIdx += 1;
        }
        combined[combinedIdx] = result;
        if (!_isPlaceholder_1(result)) {
          left -= 1;
        }
        combinedIdx += 1;
      }
      return left <= 0 ? fn.apply(this, combined) : _arity_1(left, _curryN(length, combined, fn));
    };
  }
  var _curryN_1 = _curryN;

  /**
   * Returns a curried equivalent of the provided function, with the specified
   * arity. The curried function has two unusual capabilities. First, its
   * arguments needn't be provided one at a time. If `g` is `R.curryN(3, f)`, the
   * following are equivalent:
   *
   *   - `g(1)(2)(3)`
   *   - `g(1)(2, 3)`
   *   - `g(1, 2)(3)`
   *   - `g(1, 2, 3)`
   *
   * Secondly, the special placeholder value [`R.__`](#__) may be used to specify
   * "gaps", allowing partial application of any combination of arguments,
   * regardless of their positions. If `g` is as above and `_` is [`R.__`](#__),
   * the following are equivalent:
   *
   *   - `g(1, 2, 3)`
   *   - `g(_, 2, 3)(1)`
   *   - `g(_, _, 3)(1)(2)`
   *   - `g(_, _, 3)(1, 2)`
   *   - `g(_, 2)(1)(3)`
   *   - `g(_, 2)(1, 3)`
   *   - `g(_, 2)(_, 3)(1)`
   *
   * @func
   * @memberOf R
   * @since v0.5.0
   * @category Function
   * @sig Number -> (* -> a) -> (* -> a)
   * @param {Number} length The arity for the returned function.
   * @param {Function} fn The function to curry.
   * @return {Function} A new, curried function.
   * @see R.curry
   * @example
   *
   *      const sumArgs = (...args) => R.sum(args);
   *
   *      const curriedAddFourNumbers = R.curryN(4, sumArgs);
   *      const f = curriedAddFourNumbers(1, 2);
   *      const g = f(3);
   *      g(4); //=> 10
   */


  var curryN = /*#__PURE__*/_curry2_1(function curryN(length, fn) {
    if (length === 1) {
      return _curry1_1(fn);
    }
    return _arity_1(length, _curryN_1(length, [], fn));
  });
  var curryN_1 = curryN;

  /**
   * Returns a curried equivalent of the provided function. The curried function
   * has two unusual capabilities. First, its arguments needn't be provided one
   * at a time. If `f` is a ternary function and `g` is `R.curry(f)`, the
   * following are equivalent:
   *
   *   - `g(1)(2)(3)`
   *   - `g(1)(2, 3)`
   *   - `g(1, 2)(3)`
   *   - `g(1, 2, 3)`
   *
   * Secondly, the special placeholder value [`R.__`](#__) may be used to specify
   * "gaps", allowing partial application of any combination of arguments,
   * regardless of their positions. If `g` is as above and `_` is [`R.__`](#__),
   * the following are equivalent:
   *
   *   - `g(1, 2, 3)`
   *   - `g(_, 2, 3)(1)`
   *   - `g(_, _, 3)(1)(2)`
   *   - `g(_, _, 3)(1, 2)`
   *   - `g(_, 2)(1)(3)`
   *   - `g(_, 2)(1, 3)`
   *   - `g(_, 2)(_, 3)(1)`
   *
   * @func
   * @memberOf R
   * @since v0.1.0
   * @category Function
   * @sig (* -> a) -> (* -> a)
   * @param {Function} fn The function to curry.
   * @return {Function} A new, curried function.
   * @see R.curryN, R.partial
   * @example
   *
   *      const addFourNumbers = (a, b, c, d) => a + b + c + d;
   *
   *      const curriedAddFourNumbers = R.curry(addFourNumbers);
   *      const f = curriedAddFourNumbers(1, 2);
   *      const g = f(3);
   *      g(4); //=> 10
   */


  var curry = /*#__PURE__*/_curry1_1(function curry(fn) {
    return curryN_1(fn.length, fn);
  });
  var curry_1 = curry;

  var $ = document.querySelector;
  var $$ = document.querySelectorAll;
  var noop = function noop() {};
  var id$1 = function id(x) {
    return x;
  };
  var head$1 = function head(list) {
    return list && list[0] || [];
  };
  var tail = function tail(list) {
    return list && list.slice && list.slice(1) || [];
  }; // export const _curryN = (len, fn) => (...args) => {
  //   if (args.length >= len) return fn(...args);
  //   if (!args.length) return fn;
  //   return _curryN(len, fn).bind(null, ...args);
  // };
  // export const curry = fn => (...args) => {
  //   return args.length === fn.length
  //     ? fn(...args)
  //     : _curryN(fn.length, fn)(...args);
  // };
  // export const curryN = curry(_curryN);

  var lens = curry_1(function (path, obj) {
    path = type$2.isString(path) ? path.split(".") : path;
    if (!obj || !type$2.isObject(obj)) return obj;
    if (path === []) return obj;
    var key = head$1(path);
    if (key === "") key = "attributes";
    if (!(key in obj)) return null;
    return lens(tail(path), obj[head$1(path)]);
  });
  var mixin = function mixin(proto) {
    for (var _len = arguments.length, sources = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      sources[_key - 1] = arguments[_key];
    }

    return Object.assign.apply(Object, [Object.create(proto)].concat(sources));
  };
  var type$2 = ["Object", "Null", "Undefined", "Array", "Number", "String", "Function", "Boolean"].reduce(function (a, t) {
    a["is".concat(t)] = function (v) {
      return a(v) === t;
    };

    return a;
  }, function (val) {
    return val === null ? "Null" : val === undefined ? "Undefined" : Object.prototype.toString.call(val).slice(8, -1);
  });

  function hashCode(str) {
    var hash = 0;

    var type = _typeof(str);

    if (str === null) return str;
    if ("number" === type) str = parseFloat(str);

    if ("object" === type) {
      try {
        str = JSON.stringify(str);
      } catch (e) {
        console.error("hash code", e);
        str = null;
      }
    }

    if ("string" !== typeof str) return false;
    if (str.length === 0) return hash;

    for (var i = str.length - 1; i >= 0; i--) {
      var char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return hash;
  } //hashing is not slow but this is really only useful
  //for async requests or function that require heavy computation


  function memoize(fn, timeout, context) {
    var store = {};
    return function () {
      var key = hashCode(arguments);
      if (key && store[key]) return store[key];

      if (!isNaN(timeout) && timeout !== null) {
        setTimeout(function () {
          delete store[key];
        }, timeout);
      }

      return store[key] = fn.apply(context || this, Array.prototype.slice.call(arguments));
    };
  }

  var storage = function storage(source, context) {
    var store = {
      set: function set(key, val, expires) {
        try {
          //expires should be a bool. when true expire at midnight of the day it was set
          var date;

          if (expires) {
            date = new Date();
            date.setDate(date.getDate() + 1); //data loads happen aroun 2-4am every day

            date.setHours(4, 0, 0, 0);
          } //at the risk of losing data dont cache apiobjects


          var ctx = dive("api.context", val);

          if (val.data && val.type
          /*ctx instanceof api.context.constructor*/
          ) {
              val = {
                data: val.data,
                type: val.type
              };
            }

          source.setItem(key, JSON.stringify({
            accountId: lens("user.accountId", context) || undefined,
            value: "object" === _typeof(val) ? JSON.stringify(val) : val,
            expirationDate: date ? date.getTime() : null
          }));
        } catch (e) {
          clearCache(9000);
          console.error(e);
        }
      },
      get: function get(key, overrideAccountIdCheck) {
        var item = source.getItem(key);
        if (!item) return item;
        var accountId = lens("user.accountId", context);
        item = JSON.parse(item);

        if (item.expirationDate && new Date() > new Date(item.expirationDate)) {
          source.removeItem(key);
          return null;
        }

        if (item.accountId !== accountId && !overrideAccountIdCheck) return null;
        return typeof item.value === "string" && (item.value[0] === "[" || item.value[0] === "{") ? JSON.parse(item.value) : item.value;
      },
      remove: source.removeItem.bind(source),
      removeItem: source.removeItem.bind(source),
      clear: source.clear.bind(source)
    };
    store.getItem = store.get;
    store.setItem = store.set;
    return store;
  };

  var sessionStorage = storage(window.sessionStorage);
  var localStorage = storage(window.localStorage);

  function promiseProp(value, promise) {
    if (!value && promise && promise.then) {
      promise.then(function (res) {
        value = clone_1(res);
        return res;
      });
    }

    return function () {
      if (value) return Promise.resolve(value);else {
        if (!promise) return Promise.reject(null);
        if (promise.then) return promise;
        promise = promise().then(function (res) {
          value = clone_1(res);
          return res;
        });
        return promise;
      }
    };
  } //clear local storage items that do not have the same cache version


  function clearCache(version) {
    var localStorage = window.localStorage;
    var sessionStorage = window.sessionStorage;

    for (var x = localStorage.length - 1; x >= 0; x--) {
      var key = localStorage.key(x);
      var split = key.split("-");

      if (split[0] === "cache" && split[1] !== version) {
        localStorage.removeItem(key);
      }
    }
  }

  var limitLogExposure = function limitLogExposure(context) {
    var enabled;
    var l = console.log.bind(console);
    return function (enable) {
      if (enable !== undefined) {
        enabled = enable;
      } else {
        enabled = context.pageContext.isDebugMode;
      }

      console.log = enabled ? l : function (x) {
        return x;
      };
    };
  };

  var log = function log() {
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    console.log(args);
    return args[0];
  };

  var once = function once(f) {
    var a = 0;
    var value;
    return function () {
      if (a) return value;
      a = 1;

      for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        args[_key3] = arguments[_key3];
      }

      return value = f.apply(this, args);
    };
  };

  var common = {
    limitLogExposure: limitLogExposure,
    // globalEventBus,
    noop: noop,
    log: log,
    once: once,
    id: id$1,
    type: type$2,
    head: head$1,
    tail: tail,
    lens: lens,
    hashCode: hashCode,
    memoize: memoize,
    sessionStorage: sessionStorage,
    localStorage: localStorage,
    promiseProp: promiseProp,
    clearCache: clearCache,
    mixin: mixin,
    $: $,
    $$: $$,
    printDiv: function printDiv(elemIdentifier) {
      var $divToPrint = $(elemIdentifier);
      var newWindow = window.open();
      newWindow.document.write($divToPrint.html());
      newWindow.document.close();
      newWindow.focus();
      newWindow.print();
      newWindow.close();
    },
    prop: function prop(v) {
      var pure = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      var property = function property(x) {
        if (x !== undefined) v = pure ? clone_1(x) : x;
        return v;
      };

      property.isProp = true;

      property.map = function (f) {
        property(f(x));
        return property;
      };

      return property;
    }
  };

  var utilities = Object.assign({
    context: context
  }, common);

  var validateSetPrototypeOfArguments = function (O, proto) {
    anObject(O);
    if (!isObject(proto) && proto !== null) {
      throw TypeError("Can't set " + String(proto) + ' as a prototype');
    }
  };

  // Works with __proto__ only. Old v8 can't work with null proto objects.
  /* eslint-disable no-proto */


  var objectSetPrototypeOf = Object.setPrototypeOf || ('__proto__' in {} ? function () { // eslint-disable-line
    var correctSetter = false;
    var test = {};
    var setter;
    try {
      setter = Object.getOwnPropertyDescriptor(Object.prototype, '__proto__').set;
      setter.call(test, []);
      correctSetter = test instanceof Array;
    } catch (e) { /* empty */ }
    return function setPrototypeOf(O, proto) {
      validateSetPrototypeOfArguments(O, proto);
      if (correctSetter) setter.call(O, proto);
      else O.__proto__ = proto;
      return O;
    };
  }() : undefined);

  var inheritIfRequired = function (that, target, C) {
    var S = target.constructor;
    var P;
    if (S !== C && typeof S == 'function' && (P = S.prototype) !== C.prototype && isObject(P) && objectSetPrototypeOf) {
      objectSetPrototypeOf(that, P);
    } return that;
  };

  var objectDefineProperties = descriptors ? Object.defineProperties : function defineProperties(O, Properties) {
    anObject(O);
    var keys = objectKeys(Properties);
    var length = keys.length;
    var i = 0;
    var key;
    while (length > i) objectDefineProperty.f(O, key = keys[i++], Properties[key]);
    return O;
  };

  // 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])





  var IE_PROTO = sharedKey('IE_PROTO');
  var PROTOTYPE = 'prototype';
  var Empty = function () { /* empty */ };

  // Create object with fake `null` prototype: use iframe Object with cleared prototype
  var createDict = function () {
    // Thrash, waste and sodomy: IE GC bug
    var iframe = documentCreateElement('iframe');
    var length = enumBugKeys.length;
    var lt = '<';
    var script = 'script';
    var gt = '>';
    var js = 'java' + script + ':';
    var iframeDocument;
    iframe.style.display = 'none';
    html.appendChild(iframe);
    iframe.src = String(js);
    iframeDocument = iframe.contentWindow.document;
    iframeDocument.open();
    iframeDocument.write(lt + script + gt + 'document.F=Object' + lt + '/' + script + gt);
    iframeDocument.close();
    createDict = iframeDocument.F;
    while (length--) delete createDict[PROTOTYPE][enumBugKeys[length]];
    return createDict();
  };

  var objectCreate = Object.create || function create(O, Properties) {
    var result;
    if (O !== null) {
      Empty[PROTOTYPE] = anObject(O);
      result = new Empty();
      Empty[PROTOTYPE] = null;
      // add "__proto__" for Object.getPrototypeOf polyfill
      result[IE_PROTO] = O;
    } else result = createDict();
    return Properties === undefined ? result : objectDefineProperties(result, Properties);
  };

  hiddenKeys[IE_PROTO] = true;

  var getOwnPropertyNames = objectGetOwnPropertyNames.f;
  var getOwnPropertyDescriptor$2 = objectGetOwnPropertyDescriptor.f;
  var defineProperty$1 = objectDefineProperty.f;

  var NUMBER = 'Number';
  var NativeNumber = global$1[NUMBER];
  var NumberPrototype = NativeNumber.prototype;

  // Opera ~12 has broken Object#toString
  var BROKEN_CLASSOF = classofRaw(objectCreate(NumberPrototype)) == NUMBER;
  var NATIVE_TRIM = 'trim' in String.prototype;

  // `ToNumber` abstract operation
  // https://tc39.github.io/ecma262/#sec-tonumber
  var toNumber = function (argument) {
    var it = toPrimitive(argument, false);
    var first, third, radix, maxCode, digits, length, i, code;
    if (typeof it == 'string' && it.length > 2) {
      it = NATIVE_TRIM ? it.trim() : stringTrim(it, 3);
      first = it.charCodeAt(0);
      if (first === 43 || first === 45) {
        third = it.charCodeAt(2);
        if (third === 88 || third === 120) return NaN; // Number('+0x1') should be NaN, old V8 fix
      } else if (first === 48) {
        switch (it.charCodeAt(1)) {
          case 66: case 98: radix = 2; maxCode = 49; break; // fast equal of /^0b[01]+$/i
          case 79: case 111: radix = 8; maxCode = 55; break; // fast equal of /^0o[0-7]+$/i
          default: return +it;
        }
        digits = it.slice(2);
        length = digits.length;
        for (i = 0; i < length; i++) {
          code = digits.charCodeAt(i);
          // parseInt parses a string to a first unavailable symbol
          // but ToNumber should return NaN if a string contains unavailable symbols
          if (code < 48 || code > maxCode) return NaN;
        } return parseInt(digits, radix);
      }
    } return +it;
  };

  // `Number` constructor
  // https://tc39.github.io/ecma262/#sec-number-constructor
  if (isForced_1(NUMBER, !NativeNumber(' 0o1') || !NativeNumber('0b1') || NativeNumber('+0x1'))) {
    var NumberWrapper = function Number(value) {
      var it = arguments.length < 1 ? 0 : value;
      var that = this;
      return that instanceof NumberWrapper
        // check on 1..constructor(foo) case
        && (BROKEN_CLASSOF ? fails(function () { NumberPrototype.valueOf.call(that); }) : classofRaw(that) != NUMBER)
          ? inheritIfRequired(new NativeNumber(toNumber(it)), that, NumberWrapper) : toNumber(it);
    };
    for (var keys = descriptors ? getOwnPropertyNames(NativeNumber) : (
      // ES3:
      'MAX_VALUE,MIN_VALUE,NaN,NEGATIVE_INFINITY,POSITIVE_INFINITY,' +
      // ES2015 (in case, if modules with ES2015 Number statics required before):
      'EPSILON,isFinite,isInteger,isNaN,isSafeInteger,MAX_SAFE_INTEGER,' +
      'MIN_SAFE_INTEGER,parseFloat,parseInt,isInteger'
    ).split(','), j = 0, key; keys.length > j; j++) {
      if (has(NativeNumber, key = keys[j]) && !has(NumberWrapper, key)) {
        defineProperty$1(NumberWrapper, key, getOwnPropertyDescriptor$2(NativeNumber, key));
      }
    }
    NumberWrapper.prototype = NumberPrototype;
    NumberPrototype.constructor = NumberWrapper;
    redefine(global$1, NUMBER, NumberWrapper);
  }

  var propertyIsEnumerable = objectPropertyIsEnumerable.f;

  // TO_ENTRIES: true  -> Object.entries
  // TO_ENTRIES: false -> Object.values
  var objectToArray = function (it, TO_ENTRIES) {
    var O = toIndexedObject(it);
    var keys = objectKeys(O);
    var length = keys.length;
    var i = 0;
    var result = [];
    var key;
    while (length > i) if (propertyIsEnumerable.call(O, key = keys[i++])) {
      result.push(TO_ENTRIES ? [key, O[key]] : O[key]);
    } return result;
  };

  // `Object.entries` method
  // https://tc39.github.io/ecma262/#sec-object.entries
  _export({ target: 'Object', stat: true }, {
    entries: function entries(O) {
      return objectToArray(O, true);
    }
  });

  var FAILS_ON_PRIMITIVES = fails(function () { objectKeys(1); });

  // `Object.keys` method
  // https://tc39.github.io/ecma262/#sec-object.keys
  _export({ target: 'Object', stat: true, forced: FAILS_ON_PRIMITIVES }, {
    keys: function keys(it) {
      return objectKeys(toObject(it));
    }
  });

  var VNode = function VNode() {};

  var options = {};

  var stack = [];

  var EMPTY_CHILDREN = [];

  function h(nodeName, attributes) {
  	var children = EMPTY_CHILDREN,
  	    lastSimple,
  	    child,
  	    simple,
  	    i;
  	for (i = arguments.length; i-- > 2;) {
  		stack.push(arguments[i]);
  	}
  	if (attributes && attributes.children != null) {
  		if (!stack.length) stack.push(attributes.children);
  		delete attributes.children;
  	}
  	while (stack.length) {
  		if ((child = stack.pop()) && child.pop !== undefined) {
  			for (i = child.length; i--;) {
  				stack.push(child[i]);
  			}
  		} else {
  			if (typeof child === 'boolean') child = null;

  			if (simple = typeof nodeName !== 'function') {
  				if (child == null) child = '';else if (typeof child === 'number') child = String(child);else if (typeof child !== 'string') simple = false;
  			}

  			if (simple && lastSimple) {
  				children[children.length - 1] += child;
  			} else if (children === EMPTY_CHILDREN) {
  				children = [child];
  			} else {
  				children.push(child);
  			}

  			lastSimple = simple;
  		}
  	}

  	var p = new VNode();
  	p.nodeName = nodeName;
  	p.children = children;
  	p.attributes = attributes == null ? undefined : attributes;
  	p.key = attributes == null ? undefined : attributes.key;

  	if (options.vnode !== undefined) options.vnode(p);

  	return p;
  }

  function extend(obj, props) {
    for (var i in props) {
      obj[i] = props[i];
    }return obj;
  }

  function applyRef(ref, value) {
    if (ref != null) {
      if (typeof ref == 'function') ref(value);else ref.current = value;
    }
  }

  var defer$1 = typeof Promise == 'function' ? Promise.resolve().then.bind(Promise.resolve()) : setTimeout;

  function cloneElement(vnode, props) {
    return h(vnode.nodeName, extend(extend({}, vnode.attributes), props), arguments.length > 2 ? [].slice.call(arguments, 2) : vnode.children);
  }

  var IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i;

  var items = [];

  function enqueueRender(component) {
  	if (!component._dirty && (component._dirty = true) && items.push(component) == 1) {
  		(options.debounceRendering || defer$1)(rerender);
  	}
  }

  function rerender() {
  	var p;
  	while (p = items.pop()) {
  		if (p._dirty) renderComponent(p);
  	}
  }

  function isSameNodeType(node, vnode, hydrating) {
  	if (typeof vnode === 'string' || typeof vnode === 'number') {
  		return node.splitText !== undefined;
  	}
  	if (typeof vnode.nodeName === 'string') {
  		return !node._componentConstructor && isNamedNode(node, vnode.nodeName);
  	}
  	return hydrating || node._componentConstructor === vnode.nodeName;
  }

  function isNamedNode(node, nodeName) {
  	return node.normalizedNodeName === nodeName || node.nodeName.toLowerCase() === nodeName.toLowerCase();
  }

  function getNodeProps(vnode) {
  	var props = extend({}, vnode.attributes);
  	props.children = vnode.children;

  	var defaultProps = vnode.nodeName.defaultProps;
  	if (defaultProps !== undefined) {
  		for (var i in defaultProps) {
  			if (props[i] === undefined) {
  				props[i] = defaultProps[i];
  			}
  		}
  	}

  	return props;
  }

  function createNode(nodeName, isSvg) {
  	var node = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', nodeName) : document.createElement(nodeName);
  	node.normalizedNodeName = nodeName;
  	return node;
  }

  function removeNode(node) {
  	var parentNode = node.parentNode;
  	if (parentNode) parentNode.removeChild(node);
  }

  function setAccessor(node, name, old, value, isSvg) {
  	if (name === 'className') name = 'class';

  	if (name === 'key') ; else if (name === 'ref') {
  		applyRef(old, null);
  		applyRef(value, node);
  	} else if (name === 'class' && !isSvg) {
  		node.className = value || '';
  	} else if (name === 'style') {
  		if (!value || typeof value === 'string' || typeof old === 'string') {
  			node.style.cssText = value || '';
  		}
  		if (value && typeof value === 'object') {
  			if (typeof old !== 'string') {
  				for (var i in old) {
  					if (!(i in value)) node.style[i] = '';
  				}
  			}
  			for (var i in value) {
  				node.style[i] = typeof value[i] === 'number' && IS_NON_DIMENSIONAL.test(i) === false ? value[i] + 'px' : value[i];
  			}
  		}
  	} else if (name === 'dangerouslySetInnerHTML') {
  		if (value) node.innerHTML = value.__html || '';
  	} else if (name[0] == 'o' && name[1] == 'n') {
  		var useCapture = name !== (name = name.replace(/Capture$/, ''));
  		name = name.toLowerCase().substring(2);
  		if (value) {
  			if (!old) node.addEventListener(name, eventProxy, useCapture);
  		} else {
  			node.removeEventListener(name, eventProxy, useCapture);
  		}
  		(node._listeners || (node._listeners = {}))[name] = value;
  	} else if (name !== 'list' && name !== 'type' && !isSvg && name in node) {
  		try {
  			node[name] = value == null ? '' : value;
  		} catch (e) {}
  		if ((value == null || value === false) && name != 'spellcheck') node.removeAttribute(name);
  	} else {
  		var ns = isSvg && name !== (name = name.replace(/^xlink:?/, ''));

  		if (value == null || value === false) {
  			if (ns) node.removeAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase());else node.removeAttribute(name);
  		} else if (typeof value !== 'function') {
  			if (ns) node.setAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase(), value);else node.setAttribute(name, value);
  		}
  	}
  }

  function eventProxy(e) {
  	return this._listeners[e.type](options.event && options.event(e) || e);
  }

  var mounts = [];

  var diffLevel = 0;

  var isSvgMode = false;

  var hydrating = false;

  function flushMounts() {
  	var c;
  	while (c = mounts.shift()) {
  		if (options.afterMount) options.afterMount(c);
  		if (c.componentDidMount) c.componentDidMount();
  	}
  }

  function diff(dom, vnode, context, mountAll, parent, componentRoot) {
  	if (!diffLevel++) {
  		isSvgMode = parent != null && parent.ownerSVGElement !== undefined;

  		hydrating = dom != null && !('__preactattr_' in dom);
  	}

  	var ret = idiff(dom, vnode, context, mountAll, componentRoot);

  	if (parent && ret.parentNode !== parent) parent.appendChild(ret);

  	if (! --diffLevel) {
  		hydrating = false;

  		if (!componentRoot) flushMounts();
  	}

  	return ret;
  }

  function idiff(dom, vnode, context, mountAll, componentRoot) {
  	var out = dom,
  	    prevSvgMode = isSvgMode;

  	if (vnode == null || typeof vnode === 'boolean') vnode = '';

  	if (typeof vnode === 'string' || typeof vnode === 'number') {
  		if (dom && dom.splitText !== undefined && dom.parentNode && (!dom._component || componentRoot)) {
  			if (dom.nodeValue != vnode) {
  				dom.nodeValue = vnode;
  			}
  		} else {
  			out = document.createTextNode(vnode);
  			if (dom) {
  				if (dom.parentNode) dom.parentNode.replaceChild(out, dom);
  				recollectNodeTree(dom, true);
  			}
  		}

  		out['__preactattr_'] = true;

  		return out;
  	}

  	var vnodeName = vnode.nodeName;
  	if (typeof vnodeName === 'function') {
  		return buildComponentFromVNode(dom, vnode, context, mountAll);
  	}

  	isSvgMode = vnodeName === 'svg' ? true : vnodeName === 'foreignObject' ? false : isSvgMode;

  	vnodeName = String(vnodeName);
  	if (!dom || !isNamedNode(dom, vnodeName)) {
  		out = createNode(vnodeName, isSvgMode);

  		if (dom) {
  			while (dom.firstChild) {
  				out.appendChild(dom.firstChild);
  			}
  			if (dom.parentNode) dom.parentNode.replaceChild(out, dom);

  			recollectNodeTree(dom, true);
  		}
  	}

  	var fc = out.firstChild,
  	    props = out['__preactattr_'],
  	    vchildren = vnode.children;

  	if (props == null) {
  		props = out['__preactattr_'] = {};
  		for (var a = out.attributes, i = a.length; i--;) {
  			props[a[i].name] = a[i].value;
  		}
  	}

  	if (!hydrating && vchildren && vchildren.length === 1 && typeof vchildren[0] === 'string' && fc != null && fc.splitText !== undefined && fc.nextSibling == null) {
  		if (fc.nodeValue != vchildren[0]) {
  			fc.nodeValue = vchildren[0];
  		}
  	} else if (vchildren && vchildren.length || fc != null) {
  			innerDiffNode(out, vchildren, context, mountAll, hydrating || props.dangerouslySetInnerHTML != null);
  		}

  	diffAttributes(out, vnode.attributes, props);

  	isSvgMode = prevSvgMode;

  	return out;
  }

  function innerDiffNode(dom, vchildren, context, mountAll, isHydrating) {
  	var originalChildren = dom.childNodes,
  	    children = [],
  	    keyed = {},
  	    keyedLen = 0,
  	    min = 0,
  	    len = originalChildren.length,
  	    childrenLen = 0,
  	    vlen = vchildren ? vchildren.length : 0,
  	    j,
  	    c,
  	    f,
  	    vchild,
  	    child;

  	if (len !== 0) {
  		for (var i = 0; i < len; i++) {
  			var _child = originalChildren[i],
  			    props = _child['__preactattr_'],
  			    key = vlen && props ? _child._component ? _child._component.__key : props.key : null;
  			if (key != null) {
  				keyedLen++;
  				keyed[key] = _child;
  			} else if (props || (_child.splitText !== undefined ? isHydrating ? _child.nodeValue.trim() : true : isHydrating)) {
  				children[childrenLen++] = _child;
  			}
  		}
  	}

  	if (vlen !== 0) {
  		for (var i = 0; i < vlen; i++) {
  			vchild = vchildren[i];
  			child = null;

  			var key = vchild.key;
  			if (key != null) {
  				if (keyedLen && keyed[key] !== undefined) {
  					child = keyed[key];
  					keyed[key] = undefined;
  					keyedLen--;
  				}
  			} else if (min < childrenLen) {
  					for (j = min; j < childrenLen; j++) {
  						if (children[j] !== undefined && isSameNodeType(c = children[j], vchild, isHydrating)) {
  							child = c;
  							children[j] = undefined;
  							if (j === childrenLen - 1) childrenLen--;
  							if (j === min) min++;
  							break;
  						}
  					}
  				}

  			child = idiff(child, vchild, context, mountAll);

  			f = originalChildren[i];
  			if (child && child !== dom && child !== f) {
  				if (f == null) {
  					dom.appendChild(child);
  				} else if (child === f.nextSibling) {
  					removeNode(f);
  				} else {
  					dom.insertBefore(child, f);
  				}
  			}
  		}
  	}

  	if (keyedLen) {
  		for (var i in keyed) {
  			if (keyed[i] !== undefined) recollectNodeTree(keyed[i], false);
  		}
  	}

  	while (min <= childrenLen) {
  		if ((child = children[childrenLen--]) !== undefined) recollectNodeTree(child, false);
  	}
  }

  function recollectNodeTree(node, unmountOnly) {
  	var component = node._component;
  	if (component) {
  		unmountComponent(component);
  	} else {
  		if (node['__preactattr_'] != null) applyRef(node['__preactattr_'].ref, null);

  		if (unmountOnly === false || node['__preactattr_'] == null) {
  			removeNode(node);
  		}

  		removeChildren(node);
  	}
  }

  function removeChildren(node) {
  	node = node.lastChild;
  	while (node) {
  		var next = node.previousSibling;
  		recollectNodeTree(node, true);
  		node = next;
  	}
  }

  function diffAttributes(dom, attrs, old) {
  	var name;

  	for (name in old) {
  		if (!(attrs && attrs[name] != null) && old[name] != null) {
  			setAccessor(dom, name, old[name], old[name] = undefined, isSvgMode);
  		}
  	}

  	for (name in attrs) {
  		if (name !== 'children' && name !== 'innerHTML' && (!(name in old) || attrs[name] !== (name === 'value' || name === 'checked' ? dom[name] : old[name]))) {
  			setAccessor(dom, name, old[name], old[name] = attrs[name], isSvgMode);
  		}
  	}
  }

  var recyclerComponents = [];

  function createComponent(Ctor, props, context) {
  	var inst,
  	    i = recyclerComponents.length;

  	if (Ctor.prototype && Ctor.prototype.render) {
  		inst = new Ctor(props, context);
  		Component.call(inst, props, context);
  	} else {
  		inst = new Component(props, context);
  		inst.constructor = Ctor;
  		inst.render = doRender;
  	}

  	while (i--) {
  		if (recyclerComponents[i].constructor === Ctor) {
  			inst.nextBase = recyclerComponents[i].nextBase;
  			recyclerComponents.splice(i, 1);
  			return inst;
  		}
  	}

  	return inst;
  }

  function doRender(props, state, context) {
  	return this.constructor(props, context);
  }

  function setComponentProps(component, props, renderMode, context, mountAll) {
  	if (component._disable) return;
  	component._disable = true;

  	component.__ref = props.ref;
  	component.__key = props.key;
  	delete props.ref;
  	delete props.key;

  	if (typeof component.constructor.getDerivedStateFromProps === 'undefined') {
  		if (!component.base || mountAll) {
  			if (component.componentWillMount) component.componentWillMount();
  		} else if (component.componentWillReceiveProps) {
  			component.componentWillReceiveProps(props, context);
  		}
  	}

  	if (context && context !== component.context) {
  		if (!component.prevContext) component.prevContext = component.context;
  		component.context = context;
  	}

  	if (!component.prevProps) component.prevProps = component.props;
  	component.props = props;

  	component._disable = false;

  	if (renderMode !== 0) {
  		if (renderMode === 1 || options.syncComponentUpdates !== false || !component.base) {
  			renderComponent(component, 1, mountAll);
  		} else {
  			enqueueRender(component);
  		}
  	}

  	applyRef(component.__ref, component);
  }

  function renderComponent(component, renderMode, mountAll, isChild) {
  	if (component._disable) return;

  	var props = component.props,
  	    state = component.state,
  	    context = component.context,
  	    previousProps = component.prevProps || props,
  	    previousState = component.prevState || state,
  	    previousContext = component.prevContext || context,
  	    isUpdate = component.base,
  	    nextBase = component.nextBase,
  	    initialBase = isUpdate || nextBase,
  	    initialChildComponent = component._component,
  	    skip = false,
  	    snapshot = previousContext,
  	    rendered,
  	    inst,
  	    cbase;

  	if (component.constructor.getDerivedStateFromProps) {
  		state = extend(extend({}, state), component.constructor.getDerivedStateFromProps(props, state));
  		component.state = state;
  	}

  	if (isUpdate) {
  		component.props = previousProps;
  		component.state = previousState;
  		component.context = previousContext;
  		if (renderMode !== 2 && component.shouldComponentUpdate && component.shouldComponentUpdate(props, state, context) === false) {
  			skip = true;
  		} else if (component.componentWillUpdate) {
  			component.componentWillUpdate(props, state, context);
  		}
  		component.props = props;
  		component.state = state;
  		component.context = context;
  	}

  	component.prevProps = component.prevState = component.prevContext = component.nextBase = null;
  	component._dirty = false;

  	if (!skip) {
  		rendered = component.render(props, state, context);

  		if (component.getChildContext) {
  			context = extend(extend({}, context), component.getChildContext());
  		}

  		if (isUpdate && component.getSnapshotBeforeUpdate) {
  			snapshot = component.getSnapshotBeforeUpdate(previousProps, previousState);
  		}

  		var childComponent = rendered && rendered.nodeName,
  		    toUnmount,
  		    base;

  		if (typeof childComponent === 'function') {

  			var childProps = getNodeProps(rendered);
  			inst = initialChildComponent;

  			if (inst && inst.constructor === childComponent && childProps.key == inst.__key) {
  				setComponentProps(inst, childProps, 1, context, false);
  			} else {
  				toUnmount = inst;

  				component._component = inst = createComponent(childComponent, childProps, context);
  				inst.nextBase = inst.nextBase || nextBase;
  				inst._parentComponent = component;
  				setComponentProps(inst, childProps, 0, context, false);
  				renderComponent(inst, 1, mountAll, true);
  			}

  			base = inst.base;
  		} else {
  			cbase = initialBase;

  			toUnmount = initialChildComponent;
  			if (toUnmount) {
  				cbase = component._component = null;
  			}

  			if (initialBase || renderMode === 1) {
  				if (cbase) cbase._component = null;
  				base = diff(cbase, rendered, context, mountAll || !isUpdate, initialBase && initialBase.parentNode, true);
  			}
  		}

  		if (initialBase && base !== initialBase && inst !== initialChildComponent) {
  			var baseParent = initialBase.parentNode;
  			if (baseParent && base !== baseParent) {
  				baseParent.replaceChild(base, initialBase);

  				if (!toUnmount) {
  					initialBase._component = null;
  					recollectNodeTree(initialBase, false);
  				}
  			}
  		}

  		if (toUnmount) {
  			unmountComponent(toUnmount);
  		}

  		component.base = base;
  		if (base && !isChild) {
  			var componentRef = component,
  			    t = component;
  			while (t = t._parentComponent) {
  				(componentRef = t).base = base;
  			}
  			base._component = componentRef;
  			base._componentConstructor = componentRef.constructor;
  		}
  	}

  	if (!isUpdate || mountAll) {
  		mounts.push(component);
  	} else if (!skip) {

  		if (component.componentDidUpdate) {
  			component.componentDidUpdate(previousProps, previousState, snapshot);
  		}
  		if (options.afterUpdate) options.afterUpdate(component);
  	}

  	while (component._renderCallbacks.length) {
  		component._renderCallbacks.pop().call(component);
  	}if (!diffLevel && !isChild) flushMounts();
  }

  function buildComponentFromVNode(dom, vnode, context, mountAll) {
  	var c = dom && dom._component,
  	    originalComponent = c,
  	    oldDom = dom,
  	    isDirectOwner = c && dom._componentConstructor === vnode.nodeName,
  	    isOwner = isDirectOwner,
  	    props = getNodeProps(vnode);
  	while (c && !isOwner && (c = c._parentComponent)) {
  		isOwner = c.constructor === vnode.nodeName;
  	}

  	if (c && isOwner && (!mountAll || c._component)) {
  		setComponentProps(c, props, 3, context, mountAll);
  		dom = c.base;
  	} else {
  		if (originalComponent && !isDirectOwner) {
  			unmountComponent(originalComponent);
  			dom = oldDom = null;
  		}

  		c = createComponent(vnode.nodeName, props, context);
  		if (dom && !c.nextBase) {
  			c.nextBase = dom;

  			oldDom = null;
  		}
  		setComponentProps(c, props, 1, context, mountAll);
  		dom = c.base;

  		if (oldDom && dom !== oldDom) {
  			oldDom._component = null;
  			recollectNodeTree(oldDom, false);
  		}
  	}

  	return dom;
  }

  function unmountComponent(component) {
  	if (options.beforeUnmount) options.beforeUnmount(component);

  	var base = component.base;

  	component._disable = true;

  	if (component.componentWillUnmount) component.componentWillUnmount();

  	component.base = null;

  	var inner = component._component;
  	if (inner) {
  		unmountComponent(inner);
  	} else if (base) {
  		if (base['__preactattr_'] != null) applyRef(base['__preactattr_'].ref, null);

  		component.nextBase = base;

  		removeNode(base);
  		recyclerComponents.push(component);

  		removeChildren(base);
  	}

  	applyRef(component.__ref, null);
  }

  function Component(props, context) {
  	this._dirty = true;

  	this.context = context;

  	this.props = props;

  	this.state = this.state || {};

  	this._renderCallbacks = [];
  }

  extend(Component.prototype, {
  	setState: function setState(state, callback) {
  		if (!this.prevState) this.prevState = this.state;
  		this.state = extend(extend({}, this.state), typeof state === 'function' ? state(this.state, this.props) : state);
  		if (callback) this._renderCallbacks.push(callback);
  		enqueueRender(this);
  	},
  	forceUpdate: function forceUpdate(callback) {
  		if (callback) this._renderCallbacks.push(callback);
  		renderComponent(this, 2);
  	},
  	render: function render() {}
  });

  function render(vnode, parent, merge) {
    return diff(merge, vnode, {}, false, parent, false);
  }

  function createRef() {
  	return {};
  }

  var preact = {
  	h: h,
  	createElement: h,
  	cloneElement: cloneElement,
  	createRef: createRef,
  	Component: Component,
  	render: render,
  	rerender: rerender,
  	options: options
  };

  var preact$1 = /*#__PURE__*/Object.freeze({
    default: preact,
    h: h,
    createElement: h,
    cloneElement: cloneElement,
    createRef: createRef,
    Component: Component,
    render: render,
    rerender: rerender,
    options: options
  });

  var n=function(t,r,u,e){for(var p=1;p<r.length;p++){var s=r[p++],a="number"==typeof s?u[s]:s;1===r[p]?e[0]=a:2===r[p]?(e[1]=e[1]||{})[r[++p]]=a:3===r[p]?e[1]=Object.assign(e[1]||{},a):e.push(r[p]?t.apply(null,n(t,a,u,["",null])):a);}return e},t=function(n){for(var t,r,u=1,e="",p="",s=[0],a=function(n){1===u&&(n||(e=e.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))?s.push(n||e,0):3===u&&(n||e)?(s.push(n||e,1),u=2):2===u&&"..."===e&&n?s.push(n,3):2===u&&e&&!n?s.push(!0,2,e):4===u&&r&&(s.push(n||e,2,r),r=""),e="";},f=0;f<n.length;f++){f&&(1===u&&a(),a(f));for(var h=0;h<n[f].length;h++)t=n[f][h],1===u?"<"===t?(a(),s=[s],u=3):e+=t:p?t===p?p="":e+=t:'"'===t||"'"===t?p=t:">"===t?(a(),u=1):u&&("="===t?(u=4,r=e,e=""):"/"===t?(a(),3===u&&(s=s[0]),u=s,(s=s[0]).push(u,4),u=0):" "===t||"\t"===t||"\n"===t||"\r"===t?(a(),u=2):e+=t);}return a(),s},r="function"==typeof Map,u=r?new Map:{},e=r?function(n){var r=u.get(n);return r||u.set(n,r=t(n)),r}:function(n){for(var r="",e=0;e<n.length;e++)r+=n[e].length+"-"+n[e];return u[r]||(u[r]=t(n))};function htm(t){var r=n(this,e(t),arguments,[]);return r.length>1?r:r[0]}

  /**
   * Tests whether or not an object is an array.
   *
   * @private
   * @param {*} val The object to test.
   * @return {Boolean} `true` if `val` is an array, `false` otherwise.
   * @example
   *
   *      _isArray([]); //=> true
   *      _isArray(null); //=> false
   *      _isArray({}); //=> false
   */
  var _isArray = Array.isArray || function _isArray(val) {
    return val != null && val.length >= 0 && Object.prototype.toString.call(val) === '[object Array]';
  };

  function _isTransformer(obj) {
    return obj != null && typeof obj['@@transducer/step'] === 'function';
  }
  var _isTransformer_1 = _isTransformer;

  /**
   * Returns a function that dispatches with different strategies based on the
   * object in list position (last argument). If it is an array, executes [fn].
   * Otherwise, if it has a function with one of the given method names, it will
   * execute that function (functor case). Otherwise, if it is a transformer,
   * uses transducer [xf] to return a new transformer (transducer case).
   * Otherwise, it will default to executing [fn].
   *
   * @private
   * @param {Array} methodNames properties to check for a custom implementation
   * @param {Function} xf transducer to initialize if object is transformer
   * @param {Function} fn default ramda implementation
   * @return {Function} A function that dispatches on object in list position
   */


  function _dispatchable(methodNames, xf, fn) {
    return function () {
      if (arguments.length === 0) {
        return fn();
      }
      var args = Array.prototype.slice.call(arguments, 0);
      var obj = args.pop();
      if (!_isArray(obj)) {
        var idx = 0;
        while (idx < methodNames.length) {
          if (typeof obj[methodNames[idx]] === 'function') {
            return obj[methodNames[idx]].apply(obj, args);
          }
          idx += 1;
        }
        if (_isTransformer_1(obj)) {
          var transducer = xf.apply(null, args);
          return transducer(obj);
        }
      }
      return fn.apply(this, arguments);
    };
  }
  var _dispatchable_1 = _dispatchable;

  function _map(fn, functor) {
    var idx = 0;
    var len = functor.length;
    var result = Array(len);
    while (idx < len) {
      result[idx] = fn(functor[idx]);
      idx += 1;
    }
    return result;
  }
  var _map_1 = _map;

  function _isString(x) {
    return Object.prototype.toString.call(x) === '[object String]';
  }
  var _isString_1 = _isString;

  /**
   * Tests whether or not an object is similar to an array.
   *
   * @private
   * @category Type
   * @category List
   * @sig * -> Boolean
   * @param {*} x The object to test.
   * @return {Boolean} `true` if `x` has a numeric length property and extreme indices defined; `false` otherwise.
   * @example
   *
   *      _isArrayLike([]); //=> true
   *      _isArrayLike(true); //=> false
   *      _isArrayLike({}); //=> false
   *      _isArrayLike({length: 10}); //=> false
   *      _isArrayLike({0: 'zero', 9: 'nine', length: 10}); //=> true
   */


  var _isArrayLike = /*#__PURE__*/_curry1_1(function isArrayLike(x) {
    if (_isArray(x)) {
      return true;
    }
    if (!x) {
      return false;
    }
    if (typeof x !== 'object') {
      return false;
    }
    if (_isString_1(x)) {
      return false;
    }
    if (x.nodeType === 1) {
      return !!x.length;
    }
    if (x.length === 0) {
      return true;
    }
    if (x.length > 0) {
      return x.hasOwnProperty(0) && x.hasOwnProperty(x.length - 1);
    }
    return false;
  });
  var _isArrayLike_1 = _isArrayLike;

  var XWrap = /*#__PURE__*/function () {
    function XWrap(fn) {
      this.f = fn;
    }
    XWrap.prototype['@@transducer/init'] = function () {
      throw new Error('init not implemented on XWrap');
    };
    XWrap.prototype['@@transducer/result'] = function (acc) {
      return acc;
    };
    XWrap.prototype['@@transducer/step'] = function (acc, x) {
      return this.f(acc, x);
    };

    return XWrap;
  }();

  function _xwrap(fn) {
    return new XWrap(fn);
  }
  var _xwrap_1 = _xwrap;

  /**
   * Creates a function that is bound to a context.
   * Note: `R.bind` does not provide the additional argument-binding capabilities of
   * [Function.prototype.bind](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind).
   *
   * @func
   * @memberOf R
   * @since v0.6.0
   * @category Function
   * @category Object
   * @sig (* -> *) -> {*} -> (* -> *)
   * @param {Function} fn The function to bind to context
   * @param {Object} thisObj The context to bind `fn` to
   * @return {Function} A function that will execute in the context of `thisObj`.
   * @see R.partial
   * @example
   *
   *      const log = R.bind(console.log, console);
   *      R.pipe(R.assoc('a', 2), R.tap(log), R.assoc('a', 3))({a: 1}); //=> {a: 3}
   *      // logs {a: 2}
   * @symb R.bind(f, o)(a, b) = f.call(o, a, b)
   */


  var bind$1 = /*#__PURE__*/_curry2_1(function bind(fn, thisObj) {
    return _arity_1(fn.length, function () {
      return fn.apply(thisObj, arguments);
    });
  });
  var bind_1 = bind$1;

  function _arrayReduce(xf, acc, list) {
    var idx = 0;
    var len = list.length;
    while (idx < len) {
      acc = xf['@@transducer/step'](acc, list[idx]);
      if (acc && acc['@@transducer/reduced']) {
        acc = acc['@@transducer/value'];
        break;
      }
      idx += 1;
    }
    return xf['@@transducer/result'](acc);
  }

  function _iterableReduce(xf, acc, iter) {
    var step = iter.next();
    while (!step.done) {
      acc = xf['@@transducer/step'](acc, step.value);
      if (acc && acc['@@transducer/reduced']) {
        acc = acc['@@transducer/value'];
        break;
      }
      step = iter.next();
    }
    return xf['@@transducer/result'](acc);
  }

  function _methodReduce(xf, acc, obj, methodName) {
    return xf['@@transducer/result'](obj[methodName](bind_1(xf['@@transducer/step'], xf), acc));
  }

  var symIterator = typeof Symbol !== 'undefined' ? Symbol.iterator : '@@iterator';

  function _reduce(fn, acc, list) {
    if (typeof fn === 'function') {
      fn = _xwrap_1(fn);
    }
    if (_isArrayLike_1(list)) {
      return _arrayReduce(fn, acc, list);
    }
    if (typeof list['fantasy-land/reduce'] === 'function') {
      return _methodReduce(fn, acc, list, 'fantasy-land/reduce');
    }
    if (list[symIterator] != null) {
      return _iterableReduce(fn, acc, list[symIterator]());
    }
    if (typeof list.next === 'function') {
      return _iterableReduce(fn, acc, list);
    }
    if (typeof list.reduce === 'function') {
      return _methodReduce(fn, acc, list, 'reduce');
    }

    throw new TypeError('reduce: list must be array or iterable');
  }
  var _reduce_1 = _reduce;

  var _xfBase = {
    init: function () {
      return this.xf['@@transducer/init']();
    },
    result: function (result) {
      return this.xf['@@transducer/result'](result);
    }
  };

  var XMap = /*#__PURE__*/function () {

    function XMap(f, xf) {
      this.xf = xf;
      this.f = f;
    }
    XMap.prototype['@@transducer/init'] = _xfBase.init;
    XMap.prototype['@@transducer/result'] = _xfBase.result;
    XMap.prototype['@@transducer/step'] = function (result, input) {
      return this.xf['@@transducer/step'](result, this.f(input));
    };

    return XMap;
  }();

  var _xmap = /*#__PURE__*/_curry2_1(function _xmap(f, xf) {
    return new XMap(f, xf);
  });
  var _xmap_1 = _xmap;

  function _has(prop, obj) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  }
  var _has_1 = _has;

  var toString$1 = Object.prototype.toString;
  var _isArguments = /*#__PURE__*/function () {
    return toString$1.call(arguments) === '[object Arguments]' ? function _isArguments(x) {
      return toString$1.call(x) === '[object Arguments]';
    } : function _isArguments(x) {
      return _has_1('callee', x);
    };
  }();

  var _isArguments_1 = _isArguments;

  // cover IE < 9 keys issues


  var hasEnumBug = ! /*#__PURE__*/{ toString: null }.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['constructor', 'valueOf', 'isPrototypeOf', 'toString', 'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];
  // Safari bug
  var hasArgsEnumBug = /*#__PURE__*/function () {

    return arguments.propertyIsEnumerable('length');
  }();

  var contains = function contains(list, item) {
    var idx = 0;
    while (idx < list.length) {
      if (list[idx] === item) {
        return true;
      }
      idx += 1;
    }
    return false;
  };

  /**
   * Returns a list containing the names of all the enumerable own properties of
   * the supplied object.
   * Note that the order of the output array is not guaranteed to be consistent
   * across different JS platforms.
   *
   * @func
   * @memberOf R
   * @since v0.1.0
   * @category Object
   * @sig {k: v} -> [k]
   * @param {Object} obj The object to extract properties from
   * @return {Array} An array of the object's own properties.
   * @see R.keysIn, R.values
   * @example
   *
   *      R.keys({a: 1, b: 2, c: 3}); //=> ['a', 'b', 'c']
   */
  var keys$1 = typeof Object.keys === 'function' && !hasArgsEnumBug ? /*#__PURE__*/_curry1_1(function keys(obj) {
    return Object(obj) !== obj ? [] : Object.keys(obj);
  }) : /*#__PURE__*/_curry1_1(function keys(obj) {
    if (Object(obj) !== obj) {
      return [];
    }
    var prop, nIdx;
    var ks = [];
    var checkArgsLength = hasArgsEnumBug && _isArguments_1(obj);
    for (prop in obj) {
      if (_has_1(prop, obj) && (!checkArgsLength || prop !== 'length')) {
        ks[ks.length] = prop;
      }
    }
    if (hasEnumBug) {
      nIdx = nonEnumerableProps.length - 1;
      while (nIdx >= 0) {
        prop = nonEnumerableProps[nIdx];
        if (_has_1(prop, obj) && !contains(ks, prop)) {
          ks[ks.length] = prop;
        }
        nIdx -= 1;
      }
    }
    return ks;
  });
  var keys_1 = keys$1;

  /**
   * Takes a function and
   * a [functor](https://github.com/fantasyland/fantasy-land#functor),
   * applies the function to each of the functor's values, and returns
   * a functor of the same shape.
   *
   * Ramda provides suitable `map` implementations for `Array` and `Object`,
   * so this function may be applied to `[1, 2, 3]` or `{x: 1, y: 2, z: 3}`.
   *
   * Dispatches to the `map` method of the second argument, if present.
   *
   * Acts as a transducer if a transformer is given in list position.
   *
   * Also treats functions as functors and will compose them together.
   *
   * @func
   * @memberOf R
   * @since v0.1.0
   * @category List
   * @sig Functor f => (a -> b) -> f a -> f b
   * @param {Function} fn The function to be called on every element of the input `list`.
   * @param {Array} list The list to be iterated over.
   * @return {Array} The new list.
   * @see R.transduce, R.addIndex
   * @example
   *
   *      const double = x => x * 2;
   *
   *      R.map(double, [1, 2, 3]); //=> [2, 4, 6]
   *
   *      R.map(double, {x: 1, y: 2, z: 3}); //=> {x: 2, y: 4, z: 6}
   * @symb R.map(f, [a, b]) = [f(a), f(b)]
   * @symb R.map(f, { x: a, y: b }) = { x: f(a), y: f(b) }
   * @symb R.map(f, functor_o) = functor_o.map(f)
   */


  var map = /*#__PURE__*/_curry2_1( /*#__PURE__*/_dispatchable_1(['fantasy-land/map', 'map'], _xmap_1, function map(fn, functor) {
    switch (Object.prototype.toString.call(functor)) {
      case '[object Function]':
        return curryN_1(functor.length, function () {
          return fn.call(this, functor.apply(this, arguments));
        });
      case '[object Object]':
        return _reduce_1(function (acc, key) {
          acc[key] = fn(functor[key]);
          return acc;
        }, {}, keys_1(functor));
      default:
        return _map_1(fn, functor);
    }
  }));
  var map_1 = map;

  function _isRegExp(x) {
    return Object.prototype.toString.call(x) === '[object RegExp]';
  }
  var _isRegExp_1 = _isRegExp;

  function _arrayFromIterator(iter) {
    var list = [];
    var next;
    while (!(next = iter.next()).done) {
      list.push(next.value);
    }
    return list;
  }
  var _arrayFromIterator_1 = _arrayFromIterator;

  function _includesWith(pred, x, list) {
    var idx = 0;
    var len = list.length;

    while (idx < len) {
      if (pred(x, list[idx])) {
        return true;
      }
      idx += 1;
    }
    return false;
  }
  var _includesWith_1 = _includesWith;

  function _functionName(f) {
    // String(x => x) evaluates to "x => x", so the pattern may not match.
    var match = String(f).match(/^function (\w*)/);
    return match == null ? '' : match[1];
  }
  var _functionName_1 = _functionName;

  // Based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
  function _objectIs(a, b) {
    // SameValue algorithm
    if (a === b) {
      // Steps 1-5, 7-10
      // Steps 6.b-6.e: +0 != -0
      return a !== 0 || 1 / a === 1 / b;
    } else {
      // Step 6.a: NaN == NaN
      return a !== a && b !== b;
    }
  }

  var _objectIs_1 = typeof Object.is === 'function' ? Object.is : _objectIs;

  /**
   * private _uniqContentEquals function.
   * That function is checking equality of 2 iterator contents with 2 assumptions
   * - iterators lengths are the same
   * - iterators values are unique
   *
   * false-positive result will be returned for comparision of, e.g.
   * - [1,2,3] and [1,2,3,4]
   * - [1,1,1] and [1,2,3]
   * */

  function _uniqContentEquals(aIterator, bIterator, stackA, stackB) {
    var a = _arrayFromIterator_1(aIterator);
    var b = _arrayFromIterator_1(bIterator);

    function eq(_a, _b) {
      return _equals(_a, _b, stackA.slice(), stackB.slice());
    }

    // if *a* array contains any element that is not included in *b*
    return !_includesWith_1(function (b, aItem) {
      return !_includesWith_1(eq, aItem, b);
    }, b, a);
  }

  function _equals(a, b, stackA, stackB) {
    if (_objectIs_1(a, b)) {
      return true;
    }

    var typeA = type_1(a);

    if (typeA !== type_1(b)) {
      return false;
    }

    if (a == null || b == null) {
      return false;
    }

    if (typeof a['fantasy-land/equals'] === 'function' || typeof b['fantasy-land/equals'] === 'function') {
      return typeof a['fantasy-land/equals'] === 'function' && a['fantasy-land/equals'](b) && typeof b['fantasy-land/equals'] === 'function' && b['fantasy-land/equals'](a);
    }

    if (typeof a.equals === 'function' || typeof b.equals === 'function') {
      return typeof a.equals === 'function' && a.equals(b) && typeof b.equals === 'function' && b.equals(a);
    }

    switch (typeA) {
      case 'Arguments':
      case 'Array':
      case 'Object':
        if (typeof a.constructor === 'function' && _functionName_1(a.constructor) === 'Promise') {
          return a === b;
        }
        break;
      case 'Boolean':
      case 'Number':
      case 'String':
        if (!(typeof a === typeof b && _objectIs_1(a.valueOf(), b.valueOf()))) {
          return false;
        }
        break;
      case 'Date':
        if (!_objectIs_1(a.valueOf(), b.valueOf())) {
          return false;
        }
        break;
      case 'Error':
        return a.name === b.name && a.message === b.message;
      case 'RegExp':
        if (!(a.source === b.source && a.global === b.global && a.ignoreCase === b.ignoreCase && a.multiline === b.multiline && a.sticky === b.sticky && a.unicode === b.unicode)) {
          return false;
        }
        break;
    }

    var idx = stackA.length - 1;
    while (idx >= 0) {
      if (stackA[idx] === a) {
        return stackB[idx] === b;
      }
      idx -= 1;
    }

    switch (typeA) {
      case 'Map':
        if (a.size !== b.size) {
          return false;
        }

        return _uniqContentEquals(a.entries(), b.entries(), stackA.concat([a]), stackB.concat([b]));
      case 'Set':
        if (a.size !== b.size) {
          return false;
        }

        return _uniqContentEquals(a.values(), b.values(), stackA.concat([a]), stackB.concat([b]));
      case 'Arguments':
      case 'Array':
      case 'Object':
      case 'Boolean':
      case 'Number':
      case 'String':
      case 'Date':
      case 'Error':
      case 'RegExp':
      case 'Int8Array':
      case 'Uint8Array':
      case 'Uint8ClampedArray':
      case 'Int16Array':
      case 'Uint16Array':
      case 'Int32Array':
      case 'Uint32Array':
      case 'Float32Array':
      case 'Float64Array':
      case 'ArrayBuffer':
        break;
      default:
        // Values of other types are only equal if identical.
        return false;
    }

    var keysA = keys_1(a);
    if (keysA.length !== keys_1(b).length) {
      return false;
    }

    var extendedStackA = stackA.concat([a]);
    var extendedStackB = stackB.concat([b]);

    idx = keysA.length - 1;
    while (idx >= 0) {
      var key = keysA[idx];
      if (!(_has_1(key, b) && _equals(b[key], a[key], extendedStackA, extendedStackB))) {
        return false;
      }
      idx -= 1;
    }
    return true;
  }
  var _equals_1 = _equals;

  /**
   * Returns `true` if its arguments are equivalent, `false` otherwise. Handles
   * cyclical data structures.
   *
   * Dispatches symmetrically to the `equals` methods of both arguments, if
   * present.
   *
   * @func
   * @memberOf R
   * @since v0.15.0
   * @category Relation
   * @sig a -> b -> Boolean
   * @param {*} a
   * @param {*} b
   * @return {Boolean}
   * @example
   *
   *      R.equals(1, 1); //=> true
   *      R.equals(1, '1'); //=> false
   *      R.equals([1, 2, 3], [1, 2, 3]); //=> true
   *
   *      const a = {}; a.v = a;
   *      const b = {}; b.v = b;
   *      R.equals(a, b); //=> true
   */


  var equals = /*#__PURE__*/_curry2_1(function equals(a, b) {
    return _equals_1(a, b, [], []);
  });
  var equals_1 = equals;

  function _indexOf(list, a, idx) {
    var inf, item;
    // Array.prototype.indexOf doesn't exist below IE9
    if (typeof list.indexOf === 'function') {
      switch (typeof a) {
        case 'number':
          if (a === 0) {
            // manually crawl the list to distinguish between +0 and -0
            inf = 1 / a;
            while (idx < list.length) {
              item = list[idx];
              if (item === 0 && 1 / item === inf) {
                return idx;
              }
              idx += 1;
            }
            return -1;
          } else if (a !== a) {
            // NaN
            while (idx < list.length) {
              item = list[idx];
              if (typeof item === 'number' && item !== item) {
                return idx;
              }
              idx += 1;
            }
            return -1;
          }
          // non-zero numbers can utilise Set
          return list.indexOf(a, idx);

        // all these types can utilise Set
        case 'string':
        case 'boolean':
        case 'function':
        case 'undefined':
          return list.indexOf(a, idx);

        case 'object':
          if (a === null) {
            // null can utilise Set
            return list.indexOf(a, idx);
          }
      }
    }
    // anything else not covered above, defer to R.equals
    while (idx < list.length) {
      if (equals_1(list[idx], a)) {
        return idx;
      }
      idx += 1;
    }
    return -1;
  }
  var _indexOf_1 = _indexOf;

  function _includes(a, list) {
    return _indexOf_1(list, a, 0) >= 0;
  }
  var _includes_1 = _includes;

  function _quote(s) {
    var escaped = s.replace(/\\/g, '\\\\').replace(/[\b]/g, '\\b') // \b matches word boundary; [\b] matches backspace
    .replace(/\f/g, '\\f').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t').replace(/\v/g, '\\v').replace(/\0/g, '\\0');

    return '"' + escaped.replace(/"/g, '\\"') + '"';
  }
  var _quote_1 = _quote;

  /**
   * Polyfill from <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString>.
   */
  var pad = function pad(n) {
    return (n < 10 ? '0' : '') + n;
  };

  var _toISOString = typeof Date.prototype.toISOString === 'function' ? function _toISOString(d) {
    return d.toISOString();
  } : function _toISOString(d) {
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + '.' + (d.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) + 'Z';
  };

  var _toISOString_1 = _toISOString;

  function _complement(f) {
    return function () {
      return !f.apply(this, arguments);
    };
  }
  var _complement_1 = _complement;

  function _filter(fn, list) {
    var idx = 0;
    var len = list.length;
    var result = [];

    while (idx < len) {
      if (fn(list[idx])) {
        result[result.length] = list[idx];
      }
      idx += 1;
    }
    return result;
  }
  var _filter_1 = _filter;

  function _isObject(x) {
    return Object.prototype.toString.call(x) === '[object Object]';
  }
  var _isObject_1 = _isObject;

  var XFilter = /*#__PURE__*/function () {

    function XFilter(f, xf) {
      this.xf = xf;
      this.f = f;
    }
    XFilter.prototype['@@transducer/init'] = _xfBase.init;
    XFilter.prototype['@@transducer/result'] = _xfBase.result;
    XFilter.prototype['@@transducer/step'] = function (result, input) {
      return this.f(input) ? this.xf['@@transducer/step'](result, input) : result;
    };

    return XFilter;
  }();

  var _xfilter = /*#__PURE__*/_curry2_1(function _xfilter(f, xf) {
    return new XFilter(f, xf);
  });
  var _xfilter_1 = _xfilter;

  /**
   * Takes a predicate and a `Filterable`, and returns a new filterable of the
   * same type containing the members of the given filterable which satisfy the
   * given predicate. Filterable objects include plain objects or any object
   * that has a filter method such as `Array`.
   *
   * Dispatches to the `filter` method of the second argument, if present.
   *
   * Acts as a transducer if a transformer is given in list position.
   *
   * @func
   * @memberOf R
   * @since v0.1.0
   * @category List
   * @sig Filterable f => (a -> Boolean) -> f a -> f a
   * @param {Function} pred
   * @param {Array} filterable
   * @return {Array} Filterable
   * @see R.reject, R.transduce, R.addIndex
   * @example
   *
   *      const isEven = n => n % 2 === 0;
   *
   *      R.filter(isEven, [1, 2, 3, 4]); //=> [2, 4]
   *
   *      R.filter(isEven, {a: 1, b: 2, c: 3, d: 4}); //=> {b: 2, d: 4}
   */


  var filter = /*#__PURE__*/_curry2_1( /*#__PURE__*/_dispatchable_1(['filter'], _xfilter_1, function (pred, filterable) {
    return _isObject_1(filterable) ? _reduce_1(function (acc, key) {
      if (pred(filterable[key])) {
        acc[key] = filterable[key];
      }
      return acc;
    }, {}, keys_1(filterable)) :
    // else
    _filter_1(pred, filterable);
  }));
  var filter_1 = filter;

  /**
   * The complement of [`filter`](#filter).
   *
   * Acts as a transducer if a transformer is given in list position. Filterable
   * objects include plain objects or any object that has a filter method such
   * as `Array`.
   *
   * @func
   * @memberOf R
   * @since v0.1.0
   * @category List
   * @sig Filterable f => (a -> Boolean) -> f a -> f a
   * @param {Function} pred
   * @param {Array} filterable
   * @return {Array}
   * @see R.filter, R.transduce, R.addIndex
   * @example
   *
   *      const isOdd = (n) => n % 2 === 1;
   *
   *      R.reject(isOdd, [1, 2, 3, 4]); //=> [2, 4]
   *
   *      R.reject(isOdd, {a: 1, b: 2, c: 3, d: 4}); //=> {b: 2, d: 4}
   */


  var reject = /*#__PURE__*/_curry2_1(function reject(pred, filterable) {
    return filter_1(_complement_1(pred), filterable);
  });
  var reject_1 = reject;

  function _toString(x, seen) {
    var recur = function recur(y) {
      var xs = seen.concat([x]);
      return _includes_1(y, xs) ? '<Circular>' : _toString(y, xs);
    };

    //  mapPairs :: (Object, [String]) -> [String]
    var mapPairs = function (obj, keys) {
      return _map_1(function (k) {
        return _quote_1(k) + ': ' + recur(obj[k]);
      }, keys.slice().sort());
    };

    switch (Object.prototype.toString.call(x)) {
      case '[object Arguments]':
        return '(function() { return arguments; }(' + _map_1(recur, x).join(', ') + '))';
      case '[object Array]':
        return '[' + _map_1(recur, x).concat(mapPairs(x, reject_1(function (k) {
          return (/^\d+$/.test(k)
          );
        }, keys_1(x)))).join(', ') + ']';
      case '[object Boolean]':
        return typeof x === 'object' ? 'new Boolean(' + recur(x.valueOf()) + ')' : x.toString();
      case '[object Date]':
        return 'new Date(' + (isNaN(x.valueOf()) ? recur(NaN) : _quote_1(_toISOString_1(x))) + ')';
      case '[object Null]':
        return 'null';
      case '[object Number]':
        return typeof x === 'object' ? 'new Number(' + recur(x.valueOf()) + ')' : 1 / x === -Infinity ? '-0' : x.toString(10);
      case '[object String]':
        return typeof x === 'object' ? 'new String(' + recur(x.valueOf()) + ')' : _quote_1(x);
      case '[object Undefined]':
        return 'undefined';
      default:
        if (typeof x.toString === 'function') {
          var repr = x.toString();
          if (repr !== '[object Object]') {
            return repr;
          }
        }
        return '{' + mapPairs(x, keys_1(x)).join(', ') + '}';
    }
  }
  var _toString_1 = _toString;

  /**
   * Returns the string representation of the given value. `eval`'ing the output
   * should result in a value equivalent to the input value. Many of the built-in
   * `toString` methods do not satisfy this requirement.
   *
   * If the given value is an `[object Object]` with a `toString` method other
   * than `Object.prototype.toString`, this method is invoked with no arguments
   * to produce the return value. This means user-defined constructor functions
   * can provide a suitable `toString` method. For example:
   *
   *     function Point(x, y) {
   *       this.x = x;
   *       this.y = y;
   *     }
   *
   *     Point.prototype.toString = function() {
   *       return 'new Point(' + this.x + ', ' + this.y + ')';
   *     };
   *
   *     R.toString(new Point(1, 2)); //=> 'new Point(1, 2)'
   *
   * @func
   * @memberOf R
   * @since v0.14.0
   * @category String
   * @sig * -> String
   * @param {*} val
   * @return {String}
   * @example
   *
   *      R.toString(42); //=> '42'
   *      R.toString('abc'); //=> '"abc"'
   *      R.toString([1, 2, 3]); //=> '[1, 2, 3]'
   *      R.toString({foo: 1, bar: 2, baz: 3}); //=> '{"bar": 2, "baz": 3, "foo": 1}'
   *      R.toString(new Date('2001-02-03T04:05:06Z')); //=> 'new Date("2001-02-03T04:05:06.000Z")'
   */


  var toString$2 = /*#__PURE__*/_curry1_1(function toString(val) {
    return _toString_1(val, []);
  });
  var toString_1 = toString$2;

  /**
   * Determines whether a given string matches a given regular expression.
   *
   * @func
   * @memberOf R
   * @since v0.12.0
   * @category String
   * @sig RegExp -> String -> Boolean
   * @param {RegExp} pattern
   * @param {String} str
   * @return {Boolean}
   * @see R.match
   * @example
   *
   *      R.test(/^x/, 'xyz'); //=> true
   *      R.test(/^y/, 'xyz'); //=> false
   */


  var test$1 = /*#__PURE__*/_curry2_1(function test(pattern, str) {
    if (!_isRegExp_1(pattern)) {
      throw new TypeError('‘test’ requires a value of type RegExp as its first argument; received ' + toString_1(pattern));
    }
    return _cloneRegExp_1(pattern).test(str);
  });
  var test_1 = test$1;

  /**
   * Optimized internal three-arity curry function.
   *
   * @private
   * @category Function
   * @param {Function} fn The function to curry.
   * @return {Function} The curried function.
   */


  function _curry3(fn) {
    return function f3(a, b, c) {
      switch (arguments.length) {
        case 0:
          return f3;
        case 1:
          return _isPlaceholder_1(a) ? f3 : _curry2_1(function (_b, _c) {
            return fn(a, _b, _c);
          });
        case 2:
          return _isPlaceholder_1(a) && _isPlaceholder_1(b) ? f3 : _isPlaceholder_1(a) ? _curry2_1(function (_a, _c) {
            return fn(_a, b, _c);
          }) : _isPlaceholder_1(b) ? _curry2_1(function (_b, _c) {
            return fn(a, _b, _c);
          }) : _curry1_1(function (_c) {
            return fn(a, b, _c);
          });
        default:
          return _isPlaceholder_1(a) && _isPlaceholder_1(b) && _isPlaceholder_1(c) ? f3 : _isPlaceholder_1(a) && _isPlaceholder_1(b) ? _curry2_1(function (_a, _b) {
            return fn(_a, _b, c);
          }) : _isPlaceholder_1(a) && _isPlaceholder_1(c) ? _curry2_1(function (_a, _c) {
            return fn(_a, b, _c);
          }) : _isPlaceholder_1(b) && _isPlaceholder_1(c) ? _curry2_1(function (_b, _c) {
            return fn(a, _b, _c);
          }) : _isPlaceholder_1(a) ? _curry1_1(function (_a) {
            return fn(_a, b, c);
          }) : _isPlaceholder_1(b) ? _curry1_1(function (_b) {
            return fn(a, _b, c);
          }) : _isPlaceholder_1(c) ? _curry1_1(function (_c) {
            return fn(a, b, _c);
          }) : fn(a, b, c);
      }
    };
  }
  var _curry3_1 = _curry3;

  /**
   * Creates a function that will process either the `onTrue` or the `onFalse`
   * function depending upon the result of the `condition` predicate.
   *
   * @func
   * @memberOf R
   * @since v0.8.0
   * @category Logic
   * @sig (*... -> Boolean) -> (*... -> *) -> (*... -> *) -> (*... -> *)
   * @param {Function} condition A predicate function
   * @param {Function} onTrue A function to invoke when the `condition` evaluates to a truthy value.
   * @param {Function} onFalse A function to invoke when the `condition` evaluates to a falsy value.
   * @return {Function} A new function that will process either the `onTrue` or the `onFalse`
   *                    function depending upon the result of the `condition` predicate.
   * @see R.unless, R.when, R.cond
   * @example
   *
   *      const incCount = R.ifElse(
   *        R.has('count'),
   *        R.over(R.lensProp('count'), R.inc),
   *        R.assoc('count', 1)
   *      );
   *      incCount({});           //=> { count: 1 }
   *      incCount({ count: 1 }); //=> { count: 2 }
   */


  var ifElse = /*#__PURE__*/_curry3_1(function ifElse(condition, onTrue, onFalse) {
    return curryN_1(Math.max(condition.length, onTrue.length, onFalse.length), function _ifElse() {
      return condition.apply(this, arguments) ? onTrue.apply(this, arguments) : onFalse.apply(this, arguments);
    });
  });
  var ifElse_1 = ifElse;

  var umd = createCommonjsModule(function (module, exports) {
  (function (global, factory) {
  	module.exports = factory();
  }(commonjsGlobal, (function () {
  var isMergeableObject = function isMergeableObject(value) {
  	return isNonNullObject(value)
  		&& !isSpecial(value)
  };

  function isNonNullObject(value) {
  	return !!value && typeof value === 'object'
  }

  function isSpecial(value) {
  	var stringValue = Object.prototype.toString.call(value);

  	return stringValue === '[object RegExp]'
  		|| stringValue === '[object Date]'
  		|| isReactElement(value)
  }

  // see https://github.com/facebook/react/blob/b5ac963fb791d1298e7f396236383bc955f916c1/src/isomorphic/classic/element/ReactElement.js#L21-L25
  var canUseSymbol = typeof Symbol === 'function' && Symbol.for;
  var REACT_ELEMENT_TYPE = canUseSymbol ? Symbol.for('react.element') : 0xeac7;

  function isReactElement(value) {
  	return value.$$typeof === REACT_ELEMENT_TYPE
  }

  function emptyTarget(val) {
  	return Array.isArray(val) ? [] : {}
  }

  function cloneUnlessOtherwiseSpecified(value, options) {
  	return (options.clone !== false && options.isMergeableObject(value))
  		? deepmerge(emptyTarget(value), value, options)
  		: value
  }

  function defaultArrayMerge(target, source, options) {
  	return target.concat(source).map(function(element) {
  		return cloneUnlessOtherwiseSpecified(element, options)
  	})
  }

  function getMergeFunction(key, options) {
  	if (!options.customMerge) {
  		return deepmerge
  	}
  	var customMerge = options.customMerge(key);
  	return typeof customMerge === 'function' ? customMerge : deepmerge
  }

  function mergeObject(target, source, options) {
  	var destination = {};
  	if (options.isMergeableObject(target)) {
  		Object.keys(target).forEach(function(key) {
  			destination[key] = cloneUnlessOtherwiseSpecified(target[key], options);
  		});
  	}
  	Object.keys(source).forEach(function(key) {
  		if (!options.isMergeableObject(source[key]) || !target[key]) {
  			destination[key] = cloneUnlessOtherwiseSpecified(source[key], options);
  		} else {
  			destination[key] = getMergeFunction(key, options)(target[key], source[key], options);
  		}
  	});
  	return destination
  }

  function deepmerge(target, source, options) {
  	options = options || {};
  	options.arrayMerge = options.arrayMerge || defaultArrayMerge;
  	options.isMergeableObject = options.isMergeableObject || isMergeableObject;

  	var sourceIsArray = Array.isArray(source);
  	var targetIsArray = Array.isArray(target);
  	var sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;

  	if (!sourceAndTargetTypesMatch) {
  		return cloneUnlessOtherwiseSpecified(source, options)
  	} else if (sourceIsArray) {
  		return options.arrayMerge(target, source, options)
  	} else {
  		return mergeObject(target, source, options)
  	}
  }

  deepmerge.all = function deepmergeAll(array, options) {
  	if (!Array.isArray(array)) {
  		throw new Error('first argument should be an array')
  	}

  	return array.reduce(function(prev, next) {
  		return deepmerge(prev, next, options)
  	}, {})
  };

  var deepmerge_1 = deepmerge;

  return deepmerge_1;

  })));
  });

  /*!
   * Determine if an object is a Buffer
   *
   * @author   Feross Aboukhadijeh <https://feross.org>
   * @license  MIT
   */

  var isBuffer = function isBuffer (obj) {
    return obj != null && obj.constructor != null &&
      typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
  };

  var flat = flatten;
  flatten.flatten = flatten;
  flatten.unflatten = unflatten;

  function flatten (target, opts) {
    opts = opts || {};

    var delimiter = opts.delimiter || '.';
    var maxDepth = opts.maxDepth;
    var output = {};

    function step (object, prev, currentDepth) {
      currentDepth = currentDepth || 1;
      Object.keys(object).forEach(function (key) {
        var value = object[key];
        var isarray = opts.safe && Array.isArray(value);
        var type = Object.prototype.toString.call(value);
        var isbuffer = isBuffer(value);
        var isobject = (
          type === '[object Object]' ||
          type === '[object Array]'
        );

        var newKey = prev
          ? prev + delimiter + key
          : key;

        if (!isarray && !isbuffer && isobject && Object.keys(value).length &&
          (!opts.maxDepth || currentDepth < maxDepth)) {
          return step(value, newKey, currentDepth + 1)
        }

        output[newKey] = value;
      });
    }

    step(target);

    return output
  }

  function unflatten (target, opts) {
    opts = opts || {};

    var delimiter = opts.delimiter || '.';
    var overwrite = opts.overwrite || false;
    var result = {};

    var isbuffer = isBuffer(target);
    if (isbuffer || Object.prototype.toString.call(target) !== '[object Object]') {
      return target
    }

    // safely ensure that the key is
    // an integer.
    function getkey (key) {
      var parsedKey = Number(key);

      return (
        isNaN(parsedKey) ||
        key.indexOf('.') !== -1 ||
        opts.object
      ) ? key
        : parsedKey
    }

    var sortedKeys = Object.keys(target).sort(function (keyA, keyB) {
      return keyA.length - keyB.length
    });

    sortedKeys.forEach(function (key) {
      var split = key.split(delimiter);
      var key1 = getkey(split.shift());
      var key2 = getkey(split[0]);
      var recipient = result;

      while (key2 !== undefined) {
        var type = Object.prototype.toString.call(recipient[key1]);
        var isobject = (
          type === '[object Object]' ||
          type === '[object Array]'
        );

        // do not write over falsey, non-undefined values if overwrite is false
        if (!overwrite && !isobject && typeof recipient[key1] !== 'undefined') {
          return
        }

        if ((overwrite && !isobject) || (!overwrite && recipient[key1] == null)) {
          recipient[key1] = (
            typeof key2 === 'number' &&
            !opts.object ? [] : {}
          );
        }

        recipient = recipient[key1];
        if (split.length > 0) {
          key1 = getkey(split.shift());
          key2 = getkey(split[0]);
        }
      }

      // unflatten again for 'messy objects'
      recipient[key1] = unflatten(target[key], opts);
    });

    return result
  }

  var html$1 = htm.bind(h);
  var validations = {
    Function: function Function(validator, path, value) {
      var result = validator(value);
      return result || null;
    },
    String: function () {
      var stringValidations = {
        required: ifElse_1(Boolean, function () {
          return null;
        }, function () {
          return "This field is required";
        }),
        email: ifElse_1(test_1(/^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/), function () {
          return null;
        }, function () {
          return "Enter a valid email";
        }),
        number: function number(x) {
          return utilities.type.isNumber(x) || utilities.type.isString(x) && Number(x) == x || "Enter a valid number";
        }
      };
      return function (validator, path, value) {
        var stringValidator = stringValidations[validator];
        if (!stringValidator) return null;
        var result = stringValidator(value);
        return result && _defineProperty({}, path, result) || null;
      };
    }()
  };
  var validate = curry_1(function (definition, state) {
    var validation = {};

    var _arr = Object.entries(definition);

    for (var _i = 0; _i < _arr.length; _i++) {
      var _arr$_i = _slicedToArray(_arr[_i], 2),
          path = _arr$_i[0],
          validator = _arr$_i[1];

      var storeVal = utilities.lens(path, state);
      var message = validations[utilities.type(validator)](validator, path, storeVal);
      if (message) validation[path] = message;
    }

    if (Object.keys(validation).length) return flat.unflatten(validation);else return null;
  }); //this should be re-written as a compose function that allows you to add functionality
  var useReducer = function () {
    var _state = {};
    return function (reducer) {
      var _this = this;

      var initialState = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      _state = umd(initialState, _state);

      reducer = reducer || function () {
        return _state;
      };

      return [_state, function (action) {
        var newState = reducer(_state, action);

        if (newState instanceof Promise || newState && newState.then && newState.catch) {
          return newState.then(function (response) {
            _state = response;

            _this.setState({});
          });
        } else _state = newState;

        _this.setState({});
      }];
    };
  }();
  var createVm = function createVm(viewActions) {
    return function (dispatch) {
      return map_1(function (handler) {
        return handler(dispatch);
      }, viewActions);
    };
  };
  var tools = {
    html: html$1,
    preact: preact$1,
    validate: validate
  };

  /**
   * Returns a function that always returns the given value. Note that for
   * non-primitives the value returned is a reference to the original value.
   *
   * This function is known as `const`, `constant`, or `K` (for K combinator) in
   * other languages and libraries.
   *
   * @func
   * @memberOf R
   * @since v0.1.0
   * @category Function
   * @sig a -> (* -> a)
   * @param {*} val The value to wrap in a function
   * @return {Function} A Function :: * -> val.
   * @example
   *
   *      const t = R.always('Tee');
   *      t(); //=> 'Tee'
   */


  var always = /*#__PURE__*/_curry1_1(function always(val) {
    return function () {
      return val;
    };
  });
  var always_1 = always;

  // `Identity` is a functor that holds a single value, where `map` simply
  // transforms the held value with the provided function.


  var Identity = function (x) {
    return { value: x, map: function (f) {
        return Identity(f(x));
      } };
  };

  /**
   * Returns the result of "setting" the portion of the given data structure
   * focused by the given lens to the result of applying the given function to
   * the focused value.
   *
   * @func
   * @memberOf R
   * @since v0.16.0
   * @category Object
   * @typedefn Lens s a = Functor f => (a -> f a) -> s -> f s
   * @sig Lens s a -> (a -> a) -> s -> s
   * @param {Lens} lens
   * @param {*} v
   * @param {*} x
   * @return {*}
   * @see R.prop, R.lensIndex, R.lensProp
   * @example
   *
   *      const headLens = R.lensIndex(0);
   *
   *      R.over(headLens, R.toUpper, ['foo', 'bar', 'baz']); //=> ['FOO', 'bar', 'baz']
   */
  var over = /*#__PURE__*/_curry3_1(function over(lens, f, x) {
    // The value returned by the getter function is first transformed with `f`,
    // then set as the value of an `Identity`. This is then mapped over with the
    // setter function of the lens.
    return lens(function (y) {
      return Identity(f(y));
    })(x).value;
  });
  var over_1 = over;

  /**
   * Returns the result of "setting" the portion of the given data structure
   * focused by the given lens to the given value.
   *
   * @func
   * @memberOf R
   * @since v0.16.0
   * @category Object
   * @typedefn Lens s a = Functor f => (a -> f a) -> s -> f s
   * @sig Lens s a -> a -> s -> s
   * @param {Lens} lens
   * @param {*} v
   * @param {*} x
   * @return {*}
   * @see R.prop, R.lensIndex, R.lensProp
   * @example
   *
   *      const xLens = R.lensProp('x');
   *
   *      R.set(xLens, 4, {x: 1, y: 2});  //=> {x: 4, y: 2}
   *      R.set(xLens, 8, {x: 1, y: 2});  //=> {x: 8, y: 2}
   */


  var set$2 = /*#__PURE__*/_curry3_1(function set(lens, v, x) {
    return over_1(lens, always_1(v), x);
  });
  var set_1 = set$2;

  /**
   * Determine if the passed argument is an integer.
   *
   * @private
   * @param {*} n
   * @category Type
   * @return {Boolean}
   */
  var _isInteger = Number.isInteger || function _isInteger(n) {
    return n << 0 === n;
  };

  /**
   * Makes a shallow clone of an object, setting or overriding the specified
   * property with the given value. Note that this copies and flattens prototype
   * properties onto the new object as well. All non-primitive properties are
   * copied by reference.
   *
   * @func
   * @memberOf R
   * @since v0.8.0
   * @category Object
   * @sig String -> a -> {k: v} -> {k: v}
   * @param {String} prop The property name to set
   * @param {*} val The new value
   * @param {Object} obj The object to clone
   * @return {Object} A new object equivalent to the original except for the changed property.
   * @see R.dissoc, R.pick
   * @example
   *
   *      R.assoc('c', 3, {a: 1, b: 2}); //=> {a: 1, b: 2, c: 3}
   */


  var assoc = /*#__PURE__*/_curry3_1(function assoc(prop, val, obj) {
    var result = {};
    for (var p in obj) {
      result[p] = obj[p];
    }
    result[prop] = val;
    return result;
  });
  var assoc_1 = assoc;

  /**
   * Checks if the input value is `null` or `undefined`.
   *
   * @func
   * @memberOf R
   * @since v0.9.0
   * @category Type
   * @sig * -> Boolean
   * @param {*} x The value to test.
   * @return {Boolean} `true` if `x` is `undefined` or `null`, otherwise `false`.
   * @example
   *
   *      R.isNil(null); //=> true
   *      R.isNil(undefined); //=> true
   *      R.isNil(0); //=> false
   *      R.isNil([]); //=> false
   */


  var isNil = /*#__PURE__*/_curry1_1(function isNil(x) {
    return x == null;
  });
  var isNil_1 = isNil;

  /**
   * Makes a shallow clone of an object, setting or overriding the nodes required
   * to create the given path, and placing the specific value at the tail end of
   * that path. Note that this copies and flattens prototype properties onto the
   * new object as well. All non-primitive properties are copied by reference.
   *
   * @func
   * @memberOf R
   * @since v0.8.0
   * @category Object
   * @typedefn Idx = String | Int
   * @sig [Idx] -> a -> {a} -> {a}
   * @param {Array} path the path to set
   * @param {*} val The new value
   * @param {Object} obj The object to clone
   * @return {Object} A new object equivalent to the original except along the specified path.
   * @see R.dissocPath
   * @example
   *
   *      R.assocPath(['a', 'b', 'c'], 42, {a: {b: {c: 0}}}); //=> {a: {b: {c: 42}}}
   *
   *      // Any missing or non-object keys in path will be overridden
   *      R.assocPath(['a', 'b', 'c'], 42, {a: 5}); //=> {a: {b: {c: 42}}}
   */


  var assocPath = /*#__PURE__*/_curry3_1(function assocPath(path, val, obj) {
    if (path.length === 0) {
      return val;
    }
    var idx = path[0];
    if (path.length > 1) {
      var nextObj = !isNil_1(obj) && _has_1(idx, obj) ? obj[idx] : _isInteger(path[1]) ? [] : {};
      val = assocPath(Array.prototype.slice.call(path, 1), val, nextObj);
    }
    if (_isInteger(idx) && _isArray(obj)) {
      var arr = [].concat(obj);
      arr[idx] = val;
      return arr;
    } else {
      return assoc_1(idx, val, obj);
    }
  });
  var assocPath_1 = assocPath;

  /**
   * Returns a lens for the given getter and setter functions. The getter "gets"
   * the value of the focus; the setter "sets" the value of the focus. The setter
   * should not mutate the data structure.
   *
   * @func
   * @memberOf R
   * @since v0.8.0
   * @category Object
   * @typedefn Lens s a = Functor f => (a -> f a) -> s -> f s
   * @sig (s -> a) -> ((a, s) -> s) -> Lens s a
   * @param {Function} getter
   * @param {Function} setter
   * @return {Lens}
   * @see R.view, R.set, R.over, R.lensIndex, R.lensProp
   * @example
   *
   *      const xLens = R.lens(R.prop('x'), R.assoc('x'));
   *
   *      R.view(xLens, {x: 1, y: 2});            //=> 1
   *      R.set(xLens, 4, {x: 1, y: 2});          //=> {x: 4, y: 2}
   *      R.over(xLens, R.negate, {x: 1, y: 2});  //=> {x: -1, y: 2}
   */


  var lens$1 = /*#__PURE__*/_curry2_1(function lens(getter, setter) {
    return function (toFunctorFn) {
      return function (target) {
        return map_1(function (focus) {
          return setter(focus, target);
        }, toFunctorFn(getter(target)));
      };
    };
  });
  var lens_1 = lens$1;

  /**
   * Retrieve the value at a given path.
   *
   * @func
   * @memberOf R
   * @since v0.2.0
   * @category Object
   * @typedefn Idx = String | Int
   * @sig [Idx] -> {a} -> a | Undefined
   * @param {Array} path The path to use.
   * @param {Object} obj The object to retrieve the nested property from.
   * @return {*} The data at `path`.
   * @see R.prop
   * @example
   *
   *      R.path(['a', 'b'], {a: {b: 2}}); //=> 2
   *      R.path(['a', 'b'], {c: {b: 2}}); //=> undefined
   */


  var path$1 = /*#__PURE__*/_curry2_1(function path(paths, obj) {
    var val = obj;
    var idx = 0;
    while (idx < paths.length) {
      if (val == null) {
        return;
      }
      val = val[paths[idx]];
      idx += 1;
    }
    return val;
  });
  var path_1 = path$1;

  /**
   * Returns a lens whose focus is the specified path.
   *
   * @func
   * @memberOf R
   * @since v0.19.0
   * @category Object
   * @typedefn Idx = String | Int
   * @typedefn Lens s a = Functor f => (a -> f a) -> s -> f s
   * @sig [Idx] -> Lens s a
   * @param {Array} path The path to use.
   * @return {Lens}
   * @see R.view, R.set, R.over
   * @example
   *
   *      const xHeadYLens = R.lensPath(['x', 0, 'y']);
   *
   *      R.view(xHeadYLens, {x: [{y: 2, z: 3}, {y: 4, z: 5}]});
   *      //=> 2
   *      R.set(xHeadYLens, 1, {x: [{y: 2, z: 3}, {y: 4, z: 5}]});
   *      //=> {x: [{y: 1, z: 3}, {y: 4, z: 5}]}
   *      R.over(xHeadYLens, R.negate, {x: [{y: 2, z: 3}, {y: 4, z: 5}]});
   *      //=> {x: [{y: -2, z: 3}, {y: 4, z: 5}]}
   */


  var lensPath = /*#__PURE__*/_curry1_1(function lensPath(p) {
    return lens_1(path_1(p), assocPath_1(p));
  });
  var lensPath_1 = lensPath;

  function _templateObject() {
    var data = _taggedTemplateLiteral(["\n      <div>", "</div>\n    "]);

    _templateObject = function _templateObject() {
      return data;
    };

    return data;
  }
  //rlens('path.to')

  var rLens = function rLens(path) {
    return lensPath_1("string" === typeof path ? path.split(".") : path);
  };

  var baseActions = {
    mutate: function mutate(state, action) {
      return set_1(rLens(action.path), action.value, state);
    },
    loading: function loading(state, action) {
      return set_1(rLens("loading"), action.value, state);
    }
  };
  var createReducer = function createReducer(request, actions) {
    return function (state, action) {
      return action && actions[action.id] ? actions[action.id].call(request, state, action) : utilities.log(state, "invalid action ".concat(action && action.id));
    };
  }; //pass in request handler (api.request)

  var store$2 = function () {
    var _state = {};
    var _actions = baseActions;

    var request = function request() {
      return Promise.reject("request handler not set");
    };

    var storeWrapper = function storeWrapper(props) {
      var _props$actions = props.actions,
          actions = _props$actions === void 0 ? {} : _props$actions,
          _props$initialState = props.initialState,
          initialState = _props$initialState === void 0 ? {} : _props$initialState,
          _props$children = props.children,
          children = _props$children === void 0 ? [] : _props$children,
          _props$initialize = props.initialize,
          _props$requestHandler = props.requestHandler,
          requestHandler = _props$requestHandler === void 0 ? request : _props$requestHandler,
          id = props.id;

      var _children = _slicedToArray(children, 1),
          child = _children[0];

      _actions = Object.assign(_actions, flat(actions, " "));
      _state = umd(initialState, _state);

      var _useReducer$call = useReducer.call(this, createReducer(requestHandler, _actions), _state),
          _useReducer$call2 = _slicedToArray(_useReducer$call, 2),
          state = _useReducer$call2[0],
          dispatch = _useReducer$call2[1]; //instead of calling dispatch({type: 'form submit', data: {}}) it is dispatch('form submit')({data})


      var ogDispatch = dispatch;
      dispatch = curry_1(function (id, action) {
        var promise = ogDispatch.call(request, Object.assign({
          id: id
        }, action || {}));

        if (promise instanceof Promise || promise && promise.then && promise.catch) {
          ogDispatch({
            id: "loading",
            value: true
          });
          promise.then(function () {
            ogDispatch({
              id: "loading",
              value: false
            });
          });
        }
      });
      return html$1(_templateObject(), child({
        state: state,
        dispatch: dispatch
      }));
    };

    storeWrapper.setGlobalRequestHandler = function (handler) {
      request = handler;
    };

    return storeWrapper;
  }();

  store$2.createReducer = createReducer;
  store$2.baseActions = baseActions;

  var getDynamicStyles_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

  exports['default'] = getDynamicStyles;
  /**
   * Extracts a styles object with only props that contain function values.
   */
  function getDynamicStyles(styles) {
    var to = null;

    for (var key in styles) {
      var value = styles[key];
      var type = typeof value === 'undefined' ? 'undefined' : _typeof(value);

      if (type === 'function') {
        if (!to) to = {};
        to[key] = value;
      } else if (type === 'object' && value !== null && !Array.isArray(value)) {
        var extracted = getDynamicStyles(value);
        if (extracted) {
          if (!to) to = {};
          to[key] = extracted;
        }
      }
    }

    return to;
  }
  });

  unwrapExports(getDynamicStyles_1);

  var toCssValue_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports['default'] = toCssValue;
  var join = function join(value, by) {
    var result = '';
    for (var i = 0; i < value.length; i++) {
      // Remove !important from the value, it will be readded later.
      if (value[i] === '!important') break;
      if (result) result += by;
      result += value[i];
    }
    return result;
  };

  /**
   * Converts array values to string.
   *
   * `margin: [['5px', '10px']]` > `margin: 5px 10px;`
   * `border: ['1px', '2px']` > `border: 1px, 2px;`
   * `margin: [['5px', '10px'], '!important']` > `margin: 5px 10px !important;`
   * `color: ['red', !important]` > `color: red !important;`
   */
  function toCssValue(value) {
    var ignoreImportant = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

    if (!Array.isArray(value)) return value;

    var cssValue = '';

    // Support space separated values via `[['5px', '10px']]`.
    if (Array.isArray(value[0])) {
      for (var i = 0; i < value.length; i++) {
        if (value[i] === '!important') break;
        if (cssValue) cssValue += ', ';
        cssValue += join(value[i], ' ');
      }
    } else cssValue = join(value, ', ');

    // Add !important, because it was ignored.
    if (!ignoreImportant && value[value.length - 1] === '!important') {
      cssValue += ' !important';
    }

    return cssValue;
  }
  });

  unwrapExports(toCssValue_1);

  var SheetsRegistry_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  /**
   * Sheets registry to access them all at one place.
   */
  var SheetsRegistry = function () {
    function SheetsRegistry() {
      _classCallCheck(this, SheetsRegistry);

      this.registry = [];
    }

    _createClass(SheetsRegistry, [{
      key: 'add',


      /**
       * Register a Style Sheet.
       */
      value: function add(sheet) {
        var registry = this.registry;
        var index = sheet.options.index;


        if (registry.indexOf(sheet) !== -1) return;

        if (registry.length === 0 || index >= this.index) {
          registry.push(sheet);
          return;
        }

        // Find a position.
        for (var i = 0; i < registry.length; i++) {
          if (registry[i].options.index > index) {
            registry.splice(i, 0, sheet);
            return;
          }
        }
      }

      /**
       * Reset the registry.
       */

    }, {
      key: 'reset',
      value: function reset() {
        this.registry = [];
      }

      /**
       * Remove a Style Sheet.
       */

    }, {
      key: 'remove',
      value: function remove(sheet) {
        var index = this.registry.indexOf(sheet);
        this.registry.splice(index, 1);
      }

      /**
       * Convert all attached sheets to a CSS string.
       */

    }, {
      key: 'toString',
      value: function toString(options) {
        return this.registry.filter(function (sheet) {
          return sheet.attached;
        }).map(function (sheet) {
          return sheet.toString(options);
        }).join('\n');
      }
    }, {
      key: 'index',


      /**
       * Current highest index number.
       */
      get: function get() {
        return this.registry.length === 0 ? 0 : this.registry[this.registry.length - 1].options.index;
      }
    }]);

    return SheetsRegistry;
  }();

  exports['default'] = SheetsRegistry;
  });

  unwrapExports(SheetsRegistry_1);

  /**
   * Copyright 2014-2015, Facebook, Inc.
   * All rights reserved.
   *
   * This source code is licensed under the BSD-style license found in the
   * LICENSE file in the root directory of this source tree. An additional grant
   * of patent rights can be found in the PATENTS file in the same directory.
   */

  /**
   * Similar to invariant but only logs a warning if the condition is not met.
   * This can be used to log issues in development environments in critical
   * paths. Removing the logging code for production environments will keep the
   * same logic and follow the same code paths.
   */

  var warning = function() {};

  {
    warning = function(condition, format, args) {
      var len = arguments.length;
      args = new Array(len > 2 ? len - 2 : 0);
      for (var key = 2; key < len; key++) {
        args[key - 2] = arguments[key];
      }
      if (format === undefined) {
        throw new Error(
          '`warning(condition, format, ...args)` requires a warning ' +
          'message argument'
        );
      }

      if (format.length < 10 || (/^[s\W]*$/).test(format)) {
        throw new Error(
          'The warning format should be able to uniquely identify this ' +
          'warning. Please, use a more descriptive format than: ' + format
        );
      }

      if (!condition) {
        var argIndex = 0;
        var message = 'Warning: ' +
          format.replace(/%s/g, function() {
            return args[argIndex++];
          });
        if (typeof console !== 'undefined') {
          console.error(message);
        }
        try {
          // This error was thrown as a convenience so that you can use this stack
          // to find the callsite that caused this warning to fire.
          throw new Error(message);
        } catch(x) {}
      }
    };
  }

  var browser = warning;

  var SheetsManager_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



  var _warning2 = _interopRequireDefault(browser);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  /**
   * SheetsManager is like a WeakMap which is designed to count StyleSheet
   * instances and attach/detach automatically.
   */
  var SheetsManager = function () {
    function SheetsManager() {
      _classCallCheck(this, SheetsManager);

      this.sheets = [];
      this.refs = [];
      this.keys = [];
    }

    _createClass(SheetsManager, [{
      key: 'get',
      value: function get(key) {
        var index = this.keys.indexOf(key);
        return this.sheets[index];
      }
    }, {
      key: 'add',
      value: function add(key, sheet) {
        var sheets = this.sheets,
            refs = this.refs,
            keys = this.keys;

        var index = sheets.indexOf(sheet);

        if (index !== -1) return index;

        sheets.push(sheet);
        refs.push(0);
        keys.push(key);

        return sheets.length - 1;
      }
    }, {
      key: 'manage',
      value: function manage(key) {
        var index = this.keys.indexOf(key);
        var sheet = this.sheets[index];
        if (this.refs[index] === 0) sheet.attach();
        this.refs[index]++;
        if (!this.keys[index]) this.keys.splice(index, 0, key);
        return sheet;
      }
    }, {
      key: 'unmanage',
      value: function unmanage(key) {
        var index = this.keys.indexOf(key);
        if (index === -1) {
          // eslint-ignore-next-line no-console
          (0, _warning2['default'])(false, "SheetsManager: can't find sheet to unmanage");
          return;
        }
        if (this.refs[index] > 0) {
          this.refs[index]--;
          if (this.refs[index] === 0) this.sheets[index].detach();
        }
      }
    }, {
      key: 'size',
      get: function get() {
        return this.keys.length;
      }
    }]);

    return SheetsManager;
  }();

  exports['default'] = SheetsManager;
  });

  unwrapExports(SheetsManager_1);

  var toCss_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports['default'] = toCss;



  var _toCssValue2 = _interopRequireDefault(toCssValue_1);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  /**
   * Indent a string.
   * http://jsperf.com/array-join-vs-for
   */
  function indentStr(str, indent) {
    var result = '';
    for (var index = 0; index < indent; index++) {
      result += '  ';
    }return result + str;
  }

  /**
   * Converts a Rule to CSS string.
   */

  function toCss(selector, style) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    var result = '';

    if (!style) return result;

    var _options$indent = options.indent,
        indent = _options$indent === undefined ? 0 : _options$indent;
    var fallbacks = style.fallbacks;


    indent++;

    // Apply fallbacks first.
    if (fallbacks) {
      // Array syntax {fallbacks: [{prop: value}]}
      if (Array.isArray(fallbacks)) {
        for (var index = 0; index < fallbacks.length; index++) {
          var fallback = fallbacks[index];
          for (var prop in fallback) {
            var value = fallback[prop];
            if (value != null) {
              result += '\n' + indentStr(prop + ': ' + (0, _toCssValue2['default'])(value) + ';', indent);
            }
          }
        }
      } else {
        // Object syntax {fallbacks: {prop: value}}
        for (var _prop in fallbacks) {
          var _value = fallbacks[_prop];
          if (_value != null) {
            result += '\n' + indentStr(_prop + ': ' + (0, _toCssValue2['default'])(_value) + ';', indent);
          }
        }
      }
    }

    for (var _prop2 in style) {
      var _value2 = style[_prop2];
      if (_value2 != null && _prop2 !== 'fallbacks') {
        result += '\n' + indentStr(_prop2 + ': ' + (0, _toCssValue2['default'])(_value2) + ';', indent);
      }
    }

    // Allow empty style in this case, because properties will be added dynamically.
    if (!result && !options.allowEmpty) return result;

    indent--;
    result = indentStr(selector + ' {' + result + '\n', indent) + indentStr('}', indent);

    return result;
  }
  });

  unwrapExports(toCss_1);

  var StyleRule_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

  var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



  var _warning2 = _interopRequireDefault(browser);



  var _toCss2 = _interopRequireDefault(toCss_1);



  var _toCssValue2 = _interopRequireDefault(toCssValue_1);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  var StyleRule = function () {
    function StyleRule(key, style, options) {
      _classCallCheck(this, StyleRule);

      this.type = 'style';
      this.isProcessed = false;
      var sheet = options.sheet,
          Renderer = options.Renderer,
          selector = options.selector;

      this.key = key;
      this.options = options;
      this.style = style;
      if (selector) this.selectorText = selector;
      this.renderer = sheet ? sheet.renderer : new Renderer();
    }

    /**
     * Set selector string.
     * Attention: use this with caution. Most browsers didn't implement
     * selectorText setter, so this may result in rerendering of entire Style Sheet.
     */


    _createClass(StyleRule, [{
      key: 'prop',


      /**
       * Get or set a style property.
       */
      value: function prop(name, value) {
        // It's a getter.
        if (value === undefined) return this.style[name];

        // Don't do anything if the value has not changed.
        if (this.style[name] === value) return this;

        value = this.options.jss.plugins.onChangeValue(value, name, this);

        var isEmpty = value == null || value === false;
        var isDefined = name in this.style;

        // Value is empty and wasn't defined before.
        if (isEmpty && !isDefined) return this;

        // We are going to remove this value.
        var remove = isEmpty && isDefined;

        if (remove) delete this.style[name];else this.style[name] = value;

        // Renderable is defined if StyleSheet option `link` is true.
        if (this.renderable) {
          if (remove) this.renderer.removeProperty(this.renderable, name);else this.renderer.setProperty(this.renderable, name, value);
          return this;
        }

        var sheet = this.options.sheet;

        if (sheet && sheet.attached) {
          (0, _warning2['default'])(false, 'Rule is not linked. Missing sheet option "link: true".');
        }
        return this;
      }

      /**
       * Apply rule to an element inline.
       */

    }, {
      key: 'applyTo',
      value: function applyTo(renderable) {
        var json = this.toJSON();
        for (var prop in json) {
          this.renderer.setProperty(renderable, prop, json[prop]);
        }return this;
      }

      /**
       * Returns JSON representation of the rule.
       * Fallbacks are not supported.
       * Useful for inline styles.
       */

    }, {
      key: 'toJSON',
      value: function toJSON() {
        var json = {};
        for (var prop in this.style) {
          var value = this.style[prop];
          if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) !== 'object') json[prop] = value;else if (Array.isArray(value)) json[prop] = (0, _toCssValue2['default'])(value);
        }
        return json;
      }

      /**
       * Generates a CSS string.
       */

    }, {
      key: 'toString',
      value: function toString(options) {
        var sheet = this.options.sheet;

        var link = sheet ? sheet.options.link : false;
        var opts = link ? _extends({}, options, { allowEmpty: true }) : options;
        return (0, _toCss2['default'])(this.selector, this.style, opts);
      }
    }, {
      key: 'selector',
      set: function set(selector) {
        if (selector === this.selectorText) return;

        this.selectorText = selector;

        if (!this.renderable) return;

        var hasChanged = this.renderer.setSelector(this.renderable, selector);

        // If selector setter is not implemented, rerender the rule.
        if (!hasChanged && this.renderable) {
          var renderable = this.renderer.replaceRule(this.renderable, this);
          if (renderable) this.renderable = renderable;
        }
      }

      /**
       * Get selector string.
       */
      ,
      get: function get() {
        return this.selectorText;
      }
    }]);

    return StyleRule;
  }();

  exports['default'] = StyleRule;
  });

  unwrapExports(StyleRule_1);

  function symbolObservablePonyfill(root) {
  	var result;
  	var Symbol = root.Symbol;

  	if (typeof Symbol === 'function') {
  		if (Symbol.observable) {
  			result = Symbol.observable;
  		} else {
  			result = Symbol('observable');
  			Symbol.observable = result;
  		}
  	} else {
  		result = '@@observable';
  	}

  	return result;
  }

  /* global window */

  var root;

  if (typeof self !== 'undefined') {
    root = self;
  } else if (typeof window !== 'undefined') {
    root = window;
  } else if (typeof global !== 'undefined') {
    root = global;
  } else if (typeof module !== 'undefined') {
    root = module;
  } else {
    root = Function('return this')();
  }

  var result = symbolObservablePonyfill(root);

  var isObservable = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });



  var _symbolObservable2 = _interopRequireDefault(result);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  exports['default'] = function (value) {
    return value && value[_symbolObservable2['default']] && value === value[_symbolObservable2['default']]();
  };
  });

  unwrapExports(isObservable);

  var cloneStyle_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

  exports['default'] = cloneStyle;



  var _isObservable2 = _interopRequireDefault(isObservable);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  var isArray = Array.isArray;
  function cloneStyle(style) {
    // Support empty values in case user ends up with them by accident.
    if (style == null) return style;

    // Support string value for SimpleRule.
    var typeOfStyle = typeof style === 'undefined' ? 'undefined' : _typeof(style);

    if (typeOfStyle === 'string' || typeOfStyle === 'number' || typeOfStyle === 'function') {
      return style;
    }

    // Support array for FontFaceRule.
    if (isArray(style)) return style.map(cloneStyle);

    // Support Observable styles.  Observables are immutable, so we don't need to
    // copy them.
    if ((0, _isObservable2['default'])(style)) return style;

    var newStyle = {};
    for (var name in style) {
      var value = style[name];
      if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
        newStyle[name] = cloneStyle(value);
        continue;
      }
      newStyle[name] = value;
    }

    return newStyle;
  }
  });

  unwrapExports(cloneStyle_1);

  var createRule_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports['default'] = createRule;



  var _warning2 = _interopRequireDefault(browser);



  var _StyleRule2 = _interopRequireDefault(StyleRule_1);



  var _cloneStyle2 = _interopRequireDefault(cloneStyle_1);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  /**
   * Create a rule instance.
   */
  function createRule() {
    var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'unnamed';
    var decl = arguments[1];
    var options = arguments[2];
    var jss = options.jss;

    var declCopy = (0, _cloneStyle2['default'])(decl);

    var rule = jss.plugins.onCreateRule(name, declCopy, options);
    if (rule) return rule;

    // It is an at-rule and it has no instance.
    if (name[0] === '@') {
      (0, _warning2['default'])(false, '[JSS] Unknown at-rule %s', name);
    }

    return new _StyleRule2['default'](name, declCopy, options);
  }
  });

  unwrapExports(createRule_1);

  var linkRule_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports["default"] = linkRule;
  /**
   * Link rule with CSSStyleRule and nested rules with corresponding nested cssRules if both exists.
   */
  function linkRule(rule, cssRule) {
    rule.renderable = cssRule;
    if (rule.rules && cssRule.cssRules) rule.rules.link(cssRule.cssRules);
  }
  });

  unwrapExports(linkRule_1);

  var _escape = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var CSS = commonjsGlobal.CSS;

  var escapeRegex = /([[\].#*$><+~=|^:(),"'`])/g;

  exports['default'] = function (str) {

    if (!CSS || !CSS.escape) {
      return str.replace(escapeRegex, '\\$1');
    }

    return CSS.escape(str);
  };
  });

  unwrapExports(_escape);

  var RuleList_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

  var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



  var _createRule2 = _interopRequireDefault(createRule_1);



  var _linkRule2 = _interopRequireDefault(linkRule_1);



  var _StyleRule2 = _interopRequireDefault(StyleRule_1);



  var _escape2 = _interopRequireDefault(_escape);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  /**
   * Contains rules objects and allows adding/removing etc.
   * Is used for e.g. by `StyleSheet` or `ConditionalRule`.
   */
  var RuleList = function () {

    // Original styles object.
    function RuleList(options) {
      var _this = this;

      _classCallCheck(this, RuleList);

      this.map = {};
      this.raw = {};
      this.index = [];

      this.update = function (name, data) {
        var _options = _this.options,
            plugins = _options.jss.plugins,
            sheet = _options.sheet;

        if (typeof name === 'string') {
          plugins.onUpdate(data, _this.get(name), sheet);
        } else {
          for (var index = 0; index < _this.index.length; index++) {
            plugins.onUpdate(name, _this.index[index], sheet);
          }
        }
      };

      this.options = options;
      this.classes = options.classes;
    }

    /**
     * Create and register rule.
     *
     * Will not render after Style Sheet was rendered the first time.
     */


    // Used to ensure correct rules order.

    // Rules registry for access by .get() method.
    // It contains the same rule registered by name and by selector.


    _createClass(RuleList, [{
      key: 'add',
      value: function add(name, decl, options) {
        var _options2 = this.options,
            parent = _options2.parent,
            sheet = _options2.sheet,
            jss = _options2.jss,
            Renderer = _options2.Renderer,
            generateClassName = _options2.generateClassName;


        options = _extends({
          classes: this.classes,
          parent: parent,
          sheet: sheet,
          jss: jss,
          Renderer: Renderer,
          generateClassName: generateClassName
        }, options);

        if (!options.selector && this.classes[name]) {
          options.selector = '.' + (0, _escape2['default'])(this.classes[name]);
        }

        this.raw[name] = decl;

        var rule = (0, _createRule2['default'])(name, decl, options);

        var className = void 0;

        if (!options.selector && rule instanceof _StyleRule2['default']) {
          className = generateClassName(rule, sheet);
          rule.selector = '.' + (0, _escape2['default'])(className);
        }

        this.register(rule, className);

        var index = options.index === undefined ? this.index.length : options.index;
        this.index.splice(index, 0, rule);

        return rule;
      }

      /**
       * Get a rule.
       */

    }, {
      key: 'get',
      value: function get(name) {
        return this.map[name];
      }

      /**
       * Delete a rule.
       */

    }, {
      key: 'remove',
      value: function remove(rule) {
        this.unregister(rule);
        this.index.splice(this.indexOf(rule), 1);
      }

      /**
       * Get index of a rule.
       */

    }, {
      key: 'indexOf',
      value: function indexOf(rule) {
        return this.index.indexOf(rule);
      }

      /**
       * Run `onProcessRule()` plugins on every rule.
       */

    }, {
      key: 'process',
      value: function process() {
        var plugins = this.options.jss.plugins;
        // We need to clone array because if we modify the index somewhere else during a loop
        // we end up with very hard-to-track-down side effects.

        this.index.slice(0).forEach(plugins.onProcessRule, plugins);
      }

      /**
       * Register a rule in `.map` and `.classes` maps.
       */

    }, {
      key: 'register',
      value: function register(rule, className) {
        this.map[rule.key] = rule;
        if (rule instanceof _StyleRule2['default']) {
          this.map[rule.selector] = rule;
          if (className) this.classes[rule.key] = className;
        }
      }

      /**
       * Unregister a rule.
       */

    }, {
      key: 'unregister',
      value: function unregister(rule) {
        delete this.map[rule.key];
        if (rule instanceof _StyleRule2['default']) {
          delete this.map[rule.selector];
          delete this.classes[rule.key];
        }
      }

      /**
       * Update the function values with a new data.
       */

    }, {
      key: 'link',


      /**
       * Link renderable rules with CSSRuleList.
       */
      value: function link(cssRules) {
        var map = this.options.sheet.renderer.getUnescapedKeysMap(this.index);

        for (var i = 0; i < cssRules.length; i++) {
          var cssRule = cssRules[i];
          var _key = this.options.sheet.renderer.getKey(cssRule);
          if (map[_key]) _key = map[_key];
          var rule = this.map[_key];
          if (rule) (0, _linkRule2['default'])(rule, cssRule);
        }
      }

      /**
       * Convert rules to a CSS string.
       */

    }, {
      key: 'toString',
      value: function toString(options) {
        var str = '';
        var sheet = this.options.sheet;

        var link = sheet ? sheet.options.link : false;

        for (var index = 0; index < this.index.length; index++) {
          var rule = this.index[index];
          var css = rule.toString(options);

          // No need to render an empty rule.
          if (!css && !link) continue;

          if (str) str += '\n';
          str += css;
        }

        return str;
      }
    }]);

    return RuleList;
  }();

  exports['default'] = RuleList;
  });

  unwrapExports(RuleList_1);

  var sheets = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });



  var _SheetsRegistry2 = _interopRequireDefault(SheetsRegistry_1);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  /**
   * This is a global sheets registry. Only DomRenderer will add sheets to it.
   * On the server one should use an own SheetsRegistry instance and add the
   * sheets to it, because you need to make sure to create a new registry for
   * each request in order to not leak sheets across requests.
   */
  exports['default'] = new _SheetsRegistry2['default']();
  });

  unwrapExports(sheets);

  var StyleSheet_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

  var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



  var _linkRule2 = _interopRequireDefault(linkRule_1);



  var _RuleList2 = _interopRequireDefault(RuleList_1);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  /* eslint-disable-next-line no-use-before-define */
  var StyleSheet = function () {
    function StyleSheet(styles, options) {
      var _this = this;

      _classCallCheck(this, StyleSheet);

      this.update = function (name, data) {
        if (typeof name === 'string') {
          _this.rules.update(name, data);
        } else {
          _this.rules.update(name);
        }
        return _this;
      };

      this.attached = false;
      this.deployed = false;
      this.linked = false;
      this.classes = {};
      this.options = _extends({}, options, {
        sheet: this,
        parent: this,
        classes: this.classes
      });
      this.renderer = new options.Renderer(this);
      this.rules = new _RuleList2['default'](this.options);

      for (var _name in styles) {
        this.rules.add(_name, styles[_name]);
      }

      this.rules.process();
    }

    /**
     * Attach renderable to the render tree.
     */


    _createClass(StyleSheet, [{
      key: 'attach',
      value: function attach() {
        if (this.attached) return this;
        if (!this.deployed) this.deploy();
        this.renderer.attach();
        if (!this.linked && this.options.link) this.link();
        this.attached = true;
        return this;
      }

      /**
       * Remove renderable from render tree.
       */

    }, {
      key: 'detach',
      value: function detach() {
        if (!this.attached) return this;
        this.renderer.detach();
        this.attached = false;
        return this;
      }

      /**
       * Add a rule to the current stylesheet.
       * Will insert a rule also after the stylesheet has been rendered first time.
       */

    }, {
      key: 'addRule',
      value: function addRule(name, decl, options) {
        var queue = this.queue;

        // Plugins can create rules.
        // In order to preserve the right order, we need to queue all `.addRule` calls,
        // which happen after the first `rules.add()` call.

        if (this.attached && !queue) this.queue = [];

        var rule = this.rules.add(name, decl, options);
        this.options.jss.plugins.onProcessRule(rule);

        if (this.attached) {
          if (!this.deployed) return rule;
          // Don't insert rule directly if there is no stringified version yet.
          // It will be inserted all together when .attach is called.
          if (queue) queue.push(rule);else {
            this.insertRule(rule);
            if (this.queue) {
              this.queue.forEach(this.insertRule, this);
              this.queue = undefined;
            }
          }
          return rule;
        }

        // We can't add rules to a detached style node.
        // We will redeploy the sheet once user will attach it.
        this.deployed = false;

        return rule;
      }

      /**
       * Insert rule into the StyleSheet
       */

    }, {
      key: 'insertRule',
      value: function insertRule(rule) {
        var renderable = this.renderer.insertRule(rule);
        if (renderable && this.options.link) (0, _linkRule2['default'])(rule, renderable);
      }

      /**
       * Create and add rules.
       * Will render also after Style Sheet was rendered the first time.
       */

    }, {
      key: 'addRules',
      value: function addRules(styles, options) {
        var added = [];
        for (var _name2 in styles) {
          added.push(this.addRule(_name2, styles[_name2], options));
        }
        return added;
      }

      /**
       * Get a rule by name.
       */

    }, {
      key: 'getRule',
      value: function getRule(name) {
        return this.rules.get(name);
      }

      /**
       * Delete a rule by name.
       * Returns `true`: if rule has been deleted from the DOM.
       */

    }, {
      key: 'deleteRule',
      value: function deleteRule(name) {
        var rule = this.rules.get(name);

        if (!rule) return false;

        this.rules.remove(rule);

        if (this.attached && rule.renderable) {
          return this.renderer.deleteRule(rule.renderable);
        }

        return true;
      }

      /**
       * Get index of a rule.
       */

    }, {
      key: 'indexOf',
      value: function indexOf(rule) {
        return this.rules.indexOf(rule);
      }

      /**
       * Deploy pure CSS string to a renderable.
       */

    }, {
      key: 'deploy',
      value: function deploy() {
        this.renderer.deploy();
        this.deployed = true;
        return this;
      }

      /**
       * Link renderable CSS rules from sheet with their corresponding models.
       */

    }, {
      key: 'link',
      value: function link() {
        var cssRules = this.renderer.getRules();

        // Is undefined when VirtualRenderer is used.
        if (cssRules) this.rules.link(cssRules);
        this.linked = true;
        return this;
      }

      /**
       * Update the function values with a new data.
       */

    }, {
      key: 'toString',


      /**
       * Convert rules to a CSS string.
       */
      value: function toString(options) {
        return this.rules.toString(options);
      }
    }]);

    return StyleSheet;
  }();

  exports['default'] = StyleSheet;
  });

  unwrapExports(StyleSheet_1);

  var moduleId = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var ns = '2f1acc6c3a606b082e5eef5e54414ffb';
  if (commonjsGlobal[ns] == null) commonjsGlobal[ns] = 0;

  // Bundle may contain multiple JSS versions at the same time. In order to identify
  // the current version with just one short number and use it for classes generation
  // we use a counter. Also it is more accurate, because user can manually reevaluate
  // the module.
  exports['default'] = commonjsGlobal[ns]++;
  });

  unwrapExports(moduleId);

  var createGenerateClassName = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });



  var _warning2 = _interopRequireDefault(browser);



  var _StyleSheet2 = _interopRequireDefault(StyleSheet_1);



  var _moduleId2 = _interopRequireDefault(moduleId);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  var maxRules = 1e10;

  /**
   * Returns a function which generates unique class names based on counters.
   * When new generator function is created, rule counter is reseted.
   * We need to reset the rule counter for SSR for each request.
   */

  exports['default'] = function () {
    var ruleCounter = 0;
    var defaultPrefix = '';

    return function (rule, sheet) {
      ruleCounter += 1;

      if (ruleCounter > maxRules) {
        (0, _warning2['default'])(false, '[JSS] You might have a memory leak. Rule counter is at %s.', ruleCounter);
      }

      var prefix = defaultPrefix;
      var jssId = '';

      if (sheet) {
        prefix = sheet.options.classNamePrefix || defaultPrefix;
        if (sheet.options.jss.id != null) jssId += sheet.options.jss.id;
      }

      return prefix + rule.key + '-' + _moduleId2['default'] + (jssId && '-' + jssId) + '-' + ruleCounter;
    };
  };
  });

  unwrapExports(createGenerateClassName);

  var _typeof$1 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

  var isBrowser = (typeof window === "undefined" ? "undefined" : _typeof$1(window)) === "object" && (typeof document === "undefined" ? "undefined" : _typeof$1(document)) === 'object' && document.nodeType === 9;

  var PluginsRegistry_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



  var _warning2 = _interopRequireDefault(browser);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  var PluginsRegistry = function () {
    function PluginsRegistry() {
      _classCallCheck(this, PluginsRegistry);

      this.hooks = {
        onCreateRule: [],
        onProcessRule: [],
        onProcessStyle: [],
        onProcessSheet: [],
        onChangeValue: [],
        onUpdate: []

        /**
         * Call `onCreateRule` hooks and return an object if returned by a hook.
         */
      };
    }

    _createClass(PluginsRegistry, [{
      key: 'onCreateRule',
      value: function onCreateRule(name, decl, options) {
        for (var i = 0; i < this.hooks.onCreateRule.length; i++) {
          var rule = this.hooks.onCreateRule[i](name, decl, options);
          if (rule) return rule;
        }
        return null;
      }

      /**
       * Call `onProcessRule` hooks.
       */

    }, {
      key: 'onProcessRule',
      value: function onProcessRule(rule) {
        if (rule.isProcessed) return;
        var sheet = rule.options.sheet;

        for (var i = 0; i < this.hooks.onProcessRule.length; i++) {
          this.hooks.onProcessRule[i](rule, sheet);
        }

        // $FlowFixMe
        if (rule.style) this.onProcessStyle(rule.style, rule, sheet);

        rule.isProcessed = true;
      }

      /**
       * Call `onProcessStyle` hooks.
       */

    }, {
      key: 'onProcessStyle',
      value: function onProcessStyle(style, rule, sheet) {
        var nextStyle = style;

        for (var i = 0; i < this.hooks.onProcessStyle.length; i++) {
          nextStyle = this.hooks.onProcessStyle[i](nextStyle, rule, sheet);
          // $FlowFixMe
          rule.style = nextStyle;
        }
      }

      /**
       * Call `onProcessSheet` hooks.
       */

    }, {
      key: 'onProcessSheet',
      value: function onProcessSheet(sheet) {
        for (var i = 0; i < this.hooks.onProcessSheet.length; i++) {
          this.hooks.onProcessSheet[i](sheet);
        }
      }

      /**
       * Call `onUpdate` hooks.
       */

    }, {
      key: 'onUpdate',
      value: function onUpdate(data, rule, sheet) {
        for (var i = 0; i < this.hooks.onUpdate.length; i++) {
          this.hooks.onUpdate[i](data, rule, sheet);
        }
      }

      /**
       * Call `onChangeValue` hooks.
       */

    }, {
      key: 'onChangeValue',
      value: function onChangeValue(value, prop, rule) {
        var processedValue = value;
        for (var i = 0; i < this.hooks.onChangeValue.length; i++) {
          processedValue = this.hooks.onChangeValue[i](processedValue, prop, rule);
        }
        return processedValue;
      }

      /**
       * Register a plugin.
       * If function is passed, it is a shortcut for `{onProcessRule}`.
       */

    }, {
      key: 'use',
      value: function use(plugin) {
        for (var name in plugin) {
          if (this.hooks[name]) this.hooks[name].push(plugin[name]);else (0, _warning2['default'])(false, '[JSS] Unknown hook "%s".', name);
        }
      }
    }]);

    return PluginsRegistry;
  }();

  exports['default'] = PluginsRegistry;
  });

  unwrapExports(PluginsRegistry_1);

  var SimpleRule_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  var SimpleRule = function () {
    function SimpleRule(key, value, options) {
      _classCallCheck(this, SimpleRule);

      this.type = 'simple';
      this.isProcessed = false;

      this.key = key;
      this.value = value;
      this.options = options;
    }

    /**
     * Generates a CSS string.
     */
    // eslint-disable-next-line no-unused-vars


    _createClass(SimpleRule, [{
      key: 'toString',
      value: function toString(options) {
        if (Array.isArray(this.value)) {
          var str = '';
          for (var index = 0; index < this.value.length; index++) {
            str += this.key + ' ' + this.value[index] + ';';
            if (this.value[index + 1]) str += '\n';
          }
          return str;
        }

        return this.key + ' ' + this.value + ';';
      }
    }]);

    return SimpleRule;
  }();

  exports['default'] = SimpleRule;
  });

  unwrapExports(SimpleRule_1);

  var KeyframesRule_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

  var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



  var _RuleList2 = _interopRequireDefault(RuleList_1);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  /**
   * Rule for @keyframes
   */
  var KeyframesRule = function () {
    function KeyframesRule(key, frames, options) {
      _classCallCheck(this, KeyframesRule);

      this.type = 'keyframes';
      this.isProcessed = false;

      this.key = key;
      this.options = options;
      this.rules = new _RuleList2['default'](_extends({}, options, { parent: this }));

      for (var name in frames) {
        this.rules.add(name, frames[name], _extends({}, this.options, {
          parent: this,
          selector: name
        }));
      }

      this.rules.process();
    }

    /**
     * Generates a CSS string.
     */


    _createClass(KeyframesRule, [{
      key: 'toString',
      value: function toString() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { indent: 1 };

        var inner = this.rules.toString(options);
        if (inner) inner += '\n';
        return this.key + ' {\n' + inner + '}';
      }
    }]);

    return KeyframesRule;
  }();

  exports['default'] = KeyframesRule;
  });

  unwrapExports(KeyframesRule_1);

  var ConditionalRule_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

  var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



  var _RuleList2 = _interopRequireDefault(RuleList_1);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  /**
   * Conditional rule for @media, @supports
   */
  var ConditionalRule = function () {
    function ConditionalRule(key, styles, options) {
      _classCallCheck(this, ConditionalRule);

      this.type = 'conditional';
      this.isProcessed = false;

      this.key = key;
      this.options = options;
      this.rules = new _RuleList2['default'](_extends({}, options, { parent: this }));

      for (var name in styles) {
        this.rules.add(name, styles[name]);
      }

      this.rules.process();
    }

    /**
     * Get a rule.
     */


    _createClass(ConditionalRule, [{
      key: 'getRule',
      value: function getRule(name) {
        return this.rules.get(name);
      }

      /**
       * Get index of a rule.
       */

    }, {
      key: 'indexOf',
      value: function indexOf(rule) {
        return this.rules.indexOf(rule);
      }

      /**
       * Create and register rule, run plugins.
       */

    }, {
      key: 'addRule',
      value: function addRule(name, style, options) {
        var rule = this.rules.add(name, style, options);
        this.options.jss.plugins.onProcessRule(rule);
        return rule;
      }

      /**
       * Generates a CSS string.
       */

    }, {
      key: 'toString',
      value: function toString() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { indent: 1 };

        var inner = this.rules.toString(options);
        return inner ? this.key + ' {\n' + inner + '\n}' : '';
      }
    }]);

    return ConditionalRule;
  }();

  exports['default'] = ConditionalRule;
  });

  unwrapExports(ConditionalRule_1);

  var FontFaceRule_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



  var _toCss2 = _interopRequireDefault(toCss_1);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  var FontFaceRule = function () {
    function FontFaceRule(key, style, options) {
      _classCallCheck(this, FontFaceRule);

      this.type = 'font-face';
      this.isProcessed = false;

      this.key = key;
      this.style = style;
      this.options = options;
    }

    /**
     * Generates a CSS string.
     */


    _createClass(FontFaceRule, [{
      key: 'toString',
      value: function toString(options) {
        if (Array.isArray(this.style)) {
          var str = '';
          for (var index = 0; index < this.style.length; index++) {
            str += (0, _toCss2['default'])(this.key, this.style[index]);
            if (this.style[index + 1]) str += '\n';
          }
          return str;
        }

        return (0, _toCss2['default'])(this.key, this.style, options);
      }
    }]);

    return FontFaceRule;
  }();

  exports['default'] = FontFaceRule;
  });

  unwrapExports(FontFaceRule_1);

  var ViewportRule_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



  var _toCss2 = _interopRequireDefault(toCss_1);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  var ViewportRule = function () {
    function ViewportRule(key, style, options) {
      _classCallCheck(this, ViewportRule);

      this.type = 'viewport';
      this.isProcessed = false;

      this.key = key;
      this.style = style;
      this.options = options;
    }

    /**
     * Generates a CSS string.
     */


    _createClass(ViewportRule, [{
      key: 'toString',
      value: function toString(options) {
        return (0, _toCss2['default'])(this.key, this.style, options);
      }
    }]);

    return ViewportRule;
  }();

  exports['default'] = ViewportRule;
  });

  unwrapExports(ViewportRule_1);

  var rules = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });



  var _SimpleRule2 = _interopRequireDefault(SimpleRule_1);



  var _KeyframesRule2 = _interopRequireDefault(KeyframesRule_1);



  var _ConditionalRule2 = _interopRequireDefault(ConditionalRule_1);



  var _FontFaceRule2 = _interopRequireDefault(FontFaceRule_1);



  var _ViewportRule2 = _interopRequireDefault(ViewportRule_1);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  var classes = {
    '@charset': _SimpleRule2['default'],
    '@import': _SimpleRule2['default'],
    '@namespace': _SimpleRule2['default'],
    '@keyframes': _KeyframesRule2['default'],
    '@media': _ConditionalRule2['default'],
    '@supports': _ConditionalRule2['default'],
    '@font-face': _FontFaceRule2['default'],
    '@viewport': _ViewportRule2['default'],
    '@-ms-viewport': _ViewportRule2['default']

    /**
     * Generate plugins which will register all rules.
     */
  };
  var plugins = Object.keys(classes).map(function (key) {
    // https://jsperf.com/indexof-vs-substr-vs-regex-at-the-beginning-3
    var re = new RegExp('^' + key);
    var RuleClass = classes[key];
    var onCreateRule = function onCreateRule(name, decl, options) {
      return re.test(name) ? new RuleClass(name, decl, options) : null;
    };
    return { onCreateRule: onCreateRule };
  });

  exports['default'] = plugins;
  });

  unwrapExports(rules);

  var observables = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });



  var _StyleRule2 = _interopRequireDefault(StyleRule_1);



  var _createRule2 = _interopRequireDefault(createRule_1);



  var _isObservable2 = _interopRequireDefault(isObservable);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  exports['default'] = {
    onCreateRule: function onCreateRule(name, decl, options) {
      if (!(0, _isObservable2['default'])(decl)) return null;

      // Cast `decl` to `Observable`, since it passed the type guard.
      var style$ = decl;

      var rule = (0, _createRule2['default'])(name, {}, options);

      // TODO
      // Call `stream.subscribe()` returns a subscription, which should be explicitly
      // unsubscribed from when we know this sheet is no longer needed.
      style$.subscribe(function (style) {
        for (var prop in style) {
          rule.prop(prop, style[prop]);
        }
      });

      return rule;
    },
    onProcessRule: function onProcessRule(rule) {
      if (!(rule instanceof _StyleRule2['default'])) return;
      var styleRule = rule;
      var style = styleRule.style;

      var _loop = function _loop(prop) {
        var value = style[prop];
        if (!(0, _isObservable2['default'])(value)) return 'continue';
        delete style[prop];
        value.subscribe({
          next: function next(nextValue) {
            styleRule.prop(prop, nextValue);
          }
        });
      };

      for (var prop in style) {
        var _ret = _loop(prop);

        if (_ret === 'continue') continue;
      }
    }
  };
  });

  unwrapExports(observables);

  var functions = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });



  var _RuleList2 = _interopRequireDefault(RuleList_1);



  var _StyleRule2 = _interopRequireDefault(StyleRule_1);



  var _createRule2 = _interopRequireDefault(createRule_1);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  // A symbol replacement.
  var now = Date.now();

  var fnValuesNs = 'fnValues' + now;
  var fnStyleNs = 'fnStyle' + ++now;

  exports['default'] = {
    onCreateRule: function onCreateRule(name, decl, options) {
      if (typeof decl !== 'function') return null;
      var rule = (0, _createRule2['default'])(name, {}, options);
      rule[fnStyleNs] = decl;
      return rule;
    },
    onProcessStyle: function onProcessStyle(style, rule) {
      var fn = {};
      for (var prop in style) {
        var value = style[prop];
        if (typeof value !== 'function') continue;
        delete style[prop];
        fn[prop] = value;
      }
      rule = rule;
      rule[fnValuesNs] = fn;
      return style;
    },
    onUpdate: function onUpdate(data, rule) {
      // It is a rules container like for e.g. ConditionalRule.
      if (rule.rules instanceof _RuleList2['default']) {
        rule.rules.update(data);
        return;
      }
      if (!(rule instanceof _StyleRule2['default'])) return;

      rule = rule;

      // If we have a fn values map, it is a rule with function values.
      if (rule[fnValuesNs]) {
        for (var prop in rule[fnValuesNs]) {
          rule.prop(prop, rule[fnValuesNs][prop](data));
        }
      }

      rule = rule;

      var fnStyle = rule[fnStyleNs];

      // If we have a style function, the entire rule is dynamic and style object
      // will be returned from that function.
      if (fnStyle) {
        var style = fnStyle(data);
        for (var _prop in style) {
          rule.prop(_prop, style[_prop]);
        }
      }
    }
  };
  });

  unwrapExports(functions);

  var DomRenderer_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



  var _warning2 = _interopRequireDefault(browser);



  var _sheets2 = _interopRequireDefault(sheets);



  var _StyleRule2 = _interopRequireDefault(StyleRule_1);



  var _toCssValue2 = _interopRequireDefault(toCssValue_1);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  /**
   * Cache the value from the first time a function is called.
   */
  var memoize = function memoize(fn) {
    var value = void 0;
    return function () {
      if (!value) value = fn();
      return value;
    };
  };

  /**
   * Get a style property value.
   */
  function getPropertyValue(cssRule, prop) {
    try {
      return cssRule.style.getPropertyValue(prop);
    } catch (err) {
      // IE may throw if property is unknown.
      return '';
    }
  }

  /**
   * Set a style property.
   */
  function setProperty(cssRule, prop, value) {
    try {
      var cssValue = value;

      if (Array.isArray(value)) {
        cssValue = (0, _toCssValue2['default'])(value, true);

        if (value[value.length - 1] === '!important') {
          cssRule.style.setProperty(prop, cssValue, 'important');
          return true;
        }
      }

      cssRule.style.setProperty(prop, cssValue);
    } catch (err) {
      // IE may throw if property is unknown.
      return false;
    }
    return true;
  }

  /**
   * Remove a style property.
   */
  function removeProperty(cssRule, prop) {
    try {
      cssRule.style.removeProperty(prop);
    } catch (err) {
      (0, _warning2['default'])(false, '[JSS] DOMException "%s" was thrown. Tried to remove property "%s".', err.message, prop);
    }
  }

  var CSSRuleTypes = {
    STYLE_RULE: 1,
    KEYFRAMES_RULE: 7

    /**
     * Get the CSS Rule key.
     */

  };var getKey = function () {
    var extractKey = function extractKey(cssText) {
      var from = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      return cssText.substr(from, cssText.indexOf('{') - 1);
    };

    return function (cssRule) {
      if (cssRule.type === CSSRuleTypes.STYLE_RULE) return cssRule.selectorText;
      if (cssRule.type === CSSRuleTypes.KEYFRAMES_RULE) {
        var name = cssRule.name;

        if (name) return '@keyframes ' + name;

        // There is no rule.name in the following browsers:
        // - IE 9
        // - Safari 7.1.8
        // - Mobile Safari 9.0.0
        var cssText = cssRule.cssText;

        return '@' + extractKey(cssText, cssText.indexOf('keyframes'));
      }

      // Conditionals.
      return extractKey(cssRule.cssText);
    };
  }();

  /**
   * Set the selector.
   */
  function setSelector(cssRule, selectorText) {
    cssRule.selectorText = selectorText;

    // Return false if setter was not successful.
    // Currently works in chrome only.
    return cssRule.selectorText === selectorText;
  }

  /**
   * Gets the `head` element upon the first call and caches it.
   */
  var getHead = memoize(function () {
    return document.head || document.getElementsByTagName('head')[0];
  });

  /**
   * Gets a map of rule keys, where the property is an unescaped key and value
   * is a potentially escaped one.
   * It is used to identify CSS rules and the corresponding JSS rules. As an identifier
   * for CSSStyleRule we normally use `selectorText`. Though if original selector text
   * contains escaped code points e.g. `:not(#\\20)`, CSSOM will compile it to `:not(# )`
   * and so CSS rule's `selectorText` won't match JSS rule selector.
   *
   * https://www.w3.org/International/questions/qa-escapes#cssescapes
   */
  var getUnescapedKeysMap = function () {
    var style = void 0;
    var isAttached = false;

    return function (rules) {
      var map = {};
      // https://github.com/facebook/flow/issues/2696
      if (!style) style = document.createElement('style');
      for (var i = 0; i < rules.length; i++) {
        var rule = rules[i];
        if (!(rule instanceof _StyleRule2['default'])) continue;
        var selector = rule.selector;
        // Only unescape selector over CSSOM if it contains a back slash.

        if (selector && selector.indexOf('\\') !== -1) {
          // Lazilly attach when needed.
          if (!isAttached) {
            getHead().appendChild(style);
            isAttached = true;
          }
          style.textContent = selector + ' {}';
          var _style = style,
              sheet = _style.sheet;

          if (sheet) {
            var cssRules = sheet.cssRules;

            if (cssRules) map[cssRules[0].selectorText] = rule.key;
          }
        }
      }
      if (isAttached) {
        getHead().removeChild(style);
        isAttached = false;
      }
      return map;
    };
  }();

  /**
   * Find attached sheet with an index higher than the passed one.
   */
  function findHigherSheet(registry, options) {
    for (var i = 0; i < registry.length; i++) {
      var sheet = registry[i];
      if (sheet.attached && sheet.options.index > options.index && sheet.options.insertionPoint === options.insertionPoint) {
        return sheet;
      }
    }
    return null;
  }

  /**
   * Find attached sheet with the highest index.
   */
  function findHighestSheet(registry, options) {
    for (var i = registry.length - 1; i >= 0; i--) {
      var sheet = registry[i];
      if (sheet.attached && sheet.options.insertionPoint === options.insertionPoint) {
        return sheet;
      }
    }
    return null;
  }

  /**
   * Find a comment with "jss" inside.
   */
  function findCommentNode(text) {
    var head = getHead();
    for (var i = 0; i < head.childNodes.length; i++) {
      var node = head.childNodes[i];
      if (node.nodeType === 8 && node.nodeValue.trim() === text) {
        return node;
      }
    }
    return null;
  }

  /**
   * Find a node before which we can insert the sheet.
   */
  function findPrevNode(options) {
    var registry = _sheets2['default'].registry;


    if (registry.length > 0) {
      // Try to insert before the next higher sheet.
      var sheet = findHigherSheet(registry, options);
      if (sheet) return sheet.renderer.element;

      // Otherwise insert after the last attached.
      sheet = findHighestSheet(registry, options);
      if (sheet) return sheet.renderer.element.nextElementSibling;
    }

    // Try to find a comment placeholder if registry is empty.
    var insertionPoint = options.insertionPoint;

    if (insertionPoint && typeof insertionPoint === 'string') {
      var comment = findCommentNode(insertionPoint);
      if (comment) return comment.nextSibling;
      // If user specifies an insertion point and it can't be found in the document -
      // bad specificity issues may appear.
      (0, _warning2['default'])(insertionPoint === 'jss', '[JSS] Insertion point "%s" not found.', insertionPoint);
    }

    return null;
  }

  /**
   * Insert style element into the DOM.
   */
  function insertStyle(style, options) {
    var insertionPoint = options.insertionPoint;

    var prevNode = findPrevNode(options);

    if (prevNode) {
      var parentNode = prevNode.parentNode;

      if (parentNode) parentNode.insertBefore(style, prevNode);
      return;
    }

    // Works with iframes and any node types.
    if (insertionPoint && typeof insertionPoint.nodeType === 'number') {
      // https://stackoverflow.com/questions/41328728/force-casting-in-flow
      var insertionPointElement = insertionPoint;
      var _parentNode = insertionPointElement.parentNode;

      if (_parentNode) _parentNode.insertBefore(style, insertionPointElement.nextSibling);else (0, _warning2['default'])(false, '[JSS] Insertion point is not in the DOM.');
      return;
    }

    getHead().insertBefore(style, prevNode);
  }

  /**
   * Read jss nonce setting from the page if the user has set it.
   */
  var getNonce = memoize(function () {
    var node = document.querySelector('meta[property="csp-nonce"]');
    return node ? node.getAttribute('content') : null;
  });

  var DomRenderer = function () {
    function DomRenderer(sheet) {
      _classCallCheck(this, DomRenderer);

      this.getPropertyValue = getPropertyValue;
      this.setProperty = setProperty;
      this.removeProperty = removeProperty;
      this.setSelector = setSelector;
      this.getKey = getKey;
      this.getUnescapedKeysMap = getUnescapedKeysMap;
      this.hasInsertedRules = false;

      // There is no sheet when the renderer is used from a standalone StyleRule.
      if (sheet) _sheets2['default'].add(sheet);

      this.sheet = sheet;

      var _ref = this.sheet ? this.sheet.options : {},
          media = _ref.media,
          meta = _ref.meta,
          element = _ref.element;

      this.element = element || document.createElement('style');
      this.element.setAttribute('data-jss', '');
      if (media) this.element.setAttribute('media', media);
      if (meta) this.element.setAttribute('data-meta', meta);
      var nonce = getNonce();
      if (nonce) this.element.setAttribute('nonce', nonce);
    }

    /**
     * Insert style element into render tree.
     */


    // HTMLStyleElement needs fixing https://github.com/facebook/flow/issues/2696


    _createClass(DomRenderer, [{
      key: 'attach',
      value: function attach() {
        // In the case the element node is external and it is already in the DOM.
        if (this.element.parentNode || !this.sheet) return;

        // When rules are inserted using `insertRule` API, after `sheet.detach().attach()`
        // browsers remove those rules.
        // TODO figure out if its a bug and if it is known.
        // Workaround is to redeploy the sheet before attaching as a string.
        if (this.hasInsertedRules) {
          this.deploy();
          this.hasInsertedRules = false;
        }

        insertStyle(this.element, this.sheet.options);
      }

      /**
       * Remove style element from render tree.
       */

    }, {
      key: 'detach',
      value: function detach() {
        this.element.parentNode.removeChild(this.element);
      }

      /**
       * Inject CSS string into element.
       */

    }, {
      key: 'deploy',
      value: function deploy() {
        if (!this.sheet) return;
        this.element.textContent = '\n' + this.sheet.toString() + '\n';
      }

      /**
       * Insert a rule into element.
       */

    }, {
      key: 'insertRule',
      value: function insertRule(rule, index) {
        var sheet = this.element.sheet;
        var cssRules = sheet.cssRules;

        var str = rule.toString();
        if (!index) index = cssRules.length;

        if (!str) return false;

        try {
          sheet.insertRule(str, index);
        } catch (err) {
          (0, _warning2['default'])(false, '[JSS] Can not insert an unsupported rule \n\r%s', rule);
          return false;
        }
        this.hasInsertedRules = true;

        return cssRules[index];
      }

      /**
       * Delete a rule.
       */

    }, {
      key: 'deleteRule',
      value: function deleteRule(cssRule) {
        var sheet = this.element.sheet;

        var index = this.indexOf(cssRule);
        if (index === -1) return false;
        sheet.deleteRule(index);
        return true;
      }

      /**
       * Get index of a CSS Rule.
       */

    }, {
      key: 'indexOf',
      value: function indexOf(cssRule) {
        var cssRules = this.element.sheet.cssRules;

        for (var _index = 0; _index < cssRules.length; _index++) {
          if (cssRule === cssRules[_index]) return _index;
        }
        return -1;
      }

      /**
       * Generate a new CSS rule and replace the existing one.
       */

    }, {
      key: 'replaceRule',
      value: function replaceRule(cssRule, rule) {
        var index = this.indexOf(cssRule);
        var newCssRule = this.insertRule(rule, index);
        this.element.sheet.deleteRule(index);
        return newCssRule;
      }

      /**
       * Get all rules elements.
       */

    }, {
      key: 'getRules',
      value: function getRules() {
        return this.element.sheet.cssRules;
      }
    }]);

    return DomRenderer;
  }();

  exports['default'] = DomRenderer;
  });

  unwrapExports(DomRenderer_1);

  var VirtualRenderer_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  /* eslint-disable class-methods-use-this */

  /**
   * Rendering backend to do nothing in nodejs.
   */
  var VirtualRenderer = function () {
    function VirtualRenderer() {
      _classCallCheck(this, VirtualRenderer);
    }

    _createClass(VirtualRenderer, [{
      key: 'setProperty',
      value: function setProperty() {
        return true;
      }
    }, {
      key: 'getPropertyValue',
      value: function getPropertyValue() {
        return '';
      }
    }, {
      key: 'removeProperty',
      value: function removeProperty() {}
    }, {
      key: 'setSelector',
      value: function setSelector() {
        return true;
      }
    }, {
      key: 'getKey',
      value: function getKey() {
        return '';
      }
    }, {
      key: 'attach',
      value: function attach() {}
    }, {
      key: 'detach',
      value: function detach() {}
    }, {
      key: 'deploy',
      value: function deploy() {}
    }, {
      key: 'insertRule',
      value: function insertRule() {
        return false;
      }
    }, {
      key: 'deleteRule',
      value: function deleteRule() {
        return true;
      }
    }, {
      key: 'replaceRule',
      value: function replaceRule() {
        return false;
      }
    }, {
      key: 'getRules',
      value: function getRules() {}
    }, {
      key: 'indexOf',
      value: function indexOf() {
        return -1;
      }
    }]);

    return VirtualRenderer;
  }();

  exports['default'] = VirtualRenderer;
  });

  unwrapExports(VirtualRenderer_1);

  var Jss_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

  var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

  var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



  var _isInBrowser2 = _interopRequireDefault(isBrowser);



  var _StyleSheet2 = _interopRequireDefault(StyleSheet_1);



  var _PluginsRegistry2 = _interopRequireDefault(PluginsRegistry_1);



  var _rules2 = _interopRequireDefault(rules);



  var _observables2 = _interopRequireDefault(observables);



  var _functions2 = _interopRequireDefault(functions);



  var _sheets2 = _interopRequireDefault(sheets);



  var _StyleRule2 = _interopRequireDefault(StyleRule_1);



  var _createGenerateClassName2 = _interopRequireDefault(createGenerateClassName);



  var _createRule3 = _interopRequireDefault(createRule_1);



  var _DomRenderer2 = _interopRequireDefault(DomRenderer_1);



  var _VirtualRenderer2 = _interopRequireDefault(VirtualRenderer_1);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  var defaultPlugins = _rules2['default'].concat([_observables2['default'], _functions2['default']]);

  var instanceCounter = 0;

  var Jss = function () {
    function Jss(options) {
      _classCallCheck(this, Jss);

      this.id = instanceCounter++;
      this.version = "9.8.7";
      this.plugins = new _PluginsRegistry2['default']();
      this.options = {
        createGenerateClassName: _createGenerateClassName2['default'],
        Renderer: _isInBrowser2['default'] ? _DomRenderer2['default'] : _VirtualRenderer2['default'],
        plugins: []
      };
      this.generateClassName = (0, _createGenerateClassName2['default'])();

      // eslint-disable-next-line prefer-spread
      this.use.apply(this, defaultPlugins);
      this.setup(options);
    }

    _createClass(Jss, [{
      key: 'setup',
      value: function setup() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        if (options.createGenerateClassName) {
          this.options.createGenerateClassName = options.createGenerateClassName;
          // $FlowFixMe
          this.generateClassName = options.createGenerateClassName();
        }

        if (options.insertionPoint != null) this.options.insertionPoint = options.insertionPoint;
        if (options.virtual || options.Renderer) {
          this.options.Renderer = options.Renderer || (options.virtual ? _VirtualRenderer2['default'] : _DomRenderer2['default']);
        }

        // eslint-disable-next-line prefer-spread
        if (options.plugins) this.use.apply(this, options.plugins);

        return this;
      }

      /**
       * Create a Style Sheet.
       */

    }, {
      key: 'createStyleSheet',
      value: function createStyleSheet(styles) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        var index = options.index;
        if (typeof index !== 'number') {
          index = _sheets2['default'].index === 0 ? 0 : _sheets2['default'].index + 1;
        }
        var sheet = new _StyleSheet2['default'](styles, _extends({}, options, {
          jss: this,
          generateClassName: options.generateClassName || this.generateClassName,
          insertionPoint: this.options.insertionPoint,
          Renderer: this.options.Renderer,
          index: index
        }));
        this.plugins.onProcessSheet(sheet);

        return sheet;
      }

      /**
       * Detach the Style Sheet and remove it from the registry.
       */

    }, {
      key: 'removeStyleSheet',
      value: function removeStyleSheet(sheet) {
        sheet.detach();
        _sheets2['default'].remove(sheet);
        return this;
      }

      /**
       * Create a rule without a Style Sheet.
       */

    }, {
      key: 'createRule',
      value: function createRule(name) {
        var style = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

        // Enable rule without name for inline styles.
        if ((typeof name === 'undefined' ? 'undefined' : _typeof(name)) === 'object') {
          options = style;
          style = name;
          name = undefined;
        }

        // Cast from RuleFactoryOptions to RuleOptions
        // https://stackoverflow.com/questions/41328728/force-casting-in-flow
        var ruleOptions = options;

        ruleOptions.jss = this;
        ruleOptions.Renderer = this.options.Renderer;
        if (!ruleOptions.generateClassName) ruleOptions.generateClassName = this.generateClassName;
        if (!ruleOptions.classes) ruleOptions.classes = {};
        var rule = (0, _createRule3['default'])(name, style, ruleOptions);

        if (!ruleOptions.selector && rule instanceof _StyleRule2['default']) {
          rule.selector = '.' + ruleOptions.generateClassName(rule);
        }

        this.plugins.onProcessRule(rule);

        return rule;
      }

      /**
       * Register plugin. Passed function will be invoked with a rule instance.
       */

    }, {
      key: 'use',
      value: function use() {
        var _this = this;

        for (var _len = arguments.length, plugins = Array(_len), _key = 0; _key < _len; _key++) {
          plugins[_key] = arguments[_key];
        }

        plugins.forEach(function (plugin) {
          // Avoids applying same plugin twice, at least based on ref.
          if (_this.options.plugins.indexOf(plugin) === -1) {
            _this.options.plugins.push(plugin);
            _this.plugins.use(plugin);
          }
        });

        return this;
      }
    }]);

    return Jss;
  }();

  exports['default'] = Jss;
  });

  unwrapExports(Jss_1);

  var lib = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.create = exports.createGenerateClassName = exports.sheets = exports.RuleList = exports.SheetsManager = exports.SheetsRegistry = exports.toCssValue = exports.getDynamicStyles = undefined;



  Object.defineProperty(exports, 'getDynamicStyles', {
    enumerable: true,
    get: function get() {
      return _interopRequireDefault(getDynamicStyles_1)['default'];
    }
  });



  Object.defineProperty(exports, 'toCssValue', {
    enumerable: true,
    get: function get() {
      return _interopRequireDefault(toCssValue_1)['default'];
    }
  });



  Object.defineProperty(exports, 'SheetsRegistry', {
    enumerable: true,
    get: function get() {
      return _interopRequireDefault(SheetsRegistry_1)['default'];
    }
  });



  Object.defineProperty(exports, 'SheetsManager', {
    enumerable: true,
    get: function get() {
      return _interopRequireDefault(SheetsManager_1)['default'];
    }
  });



  Object.defineProperty(exports, 'RuleList', {
    enumerable: true,
    get: function get() {
      return _interopRequireDefault(RuleList_1)['default'];
    }
  });



  Object.defineProperty(exports, 'sheets', {
    enumerable: true,
    get: function get() {
      return _interopRequireDefault(sheets)['default'];
    }
  });



  Object.defineProperty(exports, 'createGenerateClassName', {
    enumerable: true,
    get: function get() {
      return _interopRequireDefault(createGenerateClassName)['default'];
    }
  });



  var _Jss2 = _interopRequireDefault(Jss_1);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  /**
   * Creates a new instance of Jss.
   */
  var create = exports.create = function create(options) {
    return new _Jss2['default'](options);
  };

  /**
   * A global Jss instance.
   */
  exports['default'] = create();
  });

  var jss = unwrapExports(lib);
  var lib_1 = lib.create;
  var lib_2 = lib.createGenerateClassName;
  var lib_3 = lib.sheets;
  var lib_4 = lib.RuleList;
  var lib_5 = lib.SheetsManager;
  var lib_6 = lib.SheetsRegistry;
  var lib_7 = lib.toCssValue;
  var lib_8 = lib.getDynamicStyles;

  var parse = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });



  var _warning2 = _interopRequireDefault(browser);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  var semiWithNl = /;\n/;

  /**
   * Naive CSS parser.
   * - Supports only rule body (no selectors)
   * - Requires semicolon and new line after the value (except of last line)
   * - No nested rules support
   */

  exports['default'] = function (cssText) {
    var style = {};
    var split = cssText.split(semiWithNl);
    for (var i = 0; i < split.length; i++) {
      var decl = (split[i] || '').trim();

      if (!decl) continue;
      var colonIndex = decl.indexOf(':');
      if (colonIndex === -1) {
        (0, _warning2['default'])(false, 'Malformed CSS string "%s"', decl);
        continue;
      }
      var prop = decl.substr(0, colonIndex).trim();
      var value = decl.substr(colonIndex + 1).trim();
      style[prop] = value;
    }
    return style;
  };
  });

  unwrapExports(parse);

  var lib$1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });



  var _parse2 = _interopRequireDefault(parse);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  var onProcessRule = function onProcessRule(rule) {
    if (typeof rule.style === 'string') {
      rule.style = (0, _parse2['default'])(rule.style);
    }
  };

  exports['default'] = function () {
    return { onProcessRule: onProcessRule };
  };
  });

  unwrapExports(lib$1);

  var lib$2 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

  var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

  exports['default'] = jssGlobal;



  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  var propKey = '@global';
  var prefixKey = '@global ';

  var GlobalContainerRule = function () {
    function GlobalContainerRule(key, styles, options) {
      _classCallCheck(this, GlobalContainerRule);

      this.type = 'global';

      this.key = key;
      this.options = options;
      this.rules = new lib.RuleList(_extends({}, options, {
        parent: this
      }));

      for (var selector in styles) {
        this.rules.add(selector, styles[selector], { selector: selector });
      }

      this.rules.process();
    }

    /**
     * Get a rule.
     */


    _createClass(GlobalContainerRule, [{
      key: 'getRule',
      value: function getRule(name) {
        return this.rules.get(name);
      }

      /**
       * Create and register rule, run plugins.
       */

    }, {
      key: 'addRule',
      value: function addRule(name, style, options) {
        var rule = this.rules.add(name, style, options);
        this.options.jss.plugins.onProcessRule(rule);
        return rule;
      }

      /**
       * Get index of a rule.
       */

    }, {
      key: 'indexOf',
      value: function indexOf(rule) {
        return this.rules.indexOf(rule);
      }

      /**
       * Generates a CSS string.
       */

    }, {
      key: 'toString',
      value: function toString() {
        return this.rules.toString();
      }
    }]);

    return GlobalContainerRule;
  }();

  var GlobalPrefixedRule = function () {
    function GlobalPrefixedRule(name, style, options) {
      _classCallCheck(this, GlobalPrefixedRule);

      this.name = name;
      this.options = options;
      var selector = name.substr(prefixKey.length);
      this.rule = options.jss.createRule(selector, style, _extends({}, options, {
        parent: this,
        selector: selector
      }));
    }

    _createClass(GlobalPrefixedRule, [{
      key: 'toString',
      value: function toString(options) {
        return this.rule.toString(options);
      }
    }]);

    return GlobalPrefixedRule;
  }();

  var separatorRegExp = /\s*,\s*/g;

  function addScope(selector, scope) {
    var parts = selector.split(separatorRegExp);
    var scoped = '';
    for (var i = 0; i < parts.length; i++) {
      scoped += scope + ' ' + parts[i].trim();
      if (parts[i + 1]) scoped += ', ';
    }
    return scoped;
  }

  function handleNestedGlobalContainerRule(rule) {
    var options = rule.options,
        style = rule.style;

    var rules = style[propKey];

    if (!rules) return;

    for (var name in rules) {
      options.sheet.addRule(name, rules[name], _extends({}, options, {
        selector: addScope(name, rule.selector)
      }));
    }

    delete style[propKey];
  }

  function handlePrefixedGlobalRule(rule) {
    var options = rule.options,
        style = rule.style;

    for (var prop in style) {
      if (prop.substr(0, propKey.length) !== propKey) continue;

      var selector = addScope(prop.substr(propKey.length), rule.selector);
      options.sheet.addRule(selector, style[prop], _extends({}, options, {
        selector: selector
      }));
      delete style[prop];
    }
  }

  /**
   * Convert nested rules to separate, remove them from original styles.
   *
   * @param {Rule} rule
   * @api public
   */
  function jssGlobal() {
    function onCreateRule(name, styles, options) {
      if (name === propKey) {
        return new GlobalContainerRule(name, styles, options);
      }

      if (name[0] === '@' && name.substr(0, prefixKey.length) === prefixKey) {
        return new GlobalPrefixedRule(name, styles, options);
      }

      var parent = options.parent;


      if (parent) {
        if (parent.type === 'global' || parent.options.parent.type === 'global') {
          options.global = true;
        }
      }

      if (options.global) options.selector = name;

      return null;
    }

    function onProcessRule(rule) {
      if (rule.type !== 'style') return;

      handleNestedGlobalContainerRule(rule);
      handlePrefixedGlobalRule(rule);
    }

    return { onCreateRule: onCreateRule, onProcessRule: onProcessRule };
  }
  });

  unwrapExports(lib$2);

  var lib$3 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

  exports['default'] = jssExtend;



  var _warning2 = _interopRequireDefault(browser);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  var isObject = function isObject(obj) {
    return obj && (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' && !Array.isArray(obj);
  };
  var valueNs = 'extendCurrValue' + Date.now();

  function mergeExtend(style, rule, sheet, newStyle) {
    var extendType = _typeof(style.extend);
    // Extend using a rule name.
    if (extendType === 'string') {
      if (!sheet) return;
      var refRule = sheet.getRule(style.extend);
      if (!refRule) return;
      if (refRule === rule) {
        (0, _warning2['default'])(false, '[JSS] A rule tries to extend itself \r\n%s', rule);
        return;
      }
      var parent = refRule.options.parent;

      if (parent) {
        var originalStyle = parent.rules.raw[style.extend];
        extend(originalStyle, rule, sheet, newStyle);
      }
      return;
    }

    // Extend using an array of objects.
    if (Array.isArray(style.extend)) {
      for (var index = 0; index < style.extend.length; index++) {
        extend(style.extend[index], rule, sheet, newStyle);
      }
      return;
    }

    // Extend is a style object.
    for (var prop in style.extend) {
      if (prop === 'extend') {
        extend(style.extend.extend, rule, sheet, newStyle);
        continue;
      }
      if (isObject(style.extend[prop])) {
        if (!(prop in newStyle)) newStyle[prop] = {};
        extend(style.extend[prop], rule, sheet, newStyle[prop]);
        continue;
      }
      newStyle[prop] = style.extend[prop];
    }
  }

  function mergeRest(style, rule, sheet, newStyle) {
    // Copy base style.
    for (var prop in style) {
      if (prop === 'extend') continue;
      if (isObject(newStyle[prop]) && isObject(style[prop])) {
        extend(style[prop], rule, sheet, newStyle[prop]);
        continue;
      }

      if (isObject(style[prop])) {
        newStyle[prop] = extend(style[prop], rule, sheet);
        continue;
      }

      newStyle[prop] = style[prop];
    }
  }

  /**
   * Recursively extend styles.
   */
  function extend(style, rule, sheet) {
    var newStyle = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

    mergeExtend(style, rule, sheet, newStyle);
    mergeRest(style, rule, sheet, newStyle);
    return newStyle;
  }

  /**
   * Handle `extend` property.
   *
   * @param {Rule} rule
   * @api public
   */
  function jssExtend() {
    function onProcessStyle(style, rule, sheet) {
      if ('extend' in style) return extend(style, rule, sheet);
      return style;
    }

    function onChangeValue(value, prop, rule) {
      if (prop !== 'extend') return value;

      // Value is empty, remove properties set previously.
      if (value == null || value === false) {
        for (var key in rule[valueNs]) {
          rule.prop(key, null);
        }
        rule[valueNs] = null;
        return null;
      }

      for (var _key in value) {
        rule.prop(_key, value[_key]);
      }
      rule[valueNs] = value;

      // Make sure we don't set the value in the core.
      return null;
    }

    return { onProcessStyle: onProcessStyle, onChangeValue: onChangeValue };
  }
  });

  unwrapExports(lib$3);

  var lib$4 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

  exports.default = jssNested;



  var _warning2 = _interopRequireDefault(browser);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

  var separatorRegExp = /\s*,\s*/g;
  var parentRegExp = /&/g;
  var refRegExp = /\$([\w-]+)/g;

  /**
   * Convert nested rules to separate, remove them from original styles.
   *
   * @param {Rule} rule
   * @api public
   */
  function jssNested() {
    // Get a function to be used for $ref replacement.
    function getReplaceRef(container) {
      return function (match, key) {
        var rule = container.getRule(key);
        if (rule) return rule.selector;
        (0, _warning2.default)(false, '[JSS] Could not find the referenced rule %s in %s.', key, container.options.meta || container);
        return key;
      };
    }

    var hasAnd = function hasAnd(str) {
      return str.indexOf('&') !== -1;
    };

    function replaceParentRefs(nestedProp, parentProp) {
      var parentSelectors = parentProp.split(separatorRegExp);
      var nestedSelectors = nestedProp.split(separatorRegExp);

      var result = '';

      for (var i = 0; i < parentSelectors.length; i++) {
        var parent = parentSelectors[i];

        for (var j = 0; j < nestedSelectors.length; j++) {
          var nested = nestedSelectors[j];
          if (result) result += ', ';
          // Replace all & by the parent or prefix & with the parent.
          result += hasAnd(nested) ? nested.replace(parentRegExp, parent) : parent + ' ' + nested;
        }
      }

      return result;
    }

    function getOptions(rule, container, options) {
      // Options has been already created, now we only increase index.
      if (options) return _extends({}, options, { index: options.index + 1 });

      var nestingLevel = rule.options.nestingLevel;

      nestingLevel = nestingLevel === undefined ? 1 : nestingLevel + 1;

      return _extends({}, rule.options, {
        nestingLevel: nestingLevel,
        index: container.indexOf(rule) + 1
      });
    }

    function onProcessStyle(style, rule) {
      if (rule.type !== 'style') return style;
      var container = rule.options.parent;
      var options = void 0;
      var replaceRef = void 0;
      for (var prop in style) {
        var isNested = hasAnd(prop);
        var isNestedConditional = prop[0] === '@';

        if (!isNested && !isNestedConditional) continue;

        options = getOptions(rule, container, options);

        if (isNested) {
          var selector = replaceParentRefs(prop, rule.selector
          // Lazily create the ref replacer function just once for
          // all nested rules within the sheet.
          );if (!replaceRef) replaceRef = getReplaceRef(container
          // Replace all $refs.
          );selector = selector.replace(refRegExp, replaceRef);

          container.addRule(selector, style[prop], _extends({}, options, { selector: selector }));
        } else if (isNestedConditional) {
          container
          // Place conditional right after the parent rule to ensure right ordering.
          .addRule(prop, null, options).addRule(rule.key, style[prop], { selector: rule.selector });
        }

        delete style[prop];
      }

      return style;
    }

    return { onProcessStyle: onProcessStyle };
  }
  });

  unwrapExports(lib$4);

  var lib$5 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = jssCompose;



  var _warning2 = _interopRequireDefault(browser);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

  /**
   * Set selector.
   *
   * @param {Object} original rule
   * @param {String} className class string
   * @return {Boolean} flag, indicating function was successfull or not
   */
  function registerClass(rule, className) {
    // Skip falsy values
    if (!className) return true;

    // Support array of class names `{composes: ['foo', 'bar']}`
    if (Array.isArray(className)) {
      for (var index = 0; index < className.length; index++) {
        var isSetted = registerClass(rule, className[index]);
        if (!isSetted) return false;
      }

      return true;
    }

    // Support space separated class names `{composes: 'foo bar'}`
    if (className.indexOf(' ') > -1) {
      return registerClass(rule, className.split(' '));
    }

    var parent = rule.options.parent;

    // It is a ref to a local rule.

    if (className[0] === '$') {
      var refRule = parent.getRule(className.substr(1));

      if (!refRule) {
        (0, _warning2.default)(false, '[JSS] Referenced rule is not defined. \r\n%s', rule);
        return false;
      }

      if (refRule === rule) {
        (0, _warning2.default)(false, '[JSS] Cyclic composition detected. \r\n%s', rule);
        return false;
      }

      parent.classes[rule.key] += ' ' + parent.classes[refRule.key];

      return true;
    }

    rule.options.parent.classes[rule.key] += ' ' + className;

    return true;
  }

  /**
   * Convert compose property to additional class, remove property from original styles.
   *
   * @param {Rule} rule
   * @api public
   */
  function jssCompose() {
    function onProcessStyle(style, rule) {
      if (!style.composes) return style;
      registerClass(rule, style.composes);
      // Remove composes property to prevent infinite loop.
      delete style.composes;
      return style;
    }
    return { onProcessStyle: onProcessStyle };
  }
  });

  unwrapExports(lib$5);

  /* eslint-disable no-var, prefer-template */
  var uppercasePattern = /[A-Z]/g;
  var msPattern = /^ms-/;
  var cache = {};

  function toHyphenLower(match) {
    return '-' + match.toLowerCase()
  }

  function hyphenateStyleName(name) {
    if (cache.hasOwnProperty(name)) {
      return cache[name]
    }

    var hName = name.replace(uppercasePattern, toHyphenLower);
    return (cache[name] = msPattern.test(hName) ? '-' + hName : hName)
  }

  var lib$6 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports['default'] = camelCase;



  var _hyphenateStyleName2 = _interopRequireDefault(hyphenateStyleName);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  /**
   * Convert camel cased property names to dash separated.
   *
   * @param {Object} style
   * @return {Object}
   */
  function convertCase(style) {
    var converted = {};

    for (var prop in style) {
      converted[(0, _hyphenateStyleName2['default'])(prop)] = style[prop];
    }

    if (style.fallbacks) {
      if (Array.isArray(style.fallbacks)) converted.fallbacks = style.fallbacks.map(convertCase);else converted.fallbacks = convertCase(style.fallbacks);
    }

    return converted;
  }

  /**
   * Allow camel cased property names by converting them back to dasherized.
   *
   * @param {Rule} rule
   */
  function camelCase() {
    function onProcessStyle(style) {
      if (Array.isArray(style)) {
        // Handle rules like @font-face, which can have multiple styles in an array
        for (var index = 0; index < style.length; index++) {
          style[index] = convertCase(style[index]);
        }
        return style;
      }

      return convertCase(style);
    }

    function onChangeValue(value, prop, rule) {
      var hyphenatedProp = (0, _hyphenateStyleName2['default'])(prop);

      // There was no camel case in place
      if (prop === hyphenatedProp) return value;

      rule.prop(hyphenatedProp, value);

      // Core will ignore that property value we set the proper one above.
      return null;
    }

    return { onProcessStyle: onProcessStyle, onChangeValue: onChangeValue };
  }
  });

  unwrapExports(lib$6);

  var defaultUnits = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  /**
   * Generated jss-default-unit CSS property units
   *
   * @type object
   */
  exports['default'] = {
    'animation-delay': 'ms',
    'animation-duration': 'ms',
    'background-position': 'px',
    'background-position-x': 'px',
    'background-position-y': 'px',
    'background-size': 'px',
    border: 'px',
    'border-bottom': 'px',
    'border-bottom-left-radius': 'px',
    'border-bottom-right-radius': 'px',
    'border-bottom-width': 'px',
    'border-left': 'px',
    'border-left-width': 'px',
    'border-radius': 'px',
    'border-right': 'px',
    'border-right-width': 'px',
    'border-spacing': 'px',
    'border-top': 'px',
    'border-top-left-radius': 'px',
    'border-top-right-radius': 'px',
    'border-top-width': 'px',
    'border-width': 'px',
    'border-after-width': 'px',
    'border-before-width': 'px',
    'border-end-width': 'px',
    'border-horizontal-spacing': 'px',
    'border-start-width': 'px',
    'border-vertical-spacing': 'px',
    bottom: 'px',
    'box-shadow': 'px',
    'column-gap': 'px',
    'column-rule': 'px',
    'column-rule-width': 'px',
    'column-width': 'px',
    'flex-basis': 'px',
    'font-size': 'px',
    'font-size-delta': 'px',
    height: 'px',
    left: 'px',
    'letter-spacing': 'px',
    'logical-height': 'px',
    'logical-width': 'px',
    margin: 'px',
    'margin-after': 'px',
    'margin-before': 'px',
    'margin-bottom': 'px',
    'margin-left': 'px',
    'margin-right': 'px',
    'margin-top': 'px',
    'max-height': 'px',
    'max-width': 'px',
    'margin-end': 'px',
    'margin-start': 'px',
    'mask-position-x': 'px',
    'mask-position-y': 'px',
    'mask-size': 'px',
    'max-logical-height': 'px',
    'max-logical-width': 'px',
    'min-height': 'px',
    'min-width': 'px',
    'min-logical-height': 'px',
    'min-logical-width': 'px',
    motion: 'px',
    'motion-offset': 'px',
    outline: 'px',
    'outline-offset': 'px',
    'outline-width': 'px',
    padding: 'px',
    'padding-bottom': 'px',
    'padding-left': 'px',
    'padding-right': 'px',
    'padding-top': 'px',
    'padding-after': 'px',
    'padding-before': 'px',
    'padding-end': 'px',
    'padding-start': 'px',
    'perspective-origin-x': '%',
    'perspective-origin-y': '%',
    perspective: 'px',
    right: 'px',
    'shape-margin': 'px',
    size: 'px',
    'text-indent': 'px',
    'text-stroke': 'px',
    'text-stroke-width': 'px',
    top: 'px',
    'transform-origin': '%',
    'transform-origin-x': '%',
    'transform-origin-y': '%',
    'transform-origin-z': '%',
    'transition-delay': 'ms',
    'transition-duration': 'ms',
    'vertical-align': 'px',
    width: 'px',
    'word-spacing': 'px',
    // Not existing properties.
    // Used to avoid issues with jss-expand intergration.
    'box-shadow-x': 'px',
    'box-shadow-y': 'px',
    'box-shadow-blur': 'px',
    'box-shadow-spread': 'px',
    'font-line-height': 'px',
    'text-shadow-x': 'px',
    'text-shadow-y': 'px',
    'text-shadow-blur': 'px'
  };
  });

  unwrapExports(defaultUnits);

  var lib$7 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

  exports['default'] = defaultUnit;



  var _defaultUnits2 = _interopRequireDefault(defaultUnits);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  /**
   * Clones the object and adds a camel cased property version.
   */
  function addCamelCasedVersion(obj) {
    var regExp = /(-[a-z])/g;
    var replace = function replace(str) {
      return str[1].toUpperCase();
    };
    var newObj = {};
    for (var key in obj) {
      newObj[key] = obj[key];
      newObj[key.replace(regExp, replace)] = obj[key];
    }
    return newObj;
  }

  var units = addCamelCasedVersion(_defaultUnits2['default']);

  /**
   * Recursive deep style passing function
   *
   * @param {String} current property
   * @param {(Object|Array|Number|String)} property value
   * @param {Object} options
   * @return {(Object|Array|Number|String)} resulting value
   */
  function iterate(prop, value, options) {
    if (!value) return value;

    var convertedValue = value;

    var type = typeof value === 'undefined' ? 'undefined' : _typeof(value);
    if (type === 'object' && Array.isArray(value)) type = 'array';

    switch (type) {
      case 'object':
        if (prop === 'fallbacks') {
          for (var innerProp in value) {
            value[innerProp] = iterate(innerProp, value[innerProp], options);
          }
          break;
        }
        for (var _innerProp in value) {
          value[_innerProp] = iterate(prop + '-' + _innerProp, value[_innerProp], options);
        }
        break;
      case 'array':
        for (var i = 0; i < value.length; i++) {
          value[i] = iterate(prop, value[i], options);
        }
        break;
      case 'number':
        if (value !== 0) {
          convertedValue = value + (options[prop] || units[prop] || '');
        }
        break;
      default:
        break;
    }

    return convertedValue;
  }

  /**
   * Add unit to numeric values.
   */
  function defaultUnit() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    var camelCasedOptions = addCamelCasedVersion(options);

    function onProcessStyle(style, rule) {
      if (rule.type !== 'style') return style;

      for (var prop in style) {
        style[prop] = iterate(prop, style[prop], camelCasedOptions);
      }

      return style;
    }

    function onChangeValue(value, prop) {
      return iterate(prop, value, camelCasedOptions);
    }

    return { onProcessStyle: onProcessStyle, onChangeValue: onChangeValue };
  }
  });

  unwrapExports(lib$7);

  var props = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  /**
   * A scheme for converting properties from array to regular style.
   * All properties listed below will be transformed to a string separated by space.
   */
  var propArray = exports.propArray = {
    'background-size': true,
    'background-position': true,
    border: true,
    'border-bottom': true,
    'border-left': true,
    'border-top': true,
    'border-right': true,
    'border-radius': true,
    'border-image': true,
    'border-width': true,
    'border-style': true,
    'border-color': true,
    'box-shadow': true,
    flex: true,
    margin: true,
    padding: true,
    outline: true,
    'transform-origin': true,
    transform: true,
    transition: true

    /**
     * A scheme for converting arrays to regular styles inside of objects.
     * For e.g.: "{position: [0, 0]}" => "background-position: 0 0;".
     */
  };var propArrayInObj = exports.propArrayInObj = {
    position: true, // background-position
    size: true // background-size


    /**
     * A scheme for parsing and building correct styles from passed objects.
     */
  };var propObj = exports.propObj = {
    padding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    margin: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    background: {
      attachment: null,
      color: null,
      image: null,
      position: null,
      repeat: null
    },
    border: {
      width: null,
      style: null,
      color: null
    },
    'border-top': {
      width: null,
      style: null,
      color: null
    },
    'border-right': {
      width: null,
      style: null,
      color: null
    },
    'border-bottom': {
      width: null,
      style: null,
      color: null
    },
    'border-left': {
      width: null,
      style: null,
      color: null
    },
    outline: {
      width: null,
      style: null,
      color: null
    },
    'list-style': {
      type: null,
      position: null,
      image: null
    },
    transition: {
      property: null,
      duration: null,
      'timing-function': null,
      timingFunction: null, // Needed for avoiding comilation issues with jss-camel-case
      delay: null
    },
    animation: {
      name: null,
      duration: null,
      'timing-function': null,
      timingFunction: null, // Needed to avoid compilation issues with jss-camel-case
      delay: null,
      'iteration-count': null,
      iterationCount: null, // Needed to avoid compilation issues with jss-camel-case
      direction: null,
      'fill-mode': null,
      fillMode: null, // Needed to avoid compilation issues with jss-camel-case
      'play-state': null,
      playState: null // Needed to avoid compilation issues with jss-camel-case
    },
    'box-shadow': {
      x: 0,
      y: 0,
      blur: 0,
      spread: 0,
      color: null,
      inset: null
    },
    'text-shadow': {
      x: 0,
      y: 0,
      blur: null,
      color: null
    }

    /**
     * A scheme for converting non-standart properties inside object.
     * For e.g.: include 'border-radius' property inside 'border' object.
     */
  };var customPropObj = exports.customPropObj = {
    border: {
      radius: 'border-radius',
      image: 'border-image',
      width: 'border-width',
      style: 'border-style',
      color: 'border-color'
    },
    background: {
      size: 'background-size',
      image: 'background-image'
    },
    font: {
      style: 'font-style',
      variant: 'font-variant',
      weight: 'font-weight',
      stretch: 'font-stretch',
      size: 'font-size',
      family: 'font-family',
      lineHeight: 'line-height', // Needed to avoid compilation issues with jss-camel-case
      'line-height': 'line-height'
    },
    flex: {
      grow: 'flex-grow',
      basis: 'flex-basis',
      direction: 'flex-direction',
      wrap: 'flex-wrap',
      flow: 'flex-flow',
      shrink: 'flex-shrink'
    },
    align: {
      self: 'align-self',
      items: 'align-items',
      content: 'align-content'
    },
    grid: {
      'template-columns': 'grid-template-columns',
      templateColumns: 'grid-template-columns',

      'template-rows': 'grid-template-rows',
      templateRows: 'grid-template-rows',

      'template-areas': 'grid-template-areas',
      templateAreas: 'grid-template-areas',

      template: 'grid-template',

      'auto-columns': 'grid-auto-columns',
      autoColumns: 'grid-auto-columns',

      'auto-rows': 'grid-auto-rows',
      autoRows: 'grid-auto-rows',

      'auto-flow': 'grid-auto-flow',
      autoFlow: 'grid-auto-flow',

      row: 'grid-row',
      column: 'grid-column',

      'row-start': 'grid-row-start',
      rowStart: 'grid-row-start',
      'row-end': 'grid-row-end',
      rowEnd: 'grid-row-end',

      'column-start': 'grid-column-start',
      columnStart: 'grid-column-start',
      'column-end': 'grid-column-end',
      columnEnd: 'grid-column-end',

      area: 'grid-area',
      gap: 'grid-gap',

      'row-gap': 'grid-row-gap',
      rowGap: 'grid-row-gap',

      'column-gap': 'grid-column-gap',
      columnGap: 'grid-column-gap'
    }
  };
  });

  unwrapExports(props);
  var props_1 = props.propArray;
  var props_2 = props.propArrayInObj;
  var props_3 = props.propObj;
  var props_4 = props.customPropObj;

  var lib$8 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

  exports.default = jssExpand;



  function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

  /**
   * Map values by given prop.
   *
   * @param {Array} array of values
   * @param {String} original property
   * @param {String} original rule
   * @return {String} mapped values
   */
  function mapValuesByProp(value, prop, rule) {
    return value.map(function (item) {
      return objectToArray(item, prop, rule, false, true);
    });
  }

  /**
   * Convert array to nested array, if needed
   *
   * @param {Array} array of values
   * @param {String} original property
   * @param {Object} sheme, for converting arrays in strings
   * @param {Object} original rule
   * @return {String} converted string
   */
  function processArray(value, prop, scheme, rule) {
    if (scheme[prop] == null) return value;
    if (value.length === 0) return [];
    if (Array.isArray(value[0])) return processArray(value[0], prop, scheme);
    if (_typeof(value[0]) === 'object') {
      return mapValuesByProp(value, prop, rule);
    }

    return [value];
  }

  /**
   * Convert object to array.
   *
   * @param {Object} object of values
   * @param {String} original property
   * @param {Object} original rule
   * @param {Boolean} is fallback prop
   * @param {Boolean} object is inside array
   * @return {String} converted string
   */
  function objectToArray(value, prop, rule, isFallback, isInArray) {
    if (!(props.propObj[prop] || props.customPropObj[prop])) return [];

    var result = [];

    // Check if exists any non-standart property
    if (props.customPropObj[prop]) {
      value = customPropsToStyle(value, rule, props.customPropObj[prop], isFallback);
    }

    // Pass throught all standart props
    if (Object.keys(value).length) {
      for (var baseProp in props.propObj[prop]) {
        if (value[baseProp]) {
          if (Array.isArray(value[baseProp])) {
            result.push(props.propArrayInObj[baseProp] === null ? value[baseProp] : value[baseProp].join(' '));
          } else result.push(value[baseProp]);
          continue;
        }

        // Add default value from props config.
        if (props.propObj[prop][baseProp] != null) {
          result.push(props.propObj[prop][baseProp]);
        }
      }
    }

    if (!result.length || isInArray) return result;
    return [result];
  }

  /**
   * Convert custom properties values to styles adding them to rule directly
   *
   * @param {Object} object of values
   * @param {Object} original rule
   * @param {String} property, that contain partial custom properties
   * @param {Boolean} is fallback prop
   * @return {Object} value without custom properties, that was already added to rule
   */
  function customPropsToStyle(value, rule, customProps, isFallback) {
    for (var prop in customProps) {
      var propName = customProps[prop];

      // If current property doesn't exist already in rule - add new one
      if (typeof value[prop] !== 'undefined' && (isFallback || !rule.prop(propName))) {
        var appendedValue = styleDetector(_defineProperty({}, propName, value[prop]), rule)[propName];

        // Add style directly in rule
        if (isFallback) rule.style.fallbacks[propName] = appendedValue;else rule.style[propName] = appendedValue;
      }
      // Delete converted property to avoid double converting
      delete value[prop];
    }

    return value;
  }

  /**
   * Detect if a style needs to be converted.
   *
   * @param {Object} style
   * @param {Object} rule
   * @param {Boolean} is fallback prop
   * @return {Object} convertedStyle
   */
  function styleDetector(style, rule, isFallback) {
    for (var prop in style) {
      var value = style[prop];

      if (Array.isArray(value)) {
        // Check double arrays to avoid recursion.
        if (!Array.isArray(value[0])) {
          if (prop === 'fallbacks') {
            for (var index = 0; index < style.fallbacks.length; index++) {
              style.fallbacks[index] = styleDetector(style.fallbacks[index], rule, true);
            }
            continue;
          }

          style[prop] = processArray(value, prop, props.propArray);
          // Avoid creating properties with empty values
          if (!style[prop].length) delete style[prop];
        }
      } else if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
        if (prop === 'fallbacks') {
          style.fallbacks = styleDetector(style.fallbacks, rule, true);
          continue;
        }

        style[prop] = objectToArray(value, prop, rule, isFallback);
        // Avoid creating properties with empty values
        if (!style[prop].length) delete style[prop];
      }

      // Maybe a computed value resulting in an empty string
      else if (style[prop] === '') delete style[prop];
    }

    return style;
  }

  /**
   * Adds possibility to write expanded styles.
   *
   * @param {Rule} rule
   * @api public
   */
  function jssExpand() {
    function onProcessStyle(style, rule) {
      if (!style || rule.type !== 'style') return style;

      if (Array.isArray(style)) {
        // Pass rules one by one and reformat them
        for (var index = 0; index < style.length; index++) {
          style[index] = styleDetector(style[index], rule);
        }
        return style;
      }

      return styleDetector(style, rule);
    }

    return { onProcessStyle: onProcessStyle };
  }
  });

  unwrapExports(lib$8);

  var prefix = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });



  var _isInBrowser2 = _interopRequireDefault(isBrowser);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  var js = ''; /**
                * Export javascript style and css style vendor prefixes.
                * Based on "transform" support test.
                */

  var css = '';

  // We should not do anything if required serverside.
  if (_isInBrowser2['default']) {
    // Order matters. We need to check Webkit the last one because
    // other vendors use to add Webkit prefixes to some properties
    var jsCssMap = {
      Moz: '-moz-',
      // IE did it wrong again ...
      ms: '-ms-',
      O: '-o-',
      Webkit: '-webkit-'
    };
    var style = document.createElement('p').style;
    var testProp = 'Transform';

    for (var key in jsCssMap) {
      if (key + testProp in style) {
        js = key;
        css = jsCssMap[key];
        break;
      }
    }
  }

  /**
   * Vendor prefix string for the current browser.
   *
   * @type {{js: String, css: String}}
   * @api public
   */
  exports['default'] = { js: js, css: css };
  });

  unwrapExports(prefix);

  var camelize_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports['default'] = camelize;
  var regExp = /[-\s]+(.)?/g;

  /**
   * Convert dash separated strings to camel cased.
   *
   * @param {String} str
   * @return {String}
   */
  function camelize(str) {
    return str.replace(regExp, toUpper);
  }

  function toUpper(match, c) {
    return c ? c.toUpperCase() : '';
  }
  });

  unwrapExports(camelize_1);

  var supportedProperty_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports['default'] = supportedProperty;



  var _isInBrowser2 = _interopRequireDefault(isBrowser);



  var _prefix2 = _interopRequireDefault(prefix);



  var _camelize2 = _interopRequireDefault(camelize_1);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  var el = void 0;
  var cache = {};

  if (_isInBrowser2['default']) {
    el = document.createElement('p');

    /**
     * We test every property on vendor prefix requirement.
     * Once tested, result is cached. It gives us up to 70% perf boost.
     * http://jsperf.com/element-style-object-access-vs-plain-object
     *
     * Prefill cache with known css properties to reduce amount of
     * properties we need to feature test at runtime.
     * http://davidwalsh.name/vendor-prefix
     */
    var computed = window.getComputedStyle(document.documentElement, '');
    for (var key in computed) {
      if (!isNaN(key)) cache[computed[key]] = computed[key];
    }
  }

  /**
   * Test if a property is supported, returns supported property with vendor
   * prefix if required. Returns `false` if not supported.
   *
   * @param {String} prop dash separated
   * @return {String|Boolean}
   * @api public
   */
  function supportedProperty(prop) {
    // For server-side rendering.
    if (!el) return prop;

    // We have not tested this prop yet, lets do the test.
    if (cache[prop] != null) return cache[prop];

    // Camelization is required because we can't test using
    // css syntax for e.g. in FF.
    // Test if property is supported as it is.
    if ((0, _camelize2['default'])(prop) in el.style) {
      cache[prop] = prop;
    }
    // Test if property is supported with vendor prefix.
    else if (_prefix2['default'].js + (0, _camelize2['default'])('-' + prop) in el.style) {
        cache[prop] = _prefix2['default'].css + prop;
      } else {
        cache[prop] = false;
      }

    return cache[prop];
  }
  });

  unwrapExports(supportedProperty_1);

  var supportedValue_1 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports['default'] = supportedValue;



  var _isInBrowser2 = _interopRequireDefault(isBrowser);



  var _prefix2 = _interopRequireDefault(prefix);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  var cache = {};
  var el = void 0;

  if (_isInBrowser2['default']) el = document.createElement('p');

  /**
   * Returns prefixed value if needed. Returns `false` if value is not supported.
   *
   * @param {String} property
   * @param {String} value
   * @return {String|Boolean}
   * @api public
   */
  function supportedValue(property, value) {
    // For server-side rendering.
    if (!el) return value;

    // It is a string or a number as a string like '1'.
    // We want only prefixable values here.
    if (typeof value !== 'string' || !isNaN(parseInt(value, 10))) return value;

    var cacheKey = property + value;

    if (cache[cacheKey] != null) return cache[cacheKey];

    // IE can even throw an error in some cases, for e.g. style.content = 'bar'
    try {
      // Test value as it is.
      el.style[property] = value;
    } catch (err) {
      cache[cacheKey] = false;
      return false;
    }

    // Value is supported as it is.
    if (el.style[property] !== '') {
      cache[cacheKey] = value;
    } else {
      // Test value with vendor prefix.
      value = _prefix2['default'].css + value;

      // Hardcode test to convert "flex" to "-ms-flexbox" for IE10.
      if (value === '-ms-flex') value = '-ms-flexbox';

      el.style[property] = value;

      // Value is supported with vendor prefix.
      if (el.style[property] !== '') cache[cacheKey] = value;
    }

    if (!cache[cacheKey]) cache[cacheKey] = false;

    // Reset style value.
    el.style[property] = '';

    return cache[cacheKey];
  }
  });

  unwrapExports(supportedValue_1);

  var lib$9 = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.supportedValue = exports.supportedProperty = exports.prefix = undefined;



  var _prefix2 = _interopRequireDefault(prefix);



  var _supportedProperty2 = _interopRequireDefault(supportedProperty_1);



  var _supportedValue2 = _interopRequireDefault(supportedValue_1);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  exports['default'] = {
    prefix: _prefix2['default'],
    supportedProperty: _supportedProperty2['default'],
    supportedValue: _supportedValue2['default']
  }; /**
      * CSS Vendor prefix detection and property feature testing.
      *
      * @copyright Oleg Slobodskoi 2015
      * @website https://github.com/jsstyles/css-vendor
      * @license MIT
      */

  exports.prefix = _prefix2['default'];
  exports.supportedProperty = _supportedProperty2['default'];
  exports.supportedValue = _supportedValue2['default'];
  });

  unwrapExports(lib$9);
  var lib_1$1 = lib$9.supportedValue;
  var lib_2$1 = lib$9.supportedProperty;
  var lib_3$1 = lib$9.prefix;

  var lib$a = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports['default'] = jssVendorPrefixer;



  var vendor = _interopRequireWildcard(lib$9);

  function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

  /**
   * Add vendor prefix to a property name when needed.
   *
   * @param {Rule} rule
   * @api public
   */
  function jssVendorPrefixer() {
    function onProcessRule(rule) {
      if (rule.type === 'keyframes') {
        rule.key = '@' + vendor.prefix.css + rule.key.substr(1);
      }
    }

    function onProcessStyle(style, rule) {
      if (rule.type !== 'style') return style;

      for (var prop in style) {
        var value = style[prop];

        var changeProp = false;
        var supportedProp = vendor.supportedProperty(prop);
        if (supportedProp && supportedProp !== prop) changeProp = true;

        var changeValue = false;
        var supportedValue = vendor.supportedValue(supportedProp, value);
        if (supportedValue && supportedValue !== value) changeValue = true;

        if (changeProp || changeValue) {
          if (changeProp) delete style[prop];
          style[supportedProp || prop] = supportedValue || value;
        }
      }

      return style;
    }

    function onChangeValue(value, prop) {
      return vendor.supportedValue(prop, value);
    }

    return { onProcessRule: onProcessRule, onProcessStyle: onProcessStyle, onChangeValue: onChangeValue };
  }
  });

  unwrapExports(lib$a);

  var lib$b = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports['default'] = jssPropsSort;
  /**
   * Sort props by length.
   */
  function jssPropsSort() {
    function sort(prop0, prop1) {
      return prop0.length - prop1.length;
    }

    function onProcessStyle(style, rule) {
      if (rule.type !== 'style') return style;

      var newStyle = {};
      var props = Object.keys(style).sort(sort);
      for (var prop in props) {
        newStyle[props[prop]] = style[props[prop]];
      }
      return newStyle;
    }

    return { onProcessStyle: onProcessStyle };
  }
  });

  unwrapExports(lib$b);

  var lib$c = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });



  var _jssTemplate2 = _interopRequireDefault(lib$1);



  var _jssGlobal2 = _interopRequireDefault(lib$2);



  var _jssExtend2 = _interopRequireDefault(lib$3);



  var _jssNested2 = _interopRequireDefault(lib$4);



  var _jssCompose2 = _interopRequireDefault(lib$5);



  var _jssCamelCase2 = _interopRequireDefault(lib$6);



  var _jssDefaultUnit2 = _interopRequireDefault(lib$7);



  var _jssExpand2 = _interopRequireDefault(lib$8);



  var _jssVendorPrefixer2 = _interopRequireDefault(lib$a);



  var _jssPropsSort2 = _interopRequireDefault(lib$b);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

  exports.default = function () {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    return {
      plugins: [(0, _jssTemplate2.default)(options.template), (0, _jssGlobal2.default)(options.global), (0, _jssExtend2.default)(options.extend), (0, _jssNested2.default)(options.nested), (0, _jssCompose2.default)(options.compose), (0, _jssCamelCase2.default)(options.camelCase), (0, _jssDefaultUnit2.default)(options.defaultUnit), (0, _jssExpand2.default)(options.expand), (0, _jssVendorPrefixer2.default)(options.vendorPrefixer), (0, _jssPropsSort2.default)(options.propsSort)]
    };
  };
  });

  var preset = unwrapExports(lib$c);

  function _templateObject$1() {
    var data = _taggedTemplateLiteral(["\n      <", " classes=", " ...", " />\n    "]);

    _templateObject$1 = function _templateObject() {
      return data;
    };

    return data;
  }
  jss.setup(preset());
  var withStyle = curry_1(function (style, WrappedComponent) {
    var sheet = jss.createStyleSheet(style);

    var _sheet$attach = sheet.attach(),
        classes = _sheet$attach.classes;

    var appliedCustomSheet;
    return function (props) {
      if (!appliedCustomSheet && utilities.type.isObject(props.style)) {
        sheet.detach();
        sheet = jss.createStyleSheet(umd(style, props.style));
        classes = sheet.classes;
        appliedCustomSheet = true;
      }

      return html$1(_templateObject$1(), WrappedComponent, classes, props);
    };
  });

  var withAdapter = curryN_1(2, function () {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var WrappedComponent = arguments.length > 1 ? arguments[1] : undefined;
    var _options$adapters = options.adapters,
        adapters = _options$adapters === void 0 ? [] : _options$adapters,
        _options$id = options.id,
        id = _options$id === void 0 ? "#meToo" : _options$id;
    WrappedComponent.adapters = adapters.reduce(function (acc, key) {
      if (type.isFunction(adapters[key])) acc[key] = adapters[key](options, WrappedComponent);
      return acc;
    }, {});
    id = id || WrappedComponent.id;

    WrappedComponent.render = function () {
      var props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      return render(h(WrappedComponent, Object.assign({
        id: id
      }, props)), document.getElementById(id + "-container"));
    };

    return WrappedComponent;
  });

  function _pipe(f, g) {
    return function () {
      return g.call(this, f.apply(this, arguments));
    };
  }
  var _pipe_1 = _pipe;

  /**
   * Returns a single item by iterating through the list, successively calling
   * the iterator function and passing it an accumulator value and the current
   * value from the array, and then passing the result to the next call.
   *
   * The iterator function receives two values: *(acc, value)*. It may use
   * [`R.reduced`](#reduced) to shortcut the iteration.
   *
   * The arguments' order of [`reduceRight`](#reduceRight)'s iterator function
   * is *(value, acc)*.
   *
   * Note: `R.reduce` does not skip deleted or unassigned indices (sparse
   * arrays), unlike the native `Array.prototype.reduce` method. For more details
   * on this behavior, see:
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce#Description
   *
   * Dispatches to the `reduce` method of the third argument, if present. When
   * doing so, it is up to the user to handle the [`R.reduced`](#reduced)
   * shortcuting, as this is not implemented by `reduce`.
   *
   * @func
   * @memberOf R
   * @since v0.1.0
   * @category List
   * @sig ((a, b) -> a) -> a -> [b] -> a
   * @param {Function} fn The iterator function. Receives two values, the accumulator and the
   *        current element from the array.
   * @param {*} acc The accumulator value.
   * @param {Array} list The list to iterate over.
   * @return {*} The final, accumulated value.
   * @see R.reduced, R.addIndex, R.reduceRight
   * @example
   *
   *      R.reduce(R.subtract, 0, [1, 2, 3, 4]) // => ((((0 - 1) - 2) - 3) - 4) = -10
   *      //          -               -10
   *      //         / \              / \
   *      //        -   4           -6   4
   *      //       / \              / \
   *      //      -   3   ==>     -3   3
   *      //     / \              / \
   *      //    -   2           -1   2
   *      //   / \              / \
   *      //  0   1            0   1
   *
   * @symb R.reduce(f, a, [b, c, d]) = f(f(f(a, b), c), d)
   */


  var reduce = /*#__PURE__*/_curry3_1(_reduce_1);
  var reduce_1 = reduce;

  /**
   * This checks whether a function has a [methodname] function. If it isn't an
   * array it will execute that function otherwise it will default to the ramda
   * implementation.
   *
   * @private
   * @param {Function} fn ramda implemtation
   * @param {String} methodname property to check for a custom implementation
   * @return {Object} Whatever the return value of the method is.
   */


  function _checkForMethod(methodname, fn) {
    return function () {
      var length = arguments.length;
      if (length === 0) {
        return fn();
      }
      var obj = arguments[length - 1];
      return _isArray(obj) || typeof obj[methodname] !== 'function' ? fn.apply(this, arguments) : obj[methodname].apply(obj, Array.prototype.slice.call(arguments, 0, length - 1));
    };
  }
  var _checkForMethod_1 = _checkForMethod;

  /**
   * Returns the elements of the given list or string (or object with a `slice`
   * method) from `fromIndex` (inclusive) to `toIndex` (exclusive).
   *
   * Dispatches to the `slice` method of the third argument, if present.
   *
   * @func
   * @memberOf R
   * @since v0.1.4
   * @category List
   * @sig Number -> Number -> [a] -> [a]
   * @sig Number -> Number -> String -> String
   * @param {Number} fromIndex The start index (inclusive).
   * @param {Number} toIndex The end index (exclusive).
   * @param {*} list
   * @return {*}
   * @example
   *
   *      R.slice(1, 3, ['a', 'b', 'c', 'd']);        //=> ['b', 'c']
   *      R.slice(1, Infinity, ['a', 'b', 'c', 'd']); //=> ['b', 'c', 'd']
   *      R.slice(0, -1, ['a', 'b', 'c', 'd']);       //=> ['a', 'b', 'c']
   *      R.slice(-3, -1, ['a', 'b', 'c', 'd']);      //=> ['b', 'c']
   *      R.slice(0, 3, 'ramda');                     //=> 'ram'
   */


  var slice = /*#__PURE__*/_curry3_1( /*#__PURE__*/_checkForMethod_1('slice', function slice(fromIndex, toIndex, list) {
    return Array.prototype.slice.call(list, fromIndex, toIndex);
  }));
  var slice_1 = slice;

  /**
   * Returns all but the first element of the given list or string (or object
   * with a `tail` method).
   *
   * Dispatches to the `slice` method of the first argument, if present.
   *
   * @func
   * @memberOf R
   * @since v0.1.0
   * @category List
   * @sig [a] -> [a]
   * @sig String -> String
   * @param {*} list
   * @return {*}
   * @see R.head, R.init, R.last
   * @example
   *
   *      R.tail([1, 2, 3]);  //=> [2, 3]
   *      R.tail([1, 2]);     //=> [2]
   *      R.tail([1]);        //=> []
   *      R.tail([]);         //=> []
   *
   *      R.tail('abc');  //=> 'bc'
   *      R.tail('ab');   //=> 'b'
   *      R.tail('a');    //=> ''
   *      R.tail('');     //=> ''
   */


  var tail$1 = /*#__PURE__*/_curry1_1( /*#__PURE__*/_checkForMethod_1('tail', /*#__PURE__*/slice_1(1, Infinity)));
  var tail_1 = tail$1;

  /**
   * Performs left-to-right function composition. The leftmost function may have
   * any arity; the remaining functions must be unary.
   *
   * In some libraries this function is named `sequence`.
   *
   * **Note:** The result of pipe is not automatically curried.
   *
   * @func
   * @memberOf R
   * @since v0.1.0
   * @category Function
   * @sig (((a, b, ..., n) -> o), (o -> p), ..., (x -> y), (y -> z)) -> ((a, b, ..., n) -> z)
   * @param {...Function} functions
   * @return {Function}
   * @see R.compose
   * @example
   *
   *      const f = R.pipe(Math.pow, R.negate, R.inc);
   *
   *      f(3, 4); // -(3^4) + 1
   * @symb R.pipe(f, g, h)(a, b) = h(g(f(a, b)))
   */


  function pipe() {
    if (arguments.length === 0) {
      throw new Error('pipe requires at least one argument');
    }
    return _arity_1(arguments[0].length, reduce_1(_pipe_1, arguments[0], tail_1(arguments)));
  }
  var pipe_1 = pipe;

  /**
   * Returns a new list or string with the elements or characters in reverse
   * order.
   *
   * @func
   * @memberOf R
   * @since v0.1.0
   * @category List
   * @sig [a] -> [a]
   * @sig String -> String
   * @param {Array|String} list
   * @return {Array|String}
   * @example
   *
   *      R.reverse([1, 2, 3]);  //=> [3, 2, 1]
   *      R.reverse([1, 2]);     //=> [2, 1]
   *      R.reverse([1]);        //=> [1]
   *      R.reverse([]);         //=> []
   *
   *      R.reverse('abc');      //=> 'cba'
   *      R.reverse('ab');       //=> 'ba'
   *      R.reverse('a');        //=> 'a'
   *      R.reverse('');         //=> ''
   */


  var reverse = /*#__PURE__*/_curry1_1(function reverse(list) {
    return _isString_1(list) ? list.split('').reverse().join('') : Array.prototype.slice.call(list, 0).reverse();
  });
  var reverse_1 = reverse;

  /**
   * Performs right-to-left function composition. The rightmost function may have
   * any arity; the remaining functions must be unary.
   *
   * **Note:** The result of compose is not automatically curried.
   *
   * @func
   * @memberOf R
   * @since v0.1.0
   * @category Function
   * @sig ((y -> z), (x -> y), ..., (o -> p), ((a, b, ..., n) -> o)) -> ((a, b, ..., n) -> z)
   * @param {...Function} ...functions The functions to compose
   * @return {Function}
   * @see R.pipe
   * @example
   *
   *      const classyGreeting = (firstName, lastName) => "The name's " + lastName + ", " + firstName + " " + lastName
   *      const yellGreeting = R.compose(R.toUpper, classyGreeting);
   *      yellGreeting('James', 'Bond'); //=> "THE NAME'S BOND, JAMES BOND"
   *
   *      R.compose(Math.abs, R.add(1), R.multiply(2))(-4) //=> 7
   *
   * @symb R.compose(f, g, h)(a, b) = f(g(h(a, b)))
   */


  function compose() {
    if (arguments.length === 0) {
      throw new Error('compose requires at least one argument');
    }
    return pipe_1.apply(this, reverse_1(arguments));
  }
  var compose_1 = compose;

  /**
   * Returns a new function much like the supplied one, except that the first two
   * arguments' order is reversed.
   *
   * @func
   * @memberOf R
   * @since v0.1.0
   * @category Function
   * @sig ((a, b, c, ...) -> z) -> (b -> a -> c -> ... -> z)
   * @param {Function} fn The function to invoke with its first two parameters reversed.
   * @return {*} The result of invoking `fn` with its first two parameters' order reversed.
   * @example
   *
   *      const mergeThree = (a, b, c) => [].concat(a, b, c);
   *
   *      mergeThree(1, 2, 3); //=> [1, 2, 3]
   *
   *      R.flip(mergeThree)(1, 2, 3); //=> [2, 1, 3]
   * @symb R.flip(f)(a, b, c) = f(b, a, c)
   */


  var flip = /*#__PURE__*/_curry1_1(function flip(fn) {
    return curryN_1(fn.length, function (a, b) {
      var args = Array.prototype.slice.call(arguments, 0);
      args[0] = b;
      args[1] = a;
      return fn.apply(this, args);
    });
  });
  var flip_1 = flip;

  function _isFunction(x) {
    return Object.prototype.toString.call(x) === '[object Function]';
  }
  var _isFunction_1 = _isFunction;

  function _templateObject3() {
    var data = _taggedTemplateLiteral(["\n          <form\n            onsubmit=", "\n            data-action=\"submit\"\n            class=", "\n            id=\"", "-form\"\n          >\n            <div className=\"formfield\">\n              <label for=\"recipient\" className=\"required\">Recipient</label>\n              <input\n                name=\"recipient\"\n                type=\"email\"\n                class=", "\n                oninput=", "\n                value=", "\n                required\n              />\n              <span validation=\"recipient\"\n                >", "</span\n              >\n            </div>\n            <div className=\"formfield\">\n              <label for=\"message\" className=\"required\">Message</label>\n              <input\n                name=\"message\"\n                type=\"text\"\n                class=", "\n                oninput=", "\n                value=", "\n                required\n              />\n              <span validation=\"message\">", "</span>\n            </div>\n            <button type=\"submit\" className=", ">Send</button>\n          </form>\n        "]);

    _templateObject3 = function _templateObject3() {
      return data;
    };

    return data;
  }

  function _templateObject2() {
    var data = _taggedTemplateLiteral(["\n            ", "\n          "]);

    _templateObject2 = function _templateObject2() {
      return data;
    };

    return data;
  }

  function _templateObject$2() {
    var data = _taggedTemplateLiteral(["\n    <", "\n      initialState=", "\n      actions=", "\n      requestHandler=", "\n      >", "<//\n    >\n  "]);

    _templateObject$2 = function _templateObject() {
      return data;
    };

    return data;
  }
  /**
   * htm+preact+jss ~= 42kb
   * ace storefront.css = 87kb
   * it would be better to use unpkg
   * but ie doesn't support browser modules
   * an alpha version of preact to access hooks
   * it should be available soon
   */
  // a handfull of optimistic coding and a spoonfull of syntactic sugar

  var id$2 = "bronto-emailer"; // export let prerender = `
  //   {% if themeSettings.recaptchaSiteKey %}
  //     <script src='https://www.google.com/recaptcha/api.js' async defer></script>
  //   {% endif %}
  //   <section id="${id}">
  //     <form data-action="submit" id="${id}-form">
  //       <div class="formfield">
  //         <label for="recipient" class="required">
  //         <input name="recipient" type="email" required>
  //       </div>
  //       <div class="formfield">
  //         <label for="message" class="required">
  //         <input name="message" type="email" required>
  //       </div>
  //       <button type="submit">
  //     </form>
  //   </section>
  // `;

  var actions = {
    sendEmail: function sendEmail(state, action) {
      return this("post", "/bronto/sendMessage", {
        recipient: utilities.lens("recipient", state),
        message: utilities.lens("message", state),
        action: action
      }).then(function (response) {
        console.log(response);
        action.triggerMessage({
          value: {
            type: "success",
            text: "Great Success!"
          }
        });
      }).catch(function (err) {
        console.log(err);
        action.triggerMessage({
          value: {
            type: "error",
            text: "User Error!"
          }
        });
      });
    }
  };
  var initialState = {
    recipient: "",
    message: ""
  };
  initialState.validation = clone_1(initialState);
  var style = {
    submit: {
      background: "green",
      "&:hover": {
        background: "orange"
      }
    },
    loading: {
      opacity: "0.3"
    }
  };
  var validation = {
    recipient: "email",
    message: "required"
  };
  //that it wants to call. assume every other dispatch is specific
  //to this instance
  //withAdapter needs to be run last since it adds methods to the view

  var view = compose_1(withAdapter({
    id: id$2
  }), withStyle(style))(function (props) {
    var classes = props.classes;
    var id = props.id;
    var validator = validate(validation); //vm methods

    var submit = curry_1(function (dispatch, state, event) {
      event.preventDefault();
      var invalid = validator(state);

      if (invalid) {
        return dispatch("mutate", {
          path: "validation",
          value: invalid
        });
      } //if the message action doesn't exist this will just do nothing


      if (validator) dispatch("sendEmail", {
        triggerMessage: dispatch("triggerMessage")
      });
    });
    var handleInput = curry_1(function (dispatch, path, event) {
      dispatch("mutate", {
        path: path,
        value: event.currentTarget.value
      });
    });
    var bindVm = createVm({
      submit: submit,
      handleInput: handleInput
    });
    return html$1(_templateObject$2(), store$2, initialState, actions, props.requestHandler, function (_ref) {
      var dispatch = _ref.dispatch,
          state = _ref.state;
      var vm = bindVm(dispatch);
      var prop = flip_1(utilities.lens)(state);

      if (props.customView) {
        //some tools here to overwrite the innards
        //some of this could be standardized with hooks
        //would be cool to expose the preact hooks like useEffect
        //to the consumer/adapter
        return html$1(_templateObject2(), props.customView());
      }

      return html$1(_templateObject3(), vm.submit(state), state.loading ? classes.loading : "", id, classes.input, vm.handleInput("recipient"), prop("recipient"), prop("validation.recipient"), classes.input, vm.handleInput("message"), prop("message"), prop("validation.message"), classes.submit);
    });
  });
  var emailForm = {
    view: view,
    actions: actions,
    id: id$2,
    style: style,
    validation: validation
  };

  /**
   * Creates a new object by recursively evolving a shallow copy of `object`,
   * according to the `transformation` functions. All non-primitive properties
   * are copied by reference.
   *
   * A `transformation` function will not be invoked if its corresponding key
   * does not exist in the evolved object.
   *
   * @func
   * @memberOf R
   * @since v0.9.0
   * @category Object
   * @sig {k: (v -> v)} -> {k: v} -> {k: v}
   * @param {Object} transformations The object specifying transformation functions to apply
   *        to the object.
   * @param {Object} object The object to be transformed.
   * @return {Object} The transformed object.
   * @example
   *
   *      const tomato = {firstName: '  Tomato ', data: {elapsed: 100, remaining: 1400}, id:123};
   *      const transformations = {
   *        firstName: R.trim,
   *        lastName: R.trim, // Will not get invoked.
   *        data: {elapsed: R.add(1), remaining: R.add(-1)}
   *      };
   *      R.evolve(transformations, tomato); //=> {firstName: 'Tomato', data: {elapsed: 101, remaining: 1399}, id:123}
   */


  var evolve = /*#__PURE__*/_curry2_1(function evolve(transformations, object) {
    var result = object instanceof Array ? [] : {};
    var transformation, key, type;
    for (key in object) {
      transformation = transformations[key];
      type = typeof transformation;
      result[key] = type === 'function' ? transformation(object[key]) : transformation && type === 'object' ? evolve(transformation, object[key]) : object[key];
    }
    return result;
  });
  var evolve_1 = evolve;

  /**
   * Returns the empty value of its argument's type. Ramda defines the empty
   * value of Array (`[]`), Object (`{}`), String (`''`), and Arguments. Other
   * types are supported if they define `<Type>.empty`,
   * `<Type>.prototype.empty` or implement the
   * [FantasyLand Monoid spec](https://github.com/fantasyland/fantasy-land#monoid).
   *
   * Dispatches to the `empty` method of the first argument, if present.
   *
   * @func
   * @memberOf R
   * @since v0.3.0
   * @category Function
   * @sig a -> a
   * @param {*} x
   * @return {*}
   * @example
   *
   *      R.empty(Just(42));      //=> Nothing()
   *      R.empty([1, 2, 3]);     //=> []
   *      R.empty('unicorns');    //=> ''
   *      R.empty({x: 1, y: 2});  //=> {}
   */


  var empty = /*#__PURE__*/_curry1_1(function empty(x) {
    return x != null && typeof x['fantasy-land/empty'] === 'function' ? x['fantasy-land/empty']() : x != null && x.constructor != null && typeof x.constructor['fantasy-land/empty'] === 'function' ? x.constructor['fantasy-land/empty']() : x != null && typeof x.empty === 'function' ? x.empty() : x != null && x.constructor != null && typeof x.constructor.empty === 'function' ? x.constructor.empty() : _isArray(x) ? [] : _isString_1(x) ? '' : _isObject_1(x) ? {} : _isArguments_1(x) ? function () {
      return arguments;
    }() : void 0 // else
    ;
  });
  var empty_1 = empty;

  /**
   * Returns the result of concatenating the given lists or strings.
   *
   * Note: `R.concat` expects both arguments to be of the same type,
   * unlike the native `Array.prototype.concat` method. It will throw
   * an error if you `concat` an Array with a non-Array value.
   *
   * Dispatches to the `concat` method of the first argument, if present.
   * Can also concatenate two members of a [fantasy-land
   * compatible semigroup](https://github.com/fantasyland/fantasy-land#semigroup).
   *
   * @func
   * @memberOf R
   * @since v0.1.0
   * @category List
   * @sig [a] -> [a] -> [a]
   * @sig String -> String -> String
   * @param {Array|String} firstList The first list
   * @param {Array|String} secondList The second list
   * @return {Array|String} A list consisting of the elements of `firstList` followed by the elements of
   * `secondList`.
   *
   * @example
   *
   *      R.concat('ABC', 'DEF'); // 'ABCDEF'
   *      R.concat([4, 5, 6], [1, 2, 3]); //=> [4, 5, 6, 1, 2, 3]
   *      R.concat([], []); //=> []
   */


  var concat = /*#__PURE__*/_curry2_1(function concat(a, b) {
    if (_isArray(a)) {
      if (_isArray(b)) {
        return a.concat(b);
      }
      throw new TypeError(toString_1(b) + ' is not an array');
    }
    if (_isString_1(a)) {
      if (_isString_1(b)) {
        return a + b;
      }
      throw new TypeError(toString_1(b) + ' is not a string');
    }
    if (a != null && _isFunction_1(a['fantasy-land/concat'])) {
      return a['fantasy-land/concat'](b);
    }
    if (a != null && _isFunction_1(a.concat)) {
      return a.concat(b);
    }
    throw new TypeError(toString_1(a) + ' does not have a method named "concat" or "fantasy-land/concat"');
  });
  var concat_1 = concat;

  function _templateObject3$1() {
    var data = _taggedTemplateLiteral(["\n                    <ul class=", ">\n                      <li class=", ">", "</li>\n                    </ul>\n                  "]);

    _templateObject3$1 = function _templateObject3() {
      return data;
    };

    return data;
  }

  function _templateObject2$1() {
    var data = _taggedTemplateLiteral(["\n          <div id=", " class=", ">\n            ", "\n          </div>\n        "]);

    _templateObject2$1 = function _templateObject2() {
      return data;
    };

    return data;
  }

  function _templateObject$3() {
    var data = _taggedTemplateLiteral(["\n    <", " initialState=", " actions=", "\n      >", "<//\n    >\n  "]);

    _templateObject$3 = function _templateObject() {
      return data;
    };

    return data;
  }
  var id$3 = "message-bar";
  var style$1 = {
    container: {
      "margin-bottom": "10px"
    },
    success: {
      background: "green"
    },
    error: {
      background: "red"
    },
    message: {
      color: "white"
    }
  };
  var initialState$1 = {
    messages: []
  };
  var actions$1 = {
    triggerMessage: function triggerMessage(state, action) {
      return evolve_1({
        messages: flip_1(concat_1)([action.value])
      }, state);
    },
    clear: evolve_1({
      messages: empty_1
    })
  };
  var view$1 = compose_1(withAdapter({
    id: id$3
  }), withStyle(style$1))(function (props) {
    return html$1(_templateObject$3(), store$2, initialState$1, actions$1, function (_ref) {
      var dispatch = _ref.dispatch,
          state = _ref.state;
      return html$1(_templateObject2$1(), id$3, props.classes.message, state.messages.length ? state.messages.map(function (message) {
        return html$1(_templateObject3$1(), props.classes[message.type] || "", props.classes.message, message.text);
      }) : null);
    });
  });
  var message = {
    view: view$1,
    actions: actions$1,
    style: style$1,
    id: id$3
  };

  var components = {
    emailForm: emailForm,
    message: message,
    tools: tools
  };

  var correctPrototypeGetter = !fails(function () {
    function F() { /* empty */ }
    F.prototype.constructor = null;
    return Object.getPrototypeOf(new F()) !== F.prototype;
  });

  // 19.1.2.9 / 15.2.3.2 Object.getPrototypeOf(O)


  var IE_PROTO$1 = sharedKey('IE_PROTO');

  var ObjectPrototype$1 = Object.prototype;

  var objectGetPrototypeOf = correctPrototypeGetter ? Object.getPrototypeOf : function (O) {
    O = toObject(O);
    if (has(O, IE_PROTO$1)) return O[IE_PROTO$1];
    if (typeof O.constructor == 'function' && O instanceof O.constructor) {
      return O.constructor.prototype;
    } return O instanceof Object ? ObjectPrototype$1 : null;
  };

  var ITERATOR$3 = wellKnownSymbol('iterator');
  var BUGGY_SAFARI_ITERATORS = false;

  var returnThis = function () { return this; };

  // `%IteratorPrototype%` object
  // https://tc39.github.io/ecma262/#sec-%iteratorprototype%-object
  var IteratorPrototype, PrototypeOfArrayIteratorPrototype, arrayIterator;

  if ([].keys) {
    arrayIterator = [].keys();
    // Safari 8 has buggy iterators w/o `next`
    if (!('next' in arrayIterator)) BUGGY_SAFARI_ITERATORS = true;
    else {
      PrototypeOfArrayIteratorPrototype = objectGetPrototypeOf(objectGetPrototypeOf(arrayIterator));
      if (PrototypeOfArrayIteratorPrototype !== Object.prototype) IteratorPrototype = PrototypeOfArrayIteratorPrototype;
    }
  }

  if (IteratorPrototype == undefined) IteratorPrototype = {};

  // 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
  if (!has(IteratorPrototype, ITERATOR$3)) hide(IteratorPrototype, ITERATOR$3, returnThis);

  var iteratorsCore = {
    IteratorPrototype: IteratorPrototype,
    BUGGY_SAFARI_ITERATORS: BUGGY_SAFARI_ITERATORS
  };

  var IteratorPrototype$1 = iteratorsCore.IteratorPrototype;





  var returnThis$1 = function () { return this; };

  var createIteratorConstructor = function (IteratorConstructor, NAME, next) {
    var TO_STRING_TAG = NAME + ' Iterator';
    IteratorConstructor.prototype = objectCreate(IteratorPrototype$1, { next: createPropertyDescriptor(1, next) });
    setToStringTag(IteratorConstructor, TO_STRING_TAG, false, true);
    iterators[TO_STRING_TAG] = returnThis$1;
    return IteratorConstructor;
  };

  var ITERATOR$4 = wellKnownSymbol('iterator');


  var IteratorPrototype$2 = iteratorsCore.IteratorPrototype;
  var BUGGY_SAFARI_ITERATORS$1 = iteratorsCore.BUGGY_SAFARI_ITERATORS;
  var KEYS = 'keys';
  var VALUES = 'values';
  var ENTRIES = 'entries';

  var returnThis$2 = function () { return this; };

  var defineIterator = function (Iterable, NAME, IteratorConstructor, next, DEFAULT, IS_SET, FORCED) {
    createIteratorConstructor(IteratorConstructor, NAME, next);

    var getIterationMethod = function (KIND) {
      if (KIND === DEFAULT && defaultIterator) return defaultIterator;
      if (!BUGGY_SAFARI_ITERATORS$1 && KIND in IterablePrototype) return IterablePrototype[KIND];
      switch (KIND) {
        case KEYS: return function keys() { return new IteratorConstructor(this, KIND); };
        case VALUES: return function values() { return new IteratorConstructor(this, KIND); };
        case ENTRIES: return function entries() { return new IteratorConstructor(this, KIND); };
      } return function () { return new IteratorConstructor(this); };
    };

    var TO_STRING_TAG = NAME + ' Iterator';
    var INCORRECT_VALUES_NAME = false;
    var IterablePrototype = Iterable.prototype;
    var nativeIterator = IterablePrototype[ITERATOR$4]
      || IterablePrototype['@@iterator']
      || DEFAULT && IterablePrototype[DEFAULT];
    var defaultIterator = !BUGGY_SAFARI_ITERATORS$1 && nativeIterator || getIterationMethod(DEFAULT);
    var anyNativeIterator = NAME == 'Array' ? IterablePrototype.entries || nativeIterator : nativeIterator;
    var CurrentIteratorPrototype, methods, KEY;

    // fix native
    if (anyNativeIterator) {
      CurrentIteratorPrototype = objectGetPrototypeOf(anyNativeIterator.call(new Iterable()));
      if (IteratorPrototype$2 !== Object.prototype && CurrentIteratorPrototype.next) {
        if (objectGetPrototypeOf(CurrentIteratorPrototype) !== IteratorPrototype$2) {
          if (objectSetPrototypeOf) {
            objectSetPrototypeOf(CurrentIteratorPrototype, IteratorPrototype$2);
          } else if (typeof CurrentIteratorPrototype[ITERATOR$4] != 'function') {
            hide(CurrentIteratorPrototype, ITERATOR$4, returnThis$2);
          }
        }
        // Set @@toStringTag to native iterators
        setToStringTag(CurrentIteratorPrototype, TO_STRING_TAG, true, true);
      }
    }

    // fix Array#{values, @@iterator}.name in V8 / FF
    if (DEFAULT == VALUES && nativeIterator && nativeIterator.name !== VALUES) {
      INCORRECT_VALUES_NAME = true;
      defaultIterator = function values() { return nativeIterator.call(this); };
    }

    // define iterator
    if (IterablePrototype[ITERATOR$4] !== defaultIterator) {
      hide(IterablePrototype, ITERATOR$4, defaultIterator);
    }
    iterators[NAME] = defaultIterator;

    // export additional methods
    if (DEFAULT) {
      methods = {
        values: getIterationMethod(VALUES),
        keys: IS_SET ? defaultIterator : getIterationMethod(KEYS),
        entries: getIterationMethod(ENTRIES)
      };
      if (FORCED) for (KEY in methods) {
        if (BUGGY_SAFARI_ITERATORS$1 || INCORRECT_VALUES_NAME || !(KEY in IterablePrototype)) {
          redefine(IterablePrototype, KEY, methods[KEY]);
        }
      } else _export({ target: NAME, proto: true, forced: BUGGY_SAFARI_ITERATORS$1 || INCORRECT_VALUES_NAME }, methods);
    }

    return methods;
  };

  var STRING_ITERATOR = 'String Iterator';
  var setInternalState$1 = internalState.set;
  var getInternalState$1 = internalState.getterFor(STRING_ITERATOR);

  // `String.prototype[@@iterator]` method
  // https://tc39.github.io/ecma262/#sec-string.prototype-@@iterator
  defineIterator(String, 'String', function (iterated) {
    setInternalState$1(this, {
      type: STRING_ITERATOR,
      string: String(iterated),
      index: 0
    });
  // `%StringIteratorPrototype%.next` method
  // https://tc39.github.io/ecma262/#sec-%stringiteratorprototype%.next
  }, function next() {
    var state = getInternalState$1(this);
    var string = state.string;
    var index = state.index;
    var point;
    if (index >= string.length) return { value: undefined, done: true };
    point = stringAt(string, index, true);
    state.index += point.length;
    return { value: point, done: false };
  });

  // iterable DOM collections
  // flag - `iterable` interface - 'entries', 'keys', 'values', 'forEach' methods
  var domIterables = {
    CSSRuleList: 0,
    CSSStyleDeclaration: 0,
    CSSValueList: 0,
    ClientRectList: 0,
    DOMRectList: 0,
    DOMStringList: 0,
    DOMTokenList: 1,
    DataTransferItemList: 0,
    FileList: 0,
    HTMLAllCollection: 0,
    HTMLCollection: 0,
    HTMLFormElement: 0,
    HTMLSelectElement: 0,
    MediaList: 0,
    MimeTypeArray: 0,
    NamedNodeMap: 0,
    NodeList: 1,
    PaintRequestList: 0,
    Plugin: 0,
    PluginArray: 0,
    SVGLengthList: 0,
    SVGNumberList: 0,
    SVGPathSegList: 0,
    SVGPointList: 0,
    SVGStringList: 0,
    SVGTransformList: 0,
    SourceBufferList: 0,
    StyleSheetList: 0,
    TextTrackCueList: 0,
    TextTrackList: 0,
    TouchList: 0
  };

  var UNSCOPABLES = wellKnownSymbol('unscopables');


  var ArrayPrototype$1 = Array.prototype;

  // Array.prototype[@@unscopables]
  // https://tc39.github.io/ecma262/#sec-array.prototype-@@unscopables
  if (ArrayPrototype$1[UNSCOPABLES] == undefined) {
    hide(ArrayPrototype$1, UNSCOPABLES, objectCreate(null));
  }

  // add a key to Array.prototype[@@unscopables]
  var addToUnscopables = function (key) {
    ArrayPrototype$1[UNSCOPABLES][key] = true;
  };

  var ARRAY_ITERATOR = 'Array Iterator';
  var setInternalState$2 = internalState.set;
  var getInternalState$2 = internalState.getterFor(ARRAY_ITERATOR);

  // `Array.prototype.entries` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.entries
  // `Array.prototype.keys` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.keys
  // `Array.prototype.values` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.values
  // `Array.prototype[@@iterator]` method
  // https://tc39.github.io/ecma262/#sec-array.prototype-@@iterator
  // `CreateArrayIterator` internal method
  // https://tc39.github.io/ecma262/#sec-createarrayiterator
  var es_array_iterator = defineIterator(Array, 'Array', function (iterated, kind) {
    setInternalState$2(this, {
      type: ARRAY_ITERATOR,
      target: toIndexedObject(iterated), // target
      index: 0,                          // next index
      kind: kind                         // kind
    });
  // `%ArrayIteratorPrototype%.next` method
  // https://tc39.github.io/ecma262/#sec-%arrayiteratorprototype%.next
  }, function () {
    var state = getInternalState$2(this);
    var target = state.target;
    var kind = state.kind;
    var index = state.index++;
    if (!target || index >= target.length) {
      state.target = undefined;
      return { value: undefined, done: true };
    }
    if (kind == 'keys') return { value: index, done: false };
    if (kind == 'values') return { value: target[index], done: false };
    return { value: [index, target[index]], done: false };
  }, 'values');

  // argumentsList[@@iterator] is %ArrayProto_values%
  // https://tc39.github.io/ecma262/#sec-createunmappedargumentsobject
  // https://tc39.github.io/ecma262/#sec-createmappedargumentsobject
  iterators.Arguments = iterators.Array;

  // https://tc39.github.io/ecma262/#sec-array.prototype-@@unscopables
  addToUnscopables('keys');
  addToUnscopables('values');
  addToUnscopables('entries');

  var ITERATOR$5 = wellKnownSymbol('iterator');
  var TO_STRING_TAG$3 = wellKnownSymbol('toStringTag');
  var ArrayValues = es_array_iterator.values;

  for (var COLLECTION_NAME in domIterables) {
    var Collection = global$1[COLLECTION_NAME];
    var CollectionPrototype = Collection && Collection.prototype;
    if (CollectionPrototype) {
      // some Chrome versions have non-configurable methods on DOMTokenList
      if (CollectionPrototype[ITERATOR$5] !== ArrayValues) try {
        hide(CollectionPrototype, ITERATOR$5, ArrayValues);
      } catch (e) {
        CollectionPrototype[ITERATOR$5] = ArrayValues;
      }
      if (!CollectionPrototype[TO_STRING_TAG$3]) hide(CollectionPrototype, TO_STRING_TAG$3, COLLECTION_NAME);
      if (domIterables[COLLECTION_NAME]) for (var METHOD_NAME in es_array_iterator) {
        // some Chrome versions have non-configurable methods on DOMTokenList
        if (CollectionPrototype[METHOD_NAME] !== es_array_iterator[METHOD_NAME]) try {
          hide(CollectionPrototype, METHOD_NAME, es_array_iterator[METHOD_NAME]);
        } catch (e) {
          CollectionPrototype[METHOD_NAME] = es_array_iterator[METHOD_NAME];
        }
      }
    }
  }

  // `Promise.prototype.finally` method
  // https://tc39.github.io/ecma262/#sec-promise.prototype.finally
  _export({ target: 'Promise', proto: true, real: true }, {
    'finally': function (onFinally) {
      var C = speciesConstructor(this, getBuiltIn('Promise'));
      var isFunction = typeof onFinally == 'function';
      return this.then(
        isFunction ? function (x) {
          return promiseResolve(C, onFinally()).then(function () { return x; });
        } : onFinally,
        isFunction ? function (e) {
          return promiseResolve(C, onFinally()).then(function () { throw e; });
        } : onFinally
      );
    }
  });

  var promise$1 = path.Promise;

  var $AggregateError = function AggregateError(errors, message) {
    var that = this;
    if (!(that instanceof $AggregateError)) return new $AggregateError(errors, message);
    if (objectSetPrototypeOf) {
      that = objectSetPrototypeOf(new Error(message), objectGetPrototypeOf(that));
    }
    var errorsArray = [];
    iterate(errors, errorsArray.push, errorsArray);
    that.errors = errorsArray;
    if (message !== undefined) hide(that, 'message', String(message));
    return that;
  };

  $AggregateError.prototype = objectCreate(Error.prototype, {
    constructor: { value: $AggregateError, configurable: true, writable: true },
    name: { value: 'AggregateError', configurable: true, writable: true }
  });

  _export({ global: true }, {
    AggregateError: $AggregateError
  });

  // `Promise.allSettled` method
  // https://github.com/tc39/proposal-promise-allSettled




  _export({ target: 'Promise', stat: true }, {
    allSettled: function allSettled(iterable) {
      var C = this;
      var capability = newPromiseCapability.f(C);
      var resolve = capability.resolve;
      var reject = capability.reject;
      var result = perform(function () {
        var values = [];
        var counter = 0;
        var remaining = 1;
        iterate(iterable, function (promise) {
          var index = counter++;
          var alreadyCalled = false;
          values.push(undefined);
          remaining++;
          C.resolve(promise).then(function (value) {
            if (alreadyCalled) return;
            alreadyCalled = true;
            values[index] = { status: 'fulfilled', value: value };
            --remaining || resolve(values);
          }, function (e) {
            if (alreadyCalled) return;
            alreadyCalled = true;
            values[index] = { status: 'rejected', reason: e };
            --remaining || resolve(values);
          });
        });
        --remaining || resolve(values);
      });
      if (result.e) reject(result.v);
      return capability.promise;
    }
  });

  // `Promise.try` method
  // https://github.com/tc39/proposal-promise-try



  _export({ target: 'Promise', stat: true }, { 'try': function (callbackfn) {
    var promiseCapability = newPromiseCapability.f(this);
    var result = perform(callbackfn);
    (result.e ? promiseCapability.reject : promiseCapability.resolve)(result.v);
    return promiseCapability.promise;
  } });

  // `Promise.any` method
  // https://github.com/tc39/proposal-promise-any




  var PROMISE_ANY_ERROR = 'No one promise resolved';

  _export({ target: 'Promise', stat: true }, {
    any: function any(iterable) {
      var C = this;
      var capability = newPromiseCapability.f(C);
      var resolve = capability.resolve;
      var reject = capability.reject;
      var result = perform(function () {
        var errors = [];
        var counter = 0;
        var remaining = 1;
        var alreadyResolved = false;
        iterate(iterable, function (promise) {
          var index = counter++;
          var alreadyRejected = false;
          errors.push(undefined);
          remaining++;
          C.resolve(promise).then(function (value) {
            if (alreadyRejected || alreadyResolved) return;
            alreadyResolved = true;
            resolve(value);
          }, function (e) {
            if (alreadyRejected || alreadyResolved) return;
            alreadyRejected = true;
            errors[index] = e;
            --remaining || reject(new (getBuiltIn('AggregateError'))(errors, PROMISE_ANY_ERROR));
          });
        });
        --remaining || reject(new (getBuiltIn('AggregateError'))(errors, PROMISE_ANY_ERROR));
      });
      if (result.e) reject(result.v);
      return capability.promise;
    }
  });

  // helper for String#{startsWith, endsWith, includes}



  var validateStringMethodArguments = function (that, searchString, NAME) {
    if (isRegexp(searchString)) {
      throw TypeError('String.prototype.' + NAME + " doesn't accept regex");
    } return String(requireObjectCoercible(that));
  };

  var MATCH$1 = wellKnownSymbol('match');

  var correctIsRegexpLogic = function (METHOD_NAME) {
    var regexp = /./;
    try {
      '/./'[METHOD_NAME](regexp);
    } catch (e) {
      try {
        regexp[MATCH$1] = false;
        return '/./'[METHOD_NAME](regexp);
      } catch (f) { /* empty */ }
    } return false;
  };

  var STARTS_WITH = 'startsWith';
  var CORRECT_IS_REGEXP_LOGIC = correctIsRegexpLogic(STARTS_WITH);
  var nativeStartsWith = ''[STARTS_WITH];

  // `String.prototype.startsWith` method
  // https://tc39.github.io/ecma262/#sec-string.prototype.startswith
  _export({ target: 'String', proto: true, forced: !CORRECT_IS_REGEXP_LOGIC }, {
    startsWith: function startsWith(searchString /* , position = 0 */) {
      var that = validateStringMethodArguments(this, searchString, STARTS_WITH);
      var index = toLength(Math.min(arguments.length > 1 ? arguments[1] : undefined, that.length));
      var search = String(searchString);
      return nativeStartsWith
        ? nativeStartsWith.call(that, search, index)
        : that.slice(index, index + search.length) === search;
    }
  });

  var call = Function.call;

  var entryUnbind = function (CONSTRUCTOR, METHOD, length) {
    return bindContext(call, global$1[CONSTRUCTOR].prototype[METHOD], length);
  };

  var startsWith = entryUnbind('String', 'startsWith');

  var ENDS_WITH = 'endsWith';
  var nativeEndsWith = ''[ENDS_WITH];
  var min$3 = Math.min;

  var CORRECT_IS_REGEXP_LOGIC$1 = correctIsRegexpLogic(ENDS_WITH);

  // `String.prototype.endsWith` method
  // https://tc39.github.io/ecma262/#sec-string.prototype.endswith
  _export({ target: 'String', proto: true, forced: !CORRECT_IS_REGEXP_LOGIC$1 }, {
    endsWith: function endsWith(searchString /* , endPosition = @length */) {
      var that = validateStringMethodArguments(this, searchString, ENDS_WITH);
      var endPosition = arguments.length > 1 ? arguments[1] : undefined;
      var len = toLength(that.length);
      var end = endPosition === undefined ? len : min$3(toLength(endPosition), len);
      var search = String(searchString);
      return nativeEndsWith
        ? nativeEndsWith.call(that, search, end)
        : that.slice(end - search.length, end) === search;
    }
  });

  var endsWith = entryUnbind('String', 'endsWith');

  var INCLUDES = 'includes';

  var CORRECT_IS_REGEXP_LOGIC$2 = correctIsRegexpLogic(INCLUDES);

  // `String.prototype.includes` method
  // https://tc39.github.io/ecma262/#sec-string.prototype.includes
  _export({ target: 'String', proto: true, forced: !CORRECT_IS_REGEXP_LOGIC$2 }, {
    includes: function includes(searchString /* , position = 0 */) {
      return !!~validateStringMethodArguments(this, searchString, INCLUDES)
        .indexOf(searchString, arguments.length > 1 ? arguments[1] : undefined);
    }
  });

  var includes = entryUnbind('String', 'includes');

  var assign = path.Object.assign;

  var internalFind = arrayMethods(5);
  var FIND = 'find';
  var SKIPS_HOLES = true;

  // Shouldn't skip holes
  if (FIND in []) Array(1)[FIND](function () { SKIPS_HOLES = false; });

  // `Array.prototype.find` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.find
  _export({ target: 'Array', proto: true, forced: SKIPS_HOLES }, {
    find: function find(callbackfn /* , that = undefined */) {
      return internalFind(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    }
  });

  // https://tc39.github.io/ecma262/#sec-array.prototype-@@unscopables
  addToUnscopables(FIND);

  var find = entryUnbind('Array', 'find');

  var index = Object.assign(utilities, {
    components: components
  });

  return index;

});
