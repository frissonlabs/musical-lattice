import React from "react";
import { Route } from "react-router-dom";
import Home from "../Home";

export default class Root extends React.Component {
  render() {
    return (
      <div>
        <Route path="/" exact={true} component={Home} />
      </div>
    );
  }
}
