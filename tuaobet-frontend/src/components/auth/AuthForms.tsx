import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../ui/Input';
import { Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AuthFormsProps {
  mode: 'login' | 'register';
  onSwitchMode?: () => void;
}

function AuthField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-[11px] font-black uppercase tracking-[0.14em] text-tuao-text-secondary">
        {label}
      </label>
      {children}
    </div>
  );
}

export const AuthForms: React.FC<AuthFormsProps> = ({ mode, onSwitchMode }) => {
  const { login, register, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }
        if (!formData.name) {
          throw new Error('Por favor, insira seu nome de usuário.');
        }
        await register(formData.name, formData.email, formData.password);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.';
      setError(message);
    }
  };

  const submitLabel = mode === 'login' ? 'Entrar' : 'Criar conta';
  const isRegister = mode === 'register';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error ? (
        <div
          role="alert"
          className="flex gap-3 rounded-xl border border-red-500/35 bg-red-500/[0.08] px-3.5 py-3 text-left"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" strokeWidth={2} />
          <p className="text-[13px] font-medium leading-snug text-red-200/95">{error}</p>
        </div>
      ) : null}

      {isRegister ? (
        <AuthField label="Usuário">
          <Input
            name="name"
            placeholder="Teu nome de jogador"
            icon={<User size={17} strokeWidth={2} />}
            value={formData.name}
            onChange={handleChange}
            required
            autoComplete="username"
          />
        </AuthField>
      ) : null}

      <AuthField label="E-mail">
        <Input
          name="email"
          type="email"
          placeholder="nome@email.com"
          icon={<Mail size={17} strokeWidth={2} />}
          value={formData.email}
          onChange={handleChange}
          required
          autoComplete="email"
        />
      </AuthField>

      <AuthField label="Senha">
        <Input
          name="password"
          type="password"
          placeholder="••••••••"
          icon={<Lock size={17} strokeWidth={2} />}
          value={formData.password}
          onChange={handleChange}
          required
          autoComplete={isRegister ? 'new-password' : 'current-password'}
        />
      </AuthField>

      {isRegister ? (
        <AuthField label="Confirmar senha">
          <Input
            name="confirmPassword"
            type="password"
            placeholder="Repete a senha"
            icon={<Lock size={17} strokeWidth={2} />}
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />
        </AuthField>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          'mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-black uppercase tracking-[0.08em]',
          'bg-tuao-primary text-tuao-dark-950',
          'shadow-[0_0_28px_rgba(0,240,255,0.22)]',
          'transition-[transform,box-shadow,background-color,opacity] duration-200',
          'hover:bg-tuao-primary-hover hover:shadow-[0_0_36px_rgba(0,240,255,0.32)]',
          'active:scale-[0.99]',
          'disabled:pointer-events-none disabled:opacity-55 disabled:shadow-none'
        )}
      >
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} /> : submitLabel}
      </button>

      {onSwitchMode ? (
        <div className="rounded-xl border border-tuao-dark-800 bg-tuao-dark-950/50 px-4 py-3.5 text-center">
          <p className="text-[13px] text-tuao-text-secondary">
            {mode === 'login' ? 'Ainda não tens conta?' : 'Já tens conta?'}{' '}
            <button
              type="button"
              onClick={onSwitchMode}
              className="font-black text-tuao-primary underline-offset-2 transition-colors hover:text-tuao-primary-hover hover:underline"
            >
              {mode === 'login' ? 'Criar conta' : 'Entrar'}
            </button>
          </p>
        </div>
      ) : null}
    </form>
  );
};
