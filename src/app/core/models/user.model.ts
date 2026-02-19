export type UserRole = 'Administrador' | 'Secretaria' | 'Instructor' | string;

export interface UserPermissions {
  /** Secretaria con este permiso puede cambiar entre escuelas (concedido por admin) */
  canSwitchSchool?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
  avatarUrl?: string;
  permissions?: UserPermissions;
}
