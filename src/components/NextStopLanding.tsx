"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import {
  ArrowRight,
  Bot,
  Bus,
  Clock3,
  EyeOff,
  MapPin,
  Navigation,
  Route,
  Share2,
  Sparkles,
} from "lucide-react";

const FRAME_COUNT = 240;
const HERO_SCROLL_DISTANCE = 3200;

const problemCards = [
  {
    title: "Uncertain Wait Times",
    description: "Passengers wait without knowing bus locations",
    icon: Clock3,
  },
  {
    title: "No Real-Time Visibility",
    description: "Public transport lacks real-time visibility",
    icon: EyeOff,
  },
  {
    title: "Daily Time Loss",
    description: "Time is wasted at bus stops",
    icon: MapPin,
  },
];

const solutionCards = [
  {
    title: "Live Bus Tracking",
    description: "Track buses with instant location updates and arrival confidence.",
    icon: Navigation,
  },
  {
    title: "OTP Passenger Sharing",
    description: "Secure temporary sharing between passengers and drivers.",
    icon: Share2,
  },
  {
    title: "Route Visualization",
    description: "Interactive path overlays with stop-by-stop context.",
    icon: Route,
  },
  {
    title: "AI Bus Route Chatbot",
    description: "Ask route, stop, and timing questions in natural language.",
    icon: Bot,
  },
];

const featureCards = [
  {
    title: "Real-time bus tracking",
    description:
      "Continuously updated bus position with smooth map movement and ETA confidence.",
    icon: Bus,
  },
  {
    title: "Driver location sharing",
    description:
      "Drivers share authenticated live locations for trusted trip visibility.",
    icon: Share2,
  },
  {
    title: "Interactive route map",
    description:
      "See active routes, stop states, and travel progress in one map layer.",
    icon: Route,
  },
  {
    title: "Smart bus search chatbot",
    description:
      "Find routes, nearby buses, and alternatives through conversational search.",
    icon: Sparkles,
  },
];

const frameId = (index: number) => String(index + 1).padStart(3, "0");

