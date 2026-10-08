import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminDashboard } from "../../components/admin/AdminDashboard";
import { StaffDashboard } from "../../components/staff/StaffDashboard";
import { RiderDashboard } from "../../components/rider/RiderDashboard";
import { api } from "../../services/api";

export type Role = "Admin" | "Staff" | "Rider" | null;

export const InternalPortal = () => {
  const [activeRole, setActiveRole] = useState<Role>(null);
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const savedRole = localStorage.getItem("ik_role") as Role;
    if (savedRole && localStorage.getItem("ik_jwt_token")) {
      setActiveRole(savedRole);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setLoginError(null);

    try {
      const response = await api.post('/auth/login', { username, password });
      
      localStorage.setItem("ik_jwt_token", response.token);
      localStorage.setItem("ik_role", response.role);
      localStorage.setItem("ik_staff_id", response.fullName); 

      setActiveRole(response.role as Role);
    } catch (err: any) {
      setLoginError(err.response?.data || "System denied access.");
      setPassword("");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("ik_jwt_token");
    localStorage.removeItem("ik_role");
    localStorage.removeItem("ik_staff_id");
    setActiveRole(null);
    setUsername("");
    setPassword("");
  };

  // ─── TACTILE PAPER LOGIN SCREEN ───
  if (!activeRole) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        backgroundColor: "#eee3ca", 
        backgroundImage: "radial-gradient(rgba(33,28,21,0.05) 1px, transparent 1px)",
        backgroundSize: "4px 4px",
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        fontFamily: '"Work Sans", sans-serif',
        padding: "1rem"
      }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          style={{ 
            padding: "3rem", 
            backgroundColor: "#fbf6ea", 
            borderRadius: "4px", 
            border: "2px solid #211c15", 
            textAlign: "center", 
            maxWidth: "420px", 
            width: "100%", 
            boxShadow: "8px 8px 0 #211c15" 
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
            <div style={{ background: "#efb92e", border: "2px solid #211c15", padding: "8px 16px", transform: "rotate(-2deg)", boxShadow: "3px 3px 0 #211c15" }}>
              <h1 style={{ fontFamily: '"Anton", sans-serif', color: "#211c15", margin: 0, fontSize: "2rem", letterSpacing: "1px", textTransform: "uppercase" }}>SUPERSTORE</h1>
            </div>
          </div>
          
          <p style={{ color: "rgba(33,28,21,0.6)", marginBottom: "2.5rem", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace' }}>
            Authorized Personnel Only
          </p>
          
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ textAlign: "left" }}>
              {/* CLARIFIED LABEL */}
              <label style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "#211c15" }}>Username (Staff ID)</label>
              <input 
                type="text" value={username}
                placeholder="e.g. admin"
                onChange={(e) => { setUsername(e.target.value); setLoginError(null); }}
                style={{ width: "100%", padding: "1rem", backgroundColor: "#ffffff", border: `2px solid ${loginError ? "#c63c24" : "#211c15"}`, borderRadius: "2px", color: "#211c15", outline: "none", fontSize: "1rem", fontWeight: 600, marginTop: "4px", transition: "all 0.2s" }}
                required
              />
            </div>
            
            <div style={{ textAlign: "left" }}>
              {/* CLARIFIED LABEL */}
              <label style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "#211c15" }}>Password (PIN)</label>
              <input 
                type="password" value={password}
                placeholder="•••"
                onChange={(e) => { setPassword(e.target.value); setLoginError(null); }}
                style={{ width: "100%", padding: "1rem", backgroundColor: "#ffffff", border: `2px solid ${loginError ? "#c63c24" : "#211c15"}`, borderRadius: "2px", color: "#211c15", outline: "none", fontSize: "1rem", letterSpacing: "0.2rem", fontWeight: 700, marginTop: "4px", transition: "all 0.2s" }}
                required
              />
            </div>
            
            <AnimatePresence>
              {loginError && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ color: "#ffffff", backgroundColor: "#c63c24", border: "1.5px solid #211c15", padding: "8px", margin: "0", fontSize: "0.75rem", fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase" }}>
                  {loginError}
                </motion.p>
              )}
            </AnimatePresence>

            <button 
              disabled={isAuthenticating} 
              type="submit" 
              style={{ 
                width: "100%", padding: "1.2rem", backgroundColor: isAuthenticating ? "#eee3ca" : "#2e6b48", 
                color: isAuthenticating ? "#211c15" : "#fff", border: "2px solid #211c15", borderRadius: "2px", 
                fontWeight: 800, cursor: isAuthenticating ? "not-allowed" : "pointer", marginTop: "1rem", 
                transition: "all 0.2s", textTransform: "uppercase", letterSpacing: "0.05em",
                boxShadow: isAuthenticating ? "none" : "4px 4px 0 #211c15",
                transform: isAuthenticating ? "translate(4px, 4px)" : "none"
              }}
            >
              {isAuthenticating ? "Authenticating..." : "Open Register"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (activeRole === "Admin") return <AdminDashboard onLogout={handleLogout} />;
  if (activeRole === "Staff") return <StaffDashboard onLogout={handleLogout} />;
  if (activeRole === "Rider") return <RiderDashboard onLogout={handleLogout} />;

  return null;
};