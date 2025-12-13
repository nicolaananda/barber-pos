import { withAuth } from 'next-auth/middleware';

export default withAuth({
    callbacks: {
        authorized: ({ token }) => !!token,
    },
});

export const config = {
    matcher: ['/dashboard/:path*', '/pos/:path*', '/api/transactions/:path*', '/api/shifts/:path*', '/api/expenses/:path*', '/api/payroll/:path*'],
};
