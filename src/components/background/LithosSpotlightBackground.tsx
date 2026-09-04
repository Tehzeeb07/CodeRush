"use client";

import { useEffect, useRef } from "react";

const BG_IMAGE_1 =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_195923_b0ba8ace-1d1d-4f2c-9a28-1ab84b330680.png&w=1280&q=85";

const BG_IMAGE_2 =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_201152_bba90a12-bf12-459f-91f0-51f237dbaf3b.png&w=1280&q=85";

const SPOTLIGHT_R = 300;

type Point = { x: number; y: number };

function RevealLayer({
  image,
}: {
  image: string;
}) {
  return (
    <div
        className="absolute inset-0 z-30 pointer-events-none bg-center bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url(${image})`,
          maskImage: `radial-gradient(circle ${SPOTLIGHT_R}px at var(--spot-x, 50%) var(--spot-y, 50%), rgba(255,255,255,1) 0%, rgba(255,255,255,0.98) 34%, rgba(255,255,255,0.72) 58%, rgba(255,255,255,0.2) 82%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(circle ${SPOTLIGHT_R}px at var(--spot-x, 50%) var(--spot-y, 50%), rgba(255,255,255,1) 0%, rgba(255,255,255,0.98) 34%, rgba(255,255,255,0.72) 58%, rgba(255,255,255,0.2) 82%, transparent 100%)`,
        }}
    />
  );
}

export default function LithosSpotlightBackground() {
  const mouse = useRef<Point>({ x: -999, y: -999 });
  const smooth = useRef<Point>({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const revealRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let disposed = false;

    const animate = () => {
      const dx = mouse.current.x - smooth.current.x;
      const dy = mouse.current.y - smooth.current.y;
      smooth.current.x += dx * 0.1;
      smooth.current.y += dy * 0.1;
      revealRef.current?.style.setProperty("--spot-x", `${smooth.current.x}px`);
      revealRef.current?.style.setProperty("--spot-y", `${smooth.current.y}px`);

      if (!disposed && (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2)) {
        rafRef.current = window.requestAnimationFrame(animate);
      } else {
        rafRef.current = null;
      }
    };

    const startAnimation = () => {
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(animate);
      }
    };

    const handleMove = (event: MouseEvent) => {
      mouse.current = { x: event.clientX, y: event.clientY };
      startAnimation();
    };

    smooth.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    mouse.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    revealRef.current?.style.setProperty("--spot-x", `${smooth.current.x}px`);
    revealRef.current?.style.setProperty("--spot-y", `${smooth.current.y}px`);
    window.addEventListener("mousemove", handleMove);
    startAnimation();

    return () => {
      disposed = true;
      window.removeEventListener("mousemove", handleMove);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden bg-black" aria-hidden="true">
      <div
        className="absolute inset-0 z-10 bg-center bg-cover bg-no-repeat hero-zoom"
        style={{ backgroundImage: `url(${BG_IMAGE_1})` }}
      />
      <div ref={revealRef} className="contents">
        <RevealLayer image={BG_IMAGE_2} />
        <div className="absolute inset-0 z-[35] pointer-events-none bg-[radial-gradient(circle_420px_at_var(--spot-x,50%)_var(--spot-y,50%),rgba(255,195,92,0.55),rgba(255,126,38,0.2)_42%,transparent_76%)] mix-blend-screen" />
      </div>
      <div className="absolute inset-0 z-40 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0),rgba(0,0,0,0.16)_55%,rgba(0,0,0,0.48)_100%)]" />
    </div>
  );
}
