// import { Fragment } from "preact";
// import { useReducer } from "preact/hooks";
import util from "./utilities";
import deepmerge from "deepmerge";
import flatten from "flat";
import set from "ramda/src/set";
import lensPath from "ramda/src/lensPath";
import head from "ramda/src/head";
import map from "ramda/src/map";
import { html, Fragment } from "components/tools";
import curry from "ramda/src/curry";

//string|array -> lens
//rlens('path.to')
let rLens = path => lensPath("string" === typeof path ? path.split(".") : path);

export let baseActions = {
  mutate: (state, action) => {
    return set(rLens(action.path), action.value, state);
  },
  loading: (state, action) => {
    return set(rLens("loading"), action.value, state);
  }
};

export let createReducer = actions =>
  function(id, state, action) {
    return action && actions[action.id]
      ? //this is the bound request handler
        actions[action.id].call(this, state, action)
      : util.log(state, `invalid action ${action && action.id}`);
  };

//pass in request handler (api.request)
export let store = (() => {
  var _state = {};
  var _actions = baseActions;
  var _componentTree = {};
  var _dispatch = () => {};
  var _request = () => Promise.reject("global request handler not set");
  var _reducer = state => state;
  let storeWrapper = function(props) {
    let {
      actions = {},
      initialState = {},
      children = [],
      initialize = x => x,
      requestHandler = _request,
      id = "",
      vm = {}
    } = props;
    let [child] = children;

    let cachedComponent = util.lens(id, _componentTree);
    if (!cachedComponent) {
      _state = deepmerge(flatten.unflatten({ [id]: initialState }), _state);
      _actions = Object.assign(_actions, flatten(actions, " "));
      _reducer = createReducer(_actions);

      _dispatch = function(id, action) {
        //use the component specific request handler fallback to global
        let newState = _reducer.call(
          util.type.isFunction(this) ? this : _request,
          id,
          _state,
          Object.assign(action)
        );
        let async = util.isPromise(newState);
        if (async) {
          _dispatch("loading", {
            value: true
          });
        }
        (async ? newState : Promise.resolve(newState)).then(response => {
          if (util.type.isObject(response)) _state = response;
          if (!action.silent) {
            /**
             * at the moment we are managing a component tree that is not unified
             * there are several root components because it is being used as a library
             * on top of bb instead of a standalone application. Here each of the root
             * components is being updated after every action. This could be made more
             * specific for performance but for now i think this is a more straight-forward
             * approach.
             */
            Object.values(_componentTree).forEach(component => {
              component.setState({});
            });
          }
          if (async)
            _dispatch("loading", {
              value: false
            });
        });
      };
      _componentTree = set(rLens(id), this, _componentTree);
    }

    //instead of calling dispatch({type: 'form submit', data: {}}) it is dispatch('form submit')({data})
    //actions may be nested and will be flattened. space is used as the delimeter
    //to differentiate from the normal . access with lenses

    let dispatch = curry(_dispatch.bind(requestHandler));
    let state = _state;
    let store = {
      state,
      dispatch,
      id,
      vm: map(viewAction => viewAction.bind(null, store), vm)
    };
    return html`
      <${Fragment}>${child(store)}<//>
    `;
  };
  storeWrapper.setGlobalRequestHandler = handler => {
    _request = handler;
  };
  storeWrapper.dispatch = (...args) => _dispatch.call(_request, ...args);
  storeWrapper.getState = () => _state;
  return storeWrapper;
})();

store.baseActions = baseActions;

export default store;
