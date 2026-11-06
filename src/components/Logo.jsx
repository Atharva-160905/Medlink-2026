export default function Logo({ size = 36, showWordmark = true, className = "", light = false }) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon Mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
      >
        <rect width="48" height="48" rx="14" fill={light ? "#FFFFFF" : "#0F172A"} />
        <rect
          x="1"
          y="1"
          width="46"
          height="46"
          rx="13"
          stroke={light ? "#E2E8F0" : "rgba(255,255,255,0.08)"}
          strokeWidth="1.5"
        />
        {/* Left Link Loop (Patient) */}
        <path
          d="M17 19C14.79 19 13 20.79 13 23V25C13 27.21 14.79 29 17 29H21C23.21 29 25 27.21 25 25V24.5"
          stroke="#0D9488"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Right Link Loop (Doctor) */}
        <path
          d="M31 29C33.21 29 35 27.21 35 25V23C35 20.79 33.21 19 31 19H27C24.79 19 23 20.79 23 23V23.5"
          stroke="#0284C7"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Clinical Node Center */}
        <circle cx="24" cy="24" r="3" fill="#38BDF8" />
        <circle cx="24" cy="24" r="1.2" fill="#FFFFFF" />
      </svg>

      {/* Wordmark */}
      {showWordmark && (
        <span
          className={`font-semibold tracking-tight text-xl flex items-center ${
            light ? "text-white" : "text-slate-900"
          }`}
        >
          Med<span className="text-teal-600">Link</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 ml-1 mb-2"></span>
        </span>
      )}
    </div>
  );
}

