import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-svh flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">A/C Service Tracker</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            관리자 로그인
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
