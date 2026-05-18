import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Section } from '@/components/ui/section';
import { Page } from '@/components/ui/page';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Eye, EyeOff, Lock, User } from 'lucide-react';

type LoginForm = { username: string; password: string };

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<LoginForm>();
  const onSubmit = async () => {
    await new Promise(r => setTimeout(r, 1500));
    navigate('/home');
  };

  return (
    <Page variant="split">
      <Section variant="image">
        <img src="/images/login-banner.png" alt="InterpriseERP" className="h-full w-full object-cover" />
        <BrandLogo className="absolute left-8 top-8 z-20" />
        <Section variant="tagline">
          <p className="mb-4 text-4xl font-bold leading-tight drop-shadow-lg">Empower your enterprise with intelligent workflows.</p>
          <p className="text-lg text-zinc-300 drop-shadow">The next generation ERP system designed for scale, speed, and seamless integration.</p>
        </Section>
      </Section>

      <Section variant="form">
        <BrandLogo className="relative mb-8 lg:hidden" />
        <Card variant="login">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
            <CardDescription>Enter your credentials to access your workspace.</CardDescription>
          </CardHeader>

          <CardContent>
            <form id="login-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <FormField label="Username" variant="erp" icon={<User className="h-5 w-5" />} placeholder="admin@interprise.com" {...register('username', { required: true })} />
              <FormField label="Password" variant="erp" icon={<Lock className="h-5 w-5" />} type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="pr-12" labelRight={<a href="#" className="text-sm font-medium text-blue-400 hover:text-blue-300">Forgot password?</a>}{...register('password', { required: true })}>
                <Button type="button" variant="ghost-erp" size="icon" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 -translate-y-1/2">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </FormField>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 border-0 pt-0">
            <Button type="submit" form="login-form" variant="primary" size="lg"
              disabled={isSubmitting} className="w-full py-6 text-base font-medium">
              {isSubmitting
                ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                : <> Sign In <ArrowRight className="ml-1 h-5 w-5" /> </>
              }
            </Button>
          </CardFooter>
        </Card>

        <p className="absolute bottom-8 right-8 text-xs text-zinc-600">© 2026 Interprise Inc.</p>
      </Section>
    </Page>
  );
}
