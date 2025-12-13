import mongoose, { Schema, Model, models } from 'mongoose';
import { Types } from 'mongoose';

export type ExpenseCategory = 'operational' | 'salary' | 'supplies';

export interface IExpense {
    _id: string;
    description: string;
    amount: number;
    category: ExpenseCategory;
    date: Date;
    shiftId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
    {
        description: { type: String, required: true },
        amount: { type: Number, required: true },
        category: { type: String, enum: ['operational', 'salary', 'supplies'], required: true },
        date: { type: Date, default: Date.now },
        shiftId: { type: Schema.Types.ObjectId, ref: 'CashShift' },
    },
    { timestamps: true }
);

const Expense: Model<IExpense> = models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);

export default Expense;
