import jss from "jss";
import preset from "jss-preset-default";
import util from "./utilities";
import { html } from "components/tools";
import curry from "ramda/src/curry";
import difference from "ramda/src/difference";
import deepmerge from "deepmerge";

jss.setup(preset());

let withStyle = curry((style, WrappedComponent) => {
  let sheet = jss.createStyleSheet(style);
  let { classes } = sheet.attach();
  return props => {
    if (util.type.isObject(props.style)) {
      try {
        let mergedStyles = deepmerge(style, props.style);
        //this could probbly be more efficient (only merging once)
        //but this means that we can render differently styled versions
        //of a component
        if (JSON.stringify(mergedStyles) !== JSON.stringify(style)) {
          sheet.detach();
          style = mergedStyles;
          sheet = jss.createStyleSheet(style);
          var attatched = sheet.attach();
          classes = attatched.classes;
        }
      } catch (e) {
        console.log("error merging styles: ", e);
      }
    }
    return html`
      <${WrappedComponent} classes=${classes} ...${props} />
    `;
  };
});

export default withStyle;
