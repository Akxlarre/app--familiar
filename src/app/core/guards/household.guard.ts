import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

export const householdGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady;
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
