import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
    id: string; // Service ID
    name: string;
    price: number;
    qty: number;
}

export interface PosState {
    selectedBarber: { id: string; name: string } | null;
    cart: CartItem[];
    customerName: string;
    customerPhone: string;
    activeShift: { id: string; status: 'open' | 'closed' } | null;

    setBarber: (barber: { id: string; name: string } | null) => void;
    addToCart: (item: CartItem) => void;
    removeFromCart: (itemId: string) => void;
    updateQty: (itemId: string, delta: number) => void;
    clearCart: () => void;
    setCustomerInfo: (name: string, phone: string) => void;
    setActiveShift: (shift: { id: string; status: 'open' | 'closed' } | null) => void;
}

export const usePosStore = create<PosState>()(
    persist(
        (set) => ({
            selectedBarber: null,
            cart: [],
            customerName: '',
            customerPhone: '',
            activeShift: null,

            setBarber: (barber) => set({ selectedBarber: barber }),

            addToCart: (item) =>
                set((state) => {
                    const existing = state.cart.find((i) => i.id === item.id);
                    if (existing) {
                        return {
                            cart: state.cart.map((i) =>
                                i.id === item.id ? { ...i, qty: i.qty + 1 } : i
                            ),
                        };
                    }
                    return { cart: [...state.cart, { ...item, qty: 1 }] };
                }),

            removeFromCart: (itemId) =>
                set((state) => ({ cart: state.cart.filter((i) => i.id !== itemId) })),

            updateQty: (itemId, delta) =>
                set((state) => ({
                    cart: state.cart.map((i) => {
                        if (i.id === itemId) {
                            const newQty = Math.max(1, i.qty + delta);
                            return { ...i, qty: newQty };
                        }
                        return i;
                    }),
                })),

            clearCart: () => set({ cart: [], selectedBarber: null, customerName: '', customerPhone: '' }),

            setCustomerInfo: (name, phone) => set({ customerName: name, customerPhone: phone }),

            setActiveShift: (shift) => set({ activeShift: shift }),
        }),
        {
            name: 'staycool-pos-storage',
        }
    )
);
