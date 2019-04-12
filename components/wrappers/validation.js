import util from "./utilities";
import { html, validate } from "components/tools";
import curry from "ramda/src/curry";
import deepmerge from "deepmerge";

let withValidation = curry((validation, WrappedComponent) => {
  let validator = validate(validation);
  return props => {
    if (props.validation) {
      validator = validate(deepmerge(validation, props.validation));
    }
    return html`
      <${WrappedComponent} validator=${validator} ...${props} />
    `;
  };
});

export default withValidation;
