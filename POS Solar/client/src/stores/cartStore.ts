import { create } from 'zustand';
import { Product, ProductVariant } from '../types';

export interface CartItem {
  product: Product;
  variant?: ProductVariant | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  serial_numbers: string[];
}

interface CartState {
  items: CartItem[];
  customer_id: string;
  dealer_id: string;
  warehouse_id: string;
  discount: number;
  tax: number;
  installation_charges: number;
  transport_charges: number;
  paid_amount: number;
  payment_method: string;
  system_capacity_kw: number;
  notes: string;

  addItem: (product: Product, variant?: ProductVariant | null, qty?: number) => void;
  removeItem: (productId: string, variantId?: string | null) => void;
  updateQuantity: (productId: string, variantId: string | null | undefined, qty: number) => void;
  updateUnitPrice: (productId: string, variantId: string | null | undefined, price: number) => void;
  addSerialNumber: (productId: string, variantId: string | null | undefined, sn: string) => void;
  removeSerialNumber: (productId: string, variantId: string | null | undefined, sn: string) => void;
  setCustomerId: (id: string) => void;
  setDealerId: (id: string) => void;
  setWarehouseId: (id: string) => void;
  setDiscount: (val: number) => void;
  setTax: (val: number) => void;
  setInstallationCharges: (val: number) => void;
  setTransportCharges: (val: number) => void;
  setPaidAmount: (val: number) => void;
  setPaymentMethod: (method: string) => void;
  setSystemCapacityKw: (kw: number) => void;
  setNotes: (notes: string) => void;
  resetCart: () => void;

  getSubtotal: () => number;
  getGrandTotal: () => number;
  getBalanceDue: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer_id: '',
  dealer_id: '',
  warehouse_id: '',
  discount: 0,
  tax: 0,
  installation_charges: 0,
  transport_charges: 0,
  paid_amount: 0,
  payment_method: 'CASH',
  system_capacity_kw: 0,
  notes: '',

  addItem: (product, variant, qty = 1) => {
    set((state) => {
      const existingIdx = state.items.findIndex(
        (i) => i.product.id === product.id && i.variant?.id === variant?.id
      );

      const price = variant?.sale_price || product.sale_price || 0;

      if (existingIdx > -1) {
        const updated = [...state.items];
        const newQty = updated[existingIdx].quantity + qty;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          total_price: newQty * updated[existingIdx].unit_price,
        };
        return { items: updated };
      }

      const newItem: CartItem = {
        product,
        variant,
        quantity: qty,
        unit_price: price,
        total_price: price * qty,
        serial_numbers: [],
      };
      return { items: [...state.items, newItem] };
    });
  },

  removeItem: (productId, variantId) => {
    set((state) => ({
      items: state.items.filter(
        (i) => !(i.product.id === productId && i.variant?.id === variantId)
      ),
    }));
  },

  updateQuantity: (productId, variantId, qty) => {
    set((state) => ({
      items: state.items.map((i) => {
        if (i.product.id === productId && i.variant?.id === variantId) {
          const safeQty = Math.max(1, qty);
          return {
            ...i,
            quantity: safeQty,
            total_price: safeQty * i.unit_price,
          };
        }
        return i;
      }),
    }));
  },

  updateUnitPrice: (productId, variantId, price) => {
    set((state) => ({
      items: state.items.map((i) => {
        if (i.product.id === productId && i.variant?.id === variantId) {
          return {
            ...i,
            unit_price: price,
            total_price: price * i.quantity,
          };
        }
        return i;
      }),
    }));
  },

  addSerialNumber: (productId, variantId, sn) => {
    set((state) => ({
      items: state.items.map((i) => {
        if (i.product.id === productId && i.variant?.id === variantId) {
          if (!i.serial_numbers.includes(sn)) {
            return { ...i, serial_numbers: [...i.serial_numbers, sn] };
          }
        }
        return i;
      }),
    }));
  },

  removeSerialNumber: (productId, variantId, sn) => {
    set((state) => ({
      items: state.items.map((i) => {
        if (i.product.id === productId && i.variant?.id === variantId) {
          return { ...i, serial_numbers: i.serial_numbers.filter((s) => s !== sn) };
        }
        return i;
      }),
    }));
  },

  setCustomerId: (id) => set({ customer_id: id }),
  setDealerId: (id) => set({ dealer_id: id }),
  setWarehouseId: (id) => set({ warehouse_id: id }),
  setDiscount: (discount) => set({ discount }),
  setTax: (tax) => set({ tax }),
  setInstallationCharges: (installation_charges) => set({ installation_charges }),
  setTransportCharges: (transport_charges) => set({ transport_charges }),
  setPaidAmount: (paid_amount) => set({ paid_amount }),
  setPaymentMethod: (payment_method) => set({ payment_method }),
  setSystemCapacityKw: (system_capacity_kw) => set({ system_capacity_kw }),
  setNotes: (notes) => set({ notes }),

  resetCart: () =>
    set({
      items: [],
      customer_id: '',
      dealer_id: '',
      discount: 0,
      tax: 0,
      installation_charges: 0,
      transport_charges: 0,
      paid_amount: 0,
      system_capacity_kw: 0,
      notes: '',
    }),

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.total_price, 0);
  },

  getGrandTotal: () => {
    const sub = get().getSubtotal();
    return sub - get().discount + get().tax + get().installation_charges + get().transport_charges;
  },

  getBalanceDue: () => {
    const grand = get().getGrandTotal();
    return Math.max(0, grand - get().paid_amount);
  },
}));