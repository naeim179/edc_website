"use client";

import { useState, useRef } from "react";

interface PasswordToggleProps {
  visible: boolean;
  onToggle: () => void;
  label?: string;
}

export function PasswordToggle({
  visible,
  onToggle,
  label = "كلمة المرور",
}: PasswordToggleProps) {
  const [blinking, setBlinking] = useState(false);
  const [flash, setFlash] = useState(false);

  const handleClick = () => {
    if (blinking) return;

    const willShow = !visible;
    setBlinking(true);

    setTimeout(() => {
      onToggle();

      if (willShow) {
        setFlash(true);

        setTimeout(() => {
          setFlash(false);
        }, 550);
      }
    }, 220);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onAnimationEnd={() => setBlinking(false)}
      aria-label={
        visible
          ? `إخفاء ${label}`
          : `إظهار ${label}`
      }
      className={`eye-toggle ${
        blinking ? "is-blinking" : ""
      } ${visible ? "is-visible" : ""} ${
        flash ? "is-flash" : ""
      }`}
    >
      <span className="eye-glow" />

      <svg
        viewBox="0 0 24 24"
        width="21"
        height="21"
        className="eye-svg"
      >
        <defs>
          <linearGradient id="irisGrad">
            <stop stopColor="#e8c874" />
            <stop offset="55%" stopColor="#c99a3d" />
            <stop offset="100%" stopColor="#124b8a" />
          </linearGradient>
        </defs>

        <path
          className="eye-outline"
          d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />

        <g className="eye-iris">
          <circle
            cx="12"
            cy="12"
            r="3.3"
            fill="url(#irisGrad)"
          />
          <circle
            cx="12"
            cy="12"
            r="1.3"
            fill="#0b1f3a"
          />
        </g>

        <path
          className="eye-lid"
          d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"
          fill="#f8fafc"
        />
      </svg>

      <style jsx>{`
        .eye-toggle {
          position: relative;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          color: #94a3b8;
          transition: .2s;
        }

        .eye-toggle:hover {
          color: #124b8a;
          background: #eff6ff;
        }

        .eye-glow {
          position:absolute;
          inset:2px;
          border-radius:999px;
          background:#c99a3d;
          opacity:0;
          filter:blur(10px);
          transition:.3s;
        }

        .eye-toggle.is-flash .eye-glow {
          opacity:.5;
          transform:scale(1.4);
        }

        .eye-svg {
          position:relative;
          z-index:1;
        }

        .eye-iris {
          transform-origin:center;
        }

        .eye-toggle.is-visible .eye-iris {
          transform:scaleY(.15);
        }

        .eye-lid {
          transform-origin:center;
          transform:scaleY(0);
        }

        .eye-toggle.is-blinking .eye-lid {
          animation:blink .5s ease;
        }

        @keyframes blink {
          0%,100% {
            transform:scaleY(0);
          }
          50% {
            transform:scaleY(1);
          }
        }
      `}</style>
    </button>
  );
}
