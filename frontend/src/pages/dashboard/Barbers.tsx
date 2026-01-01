import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Plus,
    Pencil,
    Trash2,
    Users,
    Loader2,
    Search,
    UserPlus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';

interface Barber {
    id: number;
    username: string;
    name: string;
    role: string;
    status: string;
    availability: string;

    createdAt: string;
    updatedAt: string;
}

export default function BarbersPage() {
    const { user } = useAuth();
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [currentId, setCurrentId] = useState<number | null>(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const [status, setStatus] = useState('active');

    useEffect(() => {
        if (user?.role === 'owner') {
            fetchBarbers();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchBarbers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users/barbers-list', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Failed to fetch barbers' }));
                console.error('Fetch barbers error:', res.status, errorData);
                throw new Error(errorData.error || 'Failed to fetch barbers');
            }
            const data = await res.json();
            console.log('Fetched barbers:', data);
            setBarbers(data || []);
        } catch (error) {
            console.error('Error fetching barbers:', error);
            alert(`Error: ${error instanceof Error ? error.message : 'Failed to fetch barbers'}`);
            setBarbers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Validate inputs
            if (!username.trim()) {
                alert('Username is required');
                return;
            }
            if (!name.trim()) {
                alert('Name is required');
                return;
            }
            if (!currentId && !password.trim()) {
                alert('Password is required');
                return;
            }

            const token = localStorage.getItem('token');
            const method = currentId ? 'PUT' : 'POST';
            const url = currentId ? `/api/users/barbers/${currentId}` : '/api/users/barbers';

            const body: any = {
                username: username.trim(),
                name: name.trim(),
                status: status || 'active'
            };

            // Only include password if it's a new user or if password is provided for update
            if (!currentId) {
                if (!password.trim()) {
                    alert('Password is required');
                    return;
                }
                body.password = password;
            } else if (password.trim()) {
                body.password = password;
            }

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Failed to save barber' }));
                const errorMessage = errorData.error || errorData.details || 'Failed to save barber';
                alert(`Error: ${errorMessage}`);
                return;
            }

            await fetchBarbers();
            handleClose();
        } catch (error) {
            console.error('Error saving barber:', error);
            alert(`Failed to save barber: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this barber?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/users/barbers/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const error = await res.json();
                alert(error.error || 'Failed to delete barber');
                return;
            }

            await fetchBarbers();
        } catch (error) {
            console.error(error);
            alert('Failed to delete barber');
        }
    };

    const handleEdit = (barber: Barber) => {
        setCurrentId(barber.id);
        setUsername(barber.username);
        setPassword('');
        setName(barber.name);
        setStatus(barber.status);
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setCurrentId(null);
        setUsername('');
        setPassword('');
        setName('');
        setStatus('active');
        setIsDialogOpen(true);
    };

    const handleClose = () => {
        setIsDialogOpen(false);
        setCurrentId(null);
        setUsername('');
        setPassword('');
        setName('');
        setStatus('active');
    };

    const filteredBarbers = barbers.filter(barber =>
        barber.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        barber.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (user?.role !== 'owner') {
        return (
            <div className="p-6 md:p-8 flex items-center justify-center min-h-[400px]">
                <Card className="max-w-md">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
                            <p className="text-muted-foreground">
                                Only owners can access this page.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Barber Management</h1>
                    <p className="text-muted-foreground">Add, edit, or remove barbers from your team.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleAdd} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add Barber
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>{currentId ? 'Edit Barber' : 'Add New Barber'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">Username *</Label>
                                <Input
                                    id="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    disabled={!!currentId}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">
                                    Password {currentId ? '(leave empty to keep current)' : '*'}
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required={!currentId}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={handleClose}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    {currentId ? 'Update' : 'Create'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                        placeholder="Search barbers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            <Card className="border-zinc-200 shadow-sm bg-white">
                <CardHeader>
                    <CardTitle className="text-zinc-900 font-bold">Barbers</CardTitle>
                    <CardDescription className="text-zinc-500">
                        Manage your barber team and their commission settings
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="animate-spin text-zinc-900" />
                        </div>
                    ) : barbers.length === 0 ? (
                        <div className="text-center p-12 text-zinc-400">
                            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-semibold mb-2 text-zinc-900">No barbers found</p>
                            <p className="text-sm">
                                {searchTerm
                                    ? 'No barbers match your search criteria'
                                    : 'You don\'t have any barbers yet. Click "Add Barber" to create your first barber.'}
                            </p>
                        </div>
                    ) : filteredBarbers.length === 0 ? (
                        <div className="text-center p-12 text-zinc-400">
                            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-semibold mb-2 text-zinc-900">No matching results</p>
                            <p className="text-sm">No barbers found matching "{searchTerm}"</p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-zinc-200 overflow-x-auto bg-white">
                            <table className="w-full text-sm text-left min-w-[800px]">
                                <thead className="bg-zinc-50 uppercase tracking-wider text-xs font-semibold text-zinc-500 border-b border-zinc-200">
                                    <tr>
                                        <th className="p-4 pl-6">Name</th>
                                        <th className="p-4">Username</th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 bg-white">
                                    {filteredBarbers.map((barber) => (
                                        <tr key={barber.id} className="hover:bg-zinc-50 transition-colors group">
                                            <td className="p-4 pl-6 font-bold text-zinc-900">{barber.name}</td>
                                            <td className="p-4 text-zinc-500">{barber.username}</td>
                                            <td className="p-4 text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        barber.status === 'active'
                                                            ? 'bg-zinc-900 text-white border-zinc-900'
                                                            : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                                                    }
                                                >
                                                    {barber.status}
                                                </Badge>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2 justify-center">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEdit(barber)}
                                                        className="h-8 border-zinc-200 hover:bg-zinc-100 text-zinc-900"
                                                    >
                                                        <Pencil className="w-3 h-3 mr-1" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDelete(barber.id)}
                                                        className="h-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 border-zinc-200"
                                                    >
                                                        <Trash2 className="w-3 h-3 mr-1" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

