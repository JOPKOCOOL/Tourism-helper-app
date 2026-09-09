import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/logout'];

let pendingRefresh: Observable<boolean> | null = null;

function getOrCreateRefresh(authService: AuthService): Observable<boolean> {
  if (!pendingRefresh) {
    pendingRefresh = authService.refreshSession().pipe(
      finalize(() => {
        pendingRefresh = null;
      }),
      shareReplay(1),
    );
  }
  return pendingRefresh;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (AUTH_ENDPOINTS.some((path) => req.url.startsWith(path))) {
    return next(req);
  }

  const authService = inject(AuthService);
  const router = inject(Router);

  const withAuthHeader = (token: string | null) =>
    token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(withAuthHeader(authService.accessToken())).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return getOrCreateRefresh(authService).pipe(
        switchMap((refreshed) => {
          if (!refreshed) {
            router.navigateByUrl('/login');
            return throwError(() => error);
          }
          return next(withAuthHeader(authService.accessToken()));
        }),
      );
    }),
  );
};
