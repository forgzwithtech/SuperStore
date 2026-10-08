import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { api } from "../../services/api";

interface AdminDashboardProps {
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

const labelStyle = {
  display: "block", marginBottom: "0.4rem", fontSize: "0.75rem", 
  color: "rgba(33,28,21,0.8)", fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase" as const
};

const resolveImageUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `http://localhost:5149${url}`; 
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

export const AdminDashboard = ({ onLogout }: AdminDashboardProps) => {
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "all-inventory" | "inventory" | "users">("overview");

  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]); 
  
  const [, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [inventorySearch, setInventorySearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminTelemetry = async () => {
      try {
        // FIXED: Added individual .catch() so a 404 on one endpoint doesn't crash the entire dashboard
        const [productsData, ordersData, categoriesData, brandsData, personnelData] = await Promise.all([
          api.get('/admin/inventory/products').catch((e) => { console.error("Products error", e); return []; }),
          api.get('/admin/orders/all').catch((e) => { console.error("Orders error", e); return []; }),
          api.get('/categories').catch(() => []), 
          api.get('/brands').catch(() => []),
          api.get('/admin/users/all').catch(() => []) 
        ]);
        
        setProducts(productsData);
        setOrders(ordersData);
        setCategories(categoriesData);
        setBrands(brandsData);
        setPersonnel(personnelData);
        
        if (productsData.length > 0 && !stockForm.productId) {
          setStockForm(prev => ({ ...prev, productId: productsData[0].id }));
        }
      } catch (err) {
        console.error("Failed to fetch administrative records", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdminTelemetry();
  }, [refreshTrigger]);

  const pieChartMetrics = useMemo(() => {
    const counts: Record<string, number> = { Pending: 0, Paid: 0, ReadyForDispatch: 0, OutForDelivery: 0, Delivered: 0 };
    orders.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });
    
    const total = orders.length;
    if (total === 0) return { gradient: "conic-gradient(rgba(0,0,0,0.05) 0% 100%)", counts };

    let runningAngle = 0;
    const colorMap: Record<string, string> = {
      Delivered: "#2e6b48", // green
      ReadyForDispatch: "#efb92e", // yellow
      Paid: "#211c15", // ink
      OutForDelivery: "#4a90e2", // blue
      Pending: "#c63c24" // red
    };

    const segments = Object.entries(counts).map(([status, val]) => {
      const sliceSize = (val / total) * 100;
      const start = runningAngle;
      runningAngle += sliceSize;
      return `${colorMap[status]} ${start}% ${runningAngle}%`;
    });

    return { gradient: `conic-gradient(${segments.join(", ")})`, counts };
  }, [orders]);

  const [inventoryMode, setInventoryMode] = useState<"inject" | "register">("inject");
  
  // ─── SUPERMARKET: FLAT REGISTER FORM ───
  const [productForm, setProductForm] = useState({ 
    productName: "", description: "", barcode: "", unitOfMeasure: "", price: "", initialStock: "", imageUrl: "" 
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [newBrandName, setNewBrandName] = useState<string>("");
  
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file); 

    try {
      const uploadResponse = await fetch('http://localhost:5149/api/admin/inventory/upload-image', {
        method: 'POST',
        body: formData,
      });
      if (!uploadResponse.ok) throw new Error(`Server execution error status: ${uploadResponse.status}`);
      const data = await uploadResponse.json();
      setProductForm({ ...productForm, imageUrl: data.url || data.Url });
    } catch (err) {
      console.error(err);
      alert("Image pipeline failed to upload.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingProduct(true);
    const finalCategoryName = selectedCategory === "ADD_NEW" ? newCategoryName : selectedCategory;
    const finalBrandName = selectedBrand === "ADD_NEW" ? newBrandName : selectedBrand;

    try {
      await api.post('/admin/inventory/create-product', {
        categoryName: finalCategoryName,
        brandName: finalBrandName,
        productName: productForm.productName,
        description: productForm.description,
        barcode: productForm.barcode,
        unitOfMeasure: productForm.unitOfMeasure,
        price: parseFloat(productForm.price),
        initialStock: parseInt(productForm.initialStock),
        imageUrl: productForm.imageUrl
      });
      
      setProductForm({ productName: "", description: "", barcode: "", unitOfMeasure: "", price: "", initialStock: "", imageUrl: "" });
      setSelectedCategory(""); setNewCategoryName(""); setSelectedBrand(""); setNewBrandName("");
      setRefreshTrigger(prev => prev + 1);
      setInventoryMode("inject"); 
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.Error || "Failed to commit product schema.");
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const [stockForm, setStockForm] = useState({ productId: "", quantityToAdd: 1 });
  const [isInjecting, setIsInjecting] = useState(false);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInjecting(true);
    try {
      await api.post('/admin/inventory/add-stock', {
        productId: stockForm.productId, 
        quantityToAdd: stockForm.quantityToAdd
      });
      setStockForm({ ...stockForm, quantityToAdd: 1 });
      setRefreshTrigger(prev => prev + 1);
      alert("Stock successfully added to shelf.");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to finalize database injection.");
    } finally {
      setIsInjecting(false);
    }
  };

  const filteredInventory = products.filter(item => 
    item.displayName?.toLowerCase().includes(inventorySearch.toLowerCase()) || 
    item.barcode?.includes(inventorySearch)
  );

  const filteredOrders = orders.filter(order => 
    order.id?.toLowerCase().includes(orderSearch.toLowerCase()) || 
    order.customerName?.toLowerCase().includes(orderSearch.toLowerCase())
  );

  return (
    // FIXED: Height locked to 100vh and overflow hidden. Prevents page-level scrolling.
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", backgroundColor: "#eee3ca", color: "#211c15", fontFamily: '"Work Sans", sans-serif' }}>
      
      {/* ─── SIDEBAR (Fixed Height, scrollable internally if needed) ─── */}
      <aside style={{ width: "280px", flexShrink: 0, height: "100vh", overflowY: "auto", backgroundColor: "#fbf6ea", borderRight: "3px solid #211c15", display: "flex", flexDirection: "column", zIndex: 10 }}>
        <div style={{ padding: "2.5rem 2rem", borderBottom: "2px dashed #211c15", backgroundImage: "radial-gradient(rgba(33,28,21,0.2) 1px, transparent 1px)", backgroundSize: "12px 12px" }}>
          <h2 style={{ margin: 0, fontSize: "1.8rem", letterSpacing: "1px", fontWeight: 800, fontFamily: '"Anton", sans-serif', textTransform: "uppercase" }}>SUPERSTORE</h2>
          <span style={{ fontSize: "0.75rem", color: "#c63c24", textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace' }}>Headquarters</span>
        </div>

        <nav style={{ padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
          {[
            { id: "overview", label: "Ledger", icon: "📊" },
            { id: "orders", label: "Order Manifest", icon: "📦" },
            { id: "all-inventory", label: "Stock Index", icon: "📋" },
            { id: "inventory", label: "Receiving Bay", icon: "📥" },
            { id: "users", label: "Personnel", icon: "🛡️" }
          ].map((tab) => (
            <button 
              key={tab.id} onClick={() => setActiveTab(tab.id as any)} 
              style={{ 
                display: "flex", alignItems: "center", gap: "12px", textAlign: "left", padding: "1rem 1.2rem", 
                borderRadius: "2px", border: activeTab === tab.id ? "2px solid #211c15" : "2px solid transparent", 
                cursor: "pointer", fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", fontSize: "0.85rem",
                backgroundColor: activeTab === tab.id ? "#efb92e" : "transparent", 
                color: "#211c15", transition: "all 0.15s",
                boxShadow: activeTab === tab.id ? "3px 3px 0 #211c15" : "none",
                transform: activeTab === tab.id ? "translate(-2px, -2px)" : "none"
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "1.5rem", borderTop: "2px dashed #211c15" }}>
          <button onClick={onLogout} style={{ width: "100%", padding: "1rem", backgroundColor: "#c63c24", color: "#fff", border: "2px solid #211c15", borderRadius: "2px", fontWeight: 700, cursor: "pointer", transition: "0.2s", fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", boxShadow: "3px 3px 0 #211c15" }}>
            Clock Out
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA (Scrollable) ─── */}
      <main style={{ flex: 1, height: "100vh", overflowY: "auto", padding: "3rem", backgroundImage: "radial-gradient(rgba(33,28,21,0.05) 1px, transparent 1px)", backgroundSize: "4px 4px" }}>
        <AnimatePresence mode="wait">
          
          {/* ─── OVERVIEW TAB ─── */}
          {activeTab === "overview" && (
            <motion.div key="overview" variants={staggerContainer} initial="hidden" animate="show" exit={{ opacity: 0 }}>
              <motion.h1 variants={fadeUp} style={{ marginTop: 0, fontSize: "2.8rem", fontFamily: '"Anton", sans-serif', textTransform: "uppercase", letterSpacing: "1px" }}>Master Ledger</motion.h1>
              
              <motion.div variants={fadeUp} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", marginTop: "2rem" }}>
                <div style={{ ...paperCardStyle, padding: "2rem", borderTop: "6px solid #2e6b48" }}>
                  <p style={labelStyle}>Gross Revenue</p>
                  <h2 style={{ margin: 0, fontSize: "2.5rem", color: "#211c15", fontWeight: 800, fontFamily: '"IBM Plex Mono", monospace' }}>{formatCurrency(orders.reduce((sum, o) => sum + o.totalAmount, 0))}</h2>
                </div>
                <div style={{ ...paperCardStyle, padding: "2rem", borderTop: "6px solid #211c15" }}>
                  <p style={labelStyle}>Total Orders</p>
                  <h2 style={{ margin: 0, fontSize: "2.5rem", color: "#211c15", fontWeight: 800, fontFamily: '"IBM Plex Mono", monospace' }}>{orders.length}</h2>
                </div>
                <div style={{ ...paperCardStyle, padding: "2rem", borderTop: "6px solid #c63c24" }}>
                  <p style={labelStyle}>Awaiting Bagging</p>
                  <h2 style={{ margin: 0, fontSize: "2.5rem", color: "#c63c24", fontWeight: 800, fontFamily: '"IBM Plex Mono", monospace' }}>{orders.filter(o => o.status === "Paid").length}</h2>
                </div>
              </motion.div>

              <motion.div variants={fadeUp} style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem", marginTop: "1.5rem" }}>
                <div style={{ ...paperCardStyle, padding: "2rem", display: "flex", alignItems: "center", gap: "4rem" }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginTop: 0, fontSize: "1.4rem", fontWeight: 800, fontFamily: '"Anton", sans-serif', textTransform: "uppercase" }}>Fulfillment Distribution</h3>
                    <p style={{ color: "rgba(33,28,21,0.6)", fontSize: "0.9rem", fontWeight: 500 }}>Live overview of current order pipeline and delivery statuses.</p>
                    
                    <div style={{ width: "100%", marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.8rem", fontFamily: '"IBM Plex Mono", monospace' }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", borderBottom: "1px dashed #ccc", paddingBottom: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700 }}><span style={{ width: "12px", height: "12px", border: "1px solid #000", backgroundColor: "#2e6b48" }}/> Delivered</div>
                        <span style={{ fontWeight: 700 }}>{pieChartMetrics.counts.Delivered || 0}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", borderBottom: "1px dashed #ccc", paddingBottom: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700 }}><span style={{ width: "12px", height: "12px", border: "1px solid #000", backgroundColor: "#211c15" }}/> Paid (Queued)</div>
                        <span style={{ fontWeight: 700 }}>{pieChartMetrics.counts.Paid || 0}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", borderBottom: "1px dashed #ccc", paddingBottom: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700 }}><span style={{ width: "12px", height: "12px", border: "1px solid #000", backgroundColor: "#efb92e" }}/> Ready For Dispatch</div>
                        <span style={{ fontWeight: 700 }}>{pieChartMetrics.counts.ReadyForDispatch || 0}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", borderBottom: "1px dashed #ccc", paddingBottom: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700 }}><span style={{ width: "12px", height: "12px", border: "1px solid #000", backgroundColor: "#4a90e2" }}/> In Transit</div>
                        <span style={{ fontWeight: 700 }}>{pieChartMetrics.counts.OutForDelivery || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ 
                    width: "220px", height: "220px", borderRadius: "50%", 
                    background: pieChartMetrics.gradient, 
                    border: "3px solid #211c15",
                    position: "relative", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "6px 6px 0 #211c15" 
                  }}>
                    <div style={{ width: "130px", height: "130px", backgroundColor: "#fbf6ea", border: "3px solid #211c15", borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "2rem", fontWeight: 800, fontFamily: '"IBM Plex Mono", monospace' }}>{orders.length}</span>
                      <span style={{ fontSize: "0.6rem", color: "rgba(33,28,21,0.6)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>Total Logs</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ─── ORDERS TAB ─── */}
          {activeTab === "orders" && (
            <motion.div key="orders" variants={staggerContainer} initial="hidden" animate="show" exit={{ opacity: 0 }}>
              <motion.div variants={fadeUp} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
                <div>
                  <h1 style={{ marginTop: 0, fontSize: "2.5rem", fontFamily: '"Anton", sans-serif', textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.2rem" }}>Order Manifest</h1>
                  <p style={{ color: "rgba(33,28,21,0.6)", margin: 0, fontSize: "1rem", fontWeight: 500 }}>Expand to view grocery picking list.</p>
                </div>
                <input type="text" placeholder="Search Order ID or Name..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} style={{ ...inputStyle, width: "300px", marginBottom: 0, boxShadow: "3px 3px 0 #211c15" }} />
              </motion.div>

              <motion.div variants={fadeUp} style={{ ...paperCardStyle, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#e3d8bc", borderBottom: "2px solid #211c15" }}>
                      <th style={{ padding: "1.2rem 1.5rem", color: "#211c15", fontWeight: 800, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1px" }}>Manifest ID</th>
                      <th style={{ padding: "1.2rem 1.5rem", color: "#211c15", fontWeight: 800, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1px" }}>Customer Details</th>
                      <th style={{ padding: "1.2rem 1.5rem", color: "#211c15", fontWeight: 800, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1px" }}>Total Value</th>
                      <th style={{ padding: "1.2rem 1.5rem", color: "#211c15", fontWeight: 800, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1px" }}>Status</th>
                      <th style={{ padding: "1.2rem 1.5rem", color: "#211c15", fontWeight: 800, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1px" }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "rgba(33,28,21,0.5)", fontWeight: 600 }}>No manifests found.</td></tr>
                    ) : (
                      filteredOrders.map(order => (
                        <React.Fragment key={order.id}>
                          <tr 
                            onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                            style={{ borderBottom: "1px solid rgba(33,28,21,0.1)", cursor: "pointer", transition: "0.15s", backgroundColor: expandedOrderId === order.id ? "rgba(33,28,21,0.03)" : "transparent" }} 
                            onMouseOver={e => e.currentTarget.style.backgroundColor = "rgba(33,28,21,0.04)"} 
                            onMouseOut={e => e.currentTarget.style.backgroundColor = expandedOrderId === order.id ? "rgba(33,28,21,0.03)" : "transparent"}
                          >
                            <td style={{ padding: "1.2rem 1.5rem", fontFamily: '"IBM Plex Mono", monospace', fontSize: "0.9rem", color: "#211c15", fontWeight: 700 }}>#{order.id.split('-')[0].toUpperCase()}</td>
                            <td style={{ padding: "1.2rem 1.5rem" }}><div style={{ fontWeight: 700 }}>{order.customerName}</div><div style={{ fontSize: "0.8rem", color: "rgba(33,28,21,0.6)", fontFamily: '"IBM Plex Mono", monospace' }}>{order.customerPhone}</div></td>
                            <td style={{ padding: "1.2rem 1.5rem", fontWeight: 800, fontFamily: '"IBM Plex Mono", monospace' }}>{formatCurrency(order.totalAmount)}</td>
                            <td style={{ padding: "1.2rem 1.5rem" }}>
                              <span style={{ 
                                padding: "0.4rem 0.8rem", borderRadius: "2px", fontSize: "0.75rem", fontWeight: 800, fontFamily: '"IBM Plex Mono", monospace', border: "1.5px solid #211c15",
                                backgroundColor: order.status === "Delivered" ? "#34c759" : order.status === "Pending" ? "#efb92e" : "#ffffff", 
                                color: "#211c15" 
                              }}>
                                {order.status.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: "1.2rem 1.5rem", color: "rgba(33,28,21,0.6)", fontSize: "0.85rem", fontWeight: 600 }}>{new Date(order.date).toLocaleString()}</td>
                          </tr>
                          
                          {/* FIXED: Mapped Order Details for Supermarket Format */}
                          <AnimatePresence>
                            {expandedOrderId === order.id && (
                              <tr style={{ backgroundColor: "#eee3ca", borderBottom: "2px solid #211c15" }}>
                                <td colSpan={5} style={{ padding: 0 }}>
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                                    <div style={{ padding: "2rem", borderLeft: "4px solid #c63c24" }}>
                                      <h4 style={{ margin: "0 0 1rem 0", color: "#211c15", textTransform: "uppercase", fontSize: "0.85rem", letterSpacing: "1px", fontWeight: 800 }}>Picking List (Items to Bag)</h4>
                                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        {order.items?.map((item: any, idx: number) => (
                                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fbf6ea", padding: "1rem 1.5rem", border: "1px solid #211c15", borderRadius: "2px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                              <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 800, fontSize: "1.2rem", color: "#c63c24" }}>{item.quantity}x</span>
                                              <div>
                                                <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>{item.productName}</span>
                                                <div style={{ fontSize: "0.8rem", color: "rgba(33,28,21,0.6)", fontWeight: 600 }}>{item.brandName} • {item.unitOfMeasure}</div>
                                              </div>
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                              <div style={{ fontFamily: '"IBM Plex Mono", monospace', color: "#211c15", fontWeight: 700, backgroundColor: "#efb92e", border: "1px solid #211c15", padding: "0.2rem 0.6rem", fontSize: "0.8rem", display: "inline-block" }}>
                                                BC: {item.barcode}
                                              </div>
                                              <div style={{ fontSize: "0.85rem", color: "#211c15", marginTop: "4px", fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace' }}>@ {formatCurrency(item.unitPrice)} ea</div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </motion.div>
            </motion.div>
          )}

          {/* ─── ALL INVENTORY TAB ─── */}
          {activeTab === "all-inventory" && (
            <motion.div key="all-inventory" variants={staggerContainer} initial="hidden" animate="show" exit={{ opacity: 0 }}>
              <motion.div variants={fadeUp} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
                <div>
                  <h1 style={{ marginTop: 0, fontSize: "2.5rem", fontFamily: '"Anton", sans-serif', textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.2rem" }}>Stock Index</h1>
                  <p style={{ color: "rgba(33,28,21,0.6)", margin: 0, fontSize: "1rem", fontWeight: 500 }}>Master view of every SKU on the shelves.</p>
                </div>
                <input type="text" placeholder="Search product or barcode..." value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} style={{ ...inputStyle, width: "300px", marginBottom: 0, boxShadow: "3px 3px 0 #211c15" }} />
              </motion.div>

              <motion.div variants={fadeUp} style={{ ...paperCardStyle, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#e3d8bc", borderBottom: "2px solid #211c15" }}>
                      <th style={{ padding: "1.2rem 1.5rem", color: "#211c15", fontWeight: 800, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1px" }}>Product Identity</th>
                      <th style={{ padding: "1.2rem 1.5rem", color: "#211c15", fontWeight: 800, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1px" }}>Category</th>
                      <th style={{ padding: "1.2rem 1.5rem", color: "#211c15", fontWeight: 800, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1px" }}>Barcode</th>
                      <th style={{ padding: "1.2rem 1.5rem", color: "#211c15", fontWeight: 800, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1px" }}>Unit Price</th>
                      <th style={{ padding: "1.2rem 1.5rem", color: "#211c15", fontWeight: 800, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1px" }}>On Shelves</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "rgba(33,28,21,0.5)", fontWeight: 600 }}>No SKUs found.</td></tr>
                    ) : (
                      filteredInventory.map(item => (
                        <tr key={item.id} style={{ borderBottom: "1px solid rgba(33,28,21,0.1)", transition: "0.15s" }} onMouseOver={e => e.currentTarget.style.backgroundColor = "rgba(33,28,21,0.03)"} onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}>
                          <td style={{ padding: "1rem 1.5rem" }}>
                            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#211c15" }}>{item.displayName.split('|')[0].trim()}</div>
                            <div style={{ fontSize: "0.85rem", color: "rgba(33,28,21,0.6)", fontWeight: 600 }}>Size: {item.displayName.split('|')[1]?.trim()}</div>
                          </td>
                          <td style={{ padding: "1rem 1.5rem", fontWeight: 600, fontSize: "0.9rem" }}>{item.category}</td>
                          <td style={{ padding: "1rem 1.5rem", fontFamily: '"IBM Plex Mono", monospace', fontWeight: 700, fontSize: "0.9rem" }}>
                            <span style={{ backgroundColor: "#eee3ca", padding: "2px 6px", border: "1px solid #211c15" }}>{item.barcode}</span>
                          </td>
                          <td style={{ padding: "1rem 1.5rem", fontWeight: 800, fontFamily: '"IBM Plex Mono", monospace' }}>{formatCurrency(item.price)}</td>
                          <td style={{ padding: "1rem 1.5rem" }}>
                            <span style={{ padding: "0.4rem 0.8rem", borderRadius: "2px", fontSize: "0.8rem", fontWeight: 800, border: "1.5px solid #211c15", backgroundColor: item.stockAvailable > 10 ? "#34c759" : item.stockAvailable > 0 ? "#efb92e" : "#c63c24", color: item.stockAvailable > 10 ? "#fff" : "#211c15" }}>
                              {item.stockAvailable} UNITS
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </motion.div>
            </motion.div>
          )}

          {/* ─── INVENTORY INJECTION TAB ─── */}
          {activeTab === "inventory" && (
            <motion.div key="inventory" variants={staggerContainer} initial="hidden" animate="show" exit={{ opacity: 0 }}>
              <h1 style={{ marginTop: 0, fontSize: "2.5rem", fontFamily: '"Anton", sans-serif', textTransform: "uppercase", letterSpacing: "1px" }}>Receiving Bay</h1>
              
              <div style={{ display: "flex", gap: "0.5rem", backgroundColor: "#fbf6ea", border: "2px solid #211c15", padding: "0.4rem", borderRadius: "4px", width: "max-content", marginBottom: "2rem", boxShadow: "4px 4px 0 #211c15" }}>
                <button onClick={() => setInventoryMode("inject")} style={{ padding: "0.8rem 1.5rem", borderRadius: "2px", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", transition: "0.2s", backgroundColor: inventoryMode === "inject" ? "#211c15" : "transparent", color: inventoryMode === "inject" ? "#fff" : "#211c15" }}>Restock Shelves</button>
                <button onClick={() => setInventoryMode("register")} style={{ padding: "0.8rem 1.5rem", borderRadius: "2px", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", transition: "0.2s", backgroundColor: inventoryMode === "register" ? "#211c15" : "transparent", color: inventoryMode === "register" ? "#fff" : "#211c15" }}>Register New SKU</button>
              </div>

              <div style={{ ...paperCardStyle, padding: "2.5rem", maxWidth: "600px" }}>
                <AnimatePresence mode="wait">
                  {inventoryMode === "inject" && (
                    <motion.form key="inject" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} onSubmit={handleAddStock}>
                      <h3 style={{ marginTop: 0, color: "#2e6b48", marginBottom: "1.5rem", fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase" }}>Scan & Restock</h3>
                      
                      <label style={labelStyle}>Select Product</label>
                      <select required style={inputStyle} value={stockForm.productId} onChange={e => setStockForm({...stockForm, productId: e.target.value})}>
                        {products.map(p => <option key={p.id} value={p.id}>{p.displayName} (Bar: {p.barcode})</option>)}
                      </select>

                      <label style={labelStyle}>Quantity Arrived in Shipment</label>
                      <input required type="number" min="1" style={inputStyle} value={stockForm.quantityToAdd} onChange={e => setStockForm({...stockForm, quantityToAdd: parseInt(e.target.value) || 1})} />

                      <button disabled={isInjecting || products.length === 0} type="submit" style={{ width: "100%", padding: "1.2rem", backgroundColor: isInjecting || products.length === 0 ? "#eee3ca" : "#2e6b48", color: isInjecting || products.length === 0 ? "#211c15" : "#fff", border: "2px solid #211c15", borderRadius: "2px", fontWeight: 800, fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", cursor: isInjecting || products.length === 0 ? "not-allowed" : "pointer", marginTop: "1rem", boxShadow: "4px 4px 0 #211c15", transition: "all 0.15s" }}>
                        {isInjecting ? "Updating Ledger..." : "Commit to Inventory"}
                      </button>
                    </motion.form>
                  )}

                  {inventoryMode === "register" && (
                    <motion.form key="register" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} onSubmit={handleCreateProduct}>
                      <h3 style={{ marginTop: 0, color: "#2e6b48", marginBottom: "1.5rem", fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase" }}>Master SKU Creation</h3>
                      
                      <div style={{ display: "flex", gap: "1rem" }}>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>Department</label>
                          <select required style={inputStyle} value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                            <option value="" disabled>Select Department</option>
                            {categories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                            <option value="ADD_NEW" style={{fontWeight: "bold", color: "#2e6b48"}}>+ Add New Dept</option>
                          </select>
                          {selectedCategory === "ADD_NEW" && (
                            <input required type="text" placeholder="e.g. Toiletries" style={{ ...inputStyle, borderColor: "#2e6b48", marginTop: "0.5rem" }} value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                          )}
                        </div>

                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>Brand</label>
                          <select required style={inputStyle} value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}>
                            <option value="" disabled>Select Brand</option>
                            {brands.map((b: any) => <option key={b.id} value={b.name}>{b.name}</option>)}
                            <option value="ADD_NEW" style={{fontWeight: "bold", color: "#2e6b48"}}>+ Add New Brand</option>
                          </select>
                          {selectedBrand === "ADD_NEW" && (
                            <input required type="text" placeholder="e.g. Nestle" style={{ ...inputStyle, borderColor: "#2e6b48", marginTop: "0.5rem" }} value={newBrandName} onChange={e => setNewBrandName(e.target.value)} />
                          )}
                        </div>
                      </div>

                      <label style={labelStyle}>Product Name</label>
                      <input required type="text" placeholder="e.g. Milo Chocolate Powder" style={inputStyle} value={productForm.productName} onChange={e => setProductForm({...productForm, productName: e.target.value})} />
                      
                      <div style={{ display: "flex", gap: "1rem" }}>
                        <div style={{ flex: 1 }}><label style={labelStyle}>Barcode (EAN/UPC)</label><input required type="text" placeholder="61511000..." style={{...inputStyle, fontFamily: '"IBM Plex Mono", monospace'}} value={productForm.barcode} onChange={e => setProductForm({...productForm, barcode: e.target.value})} /></div>
                        <div style={{ flex: 1 }}><label style={labelStyle}>Unit of Measure</label><input required type="text" placeholder="e.g. 500g Tin" style={inputStyle} value={productForm.unitOfMeasure} onChange={e => setProductForm({...productForm, unitOfMeasure: e.target.value})} /></div>
                      </div>

                      <div style={{ display: "flex", gap: "1rem" }}>
                        <div style={{ flex: 1 }}><label style={labelStyle}>Selling Price (NGN)</label><input required type="number" placeholder="4500" style={inputStyle} value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} /></div>
                        <div style={{ flex: 1 }}><label style={labelStyle}>Initial Shelf Stock</label><input required type="number" placeholder="100" style={inputStyle} value={productForm.initialStock} onChange={e => setProductForm({...productForm, initialStock: e.target.value})} /></div>
                      </div>

                      <label style={labelStyle}>Product Image</label>
                      <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem", backgroundColor: "#eee3ca", padding: "1rem", borderRadius: "4px", border: "2px dashed #211c15" }}>
                        {productForm.imageUrl ? (
                          <div style={{ position: "relative" }}>
                            <img src={resolveImageUrl(productForm.imageUrl)} alt="Preview" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "4px", border: "1.5px solid #211c15" }} />
                            <button type="button" onClick={() => setProductForm({...productForm, imageUrl: ""})} style={{ position: "absolute", top: -8, right: -8, background: "#c63c24", color: "#fff", border: "1.5px solid #211c15", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>✕</button>
                          </div>
                        ) : (
                          <div style={{ width: "60px", height: "60px", backgroundColor: "#ffffff", border: "1.5px solid #211c15", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>📷</div>
                        )}
                        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleImageUpload} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage} style={{ padding: "0.6rem 1rem", backgroundColor: "#ffffff", color: "#211c15", border: "2px solid #211c15", borderRadius: "2px", fontWeight: 700, cursor: isUploadingImage ? "wait" : "pointer", boxShadow: "2px 2px 0 #211c15" }}>
                          {isUploadingImage ? "Uploading..." : "Select File"}
                        </button>
                      </div>

                      <button disabled={isCreatingProduct || isUploadingImage} type="submit" style={{ width: "100%", padding: "1.2rem", backgroundColor: (isCreatingProduct || isUploadingImage) ? "#eee3ca" : "#2e6b48", color: (isCreatingProduct || isUploadingImage) ? "#211c15" : "#fff", border: "2px solid #211c15", borderRadius: "2px", fontWeight: 800, fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", cursor: (isCreatingProduct || isUploadingImage) ? "not-allowed" : "pointer", marginTop: "1rem", boxShadow: "4px 4px 0 #211c15", transition: "0.15s" }}>
                        Generate Master SKU
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ─── PERSONNEL TAB ─── */}
          {activeTab === "users" && (
            <motion.div key="users" variants={staggerContainer} initial="hidden" animate="show" exit={{ opacity: 0 }}>
              <h1 style={{ marginTop: 0, fontSize: "2.5rem", fontFamily: '"Anton", sans-serif', textTransform: "uppercase", letterSpacing: "1px" }}>Personnel Access</h1>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "2rem", marginTop: "2rem" }}>
                <div style={{ ...paperCardStyle, padding: "2.5rem", height: "max-content" }}>
                  <h3 style={{ marginTop: 0, color: "#211c15", marginBottom: "1.5rem", fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase" }}>Issue ID Card</h3>
                  <form onSubmit={(e) => { e.preventDefault(); alert("Feature secured."); }}>
                    <label style={labelStyle}>Full Name</label>
                    <input type="text" placeholder="Jane Doe" required style={inputStyle} />
                    <label style={labelStyle}>Phone Number</label>
                    <input type="tel" placeholder="080..." required style={inputStyle} />
                    <label style={labelStyle}>Store Role</label>
                    <select style={inputStyle}>
                      <option value="Staff">Checkout Cashier</option>
                      <option value="Rider">Dispatch Rider</option>
                    </select>
                    <button type="submit" style={{ width: "100%", padding: "1rem", backgroundColor: "#211c15", color: "#fff", border: "none", borderRadius: "2px", fontWeight: 700, cursor: "pointer", fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", boxShadow: "4px 4px 0 #efb92e" }}>Authorize Print</button>
                  </form>
                </div>

                <div style={{ ...paperCardStyle, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#e3d8bc", borderBottom: "2px solid #211c15" }}>
                        <th style={{ padding: "1.2rem", color: "#211c15", fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase" }}>Employee</th>
                        <th style={{ padding: "1.2rem", color: "#211c15", fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase" }}>Clearance</th>
                        <th style={{ padding: "1.2rem", color: "#211c15", fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personnel.length === 0 ? (
                        <tr><td colSpan={3} style={{ padding: "2rem", textAlign: "center", color: "rgba(33,28,21,0.5)", fontWeight: 600 }}>No personnel logs found.</td></tr>
                      ) : (
                        personnel.map(user => (
                          <tr key={user.id} style={{ borderBottom: "1px solid rgba(33,28,21,0.1)" }}>
                            <td style={{ padding: "1.2rem" }}><div style={{ fontWeight: 700 }}>{user.name}</div><div style={{ fontSize: "0.8rem", color: "rgba(33,28,21,0.6)", fontFamily: '"IBM Plex Mono", monospace', fontWeight: 600 }}>{user.phone}</div></td>
                            <td style={{ padding: "1.2rem" }}>
                              <span style={{ padding: "0.3rem 0.6rem", borderRadius: "2px", fontSize: "0.75rem", fontWeight: 800, backgroundColor: "#efb92e", border: "1.5px solid #211c15" }}>{user.role}</span>
                            </td>
                            <td style={{ padding: "1.2rem", fontWeight: 700, color: "#2e6b48" }}>ACTIVE</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
};