import React from "react";
import ReactDOM from "react-dom";

import "material-components-web/dist/material-components-web.min.css";
import "material-design-icons/iconfont/material-icons.css";
import "typeface-roboto";
import "typeface-roboto-condensed";
import "typeface-roboto-slab";

import "./stylesheets/index.css";
import Root from "./components/Root";

const rootElement = document.querySelector("#root");
let renderRoot;

if (process.env.NODE_ENV === "production") {
  renderRoot = () => {
    ReactDOM.render(
      <Root />,
      rootElement
    );
  };
} else {
  const { AppContainer } = require("react-hot-loader");

  renderRoot = () => {
    ReactDOM.render(
      <AppContainer>
        <Root />
      </AppContainer>,
      rootElement
    );
  };
}

renderRoot();

if (process.env.NODE_ENV !== "production") {
  if (module.hot) {
    module.hot.accept("./components/Root", renderRoot);
  }
}
