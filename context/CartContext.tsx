'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from 'react';
import { Product } from '@/types/product';
// ─── Tipi ────────────────────────────────────────────────────────────────────

export interface CartItem {
  product: Omit<Product, 'url'>; // Mai includere url nel carrello client
  quantity: number;
  finalPrice: number; // price * 1.20
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

type Action =
  | { type: 'ADD'; product: Product }
  | { type: 'REMOVE'; key: string }
  | { type: 'SET_QTY'; key: string; qty: number }
  | { type: 'CLEAR' }
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'HYDRATE'; items: CartItem[] };

// ─── Helpers ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function itemKey(p: any): string {
  return p.id ?? p.title ?? '';
}

function calcFinalPrice(price?: string, value?: string): number {
  // price nel DB è già finale (markup + flat fee applicati in import)
  const n = parseFloat(price ?? value ?? '');
  return isNaN(n) ? 0 : n;
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case 'ADD': {
      const key = itemKey(action.product);
      const idx = state.items.findIndex((i) => itemKey(i.product) === key);
      const finalPrice = calcFinalPrice(String(action.product.price ?? ''), (action.product as Record<string, unknown>).value as string | undefined);
      if (idx >= 0) {
        const items = [...state.items];
        items[idx] = { ...items[idx], quantity: items[idx].quantity + 1 };
        return { ...state, items };
      }
      // Rimuove url prima di inserire nel carrello
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { url: _url, ...safe } = action.product;
      return {
        ...state,
        items: [...state.items, { product: safe, quantity: 1, finalPrice }],
      };
    }
    case 'REMOVE':
      return {
        ...state,
        items: state.items.filter((i) => itemKey(i.product) !== action.key),
      };
    case 'SET_QTY': {
      if (action.qty <= 0)
        return {
          ...state,
          items: state.items.filter((i) => itemKey(i.product) !== action.key),
        };
      return {
        ...state,
        items: state.items.map((i) =>
          itemKey(i.product) === action.key ? { ...i, quantity: action.qty } : i
        ),
      };
    }
    case 'CLEAR':
      return { ...state, items: [] };
    case 'OPEN':
      return { ...state, isOpen: true };
    case 'CLOSE':
      return { ...state, isOpen: false };
    case 'HYDRATE':
      return { ...state, items: action.items };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  totalItems: number;
  totalPrice: number;
  addItem: (product: Product) => void;
  removeItem: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartCtx = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], isOpen: false });

  // Idrata da localStorage dopo il mount (evita hydration mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('kitwer_cart');
      if (raw) dispatch({ type: 'HYDRATE', items: JSON.parse(raw) });
    } catch {}
  }, []);

  // Persiste ogni modifica
  useEffect(() => {
    try {
      localStorage.setItem('kitwer_cart', JSON.stringify(state.items));
    } catch {}
  }, [state.items]);

  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = state.items.reduce(
    (s, i) => s + i.finalPrice * i.quantity,
    0
  );

  return (
    <CartCtx.Provider
      value={{
        items: state.items,
        isOpen: state.isOpen,
        totalItems,
        totalPrice,
        addItem: (p) => dispatch({ type: 'ADD', product: p }),
        removeItem: (key) => dispatch({ type: 'REMOVE', key }),
        setQty: (key, qty) => dispatch({ type: 'SET_QTY', key, qty }),
        clearCart: () => dispatch({ type: 'CLEAR' }),
        openCart: () => dispatch({ type: 'OPEN' }),
        closeCart: () => dispatch({ type: 'CLOSE' }),
      }}
    >
      {children}
    </CartCtx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart deve essere usato dentro CartProvider');
  return ctx;
}
