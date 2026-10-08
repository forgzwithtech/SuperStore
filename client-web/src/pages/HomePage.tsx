import { useEffect, useState, memo, useMemo, type MouseEvent } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { api } from "../services/api";
import { Navbar } from "../components/layout/Navbar";
import { Search } from "../components/search/Search";
import { ProductOverlay } from "../components/product/ProductOverlay";
import { CartFlyout } from "../components/cart/CartFlyout";
import { CheckoutModal } from "../components/checkout/CheckoutModal";
import { MockAssets } from "../assets/mockData";
import { IconBag } from "../components/ui/icon";
import { useCart } from "../context/CartContext";
import styles from "./HomePage.module.css";

export interface ProductDto { 
  id: string; 
  brand: string; 
  productName: string; 
  unitOfMeasure: string; 
  price: number; 
  category: string; 
  categorySlug: string;
  stockAvailable: number; 
  imageUrl: string; 
}

const EASE = [0.16, 1, 0.3, 1] as const;
const SPRING = { type: "spring" as const, stiffness: 400, damping: 32 };

const pageSlidePhysics = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.35, ease: EASE },
};

const TICKER_ITEMS = [
  "Fresh produce restocked daily",
  "Free delivery over ₦20,000",
  "Same-day dispatch before 2pm",
  "New arrivals in Electronics",
  "Wholesale pricing on bulk orders",
];

const resolveImageUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `http://localhost:5149${url}`;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(value);

const ProductCard = memo(({ product, onSelect, onAdd, featured }: { product: ProductDto, onSelect: any, onAdd: (product: ProductDto, qty: number) => void, featured?: boolean }) => {
  const isOutOfStock = product.stockAvailable <= 0;
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const clampQty = (n: number) => Math.max(1, Math.min(product.stockAvailable || 1, n));

  const handleStepper = (e: MouseEvent, delta: number) => {
    e.stopPropagation();
    setQty((q) => clampQty(q + delta));
  };

  const handleAdd = (e: MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    onAdd(product, qty);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1100);
  };

  return (
    <motion.div
      className={`${styles.productCard} ${featured ? styles.productCardFeatured : ""}`}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.45, ease: EASE }}
      onClick={() => onSelect(product)}
      style={{ opacity: isOutOfStock ? 0.6 : 1, filter: isOutOfStock ? "grayscale(100%)" : "none" }}
    >
      <div className={styles.cardImageWrap}>
        <img src={resolveImageUrl(product.imageUrl)} alt={product.productName} className={styles.cardImage} />
        <div className={styles.cardImageOverlay} />
      </div>
      <span className={styles.cardBadge}>
        {product.category.toUpperCase()}
      </span>

      <div className={styles.cardBody}>
        <span className={styles.cardBrand}>{product.brand}</span>
        <h3 className={`${styles.cardName} ${featured ? styles.cardNameFeatured : ""}`}>
          {product.productName}
        </h3>
        <p className={styles.cardSpecs}>{product.unitOfMeasure}</p>
        
        <div className={styles.priceRow}>
          <div>
            <span className={styles.priceLabel}>Price</span>
            <p className={`${styles.cardPrice} ${featured ? styles.cardPriceFeatured : ""}`}>
              {formatCurrency(product.price)}
            </p>
          </div>
          {!isOutOfStock && (
            <div className={styles.qtyStepper} onClick={(e) => e.stopPropagation()}>
              <button type="button" className={styles.qtyBtn} onClick={(e) => handleStepper(e, -1)} aria-label="Decrease quantity">−</button>
              <span className={styles.qtyValue}>{qty}</span>
              <button type="button" className={styles.qtyBtn} onClick={(e) => handleStepper(e, 1)} aria-label="Increase quantity">+</button>
            </div>
          )}
        </div>

        <div className={styles.stockLine}>
          <span 
            className={styles.stockPulse} 
            style={{ 
              background: isOutOfStock ? "#c63c24" : "#2e6b48",
              boxShadow: isOutOfStock ? "none" : "0 0 8px rgba(46, 107, 72, 0.4)"
            }} 
          />
          {isOutOfStock ? "Out of Stock" : `${product.stockAvailable} units ready`}
        </div>

        <button
          type="button"
          className={`${styles.addToCartBtn} ${justAdded ? styles.addToCartBtnAdded : ""}`}
          onClick={handleAdd}
          disabled={isOutOfStock}
        >
          <IconBag />
          {isOutOfStock ? "Sold Out" : justAdded ? "Added ✓" : "Add to Cart"}
        </button>
      </div>
    </motion.div>
  );
});
ProductCard.displayName = "ProductCard";

