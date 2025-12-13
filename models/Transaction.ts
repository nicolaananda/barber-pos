import mongoose, { Schema, Model, models } from 'mongoose';
import { Types } from 'mongoose';

export type PaymentMethod = 'cash' | 'qris';

export interface ITransactionItem {
    name: string;
    price: number;
    qty: number;
}

export interface ITransaction {
    _id: string;
    invoiceCode: string;
    date: Date;
    customerName?: string;
    customerPhone?: string;
    barberId: Types.ObjectId;
    items: ITransactionItem[];
    totalAmount: number;
    paymentMethod: PaymentMethod;
    shiftId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
    {
        invoiceCode: { type: String, required: true, unique: true },
        date: { type: Date, default: Date.now },
        customerName: { type: String },
        customerPhone: { type: String },
        barberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        items: [
            {
                name: { type: String, required: true },
                price: { type: Number, required: true },
                qty: { type: Number, required: true, default: 1 },
            },
        ],
        totalAmount: { type: Number, required: true },
        paymentMethod: { type: String, enum: ['cash', 'qris'], required: true },
        shiftId: { type: Schema.Types.ObjectId, ref: 'CashShift' },
    },
    { timestamps: true }
);

const Transaction: Model<ITransaction> = models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
