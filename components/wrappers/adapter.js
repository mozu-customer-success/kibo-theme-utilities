import { render, h } from "preact";
import util from "./utilities";
import curryN from "ramda/src/curryN";

export let adapters = {};

export default curryN(2, (options = {}, WrappedComponent) => {
  let { adapters = [], id = "#meToo" } = options;
  WrappedComponent.adapters = adapters.reduce((acc, key) => {
    if (type.isFunction(adapters[key]))
      acc[key] = adapters[key](options, WrappedComponent);
    return acc;
  }, {});

  id = id || WrappedComponent.id;

  WrappedComponent.render = (props = {}) =>
    render(
      h(WrappedComponent, Object.assign({ id }, props)),
      document.getElementById(id + "-container")
    );

  return WrappedComponent;
});
