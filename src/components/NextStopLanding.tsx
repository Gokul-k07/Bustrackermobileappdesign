import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import {
  ArrowRight,
  Bot,
  Clock3,
  EyeOff,
  MapPin,
  Navigation,
  Route,
  Share2,
} from "lucide-react";

const TOTAL_FRAMES = 240;
const LAST_FRAME_INDEX = TOTAL_FRAMES - 1;

const problemItems = [
  "Passengers wait without knowing bus location",
  "Public transport lacks real-time visibility",
  "Time wasted at bus stops",
];

const featureItems = [
  {
    title: "Live Bus Tracking",
    description: "Track bus movement in real time with smooth location updates.",
    icon: Navigation,
  },
  {
    title: "Driver Location Sharing",
    description: "Drivers share live position for accurate passenger visibility.",
    icon: Share2,
  },
  {
    title: "Route Visualization",
    description: "Understand route progress with stop-by-stop mapping overlays.",
    icon: Route,
  },
  {
    title: "AI Bus Route Chatbot",
    description: "Ask for routes, ETAs, and alternatives with natural language.",
    icon: Bot,
  },
];

const frameSources = (index: number) => {
  const id = String(index + 1).padStart(3, "0");
  return [
    `/hero-frames/frame${id}.png`,
    `/hero-frames/frame${id}.jpg`,
    `/hero-frames/ezgif-frame-${id}.jpg`,
  ];
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const activeTextGroup = (frame: number) => {
  if (frame < 60) return 0;
  if (frame < 120) return 1;
  if (frame < 180) return 2;
  return 3;
};

export default function NextStopLanding() {
  const navigate = useNavigate();

  const pageRef = useRef<HTMLElement | null>(null);
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const heroPinRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textGroupRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const renderedFrameRef = useRef(0);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const activeGroupRef = useRef(-1);

  const [currentFrame, setCurrentFrame] = useState(0);
  const [framesReady, setFramesReady] = useState(false);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const pageEl = pageRef.current;
    const heroEl = heroSectionRef.current;
    const pinEl = heroPinRef.current;
    const canvas = canvasRef.current;
    if (!pageEl || !heroEl || !pinEl || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let cancelled = false;

    const drawFrame = (index: number) => {
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      const image = imagesRef.current[index];
      if (!image) return;

      const imageWidth = image.naturalWidth || image.width;
      const imageHeight = image.naturalHeight || image.height;
      if (!imageWidth || !imageHeight) return;

      const scale = Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight);
      const drawWidth = imageWidth * scale;
      const drawHeight = imageHeight * scale;
      const drawX = (canvasWidth - drawWidth) * 0.5;
      const drawY = (canvasHeight - drawHeight) * 0.5;
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    };

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      drawFrame(renderedFrameRef.current);
    };

    const renderFromProgress = () => {
      const mappedFrame = Math.floor(progressRef.current * LAST_FRAME_INDEX);
      const nextFrame = clamp(mappedFrame, 0, LAST_FRAME_INDEX);
      if (nextFrame === renderedFrameRef.current) return;

      renderedFrameRef.current = nextFrame;
      drawFrame(nextFrame);
      setCurrentFrame((prev) => (prev === nextFrame ? prev : nextFrame));
    };

    const queueRender = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        renderFromProgress();
      });
    };

    const loadSingleFrame = (sources: string[]) =>
      new Promise<HTMLImageElement | null>((resolve) => {
        const trySource = (sourceIndex: number) => {
          if (sourceIndex >= sources.length) {
            resolve(null);
            return;
          }

          const image = new Image();
          image.decoding = "async";
          image.src = sources[sourceIndex];
          image.onload = () => resolve(image);
          image.onerror = () => trySource(sourceIndex + 1);
        };

        trySource(0);
      });

    const preloadFrames = async () => {
      const loaded = await Promise.all(
        Array.from({ length: TOTAL_FRAMES }, (_, index) =>
          loadSingleFrame(frameSources(index)),
        ),
      );
      imagesRef.current = loaded;
    };

    const context = gsap.context(() => {
      textGroupRefs.current.forEach((node, index) => {
        if (!node) return;
        gsap.set(node, { autoAlpha: index === 0 ? 1 : 0, y: index === 0 ? 0 : 40 });
      });
      activeGroupRef.current = 0;

      window.addEventListener("resize", resizeCanvas);

      preloadFrames().then(() => {
        if (cancelled) return;

        setFramesReady(true);
        renderedFrameRef.current = 0;
        resizeCanvas();
        drawFrame(0);

        ScrollTrigger.create({
          trigger: heroEl,
          start: "top top",
          end: "bottom top",
          scrub: true,
          pin: pinEl,
          pinSpacing: false,
          anticipatePin: 1,
          onUpdate: (self) => {
            progressRef.current = self.progress;
            queueRender();
          },
        });

        gsap.utils.toArray<HTMLElement>("[data-fade-up]").forEach((node) => {
          gsap.fromTo(
            node,
            { autoAlpha: 0, y: 40 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.8,
              ease: "power2.out",
              scrollTrigger: {
                trigger: node,
                start: "top 84%",
                toggleActions: "play none none reverse",
              },
            },
          );
        });

        ScrollTrigger.refresh();
      });
    }, pageEl);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", resizeCanvas);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      context.revert();
    };
  }, []);

  useEffect(() => {
    const nextGroup = activeTextGroup(currentFrame);
    if (nextGroup === activeGroupRef.current) return;

    const previousNode =
      activeGroupRef.current >= 0 ? textGroupRefs.current[activeGroupRef.current] : null;
    const nextNode = textGroupRefs.current[nextGroup];

    if (previousNode) {
      gsap.to(previousNode, {
        autoAlpha: 0,
        y: 40,
        duration: 0.42,
        ease: "power2.out",
        overwrite: true,
      });
    }

    if (nextNode) {
      gsap.to(nextNode, {
        autoAlpha: 1,
        y: 0,
        duration: 0.55,
        ease: "power2.out",
        overwrite: true,
      });
    }

    activeGroupRef.current = nextGroup;
  }, [currentFrame]);

  return (
    <main ref={pageRef} className="nextstop-landing">
      <div className="nextstop-ambient">
        <div className="nextstop-glow nextstop-glow-cyan" />
        <div className="nextstop-glow nextstop-glow-orange" />
      </div>

      <section ref={heroSectionRef} className="hero-shell">
        <div ref={heroPinRef} className="hero-pin">
          <canvas ref={canvasRef} className="hero-canvas" />
          <div className="hero-overlay" />

          {!framesReady && <p className="hero-loading">Loading hero frames...</p>}

          <div className="hero-text-stage">
            <div
              ref={(node) => {
                textGroupRefs.current[0] = node;
              }}
              className="hero-group"
            >
              <h1 className="hero-title">NextStop</h1>
              <p className="hero-subtitle">Real-time bus tracking for smarter travel</p>
            </div>

            <div
              ref={(node) => {
                textGroupRefs.current[1] = node;
              }}
              className="hero-group"
            >
              <h2 className="hero-heading">Never Miss Your Bus</h2>
              <p className="hero-subtitle">Know exactly where your bus is.</p>
            </div>

            <div
              ref={(node) => {
                textGroupRefs.current[2] = node;
              }}
              className="hero-group"
            >
              <h2 className="hero-heading">Smart Public Transport</h2>
              <p className="hero-subtitle">
                Live location sharing between drivers and passengers.
              </p>
            </div>

            <div
              ref={(node) => {
                textGroupRefs.current[3] = node;
              }}
              className="hero-group"
            >
              <h2 className="hero-heading">Built for Smart Cities</h2>
              <div className="hero-button-wrap">
                <button
                  type="button"
                  onClick={() => navigate("/app")}
                  className="btn btn-orange"
                >
                  Open NextStop
                  <ArrowRight className="btn-icon" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-problem section-full">
        <div className="section-container">
          <div data-fade-up className="section-header">
            <p className="section-kicker">Problem</p>
            <h2 className="section-title">Daily commuting still lacks clarity.</h2>
          </div>

          <div className="problem-grid">
            {problemItems.map((item, index) => (
              <article key={item} data-fade-up className="glass-card">
                <div className="icon-pill">
                  {index === 0 && <Clock3 className="icon" />}
                  {index === 1 && <EyeOff className="icon" />}
                  {index === 2 && <MapPin className="icon" />}
                </div>
                <p className="card-text">{item}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-full">
        <div className="section-container solution-grid">
          <div data-fade-up>
            <p className="section-kicker section-kicker-orange">Solution</p>
            <h2 className="section-title">Real-time transit intelligence in one platform.</h2>
            <p className="section-text">
              NextStop provides real-time bus tracking using shared driver location and
              interactive route maps.
            </p>
          </div>

          <div data-fade-up className="solution-card">
            <div className="solution-glow" />
            <div className="solution-stack">
              <div className="solution-row">
                <p className="solution-label">Live Feed</p>
                <p className="solution-copy">Driver 24 is 2.3 km away. ETA 6 mins.</p>
              </div>
              <div className="solution-row">
                <p className="solution-label solution-label-orange">Route Layer</p>
                <p className="solution-copy">
                  14 active stops visualized with live route progression.
                </p>
              </div>
              <div className="solution-row">
                <p className="solution-label">Secure Share</p>
                <p className="solution-copy">
                  Passenger visibility enabled via authenticated location sharing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-container">
          <div data-fade-up className="section-header">
            <p className="section-kicker">Features</p>
            <h2 className="section-title">
              Built for passengers, drivers, and operations teams.
            </h2>
          </div>

          <div className="feature-grid">
            {featureItems.map((feature) => (
              <article key={feature.title} data-fade-up className="feature-card">
                <div className="icon-pill">
                  <feature.icon className="icon" />
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-copy">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-final">
        <div data-fade-up className="section-container final-card">
          <h2 className="final-title">Start Tracking Your Bus Now</h2>
          <p className="final-copy">
            Move from uncertainty to confidence with real-time transit visibility.
          </p>
          <div className="hero-button-wrap">
            <button type="button" onClick={() => navigate("/app")} className="btn btn-cyan">
              Open NextStop App
              <ArrowRight className="btn-icon" />
            </button>
          </div>
        </div>
      </section>

      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700&family=Space+Grotesk:wght@400;500;700;800&display=swap");

        .nextstop-landing {
          position: relative;
          overflow-x: clip;
          background: #020617;
          color: #e2e8f0;
          font-family: "Space Grotesk", "Rajdhani", "Segoe UI", sans-serif;
        }

        .nextstop-ambient {
          pointer-events: none;
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .nextstop-glow {
          position: absolute;
          border-radius: 999px;
          filter: blur(56px);
        }

        .nextstop-glow-cyan {
          width: 300px;
          height: 300px;
          left: -100px;
          top: 96px;
          background: rgba(6, 182, 212, 0.28);
        }

        .nextstop-glow-orange {
          width: 300px;
          height: 300px;
          right: -120px;
          top: 22%;
          background: rgba(249, 115, 22, 0.2);
        }

        .hero-shell {
          position: relative;
          height: 300vh;
        }

        .hero-pin {
          position: relative;
          height: 100vh;
          overflow: hidden;
        }

        .hero-canvas {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
        }

        .hero-overlay {
          pointer-events: none;
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0, 0, 0, 0.28), rgba(0, 0, 0, 0.45), rgba(2, 6, 23, 0.95));
        }

        .hero-loading {
          position: absolute;
          top: 24px;
          right: 24px;
          z-index: 22;
          margin: 0;
          border-radius: 8px;
          border: 1px solid rgba(103, 232, 249, 0.35);
          background: rgba(15, 23, 42, 0.72);
          color: #cffafe;
          padding: 6px 10px;
          font-size: 12px;
        }

        .hero-text-stage {
          position: absolute;
          inset: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 0 24px;
        }

        .hero-group {
          position: absolute;
          max-width: 920px;
        }

        .hero-title {
          margin: 0;
          font-size: clamp(3rem, 10vw, 6rem);
          line-height: 1.02;
          font-weight: 800;
          letter-spacing: -0.04em;
          background: linear-gradient(90deg, #bae6fd, #67e8f9, #fdba74);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .hero-heading {
          margin: 0;
          font-size: clamp(2rem, 7.8vw, 4.2rem);
          line-height: 1.06;
          font-weight: 700;
          color: #cffafe;
        }

        .hero-subtitle {
          margin: 16px 0 0;
          font-size: clamp(1rem, 2.6vw, 1.35rem);
          color: #e2e8f0;
        }

        .hero-button-wrap {
          margin-top: 28px;
          display: flex;
          justify-content: center;
        }

        .btn {
          border: 1px solid;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: background 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease;
        }

        .btn:hover {
          transform: translateY(-1px);
        }

        .btn-icon {
          width: 16px;
          height: 16px;
        }

        .btn-orange {
          border-color: rgba(253, 186, 116, 0.55);
          color: #ffedd5;
          background: rgba(251, 146, 60, 0.2);
        }

        .btn-orange:hover {
          background: rgba(251, 146, 60, 0.36);
          box-shadow: 0 0 30px rgba(251, 146, 60, 0.42);
        }

        .btn-cyan {
          border-color: rgba(165, 243, 252, 0.45);
          color: #cffafe;
          background: rgba(34, 211, 238, 0.16);
        }

        .btn-cyan:hover {
          background: rgba(34, 211, 238, 0.3);
          box-shadow: 0 0 34px rgba(6, 182, 212, 0.45);
        }

        .section {
          position: relative;
          padding: 96px 24px;
        }

        .section-full {
          min-height: 100vh;
          display: flex;
          align-items: center;
        }

        .section-problem {
          background: linear-gradient(to bottom, #071126, #030917);
        }

        .section-container {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
        }

        .section-header {
          max-width: 760px;
          margin-bottom: 36px;
        }

        .section-kicker {
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 12px;
          color: rgba(165, 243, 252, 0.95);
        }

        .section-kicker-orange {
          color: rgba(254, 215, 170, 0.95);
        }

        .section-title {
          margin: 12px 0 0;
          font-size: clamp(2rem, 6vw, 3.25rem);
          line-height: 1.08;
          color: #ffffff;
        }

        .section-text {
          margin: 24px 0 0;
          max-width: 620px;
          font-size: 1.12rem;
          color: #cbd5e1;
          line-height: 1.7;
        }

        .problem-grid,
        .feature-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        .glass-card,
        .feature-card {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(16px);
          padding: 24px;
          transition: transform 0.24s ease, border-color 0.24s ease, background 0.24s ease;
        }

        .glass-card:hover,
        .feature-card:hover {
          transform: translateY(-6px);
          border-color: rgba(103, 232, 249, 0.45);
          background: rgba(34, 211, 238, 0.12);
        }

        .icon-pill {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(103, 232, 249, 0.4);
          background: rgba(34, 211, 238, 0.12);
          color: #a5f3fc;
          margin-bottom: 14px;
        }

        .icon {
          width: 18px;
          height: 18px;
        }

        .card-text {
          margin: 0;
          color: #e2e8f0;
          line-height: 1.6;
        }

        .solution-grid {
          display: grid;
          gap: 36px;
          align-items: center;
        }

        .solution-card {
          position: relative;
          border: 1px solid rgba(103, 232, 249, 0.28);
          border-radius: 22px;
          background: rgba(15, 23, 42, 0.62);
          backdrop-filter: blur(18px);
          padding: 28px;
          overflow: hidden;
        }

        .solution-glow {
          position: absolute;
          right: -36px;
          top: -36px;
          width: 120px;
          height: 120px;
          border-radius: 999px;
          background: rgba(34, 211, 238, 0.24);
          filter: blur(26px);
          pointer-events: none;
        }

        .solution-stack {
          display: grid;
          gap: 14px;
          position: relative;
          z-index: 1;
        }

        .solution-row {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          padding: 14px;
        }

        .solution-label {
          margin: 0;
          color: rgba(165, 243, 252, 0.95);
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .solution-label-orange {
          color: rgba(254, 215, 170, 0.95);
        }

        .solution-copy {
          margin: 8px 0 0;
          font-size: 14px;
          color: #e2e8f0;
          line-height: 1.5;
        }

        .feature-title {
          margin: 0;
          color: #ffffff;
          font-size: 1.14rem;
        }

        .feature-copy {
          margin: 10px 0 0;
          color: #cbd5e1;
          line-height: 1.58;
          font-size: 14px;
        }

        .section-final {
          padding-top: 24px;
          padding-bottom: 96px;
        }

        .final-card {
          border: 1px solid rgba(103, 232, 249, 0.22);
          border-radius: 24px;
          background: rgba(15, 23, 42, 0.62);
          backdrop-filter: blur(18px);
          padding: 40px 30px;
          text-align: center;
          max-width: 1024px;
        }

        .final-title {
          margin: 0;
          color: #ffffff;
          line-height: 1.1;
          font-size: clamp(2rem, 6vw, 3.8rem);
        }

        .final-copy {
          margin: 18px auto 0;
          max-width: 680px;
          color: #cbd5e1;
          line-height: 1.65;
          font-size: 1rem;
        }

        @media (min-width: 760px) {
          .problem-grid,
          .feature-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (min-width: 980px) {
          .problem-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .solution-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </main>
  );
}

