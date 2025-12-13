import mongoose, { Schema, Model, models } from 'mongoose';

export type UserRole = 'owner' | 'staff';
export type UserStatus = 'active' | 'inactive';
export type CommissionType = 'percentage' | 'flat';

export interface IUser {
    _id: string;
    name: string;
    username: string;
    password?: string;
    role: UserRole;
    status: UserStatus;
    commissionType: CommissionType;
    commissionValue: number;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, enum: ['owner', 'staff'], default: 'staff' },
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
        commissionType: { type: String, enum: ['percentage', 'flat'], default: 'percentage' },
        commissionValue: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const User: Model<IUser> = models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
