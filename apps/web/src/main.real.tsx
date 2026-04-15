import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { AppReal } from "./app/AppReal";
import { store } from "./app/store";
import "./tailwind.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <AppReal />
    </Provider>
  </React.StrictMode>
);
