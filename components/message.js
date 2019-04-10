import { html } from "components/tools";
import withStyle from "components/wrappers/style";
import store from "components/wrappers/store";
import withAdapter from "components/wrappers/adapter";
import evolve from "ramda/src/evolve";
import empty from "ramda/src/empty";
import concat from "ramda/src/concat";
import flip from "ramda/src/flip";
import compose from "ramda/src/compose";

export let id = "message-bar";

export let style = {
  container: {
    "margin-bottom": "10px"
  },
  success: {
    background: "green"
  },
  error: {
    background: "red"
  },
  message: {
    color: "white"
  }
};

export let initialState = {
  messages: []
};

export let actions = {
  triggerMessage: (state, action) =>
    evolve({ messages: flip(concat)([action.value]) }, state),
  clear: evolve({ messages: empty })
};

export let view = compose(
  withAdapter({
    id
  }),
  withStyle(style)
)(props => {
  return html`
    <${store} initialState=${initialState} actions=${actions}
      >${({ dispatch, state }) => {
        return html`
          <div id=${id} class=${props.classes.message}>
            ${state.messages.length
              ? state.messages.map(message => {
                  return html`
                    <ul class=${props.classes[message.type] || ""}>
                      <li class=${props.classes.message}>${message.text}</li>
                    </ul>
                  `;
                })
              : null}
          </div>
        `;
      }}<//
    >
  `;
});

export default {
  view,
  actions,
  style,
  id
};
