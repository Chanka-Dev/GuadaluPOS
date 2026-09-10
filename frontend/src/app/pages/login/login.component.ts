import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-page">
      <div class="glow-orb glow-1"></div>
      <div class="glow-orb glow-2"></div>

      <div class="login-card">
        <div class="login-header">
          <div class="brand-badge">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <h1>GuadaluPOS</h1>
          <p class="subtitle">Sistema de Punto de Venta e Inventarios</p>
        </div>

        @if (errorMessage()) {
          <div class="alert-error" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label for="email">Correo Electrónico</label>
            <div class="input-wrapper">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <input
                id="email"
                type="email"
                formControlName="email"
                placeholder="ejemplo@guadalupos.local"
                autocomplete="email"
              />
            </div>
            @if (loginForm.get('email')?.touched && loginForm.get('email')?.errors) {
              <small class="field-error">Ingresa un correo electrónico válido.</small>
            }
          </div>

          <div class="form-group">
            <label for="password">Contraseña</label>
            <div class="input-wrapper">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input
                id="password"
                type="password"
                formControlName="password"
                placeholder="••••••••"
                autocomplete="current-password"
              />
            </div>
            @if (loginForm.get('password')?.touched && loginForm.get('password')?.errors) {
              <small class="field-error">La contraseña es obligatoria.</small>
            }
          </div>

          <button
            type="submit"
            class="btn-submit"
            [disabled]="loginForm.invalid || isLoading()"
          >
            @if (isLoading()) {
              <span class="spinner"></span>
              <span>Iniciando sesión...</span>
            } @else {
              <span>Ingresar al Sistema</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            }
          </button>
        </form>

        <div class="login-footer">
          <span>Acceso seguro administrado por GuadaluPOS</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #0b0f19;
      position: relative;
      overflow: hidden;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 24px;
      box-sizing: border-box;
    }

    .glow-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
      pointer-events: none;
      opacity: 0.45;
    }
    .glow-1 {
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, #3b82f6 0%, rgba(59, 130, 246, 0) 70%);
      top: -100px;
      right: -100px;
    }
    .glow-2 {
      width: 450px;
      height: 450px;
      background: radial-gradient(circle, #10b981 0%, rgba(16, 185, 129, 0) 70%);
      bottom: -120px;
      left: -120px;
    }

    .login-card {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 440px;
      background: rgba(17, 24, 39, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px);
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
      box-sizing: border-box;
    }

    .login-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .brand-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, #2563eb, #10b981);
      color: white;
      border-radius: 14px;
      margin-bottom: 16px;
      box-shadow: 0 8px 16px rgba(37, 99, 235, 0.3);
    }
    h1 {
      color: #f8fafc;
      font-size: 1.75rem;
      font-weight: 800;
      margin: 0 0 6px 0;
      letter-spacing: -0.02em;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 0.9rem;
      margin: 0;
    }

    .alert-error {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      padding: 12px 16px;
      border-radius: 10px;
      margin-bottom: 20px;
      font-size: 0.875rem;
    }

    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      color: #cbd5e1;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-icon {
      position: absolute;
      left: 14px;
      color: #64748b;
      pointer-events: none;
    }
    input {
      width: 100%;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid #334155;
      color: #f8fafc;
      font-size: 0.95rem;
      padding: 12px 14px 12px 42px;
      border-radius: 10px;
      outline: none;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }
    input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
      background: rgba(15, 23, 42, 0.95);
    }
    .field-error {
      color: #f87171;
      font-size: 0.75rem;
      margin-top: 6px;
      display: block;
    }

    .btn-submit {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #ffffff;
      font-size: 0.95rem;
      font-weight: 600;
      padding: 13px 20px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 10px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
    }
    .btn-submit:hover:not(:disabled) {
      background: linear-gradient(135deg, #1d4ed8, #1e40af);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
      transform: translateY(-1px);
    }
    .btn-submit:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .login-footer {
      text-align: center;
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      color: #64748b;
      font-size: 0.75rem;
    }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.getRawValue();

    this.authService.login(email!, password!).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const serverMsg = err.error?.message;
        if (serverMsg) {
          this.errorMessage.set(serverMsg);
        } else if (err.status === 401) {
          this.errorMessage.set('Credenciales incorrectas. Verifica tu correo y contraseña.');
        } else {
          this.errorMessage.set('Error de conexión con el servidor. Intenta de nuevo.');
        }
      },
    });
  }
}
