import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
    name: string;
    phone: string; // Unique identifier
    totalVisits: number;
    lastVisit: Date;
    createdAt: Date;
    updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
    {
        name: { type: String, required: true },
        phone: { type: String, required: true, unique: true },
        totalVisits: { type: Number, default: 0 },
        lastVisit: { type: Date },
    },
    { timestamps: true }
);

export default mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
