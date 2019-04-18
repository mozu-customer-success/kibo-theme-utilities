import clone from "ramda/src/clone";
import curry from "ramda/src/curry";

export const $ = document.querySelector;
export const $$ = document.querySelectorAll;

export const noop = () => {};
export const id = x => x;
export const head = list => (list && list[0]) || [];
export const tail = list => (list && list.slice && list.slice(1)) || [];

// export const _curryN = (len, fn) => (...args) => {
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

export const lens = curry((path, obj) => {
  path = type.isString(path) ? path.split(".") : path;
  if (!obj || !type.isObject(obj)) return obj;
  if (!path.length) return obj;
  let key = head(path);
  if (key === "") key = "attributes";
  if (!(key in obj)) return null;
  return lens(tail(path), obj[head(path)]);
});

export const mixin = (proto, ...sources) => {
  return Object.assign(Object.create(proto), ...sources);
};

export const isServer = new Function(
  "try {return this===global;}catch(e){return false;}"
)();

export const type = [
  "Object",
  "Null",
  "Undefined",
  "Array",
  "Number",
  "String",
  "Function",
  "Boolean",
  "Promise"
].reduce(
  (a, t) => {
    a[`is${t}`] = v => a(v) === t;
    return a;
  },
  val => {
    return val === null
      ? "Null"
      : val === undefined
      ? "Undefined"
      : Object.prototype.toString.call(val).slice(8, -1);
  }
);

export const isPromise = obj =>
  obj && (type.isPromise(obj) || (obj.then && obj.reject));

function hashCode(str) {
  var hash = 0;
  var type = typeof str;
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
}

//hashing is not slow but this is really only useful
//for async requests or function that require heavy computation
function memoize(fn, timeout, context) {
  var store = {};
  return function() {
    var key = hashCode(arguments);
    if (key && store[key]) return store[key];
    if (!isNaN(timeout) && timeout !== null) {
      setTimeout(function() {
        delete store[key];
      }, timeout);
    }
    return (store[key] = fn.apply(
      context || this,
      Array.prototype.slice.call(arguments)
    ));
  };
}

var storage = function(source, context) {
  var store = {
    set: function(key, val, expires) {
      try {
        //expires should be a bool. when true expire at midnight of the day it was set
        var date;
        if (expires) {
          date = new Date();
          date.setDate(date.getDate() + 1);
          //data loads happen aroun 2-4am every day
          date.setHours(4, 0, 0, 0);
        }
        //at the risk of losing data dont cache apiobjects
        var ctx = dive("api.context", val);
        if (val.data && val.type /*ctx instanceof api.context.constructor*/) {
          val = { data: val.data, type: val.type };
        }
        source.setItem(
          key,
          JSON.stringify({
            accountId: lens("user.accountId", context) || undefined,
            value: "object" === typeof val ? JSON.stringify(val) : val,
            expirationDate: date ? date.getTime() : null
          })
        );
      } catch (e) {
        clearCache(9000);
        console.error(e);
      }
    },
    get: function(key, overrideAccountIdCheck) {
      var item = source.getItem(key);
      if (!item) return item;
      var accountId = lens("user.accountId", context);
      item = JSON.parse(item);
      if (item.expirationDate && new Date() > new Date(item.expirationDate)) {
        source.removeItem(key);
        return null;
      }
      if (item.accountId !== accountId && !overrideAccountIdCheck) return null;
      return typeof item.value === "string" &&
        (item.value[0] === "[" || item.value[0] === "{")
        ? JSON.parse(item.value)
        : item.value;
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
    promise.then(function(res) {
      value = clone(res);
      return res;
    });
  }
  return function() {
    if (value) return Promise.resolve(value);
    else {
      if (!promise) return Promise.reject(null);
      if (promise.then) return promise;
      promise = promise().then(function(res) {
        value = clone(res);
        return res;
      });
      return promise;
    }
  };
}

//clear local storage items that do not have the same cache version
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

let limitLogExposure = context => {
  let enabled;
  let l = console.log.bind(console);
  return enable => {
    if (enable !== undefined) {
      enabled = enable;
    } else {
      enabled = context.pageContext.isDebugMode;
    }
    console.log = enabled ? l : x => x;
  };
};

let log = (...args) => {
  console.log(args);
  return args[0];
};

let once = f => {
  let a = 0;
  let value;
  return function(...args) {
    if (a) return value;
    a = 1;
    return (value = f.apply(this, args));
  };
};

export default {
  limitLogExposure,
  // globalEventBus,
  noop,
  isServer,
  log,
  once,
  id,
  type,
  head,
  tail,
  lens,
  hashCode,
  memoize,
  sessionStorage,
  localStorage,
  promiseProp,
  clearCache,
  mixin,
  isPromise,
  $,
  $$,
  prop: function(v, pure = false) {
    var property = function(x) {
      if (x !== undefined) v = pure ? clone(x) : x;
      return v;
    };
    property.isProp = true;
    property.map = f => {
      property(f(x));
      return property;
    };
    return property;
  }
};
