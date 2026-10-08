import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type ProductDto } from "../../pages/HomePage";
import { IconBag } from "../ui/icon";
import { useCart } from "../../context/CartContext";
import styles from "./ProductOverlay.module.css";

interface ProductOverlayProps {
  product: ProductDto;
  onClose: () => void;
}

const resolveImageUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `http://localhost:5149${url}`;
};

const SPRING = { type: "spring" as const, stiffness: 400, damping: 32 };
const EASE = [0.16, 1, 0.3, 1] as const;

export const ProductOverlay = ({ product, onClose }: ProductOverlayProps) => {
  const { addToCart, cart } = useCart();
  const [quantity, setQuantity] = useState<number>(1);
  const [justAdded, setJustAdded] = useState(false);
  
  // ─── CART & INVENTORY LOGIC ───
  const activeStock = product.stockAvailable;
  const isSoldOut = activeStock <= 0;

  const currentCartId = product.id; 
  const quantityAlreadyInCart = cart.find((i) => i.id === currentCartId)?.quantity || 0;
  
  const remainingAllowance = activeStock - quantityAlreadyInCart;
  const isMaxedOutInCart = remainingAllowance <= 0;

  const handleIncrement = () => {
    if (quantity < remainingAllowance) setQuantity(prev => prev + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) setQuantity(prev => prev - 1);
  };

  const handleAddToBag = () => {
    if (isSoldOut || isMaxedOutInCart) return;

    const result = addToCart({
      id: product.id,
      brand: product.brand,
      name: product.productName,
      unitOfMeasure: product.unitOfMeasure,
      price: product.price,
      imageUrl: product.imageUrl,
    }, quantity, activeStock);

    if (result.success) {
      setJustAdded(true);
      setTimeout(() => {
        onClose();
      }, 700);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(value);
  };

  const totalPrice = product.price * quantity;

  return (
    <div className={styles.overlayWrapper}>
      <motion.div
        className={styles.backdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        onClick={onClose}
      />

      <motion.div
        className={styles.modalPanel}
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={SPRING}
      >
        <button className={styles.closeButton} onClick={onClose} aria-label="Close dialog">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Left Column: Market Stage Frame */}
        <div className={styles.imageColumn}>
          <div className={styles.badgeTag}>{product.category.toUpperCase()}</div>
          <div className={styles.imageContainer}>
            <img src={resolveImageUrl(product.imageUrl)} alt={product.productName} className={styles.productImage} />
          </div>
        </div>

        {/* Right Column: Details & Actions */}
        <div className={styles.detailsColumn}>
          <span className={styles.brandLabel}>{product.brand}</span>
          <h1 className={styles.productTitle}>{product.productName}</h1>

          <div className={styles.variantSection}>
            <div className={styles.specGroup}>
              <div className={styles.specHeader}>
                <h3 className={styles.specTitle}>Item Specifications</h3>
              </div>
              <div className={styles.infoBox}>
                <span className={styles.infoLabel}>Unit / Package Size</span>
                <span className={styles.infoValue}>{product.unitOfMeasure}</span>
              </div>
              <div className={styles.infoBox}>
                <span className={styles.infoLabel}>Unit Price</span>
                <span className={styles.infoValue}>{formatCurrency(product.price)}</span>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className={styles.specGroup} style={{ marginTop: '0.75rem' }}>
              <div className={styles.specHeader}>
                <h3 className={styles.specTitle}>Quantity to Add</h3>
              </div>
              
              <div className={styles.quantityControl}>
                <button 
                  className={styles.qtyBtn} 
                  onClick={handleDecrement} 
                  disabled={quantity <= 1 || isSoldOut}
                  aria-label="Decrease"
                >
                  −
                </button>
                <span className={styles.qtyValue}>{quantity}</span>
                <button 
                  className={styles.qtyBtn} 
                  onClick={handleIncrement} 
                  disabled={quantity >= remainingAllowance || isSoldOut}
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className={styles.actionSection}>
            <div className={styles.priceContainer}>
              <span className={styles.priceLabel}>Line Total</span>
              <div className={styles.priceRow}>
                <AnimatePresence mode="popLayout">
                  <motion.p
                    key={totalPrice}
                    className={styles.price}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10, position: "absolute" }}
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  >
                    {formatCurrency(totalPrice)}
                  </motion.p>
                </AnimatePresence>
              </div>
              
              <div className={styles.stockStatus} style={{ color: isSoldOut ? "var(--red)" : "var(--ink-soft)" }}>
                <span className={styles.stockPulse} style={{ background: isSoldOut ? "var(--red)" : "var(--green)" }} />
                {isSoldOut ? "Currently out of stock" : `${activeStock} units available on shelves`}
              </div>
            </div>

            <motion.button
              className={`${styles.addToBagBtn} ${justAdded ? styles.addToBagBtnAdded : ""}`}
              disabled={isSoldOut || isMaxedOutInCart}
              whileHover={(!isSoldOut && !isMaxedOutInCart) ? { scale: 1.01 } : {}}
              whileTap={(!isSoldOut && !isMaxedOutInCart) ? { scale: 0.98 } : {}}
              onClick={handleAddToBag}
            >
              <IconBag />
              {isSoldOut ? "Sold Out" : isMaxedOutInCart ? "Maximum in Bag" : justAdded ? "Added to Cart ✓" : `Add ${quantity} to Cart`}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};