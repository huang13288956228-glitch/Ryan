import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Globe, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setSuccess('注册成功！请直接登录。'); setMode('login');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败';
      if (msg.includes('Invalid login credentials')) setError('邮箱或密码错误');
      else if (msg.includes('User already registered')) setError('该邮箱已注册，请直接登录');
      else setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl mb-4 shadow-lg shadow-blue-500/20"><Globe className="w-8 h-8 text-white" /></div>
          <h1 className="text-3xl font-bold text-white tracking-tight">外贸工作台</h1>
          <p className="text-navy-400 mt-2 text-sm">AI智能外贸操作系统</p>
        </div>
        <div className="glass-card p-8">
          <div className="flex bg-navy-800/60 rounded-lg p-1 mb-6">
            {(['login', 'register'] as Mode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ${mode === m ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-navy-400 hover:text-navy-200'}`}>
                {m === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-navy-200 text-sm font-medium mb-1.5">邮箱</label>
              <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="input-field pl-10 py-2.5" />
              </div>
            </div>
            <div><label className="block text-navy-200 text-sm font-medium mb-1.5">密码</label>
              <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
                <input type={showPwd ? 'text' : 'password'} required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="至少6位字符" className="input-field pl-10 pr-10 py-2.5" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-500 hover:text-navy-300 transition-colors">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <div className="badge-red px-4 py-3 text-sm rounded-lg w-full">{error}</div>}
            {success && <div className="badge-green px-4 py-3 text-sm rounded-lg w-full">{success}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <User className="w-4 h-4" />}
              {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
            </button>
          </form>
        </div>
        <p className="text-center text-navy-600 text-xs mt-6">2026 外贸工作台 · AI智能外贸操作系统</p>
      </div>
    </div>
  );
}
