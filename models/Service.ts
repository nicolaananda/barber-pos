import mongoose, { Schema, Model, models } from 'mongoose';

export interface IService {
    _id: string;
    name: string;
    price: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
    {
        name: { type: String, required: true },
        price: { type: Number, required: true, default: 40000 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const Service: Model<IService> = models.Service || mongoose.model<IService>('Service', ServiceSchema);

export default Service;
