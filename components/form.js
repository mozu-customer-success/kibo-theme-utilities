import withValidation from "components/wrappers/validation";
import withAdapter from "components/wrappers/adapter";
import tools from "components/tools";
import withStyle from "components/wrappers/style";
import util from "/utilities";

export let id = "form";

export let actions = {
  submit: (state, action) => {}
};

export let initialState = {
  validation: {}
};

export let style = {
  loading: {
    opacity: "0.3"
  },
  formField: {
    "margin-bottom": "9px"
  },
  input: {
    "margin-bottom": "0px"
  },
  validation: {
    color: "crimson"
  }
};

export let component = ({
  recaptchaKey = "",
  classes = {},
  validator = util.noop,
  submitHandler = Promise.reject,
  resolveHandler = Promise.resolve,
  rejectHandler = console.log,
  requestHandler = Promise.reject,
  invalidHandler = util.noop,
  children = [util.noop],
  id,
  ...props
}) => {
  let captchaPromise =
    !util.isServer && recaptchaKey && window.grecaptcha
      ? () => {
          new Promise((resolve, reject) => {
            window.captchaSuccess = token => {
              resolve(token);
            };
            window.captchaError = err => {
              reject(err);
            };
            window.grecaptcha.execute();
          });
        }
      : Promise.resolve;

  let submit = ({ id, state }, event) => {
    event.preventDefault();
    let formData = util.lens(id, state);
    let valid = validator(formData);
    if (!valid) return invalidHandler;
    captchaPromise()
      .then(token => {
        formData["g-recaptcha-response"] = token;
        return submitHandler(formData);
      })
      .then(resolveHandler)
      .catch(rejectHandler);
  };

  let vm = {
    submit
  };

  return html`
    <${store}
      initialState=${initialState}
      actions=${actions}
      requestHandler=${requestHandler}
      id=${id}
      vm=${vm}
      >${({ dispatch, state, id, vm }) => {
        return html`
          <form method="POST" onsubmit=${vm.submit} ...${props}>
            ${children}
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

export default tools.composeWrappers(
  withSyle(style),
  withValidation({}),
  withAdapter({})
)(component);
