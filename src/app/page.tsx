"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowRight,
  Search,
  BarChart3,
  Link2,
  UserCheck,
  Sparkles,
  Shield,
  Zap,
  ChevronLast,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import CornerBox from "@/components/ui/CornerBox";

const FEATURES = [
  {
    icon: Zap,
    title: "Event Creation",
    desc: "Beautiful event pages live in minutes.",
  },
  {
    icon: UserCheck,
    title: "Registrations",
    desc: "Track, approve & manage every attendee.",
  },
  {
    icon: Sparkles,
    title: "No Login Needed",
    desc: "Attendees register with zero friction.",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    desc: "Rate limiting & duplicate detection.",
  },
  {
    icon: BarChart3,
    title: "Live Analytics",
    desc: "Insights on registrations & revenue.",
  },
  {
    icon: Link2,
    title: "Shareable Links",
    desc: "One clean URL ready to share anywhere.",
  },
];

const HIGHLIGHTS = [
  { icon: Zap, text: "Instant ticket delivery" },
  { icon: Search, text: "Verify with ticket ID" },
  { icon: BarChart3, text: "Filter & manage easily" },
];

const MARQUEE_WORDS = [
  "Event Creation",
  "Registration",
  "Analytics",
  "Shareable Links",
  "No Login",
  "Secure",
  "Fast",
  "Reliable",
  "Free",
  "Unlimited",
];

