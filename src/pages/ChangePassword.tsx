import { useForm } from 'react-hook-form';
import { KeyRound, Loader2 } from 'lucide-react';
import { Page } from '@/components/ui/page';
import { Section } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import axiosClient from '@/Services/axiosClient';
import { toast } from 'sonner';

interface ChangePasswordForm {
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export default function ChangePassword() {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>();

  const newPassword = watch('newPassword');

  const onSubmit = async (data: ChangePasswordForm) => {
    try {
      const response: any = await axiosClient.post('/Auth/change-password', {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      });

      if (response?.success) {
        toast.success('Password changed successfully!');
        reset();
      } else {
        toast.error(response?.message || 'Failed to change password.');
      }
    } catch (error: any) {
      console.error('Change password error', error);
      toast.error(error?.response?.data?.message || error?.message || 'An error occurred.');
    }
  };

  return (
    <Page>
      <Section className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account password and security configuration.</p>
      </Section>

      <div className="max-w-md">
        <Section className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-zinc-800 rounded-lg text-zinc-100">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Change Password</h2>
              <p className="text-sm text-muted-foreground">Ensure your account uses a strong, unique password.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              label="Current Password"
              type="password"
              placeholder="••••••••"
              {...register('oldPassword', { required: 'Current password is required' })}
            />
            {errors.oldPassword && (
              <span className="text-xs text-red-500">{errors.oldPassword.message}</span>
            )}

            <FormField
              label="New Password"
              type="password"
              placeholder="••••••••"
              {...register('newPassword', {
                required: 'New password is required',
                minLength: {
                  value: 6,
                  message: 'New password must be at least 6 characters long',
                },
              })}
            />
            {errors.newPassword && (
              <span className="text-xs text-red-500">{errors.newPassword.message}</span>
            )}

            <FormField
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              {...register('confirmPassword', {
                required: 'Please confirm your new password',
                validate: (value) =>
                  value === newPassword || 'The passwords do not match',
              })}
            />
            {errors.confirmPassword && (
              <span className="text-xs text-red-500">{errors.confirmPassword.message}</span>
            )}

            <div className="pt-4 border-t border-border flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update Password
              </Button>
            </div>
          </form>
        </Section>
      </div>
    </Page>
  );
}
