<?php

namespace App\Http\Controllers;

use App\Exceptions\TurnoYaAbiertoException;
use App\Models\TurnoCaja;
use App\Services\TurnoCajaService;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TurnoCajaController extends Controller
{
    public function __construct(
        protected TurnoCajaService $turnoCajaService
    ) {}

    /**
     * Apertura de turno por el usuario autenticado.
     */
    public function abrir(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'almacen_id' => ['required', 'uuid', 'exists:almacenes,id'],
            'monto_inicial' => ['required', 'numeric', 'min:0'],
        ]);

        $usuarioId = (int)$request->user()->id;

        try {
            $turno = $this->turnoCajaService->abrirTurno(
                $usuarioId,
                $validated['almacen_id'],
                (float)$validated['monto_inicial']
            );

            return response()->json($turno, 201);
        } catch (TurnoYaAbiertoException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Cierre de turno con validación de permisos (propietario o rol master/administrador).
     */
    public function cerrar(Request $request, string $turno): JsonResponse
    {
        $validated = $request->validate([
            'monto_final_contado' => ['required', 'numeric', 'min:0'],
        ]);

        $turnoModel = TurnoCaja::findOrFail($turno);

        $usuarioAutenticado = $request->user();

        // Permite cerrar el turno si auth()->id() == turno.usuario_id O si pertenece a usuariosCompartidos O tiene rol master/administrador/supervisor
        $esPropietario = ((int)$usuarioAutenticado->id === (int)$turnoModel->usuario_id);
        $esCompartido = $turnoModel->usuariosCompartidos()->where('users.id', $usuarioAutenticado->id)->exists();
        $esAdmin = $usuarioAutenticado->hasAnyRole(['master', 'administrador', 'supervisor']);

        if (!$esPropietario && !$esCompartido && !$esAdmin) {
            return response()->json([
                'message' => 'No autorizado para cerrar este turno de caja.',
            ], 403);
        }

        try {
            $turnoActualizado = $this->turnoCajaService->cerrarTurno(
                $turnoModel->id,
                (float)$validated['monto_final_contado']
            );

            return response()->json($turnoActualizado, 200);
        } catch (DomainException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Obtiene el turno de caja actualmente abierto del usuario autenticado (propio o compartido), o null.
     */
    public function activo(Request $request): \Illuminate\Http\Response|JsonResponse
    {
        $usuarioId = (int)$request->user()->id;

        $turnoActivo = $this->turnoCajaService->obtenerTurnoActivoUsuario($usuarioId);

        if ($turnoActivo === null) {
            return response('null', 200, ['Content-Type' => 'application/json']);
        }

        return response()->json($turnoActivo, 200);
    }

    /**
     * Consulta si un almacén específico tiene un turno abierto.
     */
    public function activoPorAlmacen(string $almacenId): \Illuminate\Http\Response|JsonResponse
    {
        $turno = $this->turnoCajaService->obtenerTurnoActivoAlmacen($almacenId);

        if ($turno === null) {
            return response('null', 200, ['Content-Type' => 'application/json']);
        }

        return response()->json($turno, 200);
    }

    /**
     * Permite a un usuario unirse a un turno abierto existente.
     */
    public function unirse(Request $request, string $turno): JsonResponse
    {
        $usuarioId = (int)$request->user()->id;

        try {
            $turnoActualizado = $this->turnoCajaService->unirseATurno($usuarioId, $turno);

            return response()->json($turnoActualizado, 200);
        } catch (DomainException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Lista turnos de caja (por defecto con estado abierto), incluyendo usuario, almacén y usuarios compartidos.
     * Restringido a roles master y administrador.
     */
    public function index(Request $request): JsonResponse
    {
        $estado = $request->query('estado', 'abierto');

        $query = TurnoCaja::with(['usuario', 'almacen', 'usuariosCompartidos']);

        if (!empty($estado)) {
            $query->where('estado', $estado);
        }

        $turnos = $query->orderBy('fecha_apertura', 'desc')->get();

        return response()->json($turnos, 200);
    }
}
