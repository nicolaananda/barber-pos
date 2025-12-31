import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Login failed');
                return;
            }

            login(data.token, data.user);
            login(data.token, data.user);

            if (data.user.role === 'owner') {
                navigate('/dashboard');
            } else {
                navigate('/pos');
            }
        } catch (err) {
            console.error(err);
            setError('Something went wrong. Please try again.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-zinc-50 selection:bg-zinc-200">
            <Card className="w-full max-w-md border-zinc-200 shadow-xl shadow-zinc-200/50 bg-white">
                <CardHeader>
                    <div className="flex justify-center mb-6">
                        <img
                            src="/logo.jpg"
                            alt="Staycool Logo"
                            className="w-24 h-24 rounded-full object-cover shadow-sm border border-zinc-200 grayscale hover:grayscale-0 transition-all duration-500"
                        />
                    </div>
                    <CardTitle className="text-2xl text-center text-zinc-900 tracking-tight uppercase font-black">
                        Staycool <span className="font-light">Hairlab</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-zinc-700 font-bold uppercase text-xs tracking-wider">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e: any) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                className="bg-zinc-50 border-zinc-200 focus:ring-zinc-900 focus:border-zinc-900"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-zinc-700 font-bold uppercase text-xs tracking-wider">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e: any) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="bg-zinc-50 border-zinc-200 focus:ring-zinc-900 focus:border-zinc-900"
                                required
                            />
                        </div>
                        {error && <p className="text-red-600 text-sm font-medium bg-red-50 p-2 rounded border border-red-100">{error}</p>}
                        <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold tracking-wide h-11">
                            Sign In
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center text-xs text-zinc-400 uppercase tracking-widest">
                    Management System
                </CardFooter>
            </Card>
        </div>
    );
}
