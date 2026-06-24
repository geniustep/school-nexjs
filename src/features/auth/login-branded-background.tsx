'use client';

/** Ambient gradients and soft shapes — no school copy (lives in LoginBrandPanel). */
export function LoginAmbientBackground() {
  return (
    <div className="login-page__ambient" aria-hidden="true">
      <div className="login-page__ambient-gradient" />
      <div className="login-page__ambient-glow login-page__ambient-glow--primary" />
      <div className="login-page__ambient-glow login-page__ambient-glow--accent" />
    </div>
  );
}
