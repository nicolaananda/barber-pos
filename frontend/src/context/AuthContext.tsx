import { useState, useEffect, ReactNode } from 'react';
import { apiFetch, installAuthFetchInterceptor } from '@/lib/api';
import { AuthContext, type User } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUserFromAPI = async (authToken: string) => {
        try {
            localStorage.setItem('token', authToken);
            const userData = await apiFetch<User>('/auth/me');
            setUser(userData);
        } catch (error) {
            console.error('Failed to fetch user', error);
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
        }
    };

    useEffect(() => {
        installAuthFetchInterceptor();

        const initAuth = async () => {
            const storedToken = localStorage.getItem('token');

            if (storedToken) {
                setToken(storedToken);
                await fetchUserFromAPI(storedToken);
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    useEffect(() => {
        const clearAuth = () => {
            setToken(null);
            setUser(null);
            localStorage.removeItem('token');
        };

        window.addEventListener('auth-expired', clearAuth);
        return () => window.removeEventListener('auth-expired', clearAuth);
    }, []);

    const login = async (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        // Fetch fresh user data from API
        await fetchUserFromAPI(newToken);
    };

    const logout = async () => {
        // Revoke token server-side before clearing locally
        if (token) {
            try {
                await apiFetch('/auth/logout', { method: 'POST' });
            } catch (error) {
                // Non-blocking: still logout locally even if server call fails
                console.error('Server logout failed:', error);
            }
        }
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
    };

    const refreshUser = async () => {
        if (token) {
            await fetchUserFromAPI(token);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}
