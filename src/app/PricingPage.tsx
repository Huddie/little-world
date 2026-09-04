import { CheckCircle2, Mail, Sparkles } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { Card } from "../components/ui/Card";

const included = [
  "Recurring personalized illustrated episodes",
  "Locked story cast with one main character",
  "Parent-controlled connected worlds",
  "PDF download and email delivery",
  "A private story shelf for each family",
];

export function PricingPage() {
  if (window.sessionStorage.getItem("little-world:signed-in") === "true") {
    return <Navigate replace to="/account" />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <section className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-honey-300/60 bg-honey-50 px-3 py-1 text-sm font-semibold text-moss-900 dark:bg-honey-300/12 dark:text-honey-100">
          <Sparkles size={16} />
          Simple pricing
        </div>
        <h1 className="mt-5 text-4xl font-black tracking-tight text-moss-900 dark:text-white sm:text-5xl">Start with a free digital story shelf.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-moss-700 dark:text-slate-300">
          Create recurring personalized episodes, choose a stable cast, and download each finished book from one private family shelf.
        </p>
      </section>

      <Card className="overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1fr_0.9fr]">
          <div className="p-7">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-moss-600 dark:text-moss-200">Digital starter</p>
            <div className="mt-5 flex items-end gap-2">
              <span className="text-5xl font-black dark:text-white">$0</span>
              <span className="pb-2 text-sm font-semibold text-moss-600 dark:text-slate-300">to begin</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-moss-700 dark:text-slate-300">
              Create a shelf, choose a cast, and receive recurring digital story episodes.
            </p>
            <Link className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-moss-700 px-5 text-sm font-bold text-white transition hover:bg-moss-800" to="/sign-in">
              <Mail size={16} />
              Start free
            </Link>
          </div>
          <div className="border-l border-moon-100 bg-gradient-to-br from-moon-50 to-honey-50 p-7 dark:border-white/10 dark:from-white/8 dark:to-honey-300/10 max-lg:border-l-0 max-lg:border-t">
            <h2 className="text-xl font-black dark:text-white">Included now</h2>
            <div className="mt-5 space-y-3">
              {included.map((item) => (
                <div className="flex items-start gap-3" key={item}>
                  <CheckCircle2 className="mt-0.5 shrink-0 text-moss-700 dark:text-moss-300" size={18} />
                  <p className="text-sm font-semibold leading-6 text-moss-800 dark:text-slate-200">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <section className="rounded-2xl border border-moon-200 bg-white p-6 text-center shadow-sm shadow-moon-900/10 dark:border-white/10 dark:bg-slate-950/82">
        <h2 className="text-2xl font-black dark:text-white">More options coming</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-moss-700 dark:text-slate-300">
          Printed book delivery and larger story collections are planned as separate options.
        </p>
      </section>
    </div>
  );
}
