import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Passenger from "./pages/Passenger";
import Driver from "./pages/Driver";
import Pay from "./pages/Pay";
import Test from "./pages/Test";

function App() {
  return (
    <Router>
      <div style={{ padding: "20px" }}>
        <h1>🚖 TaxiGO</h1>
        
        {/* Navigation */}
        <nav style={{ marginBottom: "20px" }}>
          <Link to="/passenger" style={{ marginRight: "10px" }}>Passenger</Link>
          <Link to="/driver" style={{ marginRight: "10px" }}>Driver</Link>
          <Link to="/pay" style={{ marginRight: "10px" }}>Pay</Link>
          <Link to="/test">Test</Link>
        </nav>

        {/* Page Routes */}
        <Routes>
          <Route path="/passenger" element={<Passenger />} />
          <Route path="/driver" element={<Driver />} />
          <Route path="/pay" element={<Pay />} />
          <Route path="/test" element={<Test />} />
          <Route path="/" element={<h2>Welcome to TaxiGO 🚕</h2>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
