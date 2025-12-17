'use client';

import { usePosStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Minus } from 'lucide-react';

export default function Cart() {
    const cart = usePosStore((state) => state.cart);
    const removeFromCart = usePosStore((state) => state.removeFromCart);
    const updateQty = usePosStore((state) => state.updateQty);

    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    if (cart.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <p>No items in cart</p>
            </div>
        );
    }

    return (

        <div className="flex-1 overflow-auto p-4 space-y-4">
            {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-border pb-4 last:border-0 hover:bg-white/5 p-2 rounded-lg transition-colors group">
                    <div className="flex-1">
                        <div className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">{item.name}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-1">
                            @ IDR {item.price.toLocaleString('id-ID')}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground"
                            onClick={() => updateQty(item.id, -1)}
                        >
                            <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-mono text-sm font-bold text-foreground">{item.qty}</span>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground"
                            onClick={() => updateQty(item.id, 1)}
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-1"
                            onClick={() => removeFromCart(item.id)}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            ))}
            <div className="pt-4 mt-auto border-t border-dashed border-border text-right space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Subtotal</div>
                <div className="text-xl font-bold font-mono text-primary tracking-tight">IDR {totalAmount.toLocaleString('id-ID')}</div>
            </div>
            <div className="flex justify-center mt-4">
                <p className="text-[10px] text-muted-foreground text-center">Taxes & fees calculated at checkout</p>
            </div>
        </div>
    );
}
