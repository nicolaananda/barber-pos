import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from '@/lib/api';

interface User {
    id: string;
    name: string;
    username: string;
    role: string;
    availability?: string; // 'idle' | 'busy'
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isLoading: boolean;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUserFromAPI = async (authToken: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
            } else {
                // Token invalid, clear auth
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
            }
        } catch (error) {
            console.error('Failed to fetch user', error);
        }
    };

    useEffect(() => {
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

    const login = async (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        // Fetch fresh user data from API
        await fetchUserFromAPI(newToken);
    };

    const logout = () => {
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

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
