import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DeliveryForm from "./components/DeliveryForm";
import ServiceForm from "./components/ServiceForm";
import { LanguageProvider } from "./contexts/LanguageContext";
import "./App.css";

function App() {
  return (
    <LanguageProvider>
      <Router>
        <Routes>
          <Route path="/" element={<DeliveryForm />} />
          <Route path="/delivery" element={<DeliveryForm />} />
          <Route path="/service" element={<ServiceForm />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;
