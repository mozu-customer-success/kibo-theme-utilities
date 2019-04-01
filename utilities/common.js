import context from "./context";
import Backbone from "backbone";
import _ from "underscore";
import api from "modules/api";
import $ from "modules/jquery-mozu";

const noop = () => {};
const id = x => x;
const head = list => (list && list[0]) || [];
const tail = list => (list && list.slice && list.slice(1)) || [];
const flip = f => (a, b, ...args) => f(b, a, ...args);

const _curryN = (len, fn) => (...args) => {
  if (args.length >= len) return fn(...args);
  if (!args.length) return fn;
  return _curryN(len, fn).bind(null, ...args);
};

const curry = fn => (...args) => {
  return args.length === fn.length
    ? fn(...args)
    : _curryN(fn.length, fn)(...args);
};

const curryN = curry(_curryN);

const lens = curry((path, obj) => {
  path = type.isString(path) ? path.split(".") : path;
  if (!obj || !type.isObject(obj)) return obj;
  if (path === []) return obj;
  let key = head(path);
  if (key === "") key = "attributes";
  if (!(key in obj)) return null;
  return lens(tail(path), obj[head(path)]);
});

const type = [
  "Object",
  "Null",
  "Undefined",
  "Array",
  "Number",
  "String",
  "Function",
  "Boolean"
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

var storage = function(source) {
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
        if (val.data && ctx instanceof api.context.constructor) {
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
      value = _.clone(res);
      return res;
    });
  }
  return function() {
    if (value) return Promise.resolve(value);
    else {
      if (!promise) return Promise.reject(null);
      if (promise.then) return promise;
      promise = promise().then(function(res) {
        value = _.clone(res);
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

clearCache(context.themeSettings.cacheVersion || 1);

let limitLogExposure = (() => {
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
})();

let globalEventBus = Backbone.events;

export default {
  limitLogExposure,
  globalEventBus,
  noop,
  id,
  type,
  head,
  tail,
  curry,
  curryN,
  lens,
  hashCode,
  memoize,
  sessionStorage,
  localStorage,
  promiseProp,
  clearCache,
  printDiv: function(elemIdentifier) {
    var $divToPrint = $(elemIdentifier);
    var newWindow = window.open();
    newWindow.document.write($divToPrint.html());
    newWindow.document.close();
    newWindow.focus();
    newWindow.print();
    newWindow.close();
  },
  prop: function(v, pure = false) {
    var property = function(x) {
      if (x !== undefined) v = pure ? _.clone(x) : x;
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