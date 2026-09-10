import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { Usuario, RoleItem, CrearUsuarioPayload, ActualizarUsuarioPayload } from '../../core/models/auth.models';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css'],
})
export class UsuariosComponent implements OnInit {
  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioService);
  private fb = inject(FormBuilder);

  // Lista principal de usuarios y estados
  usuarios = signal<Usuario[]>([]);
  cargando = signal<boolean>(false);
  procesandoForm = signal<boolean>(false);
  busqueda = signal<string>('');
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // Modales
  mostrandoModalUsuario = signal<boolean>(false);
  editandoUsuario = signal<Usuario | null>(null);
  modoSoloLectura = signal<boolean>(false);
  usuarioADesactivar = signal<Usuario | null>(null);

  // Formulario reactivo
  formUsuario = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    password: ['', [Validators.minLength(6)]],
    telefono: ['', [Validators.maxLength(50)]],
    rol: ['vendedor', [Validators.required]],
  });

  // Determina si el usuario logueado en la sesión actual tiene rol master
  esMasterActual = computed<boolean>(() => {
    return this.authService.tieneRol(['master']);
  });

  // Roles disponibles en el select:
  // REGLA: "master" SOLO aparece si el usuario actualmente autenticado es master.
  rolesDisponibles = computed<string[]>(() => {
    const rolesBase = ['administrador', 'supervisor', 'vendedor'];
    if (this.esMasterActual()) {
      return ['master', ...rolesBase];
    }
    return rolesBase;
  });

  // Filtrado reactivo en tiempo real
  usuariosFiltrados = computed<Usuario[]>(() => {
    const q = this.busqueda().toLowerCase().trim();
    const list = this.usuarios();
    if (!q) return list;
    return list.filter((u) => {
      const nombre = u.name?.toLowerCase() || '';
      const email = u.email?.toLowerCase() || '';
      const telefono = u.telefono?.toLowerCase() || '';
      const rol = this.obtenerNombreRol(u).toLowerCase();
      return nombre.includes(q) || email.includes(q) || telefono.includes(q) || rol.includes(q);
    });
  });

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.cargando.set(true);
    this.usuarioService.listar().subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.manejarError(err);
      },
    });
  }

  actualizarBusqueda(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busqueda.set(input.value);
  }

  /**
   * Extrae el nombre del rol principal del usuario, soportando tanto strings como objetos RoleItem.
   */
  obtenerNombreRol(user: Usuario): string {
    if (!user || !user.roles || user.roles.length === 0) return 'Sin rol';
    const primerRol = user.roles[0];
    if (typeof primerRol === 'string') return primerRol;
    return (primerRol as RoleItem).name || 'Sin rol';
  }

  /**
   * Determina si un usuario particular posee el rol 'master'.
   */
  esUsuarioMaster(user: Usuario): boolean {
    if (!user || !user.roles) return false;
    return user.roles.some((r) => (typeof r === 'string' ? r === 'master' : (r as RoleItem).name === 'master'));
  }

  // --------------------------------------------------------------------------
  // MODAL CREAR / EDITAR
  // --------------------------------------------------------------------------
  abrirModalNuevo(): void {
    this.editandoUsuario.set(null);
    this.modoSoloLectura.set(false);
    this.formUsuario.enable();

    // En creación, la contraseña es obligatoria (min 6 caracteres)
    this.formUsuario.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.formUsuario.get('password')?.updateValueAndValidity();

    // Default rol: vendedor o el primer rol disponible
    const defaultRol = this.rolesDisponibles().includes('vendedor') ? 'vendedor' : this.rolesDisponibles()[0];

    this.formUsuario.reset({
      name: '',
      email: '',
      password: '',
      telefono: '',
      rol: defaultRol,
    });

    this.mostrandoModalUsuario.set(true);
  }

  abrirModalEditar(user: Usuario): void {
    this.editandoUsuario.set(user);

    // REGLA DE INTERFAZ: Si el usuario editado es master y quien edita NO es master,
    // el formulario abre en modo solo-lectura completo.
    const esMasterTarget = this.esUsuarioMaster(user);
    const editorEsMaster = this.esMasterActual();

    if (esMasterTarget && !editorEsMaster) {
      this.modoSoloLectura.set(true);
      this.formUsuario.disable();
    } else {
      this.modoSoloLectura.set(false);
      this.formUsuario.enable();
    }

    // En edición, la contraseña es opcional
    this.formUsuario.get('password')?.setValidators([Validators.minLength(6)]);
    this.formUsuario.get('password')?.updateValueAndValidity();

    const rolActual = this.obtenerNombreRol(user);

    this.formUsuario.patchValue({
      name: user.name,
      email: user.email,
      password: '',
      telefono: user.telefono || '',
      rol: rolActual,
    });

    this.mostrandoModalUsuario.set(true);
  }

  cerrarModalUsuario(): void {
    this.mostrandoModalUsuario.set(false);
    this.editandoUsuario.set(null);
    this.modoSoloLectura.set(false);
  }

  guardarUsuario(): void {
    if (this.modoSoloLectura()) {
      return;
    }

    if (this.formUsuario.invalid) {
      this.formUsuario.markAllAsTouched();
      return;
    }

    this.procesandoForm.set(true);
    const formVals = this.formUsuario.getRawValue();

    const edicion = this.editandoUsuario();
    if (edicion) {
      // Actualización
      const payload: ActualizarUsuarioPayload = {
        name: formVals.name || '',
        email: formVals.email || '',
        telefono: formVals.telefono || null,
        rol: formVals.rol || undefined,
      };

      if (formVals.password && formVals.password.trim().length >= 6) {
        payload.password = formVals.password.trim();
      }

      this.usuarioService.actualizar(edicion.id, payload).subscribe({
        next: () => {
          this.procesandoForm.set(false);
          this.cerrarModalUsuario();
          this.mostrarExito('Usuario actualizado exitosamente.');
          this.cargarUsuarios();
        },
        error: (err) => {
          this.procesandoForm.set(false);
          this.manejarError(err);
        },
      });
    } else {
      // Creación
      const payload: CrearUsuarioPayload = {
        name: formVals.name || '',
        email: formVals.email || '',
        password: formVals.password || '',
        telefono: formVals.telefono || null,
        rol: formVals.rol || 'vendedor',
      };

      this.usuarioService.crear(payload).subscribe({
        next: () => {
          this.procesandoForm.set(false);
          this.cerrarModalUsuario();
          this.mostrarExito('Usuario creado exitosamente.');
          this.cargarUsuarios();
        },
        error: (err) => {
          this.procesandoForm.set(false);
          this.manejarError(err);
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // DESACTIVACIÓN LÓGICA
  // --------------------------------------------------------------------------
  abrirModalDesactivar(user: Usuario): void {
    // REGLA: Master nunca muestra opción de desactivación
    if (this.esUsuarioMaster(user)) {
      return;
    }
    this.usuarioADesactivar.set(user);
  }

  cerrarModalDesactivar(): void {
    this.usuarioADesactivar.set(null);
  }

  ejecutarDesactivacion(): void {
    const user = this.usuarioADesactivar();
    if (!user) return;

    this.procesandoForm.set(true);
    this.usuarioService.desactivar(user.id).subscribe({
      next: (res) => {
        this.procesandoForm.set(false);
        this.usuarioADesactivar.set(null);
        this.mostrarExito(res.message || 'Usuario desactivado correctamente.');
        this.cargarUsuarios();
      },
      error: (err) => {
        this.procesandoForm.set(false);
        this.usuarioADesactivar.set(null);
        this.manejarError(err);
      },
    });
  }

  // --------------------------------------------------------------------------
  // NOTIFICACIONES Y ERRORES
  // --------------------------------------------------------------------------
  manejarError(err: any): void {
    const msg =
      err.error?.message ||
      err.error?.error ||
      err.message ||
      'Ocurrió un error inesperado al procesar la solicitud en el servidor.';
    this.errorMsg.set(msg);
  }

  cerrarAlertaError(): void {
    this.errorMsg.set(null);
  }

  mostrarExito(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => {
      if (this.successMsg() === msg) {
        this.successMsg.set(null);
      }
    }, 5000);
  }

  cerrarAlertaExito(): void {
    this.successMsg.set(null);
  }
}
