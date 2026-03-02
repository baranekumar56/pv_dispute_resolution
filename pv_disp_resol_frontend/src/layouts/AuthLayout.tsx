import { Outlet } from 'react-router-dom';

const AuthLayout = () => (
  <div className="min-h-screen flex">
    {/* Left decorative panel */}
    <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-brand-950 flex-col items-start justify-end p-16">
      {/* Background mesh */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-brand-600/20 rounded-full blur-[120px] -translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent-violet/20 rounded-full blur-[100px] translate-x-1/4 translate-y-1/4" />
        <div className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,.04) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Brand mark */}
      <div className="relative z-10 mb-auto pt-0">
        <div className="flex items-center gap-3 pt-1">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="font-display text-white font-bold text-xl tracking-tight">PaisaVasool</span>
        </div>
      </div>

      {/* Hero content */}
      <div className="relative z-10">
        <p className="text-brand-300 text-sm font-mono tracking-widest uppercase mb-4">Dispute Resolution Platform</p>
        <h1 className="font-display text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
          Resolve financial<br />disputes with<br />
          <span className="text-brand-400">clarity.</span>
        </h1>
        <p className="text-surface-300 text-base leading-relaxed max-w-sm">
          AI-powered document extraction and dispute management for finance associates. Track, resolve, and close cases faster than ever.
        </p>

        {/* Stats */}
        <div className="mt-10 flex gap-8">
          {[
            { value: '98%', label: 'Resolution Rate' },
            { value: '2.4x', label: 'Faster Processing' },
            { value: '10k+', label: 'Cases Resolved' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-surface-400 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Right form panel */}
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-surface-50">
      <div className="lg:hidden mb-8 flex items-center gap-3">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span className="font-display text-surface-900 font-bold text-xl tracking-tight">PaisaVasool</span>
      </div>
      <div className="w-full max-w-md animate-slide-up">
        <Outlet />
      </div>
    </div>
  </div>
);

export default AuthLayout;
