import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import styles from "./CartFlyout.module.css";

interface CartFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout?: () => void;
}

// ─── PHYSICS CONFIG ───
const SPRING = { type: "spring" as const, stiffness: 400, damping: 32 };
const EASE = [0.16, 1, 0.3, 1] as const;

// Match the limit applied in the updated CartContext
const MAX_PER_CUSTOMER = 50; 

// ─── IMAGE URL RESOLVER ───
const resolveImageUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `http://localhost:5149${url}`; 
};

export const CartFlyout = ({ isOpen, onClose, onCheckout }: CartFlyoutProps) => {
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(value);
  };

  const handleProceedToCheckout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    
    if (onCheckout) onCheckout();
    if (onClose) onClose(); 
  };

  return (
    <div className={styles.flyoutWrapper}>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              className={styles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              onClick={onClose}
            />

            <motion.div 
              className={styles.panel}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={SPRING}
            >
              <div className={styles.header}>
                <h2>Your Basket</h2>
                <button className={styles.closeBtn} onClick={onClose} aria-label="Close cart">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className={styles.cartItemsContainer}>
                <AnimatePresence mode="popLayout">
                  {cart.length === 0 ? (
                    <motion.div 
                      key="empty-state"
                      className={styles.emptyState}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <svg className={styles.emptyStateIcon} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                        <path d="M3 6h18"></path>
                        <path d="M16 10a4 4 0 0 1-8 0"></path>
                      </svg>
                      <div>
                        <p>Your basket is empty</p>
                        <span className={styles.emptyStateSub}>Time to hit the aisles and stock up.</span>
                      </div>
                    </motion.div>
                  ) : (
                    cart.map((item) => (
                      <motion.div 
                        key={item.id} 
                        layout
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={SPRING}
                        className={styles.cartItem}
                      >
                        <div className={styles.itemImage}>
                          <img src={resolveImageUrl(item.imageUrl)} alt={item.name} />
                        </div>
                        
                        <div className={styles.itemDetails}>
                          <div className={styles.itemHeader}>
                            <div className={styles.titleWrap}>
                              <span className={styles.brandTag}>{item.brand}</span>
                              <h4>{item.name}</h4>
                            </div>
                            <button className={styles.removeBtn} onClick={() => removeFromCart(item.id)}>✕</button>
                          </div>
                          
                          <div className={styles.itemSpecsRow}>
                            <span className={styles.itemSpecs}>{item.unitOfMeasure}</span>
                          </div>

                          <div className={styles.itemBottomRow}>
                            <div className={styles.quantityControls}>
                              <button className={styles.qtyBtn} onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>−</button>
                              <span className={styles.qtyValue}>{item.quantity}</span>
                              <button className={styles.qtyBtn} onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= Math.min(item.maxStock, MAX_PER_CUSTOMER)}>+</button>
                            </div>
                            <span className={styles.itemPrice}>{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>

              <div className={styles.footer}>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Subtotal</span>
                  <AnimatePresence mode="popLayout">
                    <motion.span 
                      key={cartTotal}
                      className={styles.totalPrice}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10, position: "absolute" }}
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    >
                      {formatCurrency(cartTotal)}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <p className={styles.taxNote}>Delivery and taxes calculated at checkout.</p>
                
                <motion.button 
                  className={styles.checkoutBtn}
                  disabled={cart.length === 0}
                  whileHover={cart.length > 0 ? { scale: 1.01 } : {}}
                  whileTap={cart.length > 0 ? { scale: 0.98 } : {}}
                  transition={SPRING}
                  onClick={handleProceedToCheckout} 
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  Proceed to Checkout
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};