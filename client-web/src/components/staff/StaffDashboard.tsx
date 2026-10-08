import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { api } from "../../services/api";

interface StaffDashboardProps {
  onLogout: () => void;
}

// ─── TACTILE UI CONSTANTS ───
const paperCardStyle = {
  background: "#fbf6ea",
  border: "2px solid #211c15",
  boxShadow: "6px 6px 0 #211c15",
  borderRadius: "4px"
};

const inputStyle = {
  width: "100%", padding: "0.85rem 1rem", backgroundColor: "#ffffff", 
  border: "1.5px solid #211c15", borderRadius: "2px", 
  color: "#211c15", outline: "none", marginBottom: "1rem", 
  fontSize: "0.95rem", fontWeight: 600, fontFamily: '"Work Sans", sans-serif'
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(value);
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

// ─── MULTI-CART INTERFACE ───
interface PosCart {
  id: string;
  name: string;
  items: { item: any; quantity: number }[];
}

export const StaffDashboard = ({ onLogout }: StaffDashboardProps) => {
  const [activeTab, setActiveTab] = useState<"queue" | "pos">("queue");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [staffId] = useState(() => localStorage.getItem("ik_staff_id") || "STAFF-X");

  // ─── DATA STATES ───
  const [queue, setQueue] = useState<any[]>([]);
  const [storeStock, setStoreStock] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ─── PACKAGING STATES ───
  const [riderName, setRiderName] = useState("");
  const [isPackaging, setIsPackaging] = useState<string | null>(null);
  const [generatedPin, setGeneratedPin] = useState<{ orderId: string, pin: string } | null>(null);
  
  // ─── MULTIPLE CHECKOUTS (PARKED SALES) STATES ───
  const [posSearch, setPosSearch] = useState("");
  const [posCarts, setPosCarts] = useState<PosCart[]>([{ id: "cart-1", name: "Customer 1", items: [] }]);
  const [activeCartId, setActiveCartId] = useState("cart-1");
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  const activeCart = posCarts.find(c => c.id === activeCartId) || posCarts[0];

  // Responsive Listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ─── SAFE AUTO-POLLING ───
  useEffect(() => {
    let isMounted = true;
    const fetchStaffData = async () => {
      try {
        const [queueData, stockData, usersData] = await Promise.all([
          api.get('/admin/orders/queue').catch(() => []),
          api.get('/inventory/pos-stock').catch(() => []),
          api.get('/admin/users/all').catch(() => [])
        ]);
        
        if (isMounted) {
          setQueue(queueData);
          setStoreStock(stockData);
          setRiders(usersData.filter((u: any) => u.role === "Rider"));
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch staff data", err);
      }
    };

    fetchStaffData();
    const pollInterval = setInterval(fetchStaffData, 10000);
    return () => { isMounted = false; clearInterval(pollInterval); };
  }, [refreshTrigger]);

  // ─── DEEP THINK: GLOBAL BARCODE SCANNER HOOK ───
  // Scanners type fast and hit "Enter". If the user clicked away, we catch it here.
  useEffect(() => {
    if (activeTab !== "pos" || isRegisterOpen || receiptData) return;

    let buffer = "";
    let timeout: any = null;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if they are actively typing in the search box (the form handles that)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Enter") {
        if (buffer.length > 3) {
          const product = storeStock.find(p => p.barcode === buffer);
          if (product) {
            if (product.stockAvailable > 0) {
              addToPosCart(product);
            } else {
              alert(`Out of stock: ${product.productName}`);
            }
          }
        }
        buffer = "";
      } else if (e.key.length === 1) {
        buffer += e.key;
        clearTimeout(timeout);
        // Scanners type very fast. If it takes longer than 100ms, it's just a human typing randomly.
        timeout = setTimeout(() => { buffer = ""; }, 100); 
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [activeTab, isRegisterOpen, receiptData, storeStock, activeCartId, posCarts]);

  // ─── QUEUE LOGIC ───
  const handlePackageOrder = async (orderId: string) => {
    if (!riderName.trim()) { alert("Please select a Dispatch Rider."); return; }
    setIsPackaging(orderId);
    try {
      const response = await api.post(`/admin/orders/${orderId}/package`, { riderName });
      setGeneratedPin({ orderId: orderId.split('-')[0].toUpperCase(), pin: response.verificationPinGenerated });
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data || "Failed to package order.");
    } finally {
      setIsPackaging(null); setRiderName("");
    }
  };

  // ─── MULTIPLE CHECKOUT LOGIC (PARKED SALES) ───
  const handleAddCartTab = () => {
    const newId = `cart-${Date.now()}`;
    const newName = `Customer ${posCarts.length + 1}`;
    setPosCarts([...posCarts, { id: newId, name: newName, items: [] }]);
    setActiveCartId(newId);
  };

  const handleRemoveCartTab = (id: string) => {
    if (posCarts.length === 1) {
      setPosCarts([{ id: "cart-1", name: "Customer 1", items: [] }]);
      setActiveCartId("cart-1");
    } else {
      const newCarts = posCarts.filter(c => c.id !== id);
      setPosCarts(newCarts);
      if (activeCartId === id) setActiveCartId(newCarts[0].id);
    }
  };

  // ─── POS LOGIC ───
  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!posSearch.trim()) return;

    // Direct Barcode Match
    const exactMatch = storeStock.find(item => item.barcode === posSearch.trim());
    
    if (exactMatch) {
      if (exactMatch.stockAvailable > 0) {
        addToPosCart(exactMatch);
        setPosSearch(""); 
      } else {
        alert("This item is currently out of stock!");
        setPosSearch("");
      }
    }
    // If not a barcode, it leaves the text there so they can look at the filtered list
  };

  const addToPosCart = (product: any) => {
    setPosCarts(prev => prev.map(cart => {
      if (cart.id !== activeCartId) return cart;
      
      const existing = cart.items.find(p => p.item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockAvailable) {
          alert(`Maximum stock reached. Only ${product.stockAvailable} available.`);
          return cart;
        }
        return { ...cart, items: cart.items.map(p => p.item.id === product.id ? { ...p, quantity: p.quantity + 1 } : p) };
      }
      return { ...cart, items: [...cart.items, { item: product, quantity: 1 }] };
    }));
  };

  const removeFromPosCart = (productId: string) => {
    setPosCarts(prev => prev.map(cart => {
      if (cart.id !== activeCartId) return cart;
      return { ...cart, items: cart.items.filter(p => p.item.id !== productId) };
    }));
  };

  const handleCompleteSale = async () => {
    if (activeCart.items.length === 0) return;
    setIsProcessingSale(true);

    try {
      for (const cartItem of activeCart.items) {
        await api.post('/inventory/pos-sell', { barcode: cartItem.item.barcode, quantity: cartItem.quantity });
      }

      const totalAmount = activeCart.items.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
      setReceiptData({
        items: [...activeCart.items],
        total: totalAmount,
        date: new Date().toLocaleString(),
        transactionId: `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      });

      // Clear out the cart that just checked out
      handleRemoveCartTab(activeCartId);
      setIsRegisterOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data || "Failed to complete POS transaction.");
    } finally {
      setIsProcessingSale(false);
    }
  };

  const filteredStock = useMemo(() => {
    if (!posSearch) return storeStock;
    return storeStock.filter(item => 
      item.productName?.toLowerCase().includes(posSearch.toLowerCase()) || 
      item.brand?.toLowerCase().includes(posSearch.toLowerCase()) ||
      item.barcode?.includes(posSearch)
    );
  }, [storeStock, posSearch]);

  const posTotal = activeCart.items.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);

  // Quick Print Function
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: "100vh", width: "100vw", overflow: "hidden", backgroundColor: "#eee3ca", color: "#211c15", fontFamily: '"Work Sans", sans-serif' }}>
      
      {/* ─── DESKTOP SIDEBAR ─── */}
      {!isMobile && (
        <aside style={{ width: "280px", flexShrink: 0, height: "100vh", overflowY: "auto", backgroundColor: "#fbf6ea", borderRight: "3px solid #211c15", display: "flex", flexDirection: "column", zIndex: 10 }}>
          <div style={{ padding: "2.5rem 2rem", borderBottom: "2px dashed #211c15", backgroundImage: "radial-gradient(rgba(33,28,21,0.2) 1px, transparent 1px)", backgroundSize: "12px 12px" }}>
            <h2 style={{ margin: 0, fontSize: "1.8rem", letterSpacing: "1px", fontWeight: 800, fontFamily: '"Anton", sans-serif', textTransform: "uppercase" }}>SUPERSTORE</h2>
            <span style={{ fontSize: "0.75rem", color: "#2e6b48", textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace' }}>CASHIER: {staffId}</span>
          </div>
          <nav style={{ padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
            <button onClick={() => setActiveTab("queue")} style={{ display: "flex", alignItems: "center", gap: "12px", textAlign: "left", padding: "1rem 1.2rem", borderRadius: "2px", border: activeTab === "queue" ? "2px solid #211c15" : "2px solid transparent", cursor: "pointer", fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", fontSize: "0.85rem", backgroundColor: activeTab === "queue" ? "#efb92e" : "transparent", color: "#211c15", transition: "all 0.15s", boxShadow: activeTab === "queue" ? "3px 3px 0 #211c15" : "none" }}>
              <span style={{ fontSize: "1.2rem" }}>📦</span> Online Queue
            </button>
            <button onClick={() => setActiveTab("pos")} style={{ display: "flex", alignItems: "center", gap: "12px", textAlign: "left", padding: "1rem 1.2rem", borderRadius: "2px", border: activeTab === "pos" ? "2px solid #211c15" : "2px solid transparent", cursor: "pointer", fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", fontSize: "0.85rem", backgroundColor: activeTab === "pos" ? "#efb92e" : "transparent", color: "#211c15", transition: "all 0.15s", boxShadow: activeTab === "pos" ? "3px 3px 0 #211c15" : "none" }}>
              <span style={{ fontSize: "1.2rem" }}>🏪</span> Walk-In POS
            </button>
          </nav>
          <div style={{ padding: "1.5rem", borderTop: "2px dashed #211c15" }}>
            <button onClick={onLogout} style={{ width: "100%", padding: "1rem", backgroundColor: "#c63c24", color: "#fff", border: "2px solid #211c15", borderRadius: "2px", fontWeight: 700, cursor: "pointer", transition: "0.2s", fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", boxShadow: "3px 3px 0 #211c15" }}>Close Register</button>
          </div>
        </aside>
      )}

      {/* ─── MOBILE HEADER ─── */}
      {isMobile && (
        <header style={{ padding: "1.5rem", backgroundColor: "#fbf6ea", borderBottom: "3px solid #211c15", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.4rem", letterSpacing: "1px", fontWeight: 800, fontFamily: '"Anton", sans-serif' }}>SUPERSTORE</h2>
            <span style={{ fontSize: "0.6rem", color: "#2e6b48", textTransform: "uppercase", fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace' }}>{staffId}</span>
          </div>
          <button onClick={onLogout} style={{ background: "transparent", border: "none", color: "#c63c24", fontWeight: 800, fontSize: "0.9rem", textTransform: "uppercase" }}>Log Out</button>
        </header>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <main style={{ flex: 1, height: "100vh", overflowY: "auto", padding: isMobile ? "2rem 1.5rem 6rem 1.5rem" : "3rem", backgroundImage: "radial-gradient(rgba(33,28,21,0.05) 1px, transparent 1px)", backgroundSize: "4px 4px" }}>
        <AnimatePresence mode="wait">
          
          {/* ─── FULFILLMENT QUEUE TAB ─── */}
          {activeTab === "queue" && (
            <motion.div key="queue" variants={staggerContainer} initial="hidden" animate="show" exit={{ opacity: 0 }}>
              <motion.div variants={fadeUp} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
                <div>
                  <h1 style={{ marginTop: 0, fontSize: isMobile ? "2rem" : "2.8rem", fontFamily: '"Anton", sans-serif', textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.2rem" }}>Bagging Queue</h1>
                  <p style={{ color: "rgba(33,28,21,0.6)", margin: 0, fontSize: "1rem", fontWeight: 500 }}>Online grocery orders awaiting physical bagging.</p>
                </div>
                <button onClick={() => setRefreshTrigger(prev => prev + 1)} style={{ padding: "0.8rem 1.2rem", backgroundColor: "transparent", border: "2px solid #211c15", borderRadius: "2px", fontWeight: 700, cursor: "pointer", fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", boxShadow: "3px 3px 0 #211c15", fontSize: "0.8rem" }}>
                  ↻ Refresh
                </button>
              </motion.div>
              
              {isLoading ? (
                <p style={{ fontWeight: 600 }}>Loading orders...</p>
              ) : queue.length === 0 ? (
                <div style={{ ...paperCardStyle, padding: "3rem", textAlign: "center", color: "rgba(33,28,21,0.5)" }}>
                  <h3 style={{ fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", color: "#211c15", margin: "0 0 0.5rem 0" }}>All Caught Up!</h3>
                  <p style={{ margin: 0, fontWeight: 500 }}>No pending online orders to bag right now.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {queue.map((order) => (
                    <motion.div variants={fadeUp} key={order.id} style={{ ...paperCardStyle, padding: isMobile ? "1.5rem" : "2rem", borderTop: order.status === 'Paid' ? "6px solid #211c15" : "6px solid #efb92e" }}>
                      
                      {/* Order Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", borderBottom: "2px dashed #211c15", paddingBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                        <div>
                          <h3 style={{ margin: "0 0 0.2rem 0", color: "#211c15", fontFamily: '"IBM Plex Mono", monospace', fontSize: "1.2rem", fontWeight: 800 }}>ORD-{order.id.split('-')[0].toUpperCase()}</h3>
                          <span style={{ fontSize: "0.85rem", color: "rgba(33,28,21,0.6)", fontWeight: 600 }}>{order.customerName} • {order.customerPhone}</span>
                        </div>
                        <span style={{ padding: "0.4rem 0.8rem", borderRadius: "2px", fontSize: "0.75rem", fontWeight: 800, fontFamily: '"IBM Plex Mono", monospace', border: "1.5px solid #211c15", backgroundColor: order.status === 'Paid' ? "#ffffff" : "#efb92e", color: "#211c15" }}>
                          {order.status === 'Paid' ? 'ACTION REQUIRED' : 'AWAITING RIDER'}
                        </span>
                      </div>

                      {/* Items to Pack */}
                      <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", color: "#c63c24", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 800, fontFamily: '"IBM Plex Mono", monospace' }}>Pick List:</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginBottom: "2rem" }}>
                        {order.items.map((item: any, idx: number) => (
                          <div key={idx} style={{ backgroundColor: "#ffffff", padding: "1rem", borderRadius: "2px", border: "1.5px solid #211c15", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                              <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#2e6b48", fontFamily: '"IBM Plex Mono", monospace' }}>{item.quantity}x</span>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{item.productName}</div>
                                <div style={{ fontSize: "0.8rem", color: "rgba(33,28,21,0.6)", marginTop: "2px", fontWeight: 600 }}>{item.unitOfMeasure}</div>
                              </div>
                            </div>
                            <div style={{ textAlign: isMobile ? "left" : "right" }}>
                              <span style={{ fontSize: "0.65rem", color: "rgba(33,28,21,0.5)", textTransform: "uppercase", fontWeight: 700 }}>Locate Barcode:</span>
                              <div style={{ fontFamily: '"IBM Plex Mono", monospace', color: "#211c15", backgroundColor: "#eee3ca", border: "1px solid #211c15", padding: "0.2rem 0.6rem", marginTop: "2px", fontSize: "0.9rem", fontWeight: 700 }}>{item.barcode}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Action Area */}
                      {order.status === 'Paid' ? (
                        <div style={{ backgroundColor: "#eee3ca", padding: "1.5rem", borderRadius: "4px", border: "1.5px solid #211c15" }}>
                          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.8rem", fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase" }}>Assign Dispatch Rider</label>
                          <div style={{ display: "flex", gap: "1rem", flexDirection: isMobile ? "column" : "row" }}>
                            <select 
                              value={riderName} 
                              onChange={(e) => setRiderName(e.target.value)} 
                              style={{ ...inputStyle, marginBottom: 0, flex: 1, cursor: "pointer", appearance: "none" }} 
                            >
                              <option value="" disabled>-- Select Assigned Rider --</option>
                              {riders.length === 0 ? (
                                <option value="" disabled>No riders available in database</option>
                              ) : (
                                riders.map(rider => (
                                  <option key={rider.id} value={rider.name}>{rider.name} ({rider.phone})</option>
                                ))
                              )}
                            </select>
                            <button 
                              onClick={() => handlePackageOrder(order.id)}
                              disabled={isPackaging === order.id || !riderName}
                              style={{ padding: "1rem 2rem", backgroundColor: "#2e6b48", color: "#fff", border: "2px solid #211c15", borderRadius: "2px", fontWeight: 800, cursor: isPackaging === order.id || !riderName ? "not-allowed" : "pointer", whiteSpace: "nowrap", fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", boxShadow: "3px 3px 0 #211c15", transition: "0.15s", opacity: !riderName ? 0.7 : 1 }}
                            >
                              {isPackaging === order.id ? "Processing..." : "Generate PIN"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: "1.5rem", backgroundColor: "#ffffff", border: "2px dashed #211c15", borderRadius: "4px", textAlign: "center" }}>
                          <p style={{ margin: 0, color: "#211c15", fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase" }}>Boxed and ready. Awaiting rider pickup.</p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ─── POS TAB (PARKED SALES & SCANNER) ─── */}
          {activeTab === "pos" && (
            <motion.div key="pos" variants={staggerContainer} initial="hidden" animate="show" exit={{ opacity: 0 }}>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h1 style={{ marginTop: 0, fontSize: isMobile ? "2rem" : "2.8rem", fontFamily: '"Anton", sans-serif', textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.2rem" }}>Store Register</h1>
                  <p style={{ color: "rgba(33,28,21,0.6)", margin: 0, fontSize: "1rem", fontWeight: 500 }}>Scan barcodes directly or type to search.</p>
                </div>

                {/* TAB MANAGEMENT UI (Multiple Checkouts) */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {posCarts.map((cart, index) => (
                    <button 
                      key={cart.id}
                      onClick={() => setActiveCartId(cart.id)}
                      style={{ padding: "0.6rem 1rem", backgroundColor: activeCartId === cart.id ? "#211c15" : "#fbf6ea", color: activeCartId === cart.id ? "#fff" : "#211c15", border: "2px solid #211c15", borderRadius: "2px", fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace', cursor: "pointer", boxShadow: activeCartId === cart.id ? "3px 3px 0 #efb92e" : "none", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      Tab {index + 1}
                      {cart.items.length > 0 && <span style={{ backgroundColor: activeCartId === cart.id ? "#efb92e" : "#211c15", color: activeCartId === cart.id ? "#211c15" : "#fff", padding: "2px 6px", borderRadius: "50px", fontSize: "0.65rem" }}>{cart.items.reduce((s,c) => s+c.quantity,0)}</span>}
                    </button>
                  ))}
                  <button onClick={handleAddCartTab} disabled={posCarts.length >= 5} style={{ padding: "0.6rem 1rem", backgroundColor: "transparent", border: "2px dashed #211c15", color: "#211c15", fontWeight: 800, cursor: posCarts.length >= 5 ? "not-allowed" : "pointer" }}>+ Park Sale</button>
                </div>
              </div>

              {/* TRUE POS SCANNER INPUT */}
              <motion.form variants={fadeUp} onSubmit={handleBarcodeScan} style={{ marginBottom: "2rem" }}>
                <input 
                  type="text" 
                  placeholder="Scan Barcode (Enter) or Type Name..." 
                  value={posSearch} 
                  onChange={(e) => setPosSearch(e.target.value)} 
                  style={{ ...inputStyle, padding: "1.2rem", fontSize: "1.1rem", boxShadow: "4px 4px 0 #211c15", fontFamily: '"IBM Plex Mono", monospace' }} 
                  autoFocus
                />
              </motion.form>

              <motion.div variants={fadeUp} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
                {filteredStock.length === 0 ? (
                  <p style={{ color: "rgba(33,28,21,0.5)", fontWeight: 600 }}>No stock matches your search.</p>
                ) : (
                  filteredStock.map((item) => {
                    const isSoldOut = item.stockAvailable <= 0;
                    
                    return (
                      <motion.div layout key={item.id} style={{ ...paperCardStyle, padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", opacity: isSoldOut ? 0.6 : 1, filter: isSoldOut ? "grayscale(100%)" : "none" }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>{item.productName}</h3>
                          </div>
                          <p style={{ margin: "0 0 0.5rem 0", color: "var(--green)", fontSize: "0.75rem", fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase" }}>{item.brand} • {item.unitOfMeasure}</p>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                            <span style={{ fontFamily: '"IBM Plex Mono", monospace', color: "#211c15", fontSize: "0.75rem", backgroundColor: "#eee3ca", border: "1px solid #211c15", padding: "0.2rem 0.4rem", fontWeight: 700 }}>BC: {item.barcode}</span>
                            <span style={{ fontWeight: 800, color: "#211c15", fontFamily: '"IBM Plex Mono", monospace', fontSize: "1.1rem" }}>{formatCurrency(item.price)}</span>
                          </div>
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: isSoldOut ? "var(--red)" : "var(--ink-soft)" }}>{item.stockAvailable} Left</span>
                          <button 
                            onClick={() => addToPosCart(item)} 
                            disabled={isSoldOut}
                            style={{ padding: "0.8rem 1.2rem", backgroundColor: "#211c15", color: "#fff", border: "none", borderRadius: "2px", fontWeight: 800, cursor: isSoldOut ? "not-allowed" : "pointer", boxShadow: isSoldOut ? "none" : "3px 3px 0 #efb92e", transition: "0.15s", fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase" }}
                          >
                            + Add
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ─── FLOATING "CURRENT SALE" BUTTON ─── */}
      <AnimatePresence>
        {activeTab === "pos" && activeCart.items.length > 0 && (
          <motion.button 
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsRegisterOpen(true)}
            style={{ position: "fixed", bottom: isMobile ? "90px" : "40px", right: isMobile ? "20px" : "40px", zIndex: 40, background: "#2e6b48", border: "2px solid #211c15", color: "#fff", padding: "1rem 1.5rem", borderRadius: "4px", fontWeight: 800, display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", boxShadow: "6px 6px 0 #211c15", fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase" }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          >
            <span style={{ fontSize: "1.2rem" }}>🛒</span> Open Drawer 
            <span style={{ backgroundColor: "#ffffff", color: "#211c15", padding: "0.1rem 0.6rem", border: "1.5px solid #211c15", borderRadius: "2px" }}>{activeCart.items.reduce((s,c) => s + c.quantity, 0)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ─── POS CART SUB-PANEL (SLIDING DRAWER) ─── */}
      <AnimatePresence>
        {isRegisterOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRegisterOpen(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(33,28,21,0.5)", zIndex: 9998, backdropFilter: "blur(2px)" }} />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%", transition: { ease: "easeInOut", duration: 0.3 } }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: "450px", backgroundColor: "#fbf6ea", borderLeft: "3px solid #211c15", zIndex: 9999, display: "flex", flexDirection: "column", boxShadow: "-10px 0 0 rgba(33,28,21,0.1)" }}
            >
              <div style={{ padding: "1.5rem 2rem", borderBottom: "2px dashed #211c15", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundImage: "radial-gradient(rgba(33,28,21,0.2) 1px, transparent 1px)", backgroundSize: "12px 12px" }}>
                <h2 style={{ margin: 0, fontSize: "1.8rem", fontFamily: '"Anton", sans-serif', textTransform: "uppercase", letterSpacing: "1px" }}>{activeCart.name}</h2>
                <button onClick={() => setIsRegisterOpen(false)} style={{ background: "transparent", border: "none", color: "#211c15", cursor: "pointer", fontWeight: "bold" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
                {activeCart.items.length === 0 ? (
                  <p style={{ color: "rgba(33,28,21,0.5)", textAlign: "center", marginTop: "2rem", fontWeight: 600 }}>Cart is empty.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {activeCart.items.map(cartItem => (
                      <div key={cartItem.item.id} style={{ backgroundColor: "#ffffff", borderRadius: "2px", padding: "1rem", border: "2px solid #211c15", boxShadow: "3px 3px 0 rgba(33,28,21,0.1)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                          <span style={{ fontWeight: 800, fontSize: "1.05rem" }}>{cartItem.item.productName}</span>
                          <button onClick={() => removeFromPosCart(cartItem.item.id)} style={{ background: "none", border: "none", color: "#c63c24", fontWeight: 800, cursor: "pointer" }}>✕</button>
                        </div>
                        <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.75rem", color: "var(--green)", fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase" }}>{cartItem.item.unitOfMeasure} • BC: {cartItem.item.barcode}</p>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 800, fontSize: "1.1rem" }}>{cartItem.quantity} x {formatCurrency(cartItem.item.price)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div style={{ padding: "2rem", borderTop: "2px dashed #211c15", backgroundColor: "#eee3ca" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", fontWeight: 800, marginBottom: "1rem", fontFamily: '"IBM Plex Mono", monospace' }}>
                  <span style={{textTransform: "uppercase"}}>Total Due</span>
                  <span>{formatCurrency(posTotal)}</span>
                </div>
                <button 
                  onClick={handleCompleteSale} 
                  disabled={isProcessingSale || activeCart.items.length === 0}
                  style={{ width: "100%", padding: "1.2rem", backgroundColor: isProcessingSale || activeCart.items.length === 0 ? "#ccc" : "#2e6b48", color: isProcessingSale || activeCart.items.length === 0 ? "#666" : "#fff", border: "2px solid #211c15", borderRadius: "2px", fontWeight: 800, cursor: isProcessingSale || activeCart.items.length === 0 ? "not-allowed" : "pointer", fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", boxShadow: isProcessingSale || activeCart.items.length === 0 ? "none" : "4px 4px 0 #211c15" }}
                >
                  {isProcessingSale ? "Processing..." : "Checkout & Print Receipt"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── DOPE PIN GENERATION OVERLAY ─── */}
      <AnimatePresence>
        {generatedPin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(33,28,21,0.85)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", damping: 20 }} style={{ ...paperCardStyle, padding: isMobile ? "2rem" : "3.5rem", textAlign: "center", maxWidth: "480px", width: "100%", boxShadow: "8px 8px 0 #211c15" }}>
              <h2 style={{ color: "#2e6b48", margin: "0 0 1rem 0", fontSize: "1.8rem", fontFamily: '"Anton", sans-serif', textTransform: "uppercase", letterSpacing: "1px" }}>✓ Ready For Dispatch</h2>
              <p style={{ color: "rgba(33,28,21,0.8)", marginBottom: "2rem", fontSize: "1rem", fontWeight: 600 }}>Write this secure PIN on the receipt for Order <strong>ORD-{generatedPin.orderId}</strong>. The rider requires it for handover.</p>
              
              <div style={{ backgroundColor: "#eee3ca", padding: "2rem", borderRadius: "4px", border: "2px dashed #211c15", marginBottom: "2rem" }}>
                <span style={{ fontSize: "4.5rem", fontWeight: 800, color: "#c63c24", letterSpacing: "10px", fontFamily: '"IBM Plex Mono", monospace' }}>{generatedPin.pin}</span>
              </div>

              <button onClick={() => setGeneratedPin(null)} style={{ width: "100%", padding: "1.2rem", backgroundColor: "#211c15", color: "#fff", border: "none", borderRadius: "2px", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer", fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", boxShadow: "4px 4px 0 #efb92e" }}>Close Screen</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── DIGITAL RECEIPT OVERLAY WITH PRINT ─── */}
      {/* Hide UI when printing, only show receipt */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-receipt, #printable-receipt * { visibility: visible; }
          #printable-receipt { position: absolute; left: 0; top: 0; box-shadow: none; border: none; width: 100%; max-width: 100%; padding: 0; margin: 0; }
        }
      `}</style>
      
      <AnimatePresence>
        {receiptData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(33,28,21,0.85)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
            <motion.div id="printable-receipt" initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 20, opacity: 0 }} transition={{ type: "spring", damping: 25 }} style={{ backgroundColor: "#fff", color: "#000", padding: "2.5rem 2rem", width: "100%", maxWidth: "380px", boxShadow: "10px 10px 0 #211c15", border: "2px solid #211c15", fontFamily: "'Courier New', Courier, monospace" }}>
              
              <div style={{ textAlign: "center", marginBottom: "1.5rem", borderBottom: "2px dashed #000", paddingBottom: "1rem" }}>
                <h2 style={{ margin: 0, fontSize: "1.8rem", letterSpacing: "2px", fontWeight: 900 }}>SUPERSTORE</h2>
                <p style={{ margin: "4px 0", fontSize: "0.8rem", fontWeight: 600 }}>123 Market Road, Akure, NG</p>
                <p style={{ margin: "4px 0", fontSize: "0.8rem", fontWeight: 600 }}>Tel: +234 800 000 0000</p>
              </div>

              <div style={{ marginBottom: "1.5rem", fontSize: "0.85rem", fontWeight: 600 }}>
                <p style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}><span>DATE:</span> <span>{receiptData.date}</span></p>
                <p style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}><span>TXN:</span> <span>{receiptData.transactionId}</span></p>
                <p style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}><span>TILL:</span> <span>{staffId}</span></p>
              </div>

              <div style={{ borderTop: "2px dashed #000", borderBottom: "2px dashed #000", padding: "1rem 0", marginBottom: "1.5rem" }}>
                {receiptData.items.map((c: any, i: number) => (
                  <div key={i} style={{ marginBottom: "0.8rem" }}>
                    <p style={{ margin: "0 0 4px 0", fontWeight: 800, fontSize: "0.95rem" }}>{c.item.productName}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600 }}>
                      <span>{c.quantity} @ {formatCurrency(c.item.price)}</span>
                      <span>{formatCurrency(c.item.price * c.quantity)}</span>
                    </div>
                  </div>
                ))}
                
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", paddingTop: "0.5rem", borderTop: "1px solid #000", fontWeight: 900, fontSize: "1.2rem" }}>
                  <span>TOTAL:</span>
                  <span>{formatCurrency(receiptData.total)}</span>
                </div>
              </div>

              <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <p style={{ margin: "0 0 0.5rem 0", fontWeight: 800 }}>THANK YOU FOR SHOPPING</p>
                <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 600 }}>Returns accepted within 7 days with receipt.</p>
              </div>

              <div className="no-print" style={{ display: "flex", gap: "10px" }}>
                <button onClick={handlePrintReceipt} style={{ flex: 1, padding: "1rem", backgroundColor: "#fff", color: "#000", border: "2px solid #000", fontWeight: 800, fontSize: "1rem", cursor: "pointer", fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase" }}>
                  Print
                </button>
                <button onClick={() => setReceiptData(null)} style={{ flex: 1, padding: "1rem", backgroundColor: "#000", color: "#fff", border: "2px solid #000", fontWeight: 800, fontSize: "1rem", cursor: "pointer", fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase" }}>
                  Next Cust.
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};