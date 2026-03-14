'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Credenziali non valide. Riprova.');
      setLoading(false);
    } else {
      router.push('/admin');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6">
      <Image
        src="/LOGOKITWER.png"
        alt="Kitwer"
        width={80}
        height={80}
        className="mb-8 object-contain"
        priority
      />

      <h1 className="text-lg font-black text-white mb-1">Area Admin</h1>
      <p className="text-xs text-gray-500 mb-8">Accesso riservato</p>

      <form onSubmit={handleLogin} className="w-full max-w-[320px] space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          autoComplete="email"
          className="w-full h-12 px-4 bg-[#111] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-[#00D4FF] placeholder-gray-600"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          autoComplete="current-password"
          className="w-full h-12 px-4 bg-[#111] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-[#00D4FF] placeholder-gray-600"
        />

        {error && (
          <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-[#00D4FF] text-[#0A0A0A] font-bold rounded-xl disabled:opacity-40 active:scale-95 transition-transform"
        >
          {loading ? 'Accesso...' : 'Accedi'}
        </button>
      </form>
    </div>
  );
}
