import { render, h } from "preact";
import util from "./utilities";
import curryN from "ramda/src/curryN";

export let adapters = {};

export default curryN(2, (options = {}, WrappedComponent) => {
  // let { adapters = [], name = "meToo" } = options;
  // WrappedComponent.adapters = adapters.reduce((acc, key) => {
  //   if (type.isFunction(adapters[key]))
  //     acc[key] = adapters[key](options, WrappedComponent);
  //   return acc;
  // }, {});

  let id = WrappedComponent.properties.id;

  WrappedComponent.methods.render = (props = {}) =>
    render(
      h(WrappedComponent, props),
      document.getElementById(id + "-container")
    );

  return WrappedComponent;
});
