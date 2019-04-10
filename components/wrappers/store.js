// import { Fragment } from "preact";
// import { useReducer } from "preact/hooks";
import util from "./utilities";
import deepmerge from "deepmerge";
import flatten from "flat";
import set from "ramda/src/set";
import lensPath from "ramda/src/lensPath";
import { html, Fragment, useReducer } from "components/tools";
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

export let createReducer = (request, actions) => (state, action) =>
  action && actions[action.id]
    ? actions[action.id].call(request, state, action)
    : util.log(state, `invalid action ${action && action.id}`);

//pass in request handler (api.request)
let store = (() => {
  let _state = {};
  let _actions = baseActions;
  let request = () => Promise.reject("request handler not set");
  let storeWrapper = function(props) {
    let {
      actions = {},
      initialState = {},
      children = [],
      initialize = x => x,
      requestHandler = request,
      id
    } = props;

    let [child] = children;

    _actions = Object.assign(_actions, flatten(actions, " "));
    _state = deepmerge(initialState, _state);

    let [state, dispatch] = useReducer.call(
      this,
      createReducer(requestHandler, _actions),
      _state
    );

    //instead of calling dispatch({type: 'form submit', data: {}}) it is dispatch('form submit')({data})
    let ogDispatch = dispatch;
    dispatch = curry((id, action) => {
      let promise = ogDispatch.call(
        request,
        Object.assign({ id }, action || {})
      );
      if (
        promise instanceof Promise ||
        (promise && promise.then && promise.catch)
      ) {
        ogDispatch({
          id: "loading",
          value: true
        });
        promise.then(() => {
          ogDispatch({
            id: "loading",
            value: false
          });
        });
      }
    });

    return html`
      <div>${child({ state, dispatch })}</div>
    `;
  };
  storeWrapper.setGlobalRequestHandler = handler => {
    request = handler;
  };
  return storeWrapper;
})();

store.createReducer = createReducer;
store.baseActions = baseActions;

export default store;
