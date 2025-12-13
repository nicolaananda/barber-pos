import {
    // redirect
} from 'next/navigation';
// Note: We are creating a new dashboard home here, so we remove the redirect
// import { getServerSession } from 'next-auth'; 
// import { authOptions } from '@/lib/auth'; // Not strictly needed if layout handles it, but good for data fetch
import { DashboardHome } from '@/components/dashboard/DashboardHome';

export default function DashboardPage() {
    return <DashboardHome />;
}
