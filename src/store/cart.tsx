import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CatalogueProduct, CatalogueVariant } from "../types/catalogue";

export type CartItem = {
  productId: string;
  variantId: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  isOpen: boolean;
  add: (product: CatalogueProduct, variant: CatalogueVariant, quantity?: number) => void;
  remove: (productId: string, variantId: string) => void;
  setQuantity: (productId: string, variantId: string, quantity: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
};

export const STORAGE_KEY = "thirdrailify-commerce-cart-v2";
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
        return typeof candidate.productId === "string" && candidate.productId && typeof candidate.variantId === "string" && candidate.variantId ? { productId: candidate.productId, variantId: candidate.variantId, quantity } : null;
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
      add(product, variant, quantity = 1) {
        setItems((current) => {
          const existing = current.find((item) => item.productId === product.id && item.variantId === variant.id);
          if (existing) {
            return current.map((item) =>
              item.productId === product.id && item.variantId === variant.id ? { ...item, quantity: Math.min(product.maxQuantity || 20, item.quantity + quantity) } : item,
            );
          }
          return [...current, { productId: product.id, variantId: variant.id, quantity: Math.min(product.maxQuantity || 20, Math.max(1, quantity)) }];
        });
        setIsOpen(true);
      },
      remove(productId, variantId) {
        setItems((current) => current.filter((item) => item.productId !== productId || item.variantId !== variantId));
      },
      setQuantity(productId, variantId, quantity) {
        if (quantity <= 0) {
          setItems((current) => current.filter((item) => item.productId !== productId || item.variantId !== variantId));
          return;
        }
        setItems((current) =>
          current.map((item) =>
            item.productId === productId && item.variantId === variantId ? { ...item, quantity: Math.min(20, Math.max(1, quantity)) } : item,
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
