import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { InternalPortal } from './pages/internal/InternalPortal'; 
import { CartProvider } from './context/CartContext';

function App() {
  return (
    <CartProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/internal" element={<InternalPortal />} />
        </Routes>
      </Router>
    </CartProvider>
  );
}

export default App;