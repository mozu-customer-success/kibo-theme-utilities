import { html, createVm, validate, composeWrappers } from "components/tools";
import util from "./utilities";
import store from "components/wrappers/store";
import withStyle from "components/wrappers/style";
import withAdapter from "components/wrappers/adapter";
import withValidation from "components/wrappers/validation";
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
//         <input id="recipient" type="email" required>
//       </div>
//       <div class="formfield">
//         <label for="message" class="required">
//         <input id="message" type="email" required>
//       </div>
//       <button type="submit">
//     </form>
//   </section>
// `;

export let actions = {
  sendEmail: function(state, action) {
    return action.captchaPromise
      .then(token => {
        debugger;
        return this("post", "/bronto/sendMessage", {
          recipient: util.lens("recipient", state),
          message: util.lens("message", state),
          "g-recaptcha-response": token,
          action
        });
      })
      .then(response => {
        console.log(response);
        action.triggerMessage({
          type: "success",
          value: action.successMessage || "Great Succcess!",
          autoFade: true
        });
      })
      .catch(err => {
        console.log(err);
        action.triggerMessage({
          type: "error",
          value: action.errorMessage || "User Error!",
          autoFade: true
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
  form: {
    "&:after": {
      clear: "both"
    }
  },
  submit: {
    background: "green",
    "&:hover": {
      background: "orange"
    }
  },
  loading: {
    opacity: "0.3"
  },
  input: {
    "margin-bottom": "0px"
  },
  formfield: {
    "margin-bottom": "9px"
  },
  validation: {
    color: "crimson"
  },
  message: {},
  recaptcha: {
    float: "right",
    "&:after": {
      clear: "both"
    }
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

export let component = props => {
  let { classes } = props;
  let validator = props.validator || util.noop;

  let captchaPromise = new Promise((resolve, reject) => {
    window.captchaSuccess = token => {
      resolve(token);
    };
    window.captchaError = token => {
      reject(token);
    };
  });

  //vm methods
  let submit = curry((dispatch, state, event) => {
    event.preventDefault();
    if (window.grecaptcha && props.recaptchaSize === "invisible") {
      window.grecaptcha.execute();
    }
    dispatch("mutate", {
      path: "validation",
      value: {}
    });
    let invalid = validator(state);
    if (invalid) {
      return dispatch("mutate", {
        path: "validation",
        value: invalid
      });
    }
    //if the triggerMessage action doesn't exist this will just do nothing
    dispatch("sendEmail", {
      triggerMessage: dispatch("triggerMessage"),
      captchaPromise,
      successMessage: props.successMessage,
      errorMessage: props.errorMessage
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
      id=${id}
      >${({ dispatch, state }) => {
        let vm = bindVm(dispatch);
        let prop = flip(util.lens)(state);
        if (props.customView) {
          //some tools here to overwrite the innards
          //some of this could be standardized with hooks
          //would be cool to expose useEffect
          //to the consumer/adapter
          return html`
            ${props.customView()}
          `;
        }
        return html`
          <form
            onsubmit=${vm.submit(state)}
            data-action="submit"
            class=${join(" ", [
              classes.form,
              state.loading ? classes.loading : ""
            ])}
            id="${id}"
            method="POST"
            novalidate=${!!props.novalidate}
          >
            <div class=${join(" ", [classes.formfield, "formfield"])}>
              <label for="recipient" className="required"
                >${props.recipientLabel || "Recipient"}</label
              >
              <input
                name="recipient"
                type="email"
                class=${classes.input}
                oninput=${vm.handleInput("recipient")}
                value=${prop("recipient")}
                placeholder=${props.recipientPlaceholder || ""}
                required
              />
              <span class=${classes.validation} for="recipient"
                >${prop("validation.recipient")}</span
              >
            </div>
            <div
              class=${join(" ", [
                classes.formfield,
                "formfield",
                classes.message
              ])}
            >
              <label for="message" className="required"
                >${props.messageLabel || "Message"}</label
              >
              <input
                name="message"
                type="text"
                class=${classes.input}
                oninput=${vm.handleInput("message")}
                value=${prop("message")}
                placeholder=${props.messageLabel || ""}
                required
              />
              <span class=${classes.validation} for="message"
                >${prop("validation.message")}</span
              >
            </div>
            ${props.recaptchaKey
              ? html`
                  <div
                    class=${"g-recaptcha " + classes.recaptcha}
                    data-sitekey=${props.recaptchaKey}
                    data-callback="captchaSuccess"
                    data-error-callback="captchaError"
                    data-expired-callback="captchaError"
                    data-size=${props.recaptchaSize || "invisible"}
                    ref=${element => {
                      if (element && window.grecaptcha) {
                        try {
                          window.grecaptcha.render(element);
                        } catch (e) {}
                      }
                    }}
                  ></div>
                `
              : null}

            <button type="submit" className=${classes.submit}>
              ${props.submitText || "Send"}
            </button>
          </form>
        `;
      }}<//
    >
  `;
};

component.properties = {
  id,
  actions,
  style,
  validation
};

export default composeWrappers(
  withAdapter({}),
  withValidation(validation),
  withStyle(style)
)(component);
