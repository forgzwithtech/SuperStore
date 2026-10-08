import { useState, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { api } from "../../services/api";

interface RiderDashboardProps {
  onLogout: () => void;
}

// ─── TACTILE UI CONSTANTS ───
const paperCardStyle = {
  background: "#fbf6ea",
  border: "2px solid #211c15",
  boxShadow: "4px 4px 0 #211c15",
  borderRadius: "4px"
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(value);
};

// ─── ANIMATIONS ───
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export const RiderDashboard = ({ onLogout }: RiderDashboardProps) => {
  const [activeTab, setActiveTab] = useState<"pickups" | "deliveries">("pickups");
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Triggers immediate re-fetch on manual actions
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Handshake State
  const [activeHandshakeId, setActiveHandshakeId] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // ─── AUTO-POLLING & DATA FETCH ───
  useEffect(() => {
    const fetchRiderData = async () => {
      try {
        const allOrders = await api.get('/admin/orders/all');
        setOrders(allOrders);
      } catch (err) {
        console.error("Failed to fetch dispatch queue", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRiderData();

    // Auto-refresh every 10 seconds so new dispatches appear instantly
    const pollInterval = setInterval(() => {
      fetchRiderData();
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [refreshTrigger]);

  // Derived state for the Rider's two main views
  // FIXED: Changed "Processing" to "ReadyForDispatch" to match the C# OrderStatus flow!
  const pendingPickups = orders.filter(o => o.status === "ReadyForDispatch");
  const activeDeliveries = orders.filter(o => o.status === "OutForDelivery");

  const handleStartDelivery = async (orderId: string) => {
    try {
      await api.post(`/admin/orders/${orderId}/dispatch`, {});
      setRefreshTrigger(prev => prev + 1);
      setActiveTab("deliveries"); // Auto-switch to their active deliveries tab
    } catch (err: any) {
      alert(err.response?.data || "Failed to start delivery transit.");
    }
  };

  const handleCompleteHandshake = async () => {
    if (pinInput.length !== 4) {
      alert("PIN must be exactly 4 digits.");
      return;
    }
    setIsVerifying(true);
    try {
      // The backend expects `inputPin` inside a JSON body based on CompleteDeliveryRequest
      await api.post(`/admin/orders/${activeHandshakeId}/complete-delivery`, { inputPin: pinInput });
      alert("✓ Handshake Verified. Delivery closed.");
      setActiveHandshakeId(null);
      setPinInput("");
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      alert(err.response?.data || "Invalid PIN or failed to complete delivery.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#eee3ca", color: "#211c15", fontFamily: '"Work Sans", sans-serif', paddingBottom: "80px" }}>
      
      {/* ─── MOBILE APP HEADER ─── */}
      <header style={{ padding: "1.5rem", backgroundColor: "#fbf6ea", borderBottom: "3px solid #211c15", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.4rem", letterSpacing: "1px", fontWeight: 800, fontFamily: '"Anton", sans-serif', textTransform: "uppercase" }}>SUPERSTORE</h2>
          <span style={{ fontSize: "0.65rem", color: "#c63c24", textTransform: "uppercase", fontWeight: 800, fontFamily: '"IBM Plex Mono", monospace' }}>Logistics Terminal</span>
        </div>
        <button onClick={onLogout} style={{ background: "transparent", border: "none", color: "#c63c24", fontWeight: 800, fontSize: "0.9rem", textTransform: "uppercase" }}>Log Out</button>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main style={{ flex: 1, padding: "1.5rem", backgroundImage: "radial-gradient(rgba(33,28,21,0.05) 1px, transparent 1px)", backgroundSize: "4px 4px" }}>
        <AnimatePresence mode="wait">
          
          {/* ─── PICKUPS TAB (AT THE STORE) ─── */}
          {activeTab === "pickups" && (
            <motion.div key="pickups" variants={fadeUp} initial="hidden" animate="show" exit={{ opacity: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
                <div>
                  <h1 style={{ marginTop: 0, fontSize: "2rem", fontFamily: '"Anton", sans-serif', textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.2rem" }}>Dispatch Bay</h1>
                  <p style={{ color: "rgba(33,28,21,0.6)", margin: 0, fontSize: "0.95rem", fontWeight: 500 }}>Packages ready for pickup.</p>
                </div>
              </div>
              
              {isLoading ? (
                <p style={{ fontWeight: 600 }}>Syncing manifest...</p>
              ) : pendingPickups.length === 0 ? (
                <div style={{ ...paperCardStyle, padding: "3rem", textAlign: "center", color: "rgba(33,28,21,0.5)" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏪</div>
                  <h3 style={{ fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", color: "#211c15", margin: "0 0 0.5rem 0" }}>Bay Empty</h3>
                  <p style={{ margin: 0, fontWeight: 500 }}>No packages awaiting dispatch right now.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {pendingPickups.map((order) => (
                    <div key={order.id} style={{ ...paperCardStyle, padding: "1.5rem", borderLeft: "6px solid #2e6b48" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                        <span style={{ fontFamily: '"IBM Plex Mono", monospace', color: "#211c15", fontWeight: 800, fontSize: "1.1rem" }}>ORD-{order.id.split('-')[0].toUpperCase()}</span>
                        <span style={{ fontWeight: 800, fontFamily: '"IBM Plex Mono", monospace', fontSize: "1.1rem" }}>{formatCurrency(order.totalAmount)}</span>
                      </div>
                      <h3 style={{ margin: "0 0 0.2rem 0", fontSize: "1.1rem", fontWeight: 800 }}>{order.customerName}</h3>
                      <p style={{ margin: "0 0 1.5rem 0", color: "rgba(33,28,21,0.6)", fontSize: "0.9rem", fontWeight: 600, fontFamily: '"IBM Plex Mono", monospace' }}>☎ {order.customerPhone}</p>
                      
                      <button 
                        onClick={() => handleStartDelivery(order.id)}
                        style={{ width: "100%", padding: "1.2rem", backgroundColor: "#2e6b48", color: "#fff", border: "2px solid #211c15", borderRadius: "2px", fontWeight: 800, fontSize: "1rem", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", boxShadow: "3px 3px 0 #211c15" }}
                      >
                        Start Transit 🏍️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ─── DELIVERIES TAB (ON THE ROAD) ─── */}
          {activeTab === "deliveries" && (
            <motion.div key="deliveries" variants={fadeUp} initial="hidden" animate="show" exit={{ opacity: 0 }}>
              <h1 style={{ marginTop: 0, fontSize: "2rem", fontFamily: '"Anton", sans-serif', textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.2rem" }}>Active Transit</h1>
              <p style={{ color: "rgba(33,28,21,0.6)", margin: 0, fontSize: "0.95rem", fontWeight: 500, marginBottom: "1.5rem" }}>Orders currently in your possession.</p>
              
              {activeDeliveries.length === 0 ? (
                <div style={{ ...paperCardStyle, padding: "3rem", textAlign: "center", color: "rgba(33,28,21,0.5)" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏍️</div>
                  <h3 style={{ fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", color: "#211c15", margin: "0 0 0.5rem 0" }}>Route Clear</h3>
                  <p style={{ margin: 0, fontWeight: 500 }}>You have no active packages in transit.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {activeDeliveries.map((order) => (
                    <div key={order.id} style={{ ...paperCardStyle, padding: "1.5rem", borderLeft: "6px solid #efb92e" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontFamily: '"IBM Plex Mono", monospace', color: "#211c15", fontWeight: 800, fontSize: "1.1rem" }}>ORD-{order.id.split('-')[0].toUpperCase()}</span>
                        <span style={{ padding: "0.2rem 0.6rem", borderRadius: "2px", backgroundColor: "#efb92e", color: "#211c15", fontSize: "0.75rem", fontWeight: 800, border: "1.5px solid #211c15", fontFamily: '"IBM Plex Mono", monospace' }}>IN TRANSIT</span>
                      </div>
                      <h3 style={{ margin: "0 0 0.2rem 0", fontSize: "1.1rem", fontWeight: 800 }}>{order.customerName}</h3>
                      <p style={{ margin: "0 0 0.5rem 0", color: "rgba(33,28,21,0.8)", fontSize: "0.9rem", fontWeight: 600 }}>{order.deliveryAddress || "Store Pickup"}</p>
                      <p style={{ margin: "0 0 1.5rem 0", color: "rgba(33,28,21,0.6)", fontSize: "0.9rem", fontWeight: 600, fontFamily: '"IBM Plex Mono", monospace' }}>☎ {order.customerPhone}</p>
                      
                      <button 
                        onClick={() => setActiveHandshakeId(order.id)}
                        style={{ width: "100%", padding: "1.2rem", backgroundColor: "#211c15", color: "#fff", border: "2px solid #211c15", borderRadius: "2px", fontWeight: 800, fontSize: "1rem", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", boxShadow: "3px 3px 0 #efb92e" }}
                      >
                        Arrived: Enter PIN 🤝
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ─── MOBILE BOTTOM NAV BAR ─── */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#fbf6ea", borderTop: "3px solid #211c15", display: "flex", padding: "0", zIndex: 50 }}>
        <button 
          onClick={() => setActiveTab("pickups")} 
          style={{ flex: 1, padding: "1rem", background: activeTab === "pickups" ? "#eee3ca" : "transparent", border: "none", borderRight: "1.5px solid #211c15", color: "#211c15", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", transition: "0.2s" }}
        >
          <span style={{ fontSize: "1.5rem", filter: activeTab === "pickups" ? "grayscale(0)" : "grayscale(100%) opacity(0.5)" }}>🏪</span>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase" }}>Store Bay</span>
        </button>
        <button 
          onClick={() => setActiveTab("deliveries")} 
          style={{ flex: 1, padding: "1rem", background: activeTab === "deliveries" ? "#eee3ca" : "transparent", border: "none", borderLeft: "1.5px solid #211c15", color: "#211c15", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", transition: "0.2s" }}
        >
          <span style={{ fontSize: "1.5rem", filter: activeTab === "deliveries" ? "grayscale(0)" : "grayscale(100%) opacity(0.5)" }}>🏍️</span>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase" }}>On Route</span>
        </button>
      </nav>

      {/* ─── PIN PAD HANDSHAKE MODAL ─── */}
      <AnimatePresence>
        {activeHandshakeId && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(33,28,21,0.85)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", damping: 20 }}
              style={{ ...paperCardStyle, padding: "2.5rem", textAlign: "center", width: "100%", maxWidth: "400px", boxShadow: "8px 8px 0 #211c15" }}
            >
              <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.8rem", fontFamily: '"Anton", sans-serif', textTransform: "uppercase", letterSpacing: "1px" }}>Client Handshake</h2>
              <p style={{ color: "rgba(33,28,21,0.8)", marginBottom: "2rem", fontSize: "0.95rem", fontWeight: 600 }}>Ask the customer for their 4-digit verification PIN to release the grocery package.</p>
              
              <input 
                type="text" 
                maxLength={4}
                placeholder="••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))} // Restrict to numbers
                style={{ width: "100%", padding: "1.5rem", backgroundColor: "#eee3ca", border: "2px dashed #211c15", borderRadius: "2px", color: "#c63c24", outline: "none", fontSize: "3rem", textAlign: "center", letterSpacing: "15px", marginBottom: "2rem", fontWeight: 900, fontFamily: '"IBM Plex Mono", monospace' }}
                autoFocus
              />

              <div style={{ display: "flex", gap: "1rem", flexDirection: "column" }}>
                <button 
                  onClick={handleCompleteHandshake} disabled={isVerifying || pinInput.length !== 4} 
                  style={{ width: "100%", padding: "1.2rem", backgroundColor: pinInput.length === 4 ? "#2e6b48" : "#ccc", color: pinInput.length === 4 ? "#fff" : "#666", border: "2px solid #211c15", borderRadius: "2px", fontWeight: 800, fontSize: "1rem", fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", boxShadow: pinInput.length === 4 ? "3px 3px 0 #211c15" : "none", cursor: pinInput.length === 4 ? "pointer" : "not-allowed" }}
                >
                  {isVerifying ? "Verifying..." : "Verify & Handover"}
                </button>
                <button onClick={() => { setActiveHandshakeId(null); setPinInput(""); }} style={{ width: "100%", padding: "1rem", backgroundColor: "transparent", color: "#211c15", border: "none", fontWeight: 800, fontSize: "0.9rem", textDecoration: "underline", cursor: "pointer", fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase" }}>
                  Cancel Handshake
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};