export const HomePage = () => {
  const [inventory, setInventory] = useState<ProductDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);

  const [activeTab, setActiveTab] = useState<string>("catalog");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchCategory, setSearchCategory] = useState<string>("");

  const { addToCart } = useCart();

  const handleAddToCart = (product: ProductDto, qty: number) => {
    addToCart({
      id: product.id,
      brand: product.brand,
      name: product.productName,
      unitOfMeasure: product.unitOfMeasure,
      price: product.price,
      imageUrl: product.imageUrl,
    }, qty, product.stockAvailable);
  };

  const { scrollY } = useScroll();
  const topTextY = useTransform(scrollY, [0, 400], [0, -35]);
  const topTextOpacity = useTransform(scrollY, [0, 250], [1, 0.05]);

  useEffect(() => {
    api.get("/inventory")
      .then((data) => setInventory(data))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentSlide((i) => (i + 1) % MockAssets.heroSlides.length), 6000);
    return () => clearInterval(interval);
  }, []);

  const derivedCategories = useMemo(() => {
    const map = new Map<string, { name: string, count: number, image: string }>();
    inventory.forEach(p => {
      if (!map.has(p.category)) {
        map.set(p.category, { name: p.category, count: 1, image: p.imageUrl });
      } else {
        map.get(p.category)!.count += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [inventory]);

  const handleCategoryClick = (categoryName: string) => {
    setSearchCategory(categoryName);
    setActiveTab("catalog");
    setIsSearchOpen(true);
  };

  const slides = MockAssets.heroSlides;
  const slide = slides[currentSlide];

  return (
    <div className={styles.masterWrapper}>
      {/* Navbar now receives isHiddenOnMobile={isSearchOpen} to completely vanish when search is active */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onCartClick={() => setIsCartOpen(true)} 
        isHiddenOnMobile={isSearchOpen}
      />

      <AnimatePresence mode="wait">
        {activeTab === "catalog" && (
          <motion.div key="catalog" {...pageSlidePhysics} style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column", zIndex: 1 }}>
            
            <motion.main
              className={styles.mainContent}
              animate={{ background: `radial-gradient(ellipse 120% 70% at 85% 0%, ${slide.accent}14 0%, transparent 60%)` }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <div className={styles.superstoreHero}>
                <motion.div className={styles.heroContent} style={{ y: topTextY, opacity: topTextOpacity }}>
                  <AnimatePresence mode="wait">
                    <motion.div key={`eyebrow-${currentSlide}`} className={styles.heroPill} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.3 }}>
                      <span className={styles.pillDot} style={{ background: slide.accent }} />
                      <span>{slide.eyebrow}: {slide.label}</span>
                    </motion.div>
                  </AnimatePresence>

                  <h1 className={styles.heroHeadline}>
                    Your neighborhood <br />
                    <span className={styles.heroHighlightWrap}>
                      <span className={styles.heroHighlightMark} style={{ background: slide.accent }} />
                      <em className={styles.heroHighlight}>Supermarket,</em>
                    </span> <br />
                    delivered fast.
                  </h1>

                  <p className={styles.heroSubtext}>{slide.tagline}</p>

                  <div className={styles.heroCtaGroup}>
                    <motion.button className={styles.primaryAction} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={SPRING} onClick={() => document.getElementById("catalog-grid")?.scrollIntoView({ behavior: "smooth" })}>
                      <IconBag /> <span>Explore Aisles</span>
                    </motion.button>
                  </div>

                  <div className={styles.categoryPillsRow}>
                    {derivedCategories.slice(0, 3).map(cat => (
                      <button key={cat.name} className={styles.quickCatPill} onClick={() => handleCategoryClick(cat.name)}>
                        <span>{cat.name}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                      </button>
                    ))}
                  </div>
                </motion.div>

                <div className={styles.heroVisualPanel}>
                  <div className={styles.halftoneRing} style={{ borderColor: slide.accent, ['--dot-color' as any]: slide.accent }} />
                  <div className={styles.marketBannerStage}>
                    <AnimatePresence mode="wait">
                      <motion.div key={`banner-${slide.label}`} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.5, ease: EASE }} className={styles.bannerCard}>
                        <img src={slide.url} alt={slide.label} className={styles.bannerImage} />
                        <div className={styles.bannerOverlay} />
                        <div className={styles.bannerTextContent}>
                          <span className={styles.bannerTag}>{slide.label}</span>
                          <h4>Fresh stocks updated live</h4>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                    <div className={styles.heroSticker}>
                      <div className={styles.heroStickerInner}>
                        <span className={styles.heroStickerTop}>Today</span>
                        <span className={styles.heroStickerBig}>Fresh</span>
                        <span className={styles.heroStickerBottom}>Picks</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.main>

            <div className={styles.receiptTicker}>
              <div className={styles.tickerTrack}>
                {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                  <span key={i} className={styles.tickerItem}>
                    <span className={styles.tickerStar}>★</span> {item}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.stickySearchContainer}>
              <div className={styles.searchInner}>
                <Search inventory={inventory} onSelectProduct={setSelectedProduct} onAddToCart={handleAddToCart} isOpen={isSearchOpen} setIsOpen={setIsSearchOpen} query={searchQuery} setQuery={setSearchQuery} category={searchCategory} setCategory={setSearchCategory} />
              </div>
            </div>

            <section id="catalog-grid" className={styles.productSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Featured Aisles</h2>
                <p className={styles.sectionSub}>Top-tier groceries, household utilities, and electronics.</p>
              </div>
              <div className={styles.bentoGrid}>
                {isLoading ? ( <div className={styles.emptyState}>Syncing warehouse inventory...</div> ) 
                  : inventory.length === 0 ? ( <div className={styles.emptyState}>Shelves are currently empty. Check back soon.</div> ) 
                  : inventory.map((product, i) => <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} onAdd={handleAddToCart} featured={i === 0 || i === 4} />)}
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === "aisles" && (
          <motion.div key="aisles" {...pageSlidePhysics} style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column", zIndex: 1 }}>
            <section className={styles.productSection} style={{ minHeight: "85vh", paddingTop: "140px", paddingBottom: "100px" }}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Shop by Department</h2>
                <p className={styles.sectionSub}>Select a department to instantly open filtered inventory.</p>
              </div>

              <div className={styles.bentoGrid}>
                {isLoading ? ( <div className={styles.emptyState}>Syncing warehouse inventory...</div> ) 
                  : derivedCategories.length === 0 ? ( <div className={styles.emptyState}>No departments active in stock.</div> ) 
                  : derivedCategories.map((cat, i) => (
                    <motion.div
                      key={cat.name}
                      className={styles.departmentCard}
                      onClick={() => handleCategoryClick(cat.name)}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.4, ease: EASE }}
                      whileHover={{ y: -6 }}
                    >
                      <div className={styles.deptImageWrap}>
                        <img src={resolveImageUrl(cat.image)} alt={cat.name} className={styles.deptImage} />
                        <div className={styles.deptOverlay} />
                      </div>
                      <div className={styles.deptBody}>
                        <h3 className={styles.deptName}>{cat.name}</h3>
                        <p className={styles.deptCount}>{cat.count} items in stock</p>
                      </div>
                    </motion.div>
                  ))
                }
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === "support" && (
          <motion.div key="support" {...pageSlidePhysics} style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column", zIndex: 1 }}>
            <section className={styles.productSection} style={{ minHeight: "85vh", paddingTop: "140px", paddingBottom: "100px" }}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Customer Support</h2>
                <p className={styles.sectionSub}>Everything you need to know about shopping with us.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '760px', margin: '2.5rem auto 0' }}>
                {[
                  { q: "How fast is delivery?", a: "Orders placed before 2 PM are delivered the same day in our local zones. Standard delivery takes 24 hours." },
                  { q: "Can I return perishable goods?", a: "Fresh produce and perishables must be reported within 2 hours of delivery if there is an issue. Non-perishables can be returned within 7 days." },
                  { q: "Do you offer wholesale pricing?", a: "Yes, for bulk purchases on specific items, wholesale discounts are automatically applied in your cart when you reach the threshold quantity." },
                ].map((faq, i) => (
                  <motion.div key={i} className={`${styles.glassPanel} ${styles.panelPad}`} style={{ cursor: 'pointer' }} onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{faq.q}</h4>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '1.2rem', color: 'var(--ink-faint)' }}>{expandedFaq === i ? "−" : "+"}</span>
                    </div>
                    {expandedFaq === i && <p style={{ marginTop: '1rem', marginBottom: 0, color: 'var(--ink-soft)', lineHeight: 1.6, fontSize: '0.95rem' }}>{faq.a}</p>}
                  </motion.div>
                ))}
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === "about" && (
          <motion.div key="about" {...pageSlidePhysics} style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column", zIndex: 1 }}>
            <section className={styles.productSection} style={{ minHeight: "85vh", paddingTop: "140px", paddingBottom: "100px" }}>
              <div className={styles.subpageHeader}>
                <h2 className={styles.sectionTitle}>THE SUPERSTORE</h2>
                <div className={`${styles.glassPanel} ${styles.panelPadLg}`}>
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: 'var(--ink-soft)', margin: 0 }}>
                    We bring the aisles to your screen. Offering everything from fresh farm produce to home electronics, our system tracks live warehouse stock to ensure you get exactly what you order, exactly when you need it.
                  </p>
                </div>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{selectedProduct && <ProductOverlay product={selectedProduct} onClose={() => setSelectedProduct(null)} />}</AnimatePresence>
      <CartFlyout isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onCheckout={() => setIsCheckoutOpen(true)} />
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />

      <footer className={styles.footer}>
        <a href="mailto:emberztech@gmail.com" className={styles.footerLink}>
          Engineered and powered by Emberz Technology &copy; 2026
        </a>
      </footer>
    </div>
  );
};