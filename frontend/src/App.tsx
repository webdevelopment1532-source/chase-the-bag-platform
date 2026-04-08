import React from "react";
import { useRoutes } from "react-router-dom";
import { router } from "./routes";

function App() {
  // Convert the router config to routes for useRoutes
  const element = useRoutes(router.routes);
  return element;
}

export default App;
