<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost',
        'http://localhost:4200',
        'http://127.0.0.1',
        'http://127.0.0.1:4200',
        'http://181.188.171.38',
        'http://192.168.0.10',
    ],

    'allowed_origins_patterns' => [
        '#^http://(localhost|127\.0\.0\.1|181\.188\.171\.38|192\.168\.0\.10)(:\d+)?$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
