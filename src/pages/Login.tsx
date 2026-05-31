import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Section } from '@/components/ui/section';
import { Page } from '@/components/ui/page';
import { BrandLogo } from '@/components/ui/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Eye, EyeOff, Lock, User, Building } from 'lucide-react';
import axiosClient, { API_BASE } from '../Services/axiosClient';
import { useAppDispatch } from '@/store/hooks';
import { setAuthData } from '@/store/slices/authSlice';
import { toast } from 'sonner';
import type { CompanyDto } from '@/types/CompanyDto';

type LoginForm = { username: string; password: string };

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyDto | null>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<LoginForm>();

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response: any = await axiosClient.get('/Company');
        if (response && response.success) {
          const data = response.data || [];
          setCompanies(data);
          if (data.length > 0) {
            setSelectedCompany(data[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load company details for login screen:', error);
      }
    };
    fetchCompanies();
  }, []);

  const onSubmit = async (data: LoginForm) => {
    try {
      const response: any = await axiosClient.post('/Auth/login', data);
      if (response && response.success) {
        // Dispatch all user data and token to the Redux store
        dispatch(setAuthData(response.data));
        toast.success('Login successful!');
        navigate('/home');
      } else {
        toast.error(response?.message || 'Invalid username or password');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error?.message || 'Something went wrong during login');
    }
  };

  return (
    <Page variant="split">
      <Section variant="image">
        <img src="/images/login-banner.png" alt="APEX ERP" className="h-full w-full object-cover" />
        <BrandLogo className="absolute left-8 top-8 z-20" />
        <Section variant="tagline">
          <p className="mb-1.5 text-xl lg:text-2xl xl:text-3xl font-bold leading-tight drop-shadow-lg text-foreground">Manage. Automate. Grow.</p>
          <p className="text-xs lg:text-sm xl:text-base text-muted-foreground drop-shadow leading-relaxed">The next generation ERP system designed for scale, speed, and seamless integration.</p>
        </Section>
      </Section>

      <Section variant="form" className="h-screen overflow-hidden py-4">
        <BrandLogo className="relative mb-4 lg:hidden" />

        <Card variant="login" className="w-full max-w-[400px] flex flex-col justify-between overflow-hidden shadow-xl border border-zinc-200 dark:border-zinc-800">
          {companies.length > 0 && selectedCompany && (
            <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/20">
              <div className="flex items-center gap-2.5 min-w-0">
                {selectedCompany.logoUrl ? (
                  <img
                    src={`${API_BASE}${selectedCompany.logoUrl}`}
                    alt={selectedCompany.name}
                    className="h-9 w-9 rounded-lg object-cover border border-zinc-200/80 dark:border-zinc-800 bg-white p-0.5 shadow-sm"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                    <Building className="h-5 w-5 text-zinc-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider leading-none">Workspace</span>
                  <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{selectedCompany.name}</span>
                </div>
              </div>
              
              {companies.length > 1 && (
                <div className="flex items-center gap-1">
                  <select
                    value={selectedCompany.id || ''}
                    onChange={(e) => {
                      const comp = companies.find(c => c.id === e.target.value);
                      if (comp) setSelectedCompany(comp);
                    }}
                    className="text-[10px] font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-0.5 text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer max-w-[110px] shadow-sm"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <CardHeader className="pt-4 pb-3">
            <CardTitle className="text-xl font-semibold">Welcome back</CardTitle>
            <CardDescription className="text-xs text-zinc-500">Enter your credentials to access your workspace.</CardDescription>
          </CardHeader>

          <CardContent className="pb-3">
            <form id="login-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField label="Username" variant="erp" icon={<User className="h-4 w-4" />} placeholder="admin@apexerp.com" {...register('username', { required: true })} />
              <FormField label="Password" variant="erp" icon={<Lock className="h-4 w-4" />} type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="pr-12" {...register('password', { required: true })}>
                <Button type="button" variant="ghost-erp" size="icon" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 -translate-y-1/2">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </FormField>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 border-0 pt-0 pb-4">
            <Button type="submit" form="login-form" variant="primary" size="lg"
              disabled={isSubmitting} className="w-full py-5 text-sm font-medium">
              {isSubmitting
                ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                : <> Sign In <ArrowRight className="ml-1 h-4 w-4" /> </>
              }
            </Button>
          </CardFooter>

          {selectedCompany && (selectedCompany.email || selectedCompany.phone || selectedCompany.address) && (
            <div className="px-6 py-2 bg-zinc-50/50 dark:bg-zinc-900/10 border-t border-zinc-100 dark:border-zinc-800/40 flex items-center justify-between text-[9px] text-zinc-400">
              <span className="truncate max-w-[180px]">{selectedCompany.address ? `📍 ${selectedCompany.address}` : ''}</span>
              <div className="flex items-center gap-2">
                {selectedCompany.email && <span className="truncate">✉ {selectedCompany.email}</span>}
                {selectedCompany.phone && <span className="truncate">📞 {selectedCompany.phone}</span>}
              </div>
            </div>
          )}
        </Card>

        <div className="absolute top-8 right-8 z-20">
          <ThemeToggle />
        </div>
        <p className="absolute bottom-6 right-8 text-xs text-muted-foreground">© 2026 Apex ERP</p>
      </Section>
    </Page>
  );
}
