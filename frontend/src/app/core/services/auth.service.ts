import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { AuthResponse, LoginRequest } from '../models/auth.models';

type AuthState = 'unknown' | 'authenticated' | 'unauthenticated';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _accessToken = signal<string | null>(null);
  readonly accessToken = this._accessToken.asReadonly();

  private readonly _authState = signal<AuthState>('unknown');
  readonly isAuthenticated = computed(() => this._authState() === 'authenticated');

  login(credentials: LoginRequest): Observable<void> {
    return this.http
      .post<AuthResponse>('/auth/login', credentials, { withCredentials: true })
      .pipe(
        tap((res) => this.setAuthenticated(res.accessToken)),
        map(() => undefined),
      );
  }

  /**
   * Stand-in for a future `/auth/me` check: there's no read-only session
   * endpoint yet, so `/auth/refresh` doubles as "am I logged in" on app boot.
   */
  refreshSession(): Observable<boolean> {
    return this.http.post<AuthResponse>('/auth/refresh', null, { withCredentials: true }).pipe(
      map((res) => {
        this.setAuthenticated(res.accessToken);
        return true;
      }),
      catchError(() => {
        this.setUnauthenticated();
        return of(false);
      }),
    );
  }

  logout(): void {
    this.http.post('/auth/logout', null, { withCredentials: true }).subscribe({
      complete: () => this.finishLogout(),
      error: () => this.finishLogout(),
    });
  }

  private finishLogout(): void {
    this.setUnauthenticated();
    this.router.navigateByUrl('/login');
  }

  private setAuthenticated(accessToken: string): void {
    this._accessToken.set(accessToken);
    this._authState.set('authenticated');
  }

  private setUnauthenticated(): void {
    this._accessToken.set(null);
    this._authState.set('unauthenticated');
  }
}
