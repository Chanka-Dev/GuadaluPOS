export interface RoleItem {
  id: number;
  name: string;
  guard_name?: string;
}

export interface Usuario {
  id: number;
  name: string;
  email: string;
  telefono?: string | null;
  activo?: boolean;
  roles: (string | RoleItem)[];
  created_at?: string;
  updated_at?: string;
}

export interface LoginResponse {
  token: string;
  user: Usuario;
}

export interface CrearUsuarioPayload {
  name: string;
  email: string;
  password: string;
  telefono?: string | null;
  rol: string;
}

export interface ActualizarUsuarioPayload {
  name?: string;
  email?: string;
  password?: string;
  telefono?: string | null;
  activo?: boolean;
  rol?: string;
}
