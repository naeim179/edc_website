"use client";

import { useEffect, useState } from "react";

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
  const [iris, setIris] = useState({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const move = (e: MouseEvent) => {
      const x =
        (e.clientX / window.innerWidth - 0.5) * 6;
      const y =
        (e.clientY / window.innerHeight - 0.5) * 6;

      setIris({
        x,
        y,
      });
    };

    window.addEventListener("mousemove", move);

    return () => {
      window.removeEventListener("mousemove", move);
    };
  }, []);

  const handleClick = () => {
    if (blinking) return;

    const opening = !visible;

    setBlinking(true);

    setTimeout(() => {
      onToggle();

      if (opening) {
        setFlash(true);

        setTimeout(() => {
          setFlash(false);
        }, 600);
      }

      setTimeout(() => {
        setBlinking(false);
      }, 300);

    }, 220);
  };


  useEffect(() => {
    if (!visible) return; // لا ترمش وهي مغمضة

    const timer = setInterval(() => {
      setBlinking(true);

      setTimeout(() => {
        setBlinking(false);
      }, 500);

    }, 7000);

    return () => clearInterval(timer);
  }, [visible]);


  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={
        visible
          ? `إخفاء ${label}`
          : `إظهار ${label}`
      }
      className={`eye-toggle ${
        blinking ? "sleep" : ""
      } ${visible ? "open" : "closed"} ${
        flash ? "wake" : ""
      }`}
    >

      <span className="glow" />


      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
      >

        <defs>
          <linearGradient id="iris">
            <stop stopColor="#e8c874"/>
            <stop offset="60%" stopColor="#c99a3d"/>
            <stop offset="100%" stopColor="#124b8a"/>
          </linearGradient>
        </defs>


        <path
          d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />


        <g
          className="iris"
          style={{
            "--iris-x": `${iris.x}px`,
            "--iris-y": `${iris.y}px`,
          } as React.CSSProperties}
        >

          <circle
            cx="12"
            cy="12"
            r="3.4"
            fill="url(#iris)"
          />

          <circle
            cx="12"
            cy="12"
            r="1.3"
            fill="#07172d"
          />

        </g>


        <path
          className="lid"
          d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"
          fill="#f8fafc"
        />

      </svg>


      <style jsx>{`

        .eye-toggle {
          position:relative;
          width:34px;
          height:34px;
          display:flex;
          align-items:center;
          justify-content:center;
          border-radius:999px;
          color:#94a3b8;
          transition:.25s;
        }


        .eye-toggle:hover {
          color:#124b8a;
          background:#eff6ff;
        }


        .glow {
          position:absolute;
          inset:0;
          border-radius:50%;
          background:#c99a3d;
          opacity:0;
          filter:blur(10px);
          transition:.4s;
        }


        .wake .glow {
          opacity:.7;
          transform:scale(1.5);
        }


        .iris {
          transition:
          transform .25s cubic-bezier(.34,1.56,.64,1);
          transform-origin:center;
          transform:
            translate(var(--iris-x), var(--iris-y))
            scaleY(1);
        }



        .closed .iris {
          transform:
          translate(var(--iris-x), var(--iris-y))
          scaleY(.15);
        }

        .open .iris {
          transform:
          translate(var(--iris-x), var(--iris-y))
          scaleY(1);
        }

        .sleep .iris {
          animation:
          sleepEye .5s ease;
        }


        .lid {
          transform-origin:center;
          transform:scaleY(0);
        }


        .sleep .lid {
          animation:
          closeEye .5s ease;
        }


        @keyframes closeEye {

          0%,100% {
            transform:scaleY(0);
          }

          50% {
            transform:scaleY(1);
          }

        }


        @keyframes sleepEye {

          50% {
            transform:scaleY(.1);
          }

        }

      `}</style>

    </button>
  );
}