const frameSources = (index: number) => {
  const id = frameId(index);
  return [
    `/hero-frames/frame${id}.png`,
    `/hero-frames/frame${id}.jpg`,
    `/hero-frames/ezgif-frame-${id}.jpg`,
  ];
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export default function NextStopLanding() {
  const pageRef = useRef<HTMLElement | null>(null);
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const heroPinRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const currentFrameRef = useRef(0);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const [isReady, setIsReady] = useState(false);

  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 8,
        duration: 7 + Math.random() * 10,
        opacity: 0.2 + Math.random() * 0.6,
      })),
    [],
  );

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const pageEl = pageRef.current;
    const heroEl = heroSectionRef.current;
    const pinEl = heroPinRef.current;
    const canvas = canvasRef.current;
    if (!pageEl || !heroEl || !pinEl || !canvas) return;
    let teardown: (() => void) | undefined;

    const context = gsap.context(() => {
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;

      let cancelled = false;
      let loaded = 0;

      const resizeCanvas = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(canvas.clientWidth * dpr);
        canvas.height = Math.floor(canvas.clientHeight * dpr);
        drawFrame(currentFrameRef.current);
      };

      const drawFrame = (index: number) => {
        const image = imagesRef.current[index];
        if (!image) return;

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const imageWidth = image.naturalWidth || image.width;
        const imageHeight = image.naturalHeight || image.height;
        if (!imageWidth || !imageHeight) return;

        const scale = Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight);
        const drawWidth = imageWidth * scale;
        const drawHeight = imageHeight * scale;
        const dx = (canvasWidth - drawWidth) / 2;
        const dy = (canvasHeight - drawHeight) / 2;

        ctx.fillStyle = "#020617";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
      };

      const queueDraw = () => {
        if (rafRef.current !== null) return;
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          const mappedFrame = Math.round(progressRef.current * (FRAME_COUNT - 1));
          currentFrameRef.current = clamp(mappedFrame, 0, FRAME_COUNT - 1);
          drawFrame(currentFrameRef.current);
        });
      };

      const loadImage = (sources: string[]) =>
        new Promise<HTMLImageElement | null>((resolve) => {
          const trySource = (sourceIndex: number) => {
            if (sourceIndex >= sources.length) {
              resolve(null);
              return;
            }

            const image = new Image();
            image.decoding = "async";
            image.loading = "eager";
            image.src = sources[sourceIndex];
            image.onload = () => resolve(image);
            image.onerror = () => trySource(sourceIndex + 1);
          };

          trySource(0);
        });

      const preloadFrames = async () => {
        const tasks = Array.from({ length: FRAME_COUNT }, async (_, index) => {
          const image = await loadImage(frameSources(index));
          imagesRef.current[index] = image;
          loaded += 1;

          if (!cancelled && loaded === 1 && image) {
            currentFrameRef.current = 0;
            resizeCanvas();
            drawFrame(0);
          }
        });

        await Promise.all(tasks);
      };

      const initScroll = () => {
        ScrollTrigger.create({
          trigger: heroEl,
          start: "top top",
          end: `+=${HERO_SCROLL_DISTANCE}`,
          scrub: true,
          pin: pinEl,
          pinSpacing: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            progressRef.current = self.progress;
            queueDraw();
          },
        });

        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((node) => {
          gsap.fromTo(
            node,
            { autoAlpha: 0, y: 36 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.9,
              ease: "power3.out",
              scrollTrigger: {
                trigger: node,
                start: "top 85%",
                once: true,
              },
            },
          );
        });

        ScrollTrigger.refresh();
      };

      window.addEventListener("resize", resizeCanvas);

      preloadFrames().then(() => {
        if (cancelled) return;
        setIsReady(true);
        resizeCanvas();
        initScroll();
      });

      teardown = () => {
        cancelled = true;
        window.removeEventListener("resize", resizeCanvas);
        if (rafRef.current !== null) {
          window.cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
    }, pageEl);

    return () => {
      teardown?.();
      context.revert();
    };
  }, []);

  return (
    <main
      ref={pageRef}
      className="relative min-h-screen overflow-x-clip bg-[#020617] text-slate-100"
      style={{ fontFamily: "'Space Grotesk', 'Rajdhani', 'Segoe UI', sans-serif" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-48 top-10 h-80 w-80 rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="absolute right-[-120px] top-[24%] h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-[-110px] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-700/25 blur-3xl" />
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="particle absolute rounded-full bg-cyan-300"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          />
        ))}
      </div>

      <section ref={heroSectionRef} className="relative h-screen">
        <div ref={heroPinRef} className="relative flex h-screen items-center justify-center">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/35 to-[#020617]/95" />

          <div className="relative z-10 px-6 text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-semibold tracking-[0.24em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              FUTURE OF PUBLIC MOBILITY
            </p>

            <h1 className="bg-gradient-to-r from-cyan-200 via-cyan-300 to-orange-300 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-7xl md:text-8xl">
              NextStop
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base text-slate-200 sm:text-xl">
              Real-time bus tracking for smarter travel
            </p>

            <div className="mt-8 flex items-center justify-center">
              <a
                href="#final-cta"
                className="pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-orange-300/50 bg-orange-400/20 px-6 py-3 text-sm font-semibold text-orange-100 transition duration-300 hover:bg-orange-400/35 hover:shadow-[0_0_32px_rgba(251,146,60,0.45)]"
              >
                Open Live App
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <p className="mt-8 text-xs tracking-[0.2em] text-cyan-100/70">
              SCROLL TO DRIVE THE TIMELINE
            </p>

            {!isReady && (
              <p className="mt-4 text-xs text-slate-300/80">
                Loading sequence frames...
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <div data-reveal className="mb-10 max-w-3xl">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-200/80">Problem</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            Urban transit still runs on uncertainty.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {problemCards.map((card) => (
            <article
              key={card.title}
              data-reveal
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition duration-300 hover:-translate-y-1.5 hover:border-cyan-300/35 hover:bg-cyan-300/10"
            >
              <div className="mb-4 inline-flex rounded-lg border border-cyan-300/35 bg-cyan-300/10 p-2.5 text-cyan-200">
                <card.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">{card.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <div data-reveal className="mb-10 max-w-3xl">
          <p className="text-sm uppercase tracking-[0.2em] text-orange-200/90">Solution</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            NextStop delivers a connected travel layer for every route.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {solutionCards.map((card) => (
            <article
              key={card.title}
              data-reveal
              className="group relative overflow-hidden rounded-2xl border border-cyan-300/25 bg-slate-900/60 p-6 backdrop-blur-xl transition duration-300 hover:border-orange-300/45 hover:shadow-[0_0_40px_rgba(56,189,248,0.2)]"
            >
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-400/20 blur-2xl transition duration-300 group-hover:bg-orange-400/25" />
              <div className="relative">
                <div className="mb-4 inline-flex rounded-lg border border-orange-300/30 bg-orange-300/10 p-2.5 text-orange-200">
                  <card.icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-white">{card.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{card.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <div data-reveal className="mb-10 max-w-3xl">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-200/80">Features</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            Tools built for passengers, drivers, and operations teams.
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {featureCards.map((feature) => (
            <article
              key={feature.title}
              data-reveal
              className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 backdrop-blur-xl transition duration-300 hover:-translate-y-1.5 hover:border-cyan-300/45 hover:shadow-[0_12px_36px_rgba(14,165,233,0.2)]"
            >
              <div className="mb-4 inline-flex rounded-lg border border-cyan-200/25 bg-cyan-400/10 p-2.5 text-cyan-200 transition duration-300 group-hover:border-orange-300/35 group-hover:bg-orange-400/15 group-hover:text-orange-200">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="final-cta" className="relative z-10 px-6 py-28">
        <div
          data-reveal
          className="mx-auto max-w-5xl rounded-3xl border border-cyan-300/20 bg-slate-900/60 p-10 text-center backdrop-blur-2xl sm:p-16"
        >
          <p className="text-sm uppercase tracking-[0.22em] text-orange-200/90">Get Started</p>
          <h2 className="mt-4 text-4xl font-extrabold text-white sm:text-6xl">
            Start tracking your bus now
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm text-slate-300 sm:text-base">
            Upgrade commute confidence with live visibility, smarter routing, and seamless
            passenger-driver coordination.
          </p>
          <div className="mt-8">
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/45 bg-cyan-300/15 px-7 py-3.5 text-sm font-semibold text-cyan-100 transition duration-300 hover:bg-cyan-300/30 hover:shadow-[0_0_34px_rgba(6,182,212,0.45)]"
            >
              Launch NextStop
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700&family=Space+Grotesk:wght@400;500;700;800&display=swap");

        .particle {
          animation-name: particleFloat;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.65));
        }

        @keyframes particleFloat {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, -22px, 0);
          }
        }
      `}</style>
    </main>
  );
}
