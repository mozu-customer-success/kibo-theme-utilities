import { html, composeWrappers, createVm } from "components/tools";
import withStyle from "components/wrappers/style";
import store from "components/wrappers/store";
import withAdapter from "components/wrappers/adapter";
import evolve from "ramda/src/evolve";
import curry from "ramda/src/curry";
import empty from "ramda/src/empty";
import concat from "ramda/src/concat";
import flip from "ramda/src/flip";
import omit from "ramda/src/omit";
import groupBy from "ramda/src/groupBy";
import mapObjIndexed from "ramda/src/mapObjIndexed";
import compose from "ramda/src/compose";
import filter from "ramda/src/filter";
import $ from "modules/jquery-mozu";
import util from "./utilities";

export let id = "message-bar";

export let style = {
  container: {
    "margin-bottom": "10px",
    "& ul": {
      "list-style": "none"
    }
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
    evolve(
      {
        messages: flip(concat)([
          Object.assign(omit("id", action), { messageId: new Date().getTime() })
        ])
      },
      state
    ),
  clear: evolve({ messages: empty }),
  remove: (state, action) =>
    evolve(
      { messages: filter(message => message.messageId != action.messageId) },
      state
    )
};

export let component = props => {
  //it would be better to not have to manually maintain the id path
  //it might be possible to detect it in the store from this.parentcomponent etc
  let { classes } = props;
  let remove = curry((dispatch, messageId) => {
    dispatch("remove", { messageId });
  });

  let bindVm = createVm({ remove });
  return html`
    <${store} initialState=${initialState} actions=${actions} id=${id}
      >${({ dispatch, state }) => {
        let vm = bindVm(dispatch);
        return html`
          <div id=${id} class=${classes.container}>
            ${compose(
              Object.values,
              mapObjIndexed((messageGroup, type) => {
                return html`
                  <ul key=${type} class=${classes[type] || ""}>
                    ${messageGroup.length
                      ? messageGroup.map((message, dex) => {
                          return html`
                            <li
                              key=${dex}
                              message-id=${message.messageId}
                              ref=${props.autoFade !== false && message.autoFade
                                ? ref => {
                                    //it would be better to use velocity here imo but that would increase the build size
                                    //and is not worth it for one animation here.
                                    if (ref) {
                                      setTimeout(() => {
                                        $(ref).fadeOut(
                                          3000,
                                          util.once(() => {
                                            vm.remove(
                                              $(ref).attr("message-id")
                                            );
                                          })
                                        );
                                      }, 4000);
                                    }
                                  }
                                : () => {}}
                              class=${classes.message}
                            >
                              ${message.value}
                            </li>
                          `;
                        })
                      : null}
                  </ul>
                `;
              }),
              groupBy(message => message.type)
            )(state.messages)}
          </div>
        `;
      }}<//
    >
  `;
};

component.properties = {
  actions,
  style,
  id
};

component.methods = {};

export default composeWrappers(withAdapter({}), withStyle(style))(component);
