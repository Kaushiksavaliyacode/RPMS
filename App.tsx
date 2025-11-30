
import React, { useState, useEffect } from 'react';
import { User, JobCard } from './types';
import { subscribeToJobs, addJob, updateJob, deleteJob } from './services/storage';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import ProductionDashboard from './components/ProductionDashboard';
import SlittingDashboard from './components/SlittingDashboard';
import { LogOut, Hexagon, Cloud, CloudOff } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToJobs((liveData) => {
      setJobs(liveData);
      setIsConnected(true);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateJob = (newJob: JobCard) => addJob(newJob);
  const handleUpdateJob = (updatedJob: JobCard) => updateJob(updatedJob);
  const handleDeleteJob = (jobId: string) => deleteJob(jobId);

  if (!user || !user.isAuthenticated) {
    return <Login onLogin={setUser} />;
  }

  const renderDashboard = () => {
    switch (user.role) {
      case 'ADMIN':
        return <AdminDashboard jobs={jobs} onCreateJob={handleCreateJob} onUpdateJob={handleUpdateJob} onDeleteJob={handleDeleteJob} />;
      case 'PRODUCTION':
        return <ProductionDashboard jobs={jobs} onUpdateJob={handleUpdateJob} />;
      case 'SLITTING':
        return <SlittingDashboard jobs={jobs} onUpdateJob={handleUpdateJob} />;
      default:
        return <div>Unknown Role</div>;
    }
  };

  const getHeaderColor = () => {
    switch(user.role) {
        case 'ADMIN': return 'bg-slate-900 border-slate-800';
        case 'PRODUCTION': return 'bg-emerald-600 border-emerald-500';
        case 'SLITTING': return 'bg-blue-600 border-blue-500';
        default: return 'bg-slate-900';
    }
  };

  const getUserDisplayName = () => {
    switch(user.role) {
      case 'ADMIN': return 'Ridhish';
      case 'PRODUCTION': return 'Production';
      case 'SLITTING': return 'Slitting';
      default: return 'User';
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col font-sans">
      <header className={`${getHeaderColor()} text-white shadow-md sticky top-0 z-30 transition-colors duration-300 no-print shrink-0`}>
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm relative">
              <Hexagon className="text-white" size={24} />
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></div>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none tracking-tight flex items-center gap-2">
                Reliance PMS
                <span className="flex items-center gap-1 text-[10px] bg-white/10 border border-white/20 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold text-white/90">
                   {isConnected ? <Cloud size={10} /> : <CloudOff size={10} />} 
                   {isConnected ? 'Local' : 'Offline'}
                </span>
              </h1>
              <span className="text-xs text-white/70 font-medium tracking-wide uppercase">{user.role} Portal</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-white/80 hidden md:inline font-medium">
              User: <span className="text-white">{getUserDisplayName()}</span>
            </span>
            <button
              onClick={() => setUser(null)}
              className="flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all uppercase tracking-wider border border-white/10"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-6 overflow-hidden sm:overflow-visible">
        {renderDashboard()}
      </main>
    </div>
  );
};

export default App;
