<?php

namespace App\Exceptions;

use Exception;

class StockInsuficienteException extends Exception
{
    public function __construct(string $productoNombre, int $faltante, int $code = 0, ?\Throwable $previous = null)
    {
        $message = "Stock insuficiente para el producto '{$productoNombre}'. Faltaron {$faltante} unidades para cubrir la cantidad solicitada.";
        parent::__construct($message, $code, $previous);
    }
}
