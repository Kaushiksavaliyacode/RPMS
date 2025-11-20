import React, { useState } from 'react';
import { User, Department } from '../types';
import { Lock, User as UserIcon, Shield, Scissors, Factory, Hexagon } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Department>('ADMIN');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Specific credentials as requested
    if (username === 'Reliance' && password === 'Reliance.123') {
      onLogin({ role, isAuthenticated: true });
    } else {
      setError('Invalid ID or Password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="bg-white/95 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20 relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-slate-900 p-3 rounded-xl">
              <Hexagon className="text-white" size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reliance PMS</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium uppercase tracking-wide">Production Management System</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <button
            type="button"
            onClick={() => setRole('ADMIN')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${
              role === 'ADMIN'
                ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-105'
                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Shield size={24} className="mb-2" />
            <span className="text-xs font-bold">Admin</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('PRODUCTION')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${
              role === 'PRODUCTION'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg scale-105'
                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Factory size={24} className="mb-2" />
            <span className="text-xs font-bold">Production</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('SLITTING')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${
              role === 'SLITTING'
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105'
                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Scissors size={24} className="mb-2" />
            <span className="text-xs font-bold">Slitting</span>
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Login ID</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon size={18} className="text-slate-400 group-focus-within:text-slate-800 transition-colors" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all font-medium text-slate-800 placeholder-slate-400"
                placeholder="Enter ID"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Password</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-slate-400 group-focus-within:text-slate-800 transition-colors" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all font-medium text-slate-800 placeholder-slate-400"
                placeholder="Enter Password"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100 flex items-center justify-center animate-pulse">
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-3.5 rounded-xl text-white font-bold shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 ${
                role === 'ADMIN' ? 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20' :
                role === 'PRODUCTION' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' :
                'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
            }`}
          >
            Login to System
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;