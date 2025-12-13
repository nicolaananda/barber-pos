import mongoose, { Schema, Model, models } from 'mongoose';
import { Types } from 'mongoose';

export type PayrollType = 'kasbon' | 'payment';

export interface IPayroll {
    _id: string;
    barberId: Types.ObjectId;
    type: PayrollType;
    amount: number;
    note?: string;
    date: Date;
    createdAt: Date;
    updatedAt: Date;
}

const PayrollSchema = new Schema<IPayroll>(
    {
        barberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        type: { type: String, enum: ['kasbon', 'payment'], required: true },
        amount: { type: Number, required: true },
        note: { type: String },
        date: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

const Payroll: Model<IPayroll> = models.Payroll || mongoose.model<IPayroll>('Payroll', PayrollSchema);

export default Payroll;
