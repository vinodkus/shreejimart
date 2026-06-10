import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CustomerAuthService } from './customer-auth.service';

export const customerAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(CustomerAuthService);
  const token = auth.getToken();

  if (!token || !req.url.includes('/api/')) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
