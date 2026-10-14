import React from "react";

/**
 * High-fidelity 3D geometric shapes inspired by the VisualSpark pricing sample:
 * 1. PurpleSlantedDisc (Basic Plan)
 * 2. GoldCylinder (Premium Plan)
 * 3. EmeraldPolyhedron (Enterprise Plan)
 */

export function PurpleSlantedDisc({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_12px_20px_rgba(107,114,236,0.35)]"
      >
        <defs>
          <linearGradient id="purple-top" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#9C99FF" />
            <stop offset="60%" stopColor="#6C63FF" />
            <stop offset="100%" stopColor="#5346E0" />
          </linearGradient>
          <linearGradient id="purple-side" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5E53E5" />
            <stop offset="50%" stopColor="#483BC9" />
            <stop offset="100%" stopColor="#372CA3" />
          </linearGradient>
          <radialGradient id="purple-highlight" cx="45%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#C4C2FF" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#7E76FF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#6C63FF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Tilted Disc Side Body */}
        <path
          d="M 28 54 C 28 68, 92 84, 92 70 L 92 78 C 92 92, 28 76, 28 62 Z"
          fill="url(#purple-side)"
        />

        {/* Top Slanted Elliptical Cap */}
        <ellipse
          cx="60"
          cy="56"
          rx="36"
          ry="19"
          transform="rotate(-18 60 56)"
          fill="url(#purple-top)"
        />

        {/* Glossy Highlight Overlay */}
        <ellipse
          cx="58"
          cy="54"
          rx="32"
          ry="16"
          transform="rotate(-18 60 56)"
          fill="url(#purple-highlight)"
        />
      </svg>
    </div>
  );
}

export function GoldCylinder({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_12px_20px_rgba(234,168,43,0.35)]"
      >
        <defs>
          <linearGradient id="gold-body" x1="0%" y1="30%" x2="100%" y2="70%">
            <stop offset="0%" stopColor="#FFE082" />
            <stop offset="35%" stopColor="#FFC843" />
            <stop offset="70%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="gold-top" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF2B2" />
            <stop offset="60%" stopColor="#FFD459" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <radialGradient id="gold-highlight" cx="30%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
            <stop offset="70%" stopColor="#FFF2B2" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FFD459" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Cylinder Body (slanted slightly) */}
        <g transform="rotate(14 60 60)">
          {/* Main Rounded Column */}
          <path
            d="M 40 38 L 40 82 C 40 92, 80 92, 80 82 L 80 38 Z"
            fill="url(#gold-body)"
          />
          {/* Bottom Round Cap */}
          <ellipse cx="60" cy="82" rx="20" ry="8" fill="#D97706" />
          {/* Top Cap */}
          <ellipse cx="60" cy="38" rx="20" ry="8" fill="url(#gold-top)" />
          {/* Top Gloss */}
          <ellipse cx="58" cy="37" rx="16" ry="6" fill="url(#gold-highlight)" />
        </g>
      </svg>
    </div>
  );
}

export function EmeraldPolyhedron({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_12px_22px_rgba(16,185,129,0.38)]"
      >
        <defs>
          <linearGradient id="gem-f1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6EE7B7" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <linearGradient id="gem-f2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="gem-f3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="gem-f4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A7F3D0" />
            <stop offset="100%" stopColor="#6EE7B7" />
          </linearGradient>
          <linearGradient id="gem-f5" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="100%" stopColor="#065F46" />
          </linearGradient>
        </defs>

        {/* Faceted Icosahedron Gem */}
        <g transform="translate(60,60) scale(0.95) translate(-60,-60)">
          {/* Top Center Triangle (brightest) */}
          <polygon points="60,26 84,48 36,48" fill="url(#gem-f4)" />

          {/* Left Upper Triangle */}
          <polygon points="60,26 36,48 24,62" fill="url(#gem-f1)" />
          {/* Right Upper Triangle */}
          <polygon points="60,26 84,48 96,62" fill="url(#gem-f2)" />

          {/* Middle Center Facet */}
          <polygon points="36,48 84,48 74,78 46,78" fill="url(#gem-f2)" />

          {/* Middle Left Facet */}
          <polygon points="24,62 36,48 46,78 30,86" fill="url(#gem-f1)" />
          {/* Middle Right Facet */}
          <polygon points="96,62 84,48 74,78 90,86" fill="url(#gem-f3)" />

          {/* Bottom Center Triangle */}
          <polygon points="46,78 74,78 60,98" fill="url(#gem-f3)" />

          {/* Bottom Left Triangle */}
          <polygon points="30,86 46,78 60,98" fill="url(#gem-f5)" />
          {/* Bottom Right Triangle */}
          <polygon points="90,86 74,78 60,98" fill="url(#gem-f5)" />
        </g>
      </svg>
    </div>
  );
}
