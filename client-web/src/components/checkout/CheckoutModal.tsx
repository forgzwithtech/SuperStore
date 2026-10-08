import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { api } from "../../services/api"; 
import styles from "./CheckoutModal.module.css";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── PHYSICS CONFIG ───
const SPRING = { type: "spring" as const, stiffness: 400, damping: 32 };
const EASE = [0.16, 1, 0.3, 1] as const;

// ─── IMAGE URL RESOLVER ───
const resolveImageUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `http://localhost:5149${url}`; 
};

export const CheckoutModal = ({ isOpen, onClose }: CheckoutModalProps) => {
  const { cart, cartTotal, clearCart } = useCart();
  
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const orderPayload = {
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        deliveryAddress: formData.address,
        items: cart.map(item => ({
          productId: item.id, 
          quantity: item.quantity
        }))
      };

      const checkoutResponse = await api.post('/Orders/checkout', orderPayload);
      
      const orderId = checkoutResponse.data?.orderId || checkoutResponse.orderId;
      await api.post(`/Orders/${orderId}/mock-pay`, {});
      
      setOrderSuccess(true);
      clearCart();
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.error || 
        err.response?.data || 
        "Unable to process your order. Items may have just gone out of stock."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalWrapper}>
      <AnimatePresence>
        {isOpen && (
          <div className={styles.overlay}>
            <motion.div
              className={styles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              onClick={!orderSuccess ? onClose : undefined}
            />
            
            <motion.div
              className={styles.modal}
              initial={{ scale: 0.96, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 16, opacity: 0 }}
              transition={SPRING}
            >
              <div className={styles.header}>
                <h2 className={styles.headerTitle}>Order Register & Checkout</h2>
                {!orderSuccess && (
                  <button onClick={onClose} className={styles.closeBtn} aria-label="Close modal">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    Close
                  </button>
                )}
              </div>

              <div className={styles.contentArea}>
                {orderSuccess ? (
                  <motion.div 
                    className={styles.successState}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={SPRING}
                  >
                    <div className={styles.successIcon}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <h2 className={styles.successTitle}>Order Receipt Confirmed!</h2>
                    <p className={styles.successSub}>
                      Your groceries and essentials are packed and locked in. Our delivery riders will contact you shortly for dispatch to your address.
                    </p>
                    <motion.button 
                      className={styles.returnBtn}
                      onClick={() => {
                        setOrderSuccess(false);
                        onClose();
                        window.location.reload(); 
                      }}
                      whileHover={{ scale: 1.01 }} 
                      whileTap={{ scale: 0.98 }}
                    >
                      Return to Store
                    </motion.button>
                  </motion.div>
                ) : (
                  <>
                    <div className={styles.formColumn}>
                      <h3 className={styles.sectionTitle}>1. Delivery & Contact Register</h3>
                      <form id="checkout-form" onSubmit={handleSubmit} className={styles.formGrid}>
                        <div className={styles.inputGroup}>
                          <label className={styles.inputLabel}>Full Name</label>
                          <input 
                            required 
                            type="text" 
                            placeholder="e.g. Solomon Olowu" 
                            className={styles.input}
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                          />
                        </div>
                        
                        <div className={styles.inputRow}>
                          <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>Email Address</label>
                            <input 
                              required 
                              type="email" 
                              placeholder="name@domain.com" 
                              className={styles.input}
                              value={formData.email} 
                              onChange={e => setFormData({...formData, email: e.target.value})} 
                            />
                          </div>
                          <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>Phone Number</label>
                            <input 
                              required 
                              type="tel" 
                              placeholder="080 0000 0000" 
                              className={styles.input}
                              value={formData.phone} 
                              onChange={e => setFormData({...formData, phone: e.target.value})} 
                            />
                          </div>
                        </div>

                        <div className={styles.inputGroup} style={{ marginTop: '0.5rem' }}>
                          <label className={styles.inputLabel}>Physical Shipping Address</label>
                          <textarea 
                            required 
                            placeholder="Full Street Address (e.g. Alagbaka, Akure, Ondo State)" 
                            rows={3} 
                            className={styles.input}
                            style={{ resize: "none" }}
                            value={formData.address} 
                            onChange={e => setFormData({...formData, address: e.target.value})} 
                          />
                        </div>

                        <AnimatePresence>
                          {error && (
                            <motion.p 
                              className={styles.errorText}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              {error}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </form>
                    </div>

                    <div className={styles.summaryColumn}>
                      <h3 className={styles.sectionTitle}>2. Itemized Receipt</h3>
                      
                      <div className={styles.summaryItemsList}>
                        {cart.map(item => (
                          <div key={item.id} className={styles.summaryItem}>
                            <div className={styles.summaryImage}>
                              <img src={resolveImageUrl(item.imageUrl)} alt={item.name} />
                            </div>
                            <div className={styles.summaryDetails}>
                              <span className={styles.summaryBrand}>{item.brand}</span>
                              <p className={styles.summaryName}>{item.name}</p>
                              <p className={styles.summarySpecs}>{item.unitOfMeasure}</p>
                            </div>
                            <div className={styles.summaryPriceCol}>
                              <p className={styles.summaryPrice}>{formatCurrency(item.price * item.quantity)}</p>
                              <p className={styles.summaryQty}>Qty: {item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className={styles.summaryTotalRow}>
                        <span className={styles.totalLabel}>Total Amount</span>
                        <span className={styles.totalAmount}>{formatCurrency(cartTotal)}</span>
                      </div>

                      <motion.button 
                        type="submit" 
                        form="checkout-form"
                        disabled={isSubmitting || cart.length === 0}
                        className={styles.submitBtn}
                        whileHover={!isSubmitting ? { scale: 1.01 } : {}} 
                        whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                            </svg>
                            Processing Order...
                          </>
                        ) : (
                          <>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            Confirm & Dispatch Order
                          </>
                        )}
                      </motion.button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};