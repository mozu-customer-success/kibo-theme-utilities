import { html, createVm, validate } from "components/tools";
import util from "./utilities";
import store from "components/wrappers/store";
import withStyle from "components/wrappers/style";
import withAdapter from "components/wrappers/adapter";
import compose from "ramda/src/compose";
import propOr from "ramda/src/propOr";
import curry from "ramda/src/curry";
import clone from "ramda/src/clone";
import flip from "ramda/src/flip";
import join from "ramda/src/join";

/**
 * htm+preact+jss ~= 42kb
 * ace storefront.css = 87kb
 * it would be better to use unpkg
 * but ie doesn't support browser modules
 * an alpha version of preact to access hooks
 * it should be available soon
 */

// a handfull of optimistic coding and a spoonfull of syntactic sugar

export let id = "bronto-emailer";

// export let prerender = `
//   {% if themeSettings.recaptchaSiteKey %}
//     <script src='https://www.google.com/recaptcha/api.js' async defer></script>
//   {% endif %}
//   <section id="${id}">
//     <form data-action="submit" id="${id}-form">
//       <div class="formfield">
//         <label for="recipient" class="required">
//         <input name="recipient" type="email" required>
//       </div>
//       <div class="formfield">
//         <label for="message" class="required">
//         <input name="message" type="email" required>
//       </div>
//       <button type="submit">
//     </form>
//   </section>
// `;

export let actions = {
  sendEmail: function(state, action) {
    return this("post", "/bronto/sendMessage", {
      recipient: util.lens("recipient", state),
      message: util.lens("message", state),
      action
    })
      .then(response => {
        console.log(response);
        action.triggerMessage({
          value: {
            type: "success",
            text: "Great Success!"
          }
        });
      })
      .catch(err => {
        console.log(err);
        action.triggerMessage({
          value: {
            type: "error",
            text: "User Error!"
          }
        });
      });
  }
};

export let initialState = {
  recipient: "",
  message: ""
};

initialState.validation = clone(initialState);

export let style = {
  submit: {
    background: "green",
    "&:hover": {
      background: "orange"
    }
  },
  loading: {
    opacity: "0.3"
  }
};

export let validation = {
  recipient: "email",
  message: "required"
};

export let test = {
  "handles input": [
    `type $#${id}-form>input[name="recipient"] asdf`,
    state => {
      return state.recipient === "asdf";
    }
  ]
};

//view should use store wrapper and indicate the global actions
//that it wants to call. assume every other dispatch is specific
//to this instance
//withAdapter needs to be run last since it adds methods to the view
let view = compose(
  withAdapter({
    id
  }),
  withStyle(style)
)(props => {
  let { classes } = props;
  let id = props.id;
  let validator = validate(validation);

  //vm methods
  let submit = curry((dispatch, state, event) => {
    event.preventDefault();
    let invalid = validator(state);
    if (invalid) {
      return dispatch("mutate", {
        path: "validation",
        value: invalid
      });
    }
    //if the message action doesn't exist this will just do nothing
    if (validator)
      dispatch("sendEmail", {
        triggerMessage: dispatch("triggerMessage")
      });
  });
  let handleInput = curry((dispatch, path, event) => {
    dispatch("mutate", {
      path,
      value: event.currentTarget.value
    });
  });

  let bindVm = createVm({
    submit,
    handleInput
  });

  return html`
    <${store}
      initialState=${initialState}
      actions=${actions}
      requestHandler=${props.requestHandler}
      >${({ dispatch, state }) => {
        let vm = bindVm(dispatch);
        let prop = flip(util.lens)(state);
        if (props.customView) {
          //some tools here to overwrite the innards
          //some of this could be standardized with hooks
          //would be cool to expose the preact hooks like useEffect
          //to the consumer/adapter
          return html`
            ${props.customView()}
          `;
        }
        return html`
          <form
            onsubmit=${vm.submit(state)}
            data-action="submit"
            class=${state.loading ? classes.loading : ""}
            id="${id}-form"
          >
            <div className="formfield">
              <label for="recipient" className="required">Recipient</label>
              <input
                name="recipient"
                type="email"
                class=${classes.input}
                oninput=${vm.handleInput("recipient")}
                value=${prop("recipient")}
                required
              />
              <span validation="recipient"
                >${prop("validation.recipient")}</span
              >
            </div>
            <div className="formfield">
              <label for="message" className="required">Message</label>
              <input
                name="message"
                type="text"
                class=${classes.input}
                oninput=${vm.handleInput("message")}
                value=${prop("message")}
                required
              />
              <span validation="message">${prop("validation.message")}</span>
            </div>
            <button type="submit" className=${classes.submit}>Send</button>
          </form>
        `;
      }}<//
    >
  `;
});

export default {
  view,
  actions,
  id,
  style,
  validation
};
