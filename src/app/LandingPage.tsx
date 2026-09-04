import { ArrowRight, BookOpen, CalendarDays, HeartHandshake, Lock, Mail, Sparkles, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";

const features = [
  {
    icon: Wand2,
    title: "Personalized, not invasive",
    text: "Age range and story tastes are enough. Names, birthdays, and notes stay optional.",
  },
  {
    icon: BookOpen,
    title: "Recurring story worlds",
    text: "Characters stay locked once chosen, so each episode feels like part of the same little universe.",
  },
  {
    icon: HeartHandshake,
    title: "Connected worlds",
    text: "Parents can approve trusted family friends so future episodes may include shared adventures.",
  },
  {
    icon: Lock,
    title: "Parent controlled",
    text: "Children do not search, message, or publish profiles. Parents manage every connection.",
  },
];

const steps = [
  "Pick an age range and story vibe.",
  "Choose a main character and supporting cast.",
  "Receive a new illustrated episode on schedule.",
];

export function LandingPage() {
  return (
    <div className="space-y-16">
      <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-honey-300/60 bg-honey-50 px-3 py-1 text-sm font-semibold text-moss-900 dark:bg-honey-300/12 dark:text-honey-100">
            <Sparkles size={16} />
            Your little one’s little world
          </div>
          <h1 className="mt-5 max-w-4xl text-5xl font-black tracking-tight text-moss-900 dark:text-white sm:text-6xl">
            A tiny story world that grows with your child.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-moss-700 dark:text-slate-300">
            Little World creates playful recurring illustrated stories with stable characters, gentle personalization, and parent-controlled sharing.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-moss-700 px-5 text-sm font-bold text-white shadow-sm shadow-moss-900/15 transition hover:bg-moss-800" to="/sign-in">
              Start with email
              <ArrowRight size={16} />
            </Link>
            <Link className="inline-flex h-12 items-center justify-center rounded-md border border-moon-200 bg-white px-5 text-sm font-bold text-moss-900 shadow-sm shadow-moon-900/5 transition hover:border-moon-400 dark:border-white/15 dark:bg-white/8 dark:text-white dark:hover:bg-white/12" to="/pricing">
              View pricing
            </Link>
          </div>
          <p className="mt-4 text-sm font-medium text-moss-600 dark:text-slate-400">Secure email sign-in. No password to remember.</p>
        </div>

        <Card className="relative overflow-hidden border-moon-200 p-4 shadow-soft sm:p-6">
          <div className="absolute right-5 top-5 rounded-full border border-petal-300/50 bg-petal-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-petal-700">
            Episode preview
          </div>
          <div className="rounded-2xl border border-moon-200 bg-gradient-to-br from-moon-50 via-white to-honey-50 p-4 dark:border-white/10 dark:from-moon-900/30 dark:via-slate-950 dark:to-honey-300/10 sm:p-5">
            <div className="grid min-h-[360px] place-items-center rounded-xl border border-moon-100 bg-white p-5 text-center shadow-sm shadow-moon-900/10 dark:border-white/10 dark:bg-slate-950/92 sm:min-h-[430px] sm:p-6">
              <div>
                <img alt="" className="mx-auto h-24 w-24" src="/brand/little-world-icon.svg" />
                <p className="mt-6 text-sm font-black uppercase tracking-[0.22em] text-moss-600 dark:text-moss-200">Sample story world</p>
                <h2 className="mt-3 text-3xl font-black text-moss-900 dark:text-white">Pip and the Moonberry Mystery</h2>
                <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-moss-700 dark:text-slate-300">
                  A cozy illustrated adventure with recurring friends, gentle suspense, and a small brave choice.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card className="p-5" key={feature.title}>
              <Icon className="text-moss-700 dark:text-moss-300" size={24} />
              <h2 className="mt-4 text-lg font-black dark:text-white">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-moss-700 dark:text-slate-300">{feature.text}</p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-8 rounded-2xl border border-moon-200 bg-white p-6 text-moss-900 shadow-sm shadow-moon-900/10 dark:border-white/10 dark:bg-slate-950/82 dark:text-white lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-moss-600 dark:text-moss-200">How it works</p>
          <h2 className="mt-3 text-3xl font-black">Simple setup, serialized stories.</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => (
            <div className="rounded-xl border border-moon-100 bg-gradient-to-br from-white to-moon-50 p-4 shadow-sm shadow-moon-900/10 dark:border-white/10 dark:from-white/10 dark:to-white/5" key={step}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-honey-300 text-sm font-black text-moss-900">{index + 1}</span>
              <p className="mt-4 text-sm font-semibold leading-6">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h2 className="text-3xl font-black dark:text-white">Ready to build the first shelf?</h2>
          <p className="mt-2 text-moss-700 dark:text-slate-300">Start with a parent email. You can add optional child details later.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-moss-700 px-5 text-sm font-bold text-white transition hover:bg-moss-800" to="/sign-in">
            <Mail size={16} />
            Sign in
          </Link>
          <Link className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-moon-200 bg-white px-5 text-sm font-bold text-moss-900 shadow-sm shadow-moon-900/5 transition hover:border-moon-400 dark:border-white/15 dark:bg-white/8 dark:text-white dark:hover:bg-white/12" to="/app">
            <CalendarDays size={16} />
            Open dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
