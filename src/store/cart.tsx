import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CatalogueProduct } from "../types/catalogue";

export type CartItem = {
  productId: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  isOpen: boolean;
  add: (product: CatalogueProduct) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
};

const STORAGE_KEY = "thirdrailify-v2-scaffold-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

function readCart(): CartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const candidate = entry as Partial<CartItem>;
        const quantity = Math.min(20, Math.max(1, Number(candidate.quantity) || 1));
        return typeof candidate.productId === "string" && candidate.productId ? { productId: candidate.productId, quantity } : null;
      })
      .filter((entry): entry is CartItem => Boolean(entry));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readCart);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((total, item) => total + item.quantity, 0),
      isOpen,
      add(product) {
        setItems((current) => {
          const existing = current.find((item) => item.productId === product.id);
          if (existing) {
            return current.map((item) =>
              item.productId === product.id ? { ...item, quantity: Math.min(20, item.quantity + 1) } : item,
            );
          }
          return [...current, { productId: product.id, quantity: 1 }];
        });
        setIsOpen(true);
      },
      remove(productId) {
        setItems((current) => current.filter((item) => item.productId !== productId));
      },
      setQuantity(productId, quantity) {
        if (quantity <= 0) {
          setItems((current) => current.filter((item) => item.productId !== productId));
          return;
        }
        setItems((current) =>
          current.map((item) =>
            item.productId === productId ? { ...item, quantity: Math.min(20, Math.max(1, quantity)) } : item,
          ),
        );
      },
      clear: () => setItems([]),
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [isOpen, items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// The provider and its consumer hook intentionally share this small module.
// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
