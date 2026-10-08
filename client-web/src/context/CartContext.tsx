import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react";

// ─── 1. UPDATED CART ITEM (FLAT SKU) ───
export interface CartItem {
  id: string; // The database GUID
  brand: string;
  name: string;
  unitOfMeasure: string; // Replaces storage/color/condition
  price: number;
  imageUrl: string;
  quantity: number;
  maxStock: number; 
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity" | "maxStock">, quantity: number, maxStock: number) => { success: boolean; message: string };
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, newQuantity: number) => void;
  clearCart: () => void; 
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Increased limit because customers often buy groceries in bulk (e.g., 10 tomatoes, 12 packs of noodles)
const MAX_PER_CUSTOMER = 50; 

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("superstore_cart");
    if (!saved) return [];
    
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((item: any) => ({
        ...item,
        quantity: item.quantity || 1,
        maxStock: item.maxStock || 1,
        price: item.price || 0
      }));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("superstore_cart", JSON.stringify(cart));
  }, [cart]);

  // Sync cart across multiple browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "superstore_cart" && e.newValue) {
        setCart(JSON.parse(e.newValue));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // ─── 2. ADD TO CART LOGIC (NO MORE COMPOSITE KEYS) ───
  const addToCart = useCallback((item: Omit<CartItem, "quantity" | "maxStock">, quantity: number, maxStock: number) => {
    // In a supermarket, the database ID is the ultimate source of truth.
    const id = item.id;
    
    let result = { success: false, message: "" };

    setCart((prev) => {
      const existingItemIndex = prev.findIndex((i) => i.id === id);
      const currentCartQty = existingItemIndex >= 0 ? prev[existingItemIndex].quantity : 0;
      
      const absoluteMax = Math.min(maxStock, MAX_PER_CUSTOMER);

      // Stock validation
      if (currentCartQty + quantity > absoluteMax) {
        if (maxStock < MAX_PER_CUSTOMER) {
          result = { success: false, message: `Only ${maxStock} left in stock.` };
        } else {
          result = { success: false, message: `Limit of ${MAX_PER_CUSTOMER} units per customer.` };
        }
        return prev; 
      }

      result = { success: true, message: `Added ${quantity} to bag.` };

      if (existingItemIndex >= 0) {
        const newCart = [...prev];
        newCart[existingItemIndex].quantity += quantity;
        newCart[existingItemIndex].maxStock = maxStock; // Sync latest stock limits
        return newCart;
      }

      return [...prev, { ...item, quantity, maxStock }];
    });

    return result;
  }, []);

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    setCart((prev) => prev.map((item) => {
      if (item.id === id) {
        const validQuantity = Math.max(1, Math.min(newQuantity, Math.min(item.maxStock, MAX_PER_CUSTOMER)));
        return { ...item, quantity: validQuantity };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};