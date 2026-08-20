<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ApiException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class UploadController extends Controller
{
    public function show(string $file): BinaryFileResponse
    {
        if (! preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpe?g|png|webp)$/i', $file)) {
            throw new ApiException(404, 'NOT_FOUND', 'Arquivo não encontrado.');
        }
        $path = storage_path('app/private/uploads/'.$file);
        if (! is_file($path)) {
            $path = storage_path('app/uploads/'.$file);
        }
        if (! is_file($path)) {
            throw new ApiException(404, 'NOT_FOUND', 'Arquivo não encontrado.');
        }
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => 'application/octet-stream',
        };

        return response()->file($path, [
            'Content-Type' => $mime,
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}
