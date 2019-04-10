import jss from "jss";
import preset from "jss-preset-default";
import util from "./utilities";
import { html, extendComponent } from "components/tools";
import curry from "ramda/src/curry";
import deepmerge from "deepmerge";

jss.setup(preset());

let withStyle = curry((style, WrappedComponent) => {
  let sheet = jss.createStyleSheet(style);
  let { classes } = sheet.attach();
  let appliedCustomSheet;
  return props => {
    if (!appliedCustomSheet && util.type.isObject(props.style)) {
      sheet.detach();
      sheet = jss.createStyleSheet(deepmerge(style, props.style));
      classes = sheet.classes;
      appliedCustomSheet = true;
    }
    return html`
      <${WrappedComponent} classes=${classes} ...${props} />
    `;
  };
});

export default withStyle;
