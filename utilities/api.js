export default context => {
  let { api } = context;
  let getCustomer = promiseProp(
    null,
    lens("user.isAnonymous", context)
      ? null
      : api.get.bind(api, "customer", context.user.accountId)
  );

  var hookeys = ["before", "after", "with", "afterFail"];

  api.monkeyPatch = function(type, match, hooks, name) {
    if ("function" !== typeof match) return null;
    var id = function(x) {
      return x;
    };

    hooks = hookeys.reduce(function(acc, key) {
      acc[key] = hooks[key] || id;
      return acc;
    }, hooks || {});
    //store original reference to
    var original = api[type];
    if (!original) return null;
    api[name || type] = function() {
      //if match function returns true do before/after
      var args = Array.prototype.slice.call(arguments);
      var matches = match.apply(null, args);
      if (!matches) return original.apply(api, args);
      //return [arguments] from before to modify arguments going into request
      args = hooks.before(args);
      if (args instanceof Promise || (args.then && args.catch)) return args;
      var promise = original.apply(api, args);
      return hooks.with(
        promise
          .then(function(response) {
            //only return a value from after if you want to overwrite the response
            return hooks.after(response);
          })
          .catch(function(err) {
            var modified = hooks.afterFail(err);
            return Promise.reject(modified);
          })
      );
    };

    api[type] = api[type].bind(api);

    if (!name) {
      api[type].clearPatches = function() {
        if (original.clearPatches) return original.clearPatches();
        api[type] = original;
      };
    }
  };

  api.cacheRequest = function(type, args) {
    var cachedRequest;
    args = args instanceof Array ? args : [];
    api.monkeyPatch(
      type,
      function() {
        var innerArgs = Array.prototype.slice.call(arguments);
        return innerArgs.join(" ") === args.join(" ");
      },
      {
        before: function(a) {
          if (cachedRequest && cachedRequest.then) return cachedRequest;
          return a;
        },
        with: function(p) {
          cachedRequest = p;
          return p;
        }
      },
      type + "Cached"
    );

    return function() {
      cachedRequest = null;
    };
  };

  api.cachedRequests = {
    cartSummary: api.cacheRequest("get", ["cartsummary"]),
    clear: function(name) {
      if (typeof api.cachedRequests[name] === "function")
        api.cachedRequests[name]();
    }
  };

  function setCustomerAttribute(FQN, value) {
    return getCustomer().then(function(customer) {
      return api
        .get("attributedefinition", {
          attributeFQN: FQN
        })
        .then(function(attrDef) {
          var payload = _.extend(customer.data, {
            attributes: [
              {
                fullyQualifiedName: FQN,
                attributeDefinitionId: attrDef.data.id,
                values: [value.toString()]
              }
            ]
          });
          return customer.update(payload);
        });
    });
  }

  let extendedApi = Object.assign(api, {
    setCustomerAttribute,
    getCustomer
  });

  return extendedApi;
};
