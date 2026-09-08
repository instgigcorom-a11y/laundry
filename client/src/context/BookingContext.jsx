import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";

export const BookingContext = createContext(null);
const blankBooking = { mode: "pickup", dateLabel: "", slot: "", readyBy: "", address: null, paidVia: "Cash" };

function readBooking(key) {
  try { return key ? { ...blankBooking, ...JSON.parse(localStorage.getItem(key) || "{}") } : blankBooking; }
  catch { return blankBooking; }
}

export function BookingProvider({ children }) {
  const { user } = useContext(AuthContext);
  const storageKey = user?.id ? `ppl_booking:${user.id}` : null;
  const [booking, setBooking] = useState(blankBooking);

  useEffect(() => { setBooking(readBooking(storageKey)); }, [storageKey]);
  useEffect(() => { if (storageKey) localStorage.setItem(storageKey, JSON.stringify(booking)); }, [booking, storageKey]);
  function update(next) { setBooking((current) => ({ ...current, ...next })); }
  function reset() { setBooking(blankBooking); }
  return <BookingContext.Provider value={{ booking, update, reset }}>{children}</BookingContext.Provider>;
}
