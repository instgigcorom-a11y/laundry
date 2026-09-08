import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";

export const CartContext = createContext(null);

function readCart(key) {
  try { return key ? JSON.parse(localStorage.getItem(key) || "[]") : []; }
  catch { return []; }
}

export function CartProvider({ children }) {
  const { user } = useContext(AuthContext);
  const storageKey = user?.id ? `ppl_cart:${user.id}` : null;
  const [items, setItems] = useState([]);

  useEffect(() => { setItems(readCart(storageKey)); }, [storageKey]);
  function save(next) { if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next)); return next; }
  function add(product) {
    setItems((current) => save(current.some((item) => item.productId === product.id)
      ? current.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...current, { productId: product.id, name: product.name, service: product.service || product.description, categoryLabel: product.categoryLabel, price: product.price, unit: product.unit, quantity: 1 }]));
  }
  function change(productId, quantity) {
    setItems((current) => save(quantity < 1
      ? current.filter((item) => item.productId !== productId)
      : current.map((item) => item.productId === productId ? { ...item, quantity } : item)));
  }
  function clear() { setItems(() => save([])); }
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return <CartContext.Provider value={{ items, add, change, clear, total, itemCount }}>{children}</CartContext.Provider>;
}