export default function Home() {
  const { user } = useAuth();
  const gsapLoaded = useRef(false);
  const [scrolled, setScrolled] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["site-settings-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value");
      if (error) throw error;
      return Object.fromEntries(
        (data || []).map((s) => [s.key, s.value || ""]),
      );
    },
  });

  const heroHeading =
    settings?.hero_heading || "Event Registration, Simplified";
  const heroDesc =
    settings?.hero_description ||
    "Create events, share links, and manage attendees — all from one clean dashboard.";
  const footerText =
    settings?.footer_text ||
    `© ${new Date().getFullYear()} Regixo. All rights reserved.`;

  const parts = heroHeading.split(",");
  const firstLine = parts[0]?.trim() || heroHeading;
  const secondLine = parts.slice(1).join(",").trim();
  const firstLineWords = firstLine.split(" ").filter(Boolean);
  const firstLineStart = firstLineWords.slice(0, -1).join(" ");
  const firstLineHighlight =
    firstLineWords[firstLineWords.length - 1] ?? firstLine;

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    if (gsapLoaded.current) return;
    gsapLoaded.current = true;

    const load = (src: string, cb: () => void) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = cb;
      document.head.appendChild(s);
    };

    load(
      "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js",
      () => {
        load(
          "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js",
          () => {
            load(
              "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollToPlugin.min.js",
              () => {
                const g = (window as any).gsap;
                const ST = (window as any).ScrollTrigger;
                g.registerPlugin(ST, (window as any).ScrollToPlugin);

                document.querySelectorAll('a[href^="#"]').forEach((a) => {
                  a.addEventListener("click", (e) => {
                    const href = (a as HTMLAnchorElement).getAttribute("href");
                    const target = href ? document.querySelector(href) : null;
                    if (target) {
                      e.preventDefault();
                      g.to(window, {
                        duration: 1.0,
                        scrollTo: { y: target, offsetY: 64 },
                        ease: "power3.inOut",
                      });
                    }
                  });
                });

                const bar = document.getElementById("spb");
                if (bar)
                  ST.create({
                    start: 0,
                    end: "max",
                    onUpdate: (s: any) => {
                      bar.style.transform = `scaleX(${s.progress})`;
                    },
                  });

                g.from(".hero-h1", {
                  y: 50,
                  opacity: 0,
                  duration: 1.0,
                  ease: "power4.out",
                  delay: 0.1,
                });
                g.from(".hero-sub", {
                  opacity: 0,
                  y: 20,
                  duration: 0.9,
                  ease: "power3.out",
                  delay: 0.55,
                });
                g.from(".hero-btns", {
                  opacity: 0,
                  y: 16,
                  duration: 0.8,
                  ease: "power3.out",
                  delay: 0.7,
                });
                g.from(".hero-highlights", {
                  opacity: 0,
                  y: 14,
                  duration: 0.8,
                  ease: "power3.out",
                  delay: 0.85,
                });

                g.utils.toArray(".gf").forEach((el: any) => {
                  g.from(el, {
                    scrollTrigger: {
                      trigger: el,
                      start: "top 88%",
                      toggleActions: "play none none none",
                    },
                    opacity: 0,
                    y: 36,
                    duration: 0.85,
                    ease: "power3.out",
                  });
                });
                g.from(".feat-card", {
                  scrollTrigger: { trigger: ".feat-grid", start: "top 82%" },
                  opacity: 0,
                  y: 28,
                  duration: 0.65,
                  ease: "power3.out",
                  stagger: 0.07,
                });
                g.from(".step-card", {
                  scrollTrigger: { trigger: ".steps-grid", start: "top 82%" },
                  opacity: 0,
                  y: 24,
                  duration: 0.65,
                  ease: "power3.out",
                  stagger: 0.1,
                });
                g.from(".cta-box", {
                  scrollTrigger: { trigger: ".cta-box", start: "top 82%" },
                  opacity: 0,
                  scale: 0.975,
                  y: 24,
                  duration: 0.9,
                  ease: "power4.out",
                });
              },
            );
          },
        );
      },
    );
  }, []);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: auto; }
        .pg { background: #fff; color: #111; min-height: 100vh; overflow-x: hidden; -webkit-font-smoothing: antialiased; }background: #fff; color: #111; min-height: 100vh; overflow-x: hidden; -webkit-font-smoothing: antialiased; }
        #spb { position: fixed; top: 0; left: 0; right: 0; height: 2px; background: #111; transform-origin: left; transform: scaleX(0); z-index: 9999; pointer-events: none; }
        .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 300; height: 58px; padding: 0 28px; display: flex; align-items: center; justify-content: space-between; transition: background .3s, border-color .3s, box-shadow .3s; }
        .nav.sc { backdrop-filter: blur(20px); border-bottom: 1px solid rgba(0,0,0,0.07); box-shadow: 0 1px 24px rgba(0,0,0,.06); }
        .nav-logo { font-size: 1rem; font-weight: 900; letter-spacing: -.04em; color: #111; text-decoration: none; display: flex; align-items: center; gap: 6px; }
        .nav-logo-dot { width: 6px; height: 6px; border-radius: 50%; background: #111; }
        .nav-center { position: absolute; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 2px; }
        .nav-right { display: flex; align-items: center; gap: 2px; }
        .nav-link { font-size: .78rem; font-weight: 500; color: #777; text-decoration: none; padding: 5px 10px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; transition: color .15s, background .15s; }
        .nav-link:hover { color: #111; background: #f3f3f3; }
        .nav-cta { font-size: .78rem; font-weight: 400; color: #fff; background: #111; border-radius: 3px; padding: 7px 15px; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; transition: background .15s, transform .15s; margin-left: 6px; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
        .nav-cta:hover { background: #222; transform: translateY(-1px); }
        .hero { min-height: 100vh; padding-top: 140px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; position: relative; border-bottom: 1px solid #ebebeb; overflow: hidden; }
        .hero-content { display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1; padding: 0 24px 56px; flex: 1; justify-content: center; }
        .hero-grid { position: absolute; inset: 0; pointer-events: none; z-index: 0; background-image: linear-gradient(rgba(0,0,0,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.04) 1px, transparent 1px); background-size: 52px 52px; mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 10%, transparent 100%); }
        .hero-dots { position: absolute; inset: 0; pointer-events: none; z-index: 0; background-image: radial-gradient(circle, #c8c8c8 1px, transparent 1px); background-size: 28px 28px; mask-image: radial-gradient(ellipse 55% 55% at 50% 50%, black 0%, transparent 100%); opacity: .5; }
        .hero-glow { position: absolute; top: -100px; left: 50%; transform: translateX(-50%); width: 600px; height: 480px; pointer-events: none; z-index: 0; background: radial-gradient(ellipse at center, rgba(0,0,0,.025) 0%, transparent 70%); }
        .hero-corner-tl, .hero-corner-tr, .hero-corner-bl, .hero-corner-br { position: absolute; width: 56px; height: 56px; pointer-events: none; z-index: 1; }
        .hero-corner-tl { top: 80px; left: 32px; border-top: 1.5px solid #d8d8d8; border-left: 1.5px solid #d8d8d8; }
        .hero-corner-tr { top: 80px; right: 32px; border-top: 1.5px solid #d8d8d8; border-right: 1.5px solid #d8d8d8; }
        .hero-corner-bl { bottom: 52px; left: 32px; border-bottom: 1.5px solid #d8d8d8; border-left: 1.5px solid #d8d8d8; }
        .hero-corner-br { bottom: 52px; right: 32px; border-bottom: 1.5px solid #d8d8d8; border-right: 1.5px solid #d8d8d8; }
        .hero-label { display: inline-flex; align-items: center; gap: 7px; font-size: .67rem; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #888; margin-bottom: 28px; border: 1px solid #e0e0e0; padding: 4px 12px; border-radius: 999px; background: rgba(255,255,255,.9); }
        .hero-dot { width: 5px; height: 5px; background: #22c55e; border-radius: 50%; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
        .hero-h1 { font-size: clamp(2.6rem, 8.5vw, 7rem); font-weight: 500; line-height: 1.08; letter-spacing: -.05em; color: #111; max-width: 860px; margin: 0 auto; }
        .hero-sub { font-size: clamp(.875rem, 1.8vw, 1rem); font-weight: 400; color: #777; line-height: 1.75; max-width: 420px; margin: 22px auto 0; }
        .hero-btns { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 28px; }
        .btn-d { font-size: .8rem; font-weight: 400; color: #fff; background: #111; padding: 10px 20px; border-radius: 4px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 12px rgba(0,0,0,.18); transition: background .15s, transform .15s; }
        .btn-d:hover { background: #1a1a1a; transform: translateY(-1px); }
        .btn-l { font-size: .8rem; font-weight: 400; color: #555; background: #f7f7f7; padding: 10px 18px; border-radius: 4px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; border: 1px solid #e4e4e4; transition: background .15s, transform .15s; }
        .btn-l:hover { background: #efefef; color: #111; transform: translateY(-1px); }
        .hero-highlights { display: flex; gap: 0; margin-top: 44px; border: 1px solid #e8e8e8; border-radius: 14px; overflow: hidden; background: rgba(255,255,255,.7); }
        .hhl { flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px; padding: 16px 24px; border-right: 1px solid #e8e8e8; }
        .hhl:last-child { border-right: none; }
        .hhl-text { font-size: .8rem; font-weight: 600; color: #333; white-space: nowrap; }
        .hero-mqw { width: 100%; overflow: hidden; padding: 15px 0; background: #fafafa; border-top: 1px solid #ebebeb; position: relative; z-index: 1; }
        .mqt { display: flex; white-space: nowrap; animation: mq 28s linear infinite; }
        .hero-mqw:hover .mqt { animation-play-state: paused; }
        @keyframes mq { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .mqw-word { display: inline-block; font-size: .67rem; font-weight: 700; text-transform: uppercase; letter-spacing: .14em; color: #c8c8c8; padding: 0 26px; }
        .mqw-sep { display: inline-block; width: 3px; height: 3px; background: #ccc; border-radius: 50%; vertical-align: middle; }
        .wrap { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        .sec { padding: 88px 0; }
        .eyebrow { font-size: .64rem; font-weight: 700; text-transform: uppercase; letter-spacing: .14em; color: #aaa; margin-bottom: 12px; }
        .sec-title { font-size: clamp(1.8rem, 4vw, 3.2rem); font-weight: 500; letter-spacing: -.05em; color: #111; line-height: 1.05; }
        .sec-sub { font-size: .9rem; color: #888; line-height: 1.7; max-width: 340px; margin-top: 10px; }
        .sec-head { margin-bottom: 48px; }
        .feat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: #e8e8e8; border: 1px solid #e8e8e8; border-radius: 16px; overflow: hidden; }
        .feat-card { background: #fff; padding: 28px 24px; transition: background .18s; display: flex; flex-direction: column; gap: 10px; position: relative; overflow: hidden; }
        .feat-card:hover { background: #fafafa; }
        .feat-icon-wrap { width: 32px; height: 32px; border-radius: 8px; background: #f3f3f3; border: 1px solid #e8e8e8; display: flex; align-items: center; justify-content: center; color: #555; }
        .feat-num { font-size: .6rem; font-weight: 700; color: #d8d8d8; letter-spacing: .1em; text-transform: uppercase; }
        .feat-title { font-size: .9rem; font-weight: 700; color: #111; letter-spacing: -.02em; }
        .feat-desc { font-size: .82rem; color: #888; line-height: 1.65; }
        .steps-bg { background: #fafafa; border-top: 1px solid #ebebeb; border-bottom: 1px solid #ebebeb; }
        .steps-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
        .step-card { background: #fff; border: 1px solid #e8e8e8; border-radius: 14px; padding: 28px 22px; transition: border-color .18s, transform .2s, box-shadow .2s; }
        .step-card:hover { border-color: #ccc; transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,0,0,.06); }
        .step-n { font-size: 2.5rem; font-weight: 900; color: #ebebeb; letter-spacing: -.06em; line-height: 1; margin-bottom: 14px; }
        .step-title { font-size: .875rem; font-weight: 700; color: #111; margin-bottom: 6px; }
        .step-desc { font-size: .82rem; color: #888; line-height: 1.65; }
        .cta-sec { padding: 88px 0; }
        .cta-box { background: #111; border-radius: 20px; padding: 72px 56px; display: flex; align-items: center; justify-content: space-between; gap: 40px; flex-wrap: wrap; position: relative; overflow: hidden; }
        .cta-l { position: relative; flex: 1; min-width: 180px; }
        .cta-eyebrow { font-size: .62rem; font-weight: 700; text-transform: uppercase; letter-spacing: .14em; color: rgba(255,255,255,.28); margin-bottom: 10px; }
        .cta-title { font-size: clamp(1.8rem, 4.5vw, 3.5rem); font-weight: 900; color: #fff; letter-spacing: -.05em; line-height: 1.05; }
        .cta-r { display: flex; flex-direction: column; align-items: flex-start; gap: 16px; position: relative; flex-shrink: 0; }
        .cta-sub { font-size: .85rem; color: rgba(255,255,255,.4); line-height: 1.75; max-width: 230px; }
        .cta-btns { display: flex; gap: 8px; flex-wrap: wrap; }
        .cta-btn-p { font-size: .8rem; font-weight: 400; color: #111; background: #fff; padding: 10px 20px; border-radius: 4px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 12px rgba(0,0,0,.2); transition: background .15s, transform .15s; white-space: nowrap; }
        .cta-btn-p:hover { background: #f0f0f0; transform: translateY(-1px); }
        .cta-btn-g { font-size: .8rem; font-weight: 400; color: rgba(255,255,255,.5); background: transparent; padding: 10px 16px; border-radius: 4px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; border: 1.5px solid rgba(255,255,255,.14); transition: border-color .15s, color .15s; white-space: nowrap; }
        .cta-btn-g:hover { border-color: rgba(255,255,255,.3); color: rgba(255,255,255,.85); }
        .cta-checks { display: flex; flex-wrap: wrap; gap: 12px; }
        .cta-check { font-size: .72rem; color: rgba(255,255,255,.28); display: flex; align-items: center; gap: 6px; }
        .cta-check-tick { width: 14px; height: 14px; border-radius: 50%; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.16); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: rgba(255,255,255,.5); }
        .footer { border-top: 1px solid #ebebeb; padding: 24px; }
        .footer-in { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
        .footer-logo { font-size: .875rem; font-weight: 900; color: #333; letter-spacing: -.04em; }
        .footer-copy { font-size: .7rem; color: #bbb; }
        @media(max-width:820px) { .feat-grid { grid-template-columns: repeat(2,1fr); } }
        @media(max-width:600px) {
          .nav { padding: 0 16px; height: 54px; }
          .nav-center { display: none; }
          .nav-link-text { display: none; }
          .hero { padding-top: 106px; min-height: 90vh; }
          .hero-content { padding: 0 20px 40px; }
          .hero-btns { flex-direction: column; align-items: center; }
          .btn-d, .btn-l { width: 100%; max-width: 280px; justify-content: center; }
          .hero-highlights { flex-direction: column; border-radius: 12px; margin-top: 32px; }
          .hhl { border-right: none; border-bottom: 1px solid #e8e8e8; }
          .hhl:last-child { border-bottom: none; }
          .feat-grid { grid-template-columns: 1fr; }
          .steps-grid { grid-template-columns: 1fr; }
          .cta-box { padding: 36px 22px; flex-direction: column; }
          .cta-btns { width: 100%; flex-direction: column; }
        }
      `}</style>

      <div className="pg">
        <div id="spb" />

        {/* NAV */}
        <nav
          className={`nav${scrolled ? " sc" : ""} bg-white/70 border-b border-black/30 backdrop-blur-2xl`}
        >
          <Link href="/" className="nav-logo font-display font-medium">
            <span className="nav-logo-dot" />
            Regixo
          </Link>
          <div className="nav-center">
            <a href="#features" className="nav-link">
              Features
            </a>
            <a href="#process" className="nav-link">
              Process
            </a>
          </div>
          <div className="nav-right">
            <Link href="/find-ticket" className="nav-link">
              <Search size={15} />
              <span className="nav-link-text">Find Ticket</span>
            </Link>
            {user ? (
              <Link href="/dashboard" className="nav-cta">
                <ChevronLast size={14} />
                <span>Dashboard</span>
              </Link>
            ) : (
              <Link href="/auth" className="nav-cta">
                <ArrowRight size={12} />
                <span>Get Started</span>
              </Link>
            )}
          </div>
        </nav>

        {/* HERO */}
        <section className="hero">
          <div className="hero-grid" />
          <div className="hero-dots" />
          <div className="hero-glow" />
          <div className="hero-corner-tl" />
          <div className="hero-corner-tr" />
          <div className="hero-corner-bl" />
          <div className="hero-corner-br" />

          <div className="hero-content">
            <div className="hero-label">
              <span className="hero-dot" />
              Simple event management
            </div>

            <h1 className="hero-h1">
              {firstLineStart && `${firstLineStart} `}
              <CornerBox>{firstLineHighlight}</CornerBox>
              {secondLine && (
                <>
                  , <br className="hidden sm:block" />
                  {secondLine}
                </>
              )}
            </h1>

            <p className="hero-sub">{heroDesc}</p>

            <div className="hero-btns">
              <Link href="/auth" className="btn-d">
                Create Your Event <ArrowRight size={13} />
              </Link>
              <a href="#features" className="btn-l">
                See Features
              </a>
            </div>

            <div className="hero-highlights">
              {HIGHLIGHTS.map((x) => (
                <div key={x.text} className="hhl">
                  <x.icon size={15} color="#888" />
                  <span className="hhl-text">{x.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-mqw">
            <div className="mqt">
              {Array(4)
                .fill(MARQUEE_WORDS)
                .flat()
                .map((w, i) => (
                  <span key={i}>
                    <span className="mqw-word">{w}</span>
                    <span className="mqw-sep" />
                  </span>
                ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="sec" id="features">
          <div className="wrap">
            <div className="sec-head gf">
              <div className="eyebrow">
                <CornerBox>Features</CornerBox>
              </div>
              <h2 className="sec-title font-display">
                Everything you need
                <br />
                to run great events
              </h2>
              <p className="sec-sub">
                A complete toolkit for organizers who value simplicity.
              </p>
            </div>
            <div className="feat-grid">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="feat-card">
                    <div className="feat-num">0{i + 1}</div>
                    <div className="feat-icon-wrap">
                      <Icon size={15} />
                    </div>
                    <div className="feat-title">{f.title}</div>
                    <div className="feat-desc">{f.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* STEPS */}
        <section className="steps-bg sec" id="process">
          <div className="wrap">
            <div className="sec-head gf">
              <div className="eyebrow">
                <CornerBox>How it works</CornerBox>
              </div>
              <h2 className="sec-title font-display">
                Three steps
                <br />
                to go live
              </h2>
            </div>
            <div className="steps-grid">
              {[
                {
                  n: "01",
                  t: "Create your event",
                  d: "Add details, set a price, and customize the form.",
                },
                {
                  n: "02",
                  t: "Share the link",
                  d: "Get a public URL and share it anywhere.",
                },
                {
                  n: "03",
                  t: "Manage attendees",
                  d: "Approve registrations, track payments, export lists.",
                },
              ].map((s) => (
                <div key={s.n} className="step-card">
                  <div className="step-n">{s.n}</div>
                  <div className="step-title">{s.t}</div>
                  <div className="step-desc">{s.d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="cta-sec">
          <div className="wrap">
            <div className="cta-box">
              <div className="cta-l">
                <div className="cta-eyebrow">Get started today</div>
                <h2 className="cta-title font-display">
                  Ready to
                  <br />
                  go live?
                </h2>
              </div>
              <div className="cta-r">
                <p className="cta-sub">
                  Create your first event in minutes. Free forever, no credit
                  card needed.
                </p>
                <div className="cta-btns">
                  <Link href="/auth" className="cta-btn-p">
                    Start for Free <ArrowRight size={13} />
                  </Link>
                  <a href="#features" className="cta-btn-g">
                    See Features
                  </a>
                </div>
                <div className="cta-checks">
                  {["Free to use", "No credit card", "Unlimited events"].map(
                    (t) => (
                      <span key={t} className="cta-check">
                        <span className="cta-check-tick">
                          <svg
                            width="7"
                            height="7"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </span>
                        {t}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="footer">
          <div className="footer-in">
            <div className="footer-logo">Regixo</div>
            <div>
              <div className="footer-copy text-right">{footerText}</div>
              <div className="footer-copy text-right">
                Created with ❤️ by{" "}
                <a
                  href="https://www.facebook.com/motochowdhury2nd"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontWeight: 600, color: "#111" }}
                >
                  Mottalib
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
