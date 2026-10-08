import { useState, useMemo, useEffect, memo, type MouseEvent } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { type ProductDto } from '../../pages/HomePage'; 
import styles from './Search.module.css';

interface SearchProps {
  inventory: ProductDto[];
  onSelectProduct: (product: ProductDto) => void;
  onAddToCart: (product: ProductDto, qty: number) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  category: string;
  setCategory: (category: string) => void;
}

// ─── PHYSICS CONFIG ───
const SPRING = { type: "spring" as const, stiffness: 400, damping: 32 };
const EASE = [0.16, 1, 0.3, 1] as const;

// ─── STAGGERED LIST ANIMATIONS ───
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 350, damping: 25 } 
  }
};

// ─── IMAGE URL RESOLVER ───
const resolveImageUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `http://localhost:5149${url}`; 
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(value);
};

const ChevronIcon = () => (
  <svg className={styles.chevronIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

// ─── SINGLE RESULT ROW (owns its own quantity so a stepper can live per-row) ───
const ResultRow = memo(({ item, onOpen, onAdd }: { item: ProductDto, onOpen: (item: ProductDto) => void, onAdd: (item: ProductDto, qty: number) => void }) => {
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const isOutOfStock = item.stockAvailable <= 0;

  const clampQty = (n: number) => Math.max(1, Math.min(item.stockAvailable || 1, n));

  const stepQty = (e: MouseEvent, delta: number) => {
    e.stopPropagation();
    setQty((q) => clampQty(q + delta));
  };

  const handleAdd = (e: MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    onAdd(item, qty);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1100);
  };

  return (
    <motion.div
      variants={itemVariants}
      className={styles.resultCard}
      onMouseDown={() => onOpen(item)}
    >
      <div className={styles.imageBox}>
        <img src={resolveImageUrl(item.imageUrl)} alt={item.productName} />
      </div>
      <div className={styles.resultDetails}>
        <div className={styles.resultTopRow}>
          <span className={styles.resultTitle}>{item.brand} {item.productName}</span>
          <span className={styles.badge}>{item.category}</span>
        </div>

        <div className={styles.resultMetaRow}>
          <span className={styles.resultSpecs}>{item.unitOfMeasure}</span>
          <span className={styles.resultStock} style={{ color: isOutOfStock ? 'var(--red)' : 'var(--ink-faint)' }}>
            {isOutOfStock ? 'Out of Stock' : `${item.stockAvailable} available`}
          </span>
        </div>

        <div className={styles.resultActionRow} onMouseDown={(e) => e.stopPropagation()}>
          <span className={styles.resultPrice}>{formatCurrency(item.price)}</span>

          <div className={styles.quickAddZone}>
            {!isOutOfStock && (
              <div className={styles.qtyStepper}>
                <button type="button" className={styles.qtyBtn} onClick={(e) => stepQty(e, -1)} aria-label="Decrease quantity">−</button>
                <span className={styles.qtyValue}>{qty}</span>
                <button type="button" className={styles.qtyBtn} onClick={(e) => stepQty(e, 1)} aria-label="Increase quantity">+</button>
              </div>
            )}
            <button type="button" className={`${styles.addBtn} ${justAdded ? styles.addBtnAdded : ""}`} onClick={handleAdd} disabled={isOutOfStock}>
              {isOutOfStock ? "Sold Out" : justAdded ? "Added ✓" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
ResultRow.displayName = "ResultRow";

export const Search = ({ inventory, onSelectProduct, onAddToCart, isOpen, setIsOpen, query, setQuery, category, setCategory }: SearchProps) => {
  const [activeBrand, setActiveBrand] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const uniqueCategories = Array.from(new Set(inventory.map(i => i.category)));
  const uniqueBrands = Array.from(new Set(
    inventory.filter(i => !category || i.category === category).map(i => i.brand)
  ));

  // ─── SMART SEARCH & FILTER ALGORITHM ───
  const results = useMemo(() => {
    let filtered = inventory;

    // 1. Text Search
    if (query.trim()) {
      const lowerQuery = query.toLowerCase().trim();
      const searchTerms = lowerQuery.split(/\s+/).filter(Boolean);

      let scoredItems = filtered.map(item => {
        const combinedString = `${item.brand} ${item.productName} ${item.category}`.toLowerCase();
        const exactMatch = combinedString.includes(lowerQuery);

        const combinedTokens = combinedString.split(/\s+/);
        let matchCount = 0;
        searchTerms.forEach(term => {
          if (combinedTokens.some(ct => ct.includes(term))) matchCount++;
        });

        return { item, exactMatch, matchCount };
      });

      scoredItems = scoredItems.filter(data => {
        if (data.exactMatch) return true;
        const requiredMatches = searchTerms.length <= 2 ? searchTerms.length : Math.ceil(searchTerms.length * 0.6);
        return data.matchCount >= requiredMatches;
      });

      scoredItems.sort((a, b) => {
        if (a.exactMatch && !b.exactMatch) return -1;
        if (!a.exactMatch && b.exactMatch) return 1;
        return b.matchCount - a.matchCount;
      });

      filtered = scoredItems.map(data => data.item);
    }

    // 2. Dropdown Filters
    if (category) filtered = filtered.filter(i => i.category === category);
    if (activeBrand) filtered = filtered.filter(i => i.brand === activeBrand);
    
    // 3. Price Filters
    const min = parseFloat(minPrice);
    if (!isNaN(min)) filtered = filtered.filter(i => i.price >= min);
    
    const max = parseFloat(maxPrice);
    if (!isNaN(max)) filtered = filtered.filter(i => i.price <= max);

    return filtered.slice(0, 10);
  }, [query, inventory, category, activeBrand, minPrice, maxPrice]);

  const handleOpen = (item: ProductDto) => {
    onSelectProduct(item);
    setIsOpen(false);
  };

  const clearAll = () => {
    setQuery(''); setCategory(''); setActiveBrand(''); setMinPrice(''); setMaxPrice('');
  };

  return (
    <>
      <div className={styles.triggerWrapper} onClick={() => setIsOpen(true)}>
        <div className={styles.triggerInput}>
          <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span className={styles.triggerPlaceholder}>
            {category ? `Search in ${category}...` : "Search groceries, essentials, brands..."}
          </span>
          {category && <span className={styles.triggerCategoryTag}>{category}</span>}
          <div className={styles.kbdShortcut}>⌘ K</div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className={styles.modalOverlay}>
            <motion.div 
              className={styles.backdropBlur}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div 
              className={styles.liquidPalette}
              style={{ transformOrigin: "top center" }}
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={SPRING}
            >
              <div className={styles.paletteHeader}>
                <svg className={styles.activeSearchIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input 
                  autoFocus
                  className={styles.paletteInput} 
                  placeholder={category ? `Search in ${category}...` : "What are you looking for?"}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                
                <button className={styles.closeButton} onClick={() => setIsOpen(false)}>
                  <span className={styles.escText}>ESC</span>
                  <svg className={styles.closeIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className={styles.filtersContainer}>
                <div className={styles.selectWrapper}>
                  <select className={styles.filterSelect} value={category} onChange={e => {setCategory(e.target.value); setActiveBrand('');}}>
                    <option value="">All Categories</option>
                    {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <ChevronIcon />
                </div>

                <div className={styles.selectWrapper}>
                  <select className={styles.filterSelect} value={activeBrand} onChange={e => setActiveBrand(e.target.value)} disabled={!uniqueBrands.length}>
                    <option value="">All Brands</option>
                    {uniqueBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                  </select>
                  <ChevronIcon />
                </div>

                <div className={styles.filterDivider} />

                <div className={styles.priceFilterGroup}>
                  <span className={styles.currencySymbol}>₦</span>
                  <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} className={styles.priceInput} />
                  <span className={styles.priceSeparator}>-</span>
                  <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className={styles.priceInput} />
                </div>

                {(category || activeBrand || minPrice || maxPrice) && (
                  <button className={styles.filterClearBtn} onClick={clearAll}>Clear</button>
                )}
              </div>

              <div className={styles.resultsArea}>
                {results.length > 0 ? (
                  <motion.div className={styles.resultsGrid} variants={containerVariants} initial="hidden" animate="show">
                    {results.map(item => (
                      <ResultRow key={item.id} item={item} onOpen={handleOpen} onAdd={onAddToCart} />
                    ))}
                  </motion.div>
                ) : (
                   <div className={styles.emptyState}>
                     <p className={styles.emptyText}>No matching items found in stock.</p>
                     <button className={styles.clearBtn} onClick={clearAll}>Clear all filters</button>
                   </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};