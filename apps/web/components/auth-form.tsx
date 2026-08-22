"use client"

import { useActionState, useEffect, useRef } from "react"
import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"

import {
  githubSignInAction,
  googleSignInAction,
  loginAction,
  signupAction,
  type AuthFormState,
} from "@/app/(auth)/actions"

export function AuthForm({
  mode,
  googleEnabled,
  githubEnabled,
  callbackUrl,
}: {
  mode: "login" | "signup"
  googleEnabled: boolean
  githubEnabled: boolean
  callbackUrl: string
}) {
  const action = mode === "login" ? loginAction : signupAction
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(action, {})
  const timezoneRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Capture the browser timezone so streak day-boundaries are right
    // from the first completion. Falls back to Asia/Kolkata server-side.
    if (timezoneRef.current) {
      timezoneRef.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ""
    }
  }, [])

  return (
    <div className="flex flex-col gap-5">
      {(googleEnabled || githubEnabled) && (
        <>
          <div className="flex gap-2">
            {githubEnabled && (
              <SocialButton
                action={githubSignInAction}
                callbackUrl={callbackUrl}
                icon={<GitHubIcon />}
                label={githubEnabled && googleEnabled ? "GitHub" : "Continue with GitHub"}
              />
            )}
            {googleEnabled && (
              <SocialButton
                action={googleSignInAction}
                callbackUrl={callbackUrl}
                icon={<GoogleIcon />}
                label={githubEnabled && googleEnabled ? "Google" : "Continue with Google"}
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-muted-foreground text-xs">or</span>
            <Separator className="flex-1" />
          </div>
        </>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <input type="hidden" name="timezone" ref={timezoneRef} />

        {mode === "signup" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" autoComplete="name" placeholder="Your name" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
          />
        </div>

        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending
            ? mode === "login"
              ? "Logging in…"
              : "Creating account…"
            : mode === "login"
              ? "Log in"
              : "Create account"}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        {mode === "login" ? (
          <>
            No account yet?{" "}
            <Link href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-primary hover:underline">
              Sign up
            </Link>
            <span className="mx-1.5">·</span>
            <Link href="/forgot-password" className="hover:underline">
              Forgot password?
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-primary hover:underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </div>
  )
}

// OAuth button with dashed corner brackets that expand outward on hover.
function SocialButton({
  action,
  callbackUrl,
  icon,
  label,
}: {
  action: (formData: FormData) => void
  callbackUrl: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <form action={action} className="group relative flex-1">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <Button type="submit" variant="outline" className="w-full">
        {icon}
        {label}
      </Button>
      <Corner className="-top-1 -left-1 border-t border-l group-hover:-top-1.5 group-hover:-left-1.5" />
      <Corner className="-top-1 -right-1 border-t border-r group-hover:-top-1.5 group-hover:-right-1.5" />
      <Corner className="-bottom-1 -left-1 border-b border-l group-hover:-bottom-1.5 group-hover:-left-1.5" />
      <Corner className="-right-1 -bottom-1 border-r border-b group-hover:-right-1.5 group-hover:-bottom-1.5" />
    </form>
  )
}

function Corner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "border-foreground/40 pointer-events-none absolute size-2 border-dashed opacity-0 transition-all duration-300 group-hover:opacity-100",
        className,
      )}
    />
  )
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.7.82.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  )
}
