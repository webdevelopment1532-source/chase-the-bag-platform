import { createBrowserRouter } from "react-router-dom";
import HomePage from "../pages/HomePage";
import Dashboard from "../pages/Dashboard";
import ExchangeDashboard from "../pages/ExchangeDashboard";
import Wallet from "../pages/Wallet";
import { TradeChat } from "../components/offer/TradeChat";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/exchange", element: <ExchangeDashboard /> },
  { path: "/wallet", element: <Wallet /> },
  // Demo route for TradeChat (remove or integrate as needed)
  { path: "/trade/:offerId", element: <TradeChat offerId={1} /> },
]);
