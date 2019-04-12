import * as preact from "preact";
import htm from "htm";
import clone from "ramda/src/clone";
import curry from "ramda/src/curry";
import map from "ramda/src/map";
import test from "ramda/src/test";
import ifElse from "ramda/src/ifElse";
import deepmerge from "deepmerge";
import util from "./utilities";
import flatten from "flat";

export let html = htm.bind(preact.h);

export let Fragment = ({ children = [] }) =>
  html`
    <div>${children}</div>
  `;

export const validations = {
  Function: (validator, path, value) => {
    let result = validator(value);
    return result || null;
  },
  String: (() => {
    const stringValidations = {
      required: ifElse(Boolean, () => null, () => "This field is required"),
      email: ifElse(
        test(
          /^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/
        ),
        () => null,
        () => "Enter a valid email"
      ),
      number: x =>
        util.type.isNumber(x) ||
        (util.type.isString(x) && Number(x) == x) ||
        "Enter a valid number"
    };
    return (validator, path, value) => {
      let stringValidator = stringValidations[validator];
      if (!stringValidator) return null;
      let result = stringValidator(value);
      return result || null;
    };
  })()
};

export let validate = curry((definition, state) => {
  let validation = {};
  for (let [path, validator] of Object.entries(definition)) {
    let storeVal = util.lens(path, state);
    let message = validations[util.type(validator)](validator, path, storeVal);
    if (message) validation[path] = message;
  }
  if (Object.keys(validation).length) return flatten.unflatten(validation);
  else return null;
});

//this should be re-written as a compose function that allows you to add functionality
//in wrappers that get merged together instead of lost in the closure
export let composeWrappers = (...wrappers) => component => {
  component.properties = component.properties || {};
  component.methods = component.methods || {};
  return wrappers.reverse().reduce((comp, wrap) => {
    let props = comp.properties;
    let methods = comp.methods;
    comp = wrap(comp);
    comp.properties = Object.assign(props, comp.properties || {});
    comp.methods = Object.assign(methods, comp.methods || {});
    return comp;
  }, component);
};

// export let createReducer = (request, actions) => (state, action) =>
//   action && actions[action.id]
//     ? actions[action.id].call(request, state, action)
//     : util.log(state, `invalid action ${action && action.id}`);

// export let useReducer = (() => {
//   let _actions = {}
//   let reducer = x => x
//   let dispatch = function(action) {
//     let newState = reducer(_state, action);
//     if (util.isPromise(newState)) {
//       return newState.then(response => {
//         _state = response;
//         if (this.setState && !action.silent) this.setState({});
//       });
//     }
//     _state = newState;
//     if (this.setState && !action.silent) this.setState({});
//   };
//   let create = function(
//     actions = {},
//     initialState = {},
//     initialAction
//   ) {
//     //this is root node of component
//     _actions = Object.assign(_actions, flatten(actions, " "));

//     if (initialAction) {
//       dispatch.call(
//         this,
//         reducer,
//         Object.assign(initialAction, { silent: true })
//       );
//     }

//     return [_state, dispatch.bind(this, reducer)];
//   };
//   //global dispatch
//   reduce.getState = () => _state;
//   reduce.
//   return create;
// })();

export let createVm = viewActions => dispatch =>
  map(handler => handler(dispatch), viewActions);

export default {
  html,
  preact,
  validate,
  composeWrappers
};
