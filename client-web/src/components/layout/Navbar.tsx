import { useState } from "react";
import { motion, useScroll, useMotionValueEvent, useTransform, AnimatePresence } from "framer-motion";
import { IconCatalog, IconAbout, IconBag } from "../ui/icon";
import { useCart } from "../../context/CartContext";
import styles from "./Navbar.module.css";

export interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onCartClick: () => void;
  isHiddenOnMobile?: boolean;
}

const IconSupport = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconAisles = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const navTabs = [
  { id: "catalog", label: "Shop All", icon: <IconCatalog /> },
  { id: "aisles", label: "Categories", icon: <IconAisles /> },
  { id: "support", label: "Support", icon: <IconSupport /> },
  { id: "about", label: "About", icon: <IconAbout /> },
];

export const Navbar = ({ activeTab, setActiveTab, onCartClick, isHiddenOnMobile = false }: NavbarProps) => {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { cartCount } = useCart();

  const scrollProgress = useTransform(
    scrollY,
    [0, (typeof document !== "undefined" ? document.body.scrollHeight : 1000) - (typeof window !== "undefined" ? window.innerHeight : 800) || 1000],
    [0, 1]
  );

  useMotionValueEvent(scrollY, "change", (latest) => setScrolled(latest > 30));

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={`${styles.navWrapper} ${isHiddenOnMobile ? styles.hideMobile : ""}`}>
      <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ""} ${menuOpen ? styles.menuOpen : ""}`}>
        <div className={styles.navContainer}>
          <motion.div className={styles.brand} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }} onClick={() => handleNavClick("catalog")}>
            <span className={styles.brandMark}>S</span>
            <span className={styles.brandWord}>SUPERSTORE</span>
          </motion.div>

          <div className={styles.desktopLinks}>
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <div key={tab.id} className={styles.linkWrapper} onClick={() => handleNavClick(tab.id)}>
                  {isActive && <motion.div layoutId="navPill" className={styles.activePill} transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                  <span className={`${styles.iconContainer} ${isActive ? styles.activeIcon : ""}`}>{tab.icon}</span>
                  <span className={`${styles.linkLabel} ${isActive ? styles.activeLabel : ""}`}>{tab.label}</span>
                </div>
              );
            })}
          </div>

          <div className={styles.actions}>
            <motion.button className={styles.cartBtn} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={onCartClick} aria-label="Open cart">
              <IconBag />
              <AnimatePresence mode="popLayout">
                {!scrolled && (
                  <motion.span key="label" initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className={styles.cartText}>Cart</motion.span>
                )}
              </AnimatePresence>
              <AnimatePresence mode="popLayout">
                <motion.span key={cartCount} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ type: "spring", stiffness: 500, damping: 20 }} className={styles.cartBadge}>
                  {cartCount}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            <button className={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle Navigation Menu">
              <span className={menuOpen ? styles.barOpen1 : styles.bar} />
              <span className={menuOpen ? styles.barOpen2 : styles.bar} />
              <span className={menuOpen ? styles.barOpen3 : styles.bar} />
            </button>
          </div>
        </div>

        <motion.div className={styles.scrollTrack} style={{ scaleX: scrollProgress }} />

        <AnimatePresence>
          {menuOpen && (
            <motion.div className={styles.mobileMenu} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}>
              {navTabs.map((tab, i) => (
                <motion.div key={tab.id} className={`${styles.mobileLink} ${activeTab === tab.id ? styles.mobileLinkActive : ""}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} onClick={() => handleNavClick(tab.id)}>
                  <span className={styles.mobileLinkIcon}>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35, marginLeft: "auto" }}><path d="m9 18 6-6-6-6" /></svg>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </div>
  );
};