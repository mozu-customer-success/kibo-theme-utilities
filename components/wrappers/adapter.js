import { render, h } from "preact";
import util from "./utilities";
import curryN from "ramda/src/curryN";

export let adapters = {};

export default curryN(
  2,
  (
    options = {
      preserveElement: true
    },
    WrappedComponent = () => null
  ) => {
    WrappedComponent.methods.render = (
      topLevelProps = {
        style: {},
        id: "",
        validation: {}
      },
      container = {
        view: {},
        type: "backbone"
      }
    ) => {
      if (
        options.preserveElement &&
        container.type === "backbone" &&
        container.view &&
        !container.view.render.wrapped
      ) {
        container.view.render = (...args) => {
          let component = document.getElementById(id);
          container.view.render(...args);
          let container = document.getElementById(id + "-container");
          container.replaceChild(component);
        };
        container.view.render.wrapped = true;
      }
      //manage the state tree by passing a unique id to the component props
      topLevelProps.id =
        WrappedComponent.properties.id +
        (topLevelProps.id ? "." + topLevelProps.id : "");
      return render(
        h(WrappedComponent, topLevelProps),
        document.getElementById(topLevelProps.id + "-container")
      );
    };

    return WrappedComponent;
  }
);
