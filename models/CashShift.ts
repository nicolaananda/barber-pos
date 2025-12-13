import mongoose, { Schema, Model, models } from 'mongoose';
import { Types } from 'mongoose';

export type ShiftStatus = 'open' | 'closed';

export interface ICashShift {
    _id: string;
    date: Date;
    openedBy: Types.ObjectId;
    closedBy?: Types.ObjectId;
    openingCash: number;
    closingCash?: number;
    totalSystemRevenue: number;
    totalExpenses: number;
    expectedCash: number;
    discrepancy: number;
    status: ShiftStatus;
    createdAt: Date;
    updatedAt: Date;
}

const CashShiftSchema = new Schema<ICashShift>(
    {
        date: { type: Date, default: Date.now },
        openedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        openingCash: { type: Number, required: true },
        closingCash: { type: Number },
        totalSystemRevenue: { type: Number, default: 0 },
        totalExpenses: { type: Number, default: 0 },
        expectedCash: { type: Number, default: 0 },
        discrepancy: { type: Number, default: 0 },
        status: { type: String, enum: ['open', 'closed'], default: 'open' },
    },
    { timestamps: true }
);

const CashShift: Model<ICashShift> = models.CashShift || mongoose.model<ICashShift>('CashShift', CashShiftSchema);

export default CashShift;
