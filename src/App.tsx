import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import NextStopLanding from "./components/NextStopLanding";
import MainApp from "./MainApp";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NextStopLanding />} />
        <Route path="/app/*" element={<MainApp />} />
        <Route path="/map/*" element={<MainApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
