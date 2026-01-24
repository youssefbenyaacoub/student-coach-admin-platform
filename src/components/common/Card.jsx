export default function Card({ title, subtitle, actions, children, className = '' }) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden ${className}`}>
        {(title || actions) && (
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
            <div>
              {title && <h3 className="font-heading font-semibold text-slate-800 text-base">{title}</h3>}
              {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    )
  }
