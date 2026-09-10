<?php

namespace App\Exceptions;

use Exception;

class TurnoYaAbiertoException extends Exception
{
    public function __construct(string $message = "El usuario ya cuenta con un turno de caja abierto.", int $code = 0, ?\Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
