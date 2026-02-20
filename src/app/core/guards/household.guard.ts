import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

export const householdGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const hasHousehold = !!auth.currentUser()?.householdId;
  const isSetupHogar = state.url.includes('/setup-hogar');

  if (hasHousehold && isSetupHogar) {
    return router.createUrlTree(['/app/dashboard']);
  }
  if (!hasHousehold && !isSetupHogar) {
    return router.createUrlTree(['/app/setup-hogar']);
  }
  return true;
};
