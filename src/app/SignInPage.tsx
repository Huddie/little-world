import { BookOpen, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field, TextInput } from "../components/ui/Form";
import { requestMagicLink } from "../lib/http-api-client";

export function SignInPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("sending");
    try {
      await requestMagicLink({ email, name: name.trim() || undefined });
      setStatus("sent");
    } catch (caught) {
      setStatus("idle");
      setError(caught instanceof Error ? caught.message : "Could not send sign-in link");
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
      <section className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-honey-300/60 bg-honey-50 px-3 py-1 text-sm font-semibold text-moss-900 dark:bg-honey-300/12 dark:text-honey-100">
          <Sparkles size={16} />
          Secure access
        </div>
        <h1 className="text-4xl font-black tracking-tight text-moss-900 dark:text-white sm:text-5xl">Sign in to Little World.</h1>
        <p className="max-w-xl text-lg leading-8 text-moss-700 dark:text-slate-300">
          Enter your parent email and we’ll send a secure one-time sign-in link.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-moon-200 bg-white p-4 shadow-sm shadow-moon-900/10 dark:border-white/10 dark:bg-white/8">
            <BookOpen className="text-moss-700 dark:text-moss-300" size={22} />
            <p className="mt-3 text-sm font-bold dark:text-slate-100">Open your private story shelf, downloads, and book status.</p>
          </div>
          <div className="rounded-xl border border-moon-200 bg-white p-4 shadow-sm shadow-moon-900/10 dark:border-white/10 dark:bg-white/8">
            <ShieldCheck className="text-moss-700 dark:text-moss-300" size={22} />
            <p className="mt-3 text-sm font-bold dark:text-slate-100">Parent email controls profiles, invites, and family settings.</p>
          </div>
        </div>
      </section>

      <Card className="p-7">
        {status === "sent" ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-moss-100 text-moss-900 dark:bg-moss-300/18 dark:text-moss-100">
              <Mail size={24} />
            </div>
            <h2 className="text-2xl font-black dark:text-white">Check your email</h2>
            <p className="text-sm leading-6 text-moss-700 dark:text-slate-300">
              We sent a sign-in link to {email}. Open it in this browser to continue.
            </p>
            <Button onClick={() => setStatus("idle")} variant="secondary">Send another link</Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            <Field label="Parent email">
              <TextInput autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
            </Field>
            <Field hint="Optional." label="Parent name">
              <TextInput autoComplete="name" onChange={(event) => setName(event.target.value)} value={name} />
            </Field>
            {error ? <p className="rounded-md bg-petal-50 px-3 py-2 text-sm font-semibold text-petal-700">{error}</p> : null}
            <Button disabled={status === "sending"} type="submit">
              <Mail size={16} />
              {status === "sending" ? "Sending..." : "Send sign-in link"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
