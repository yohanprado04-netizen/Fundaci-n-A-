<?php
/**
 * api/mailer.php — Envío de correos por SMTP (Gmail, Outlook, Hostinger, etc.)
 * Sin dependencias externas ni Composer — usa sockets nativos con OpenSSL.
 */

function enviarCorreoSmtp(array $config, string $destinatarioEmail, string $destinatarioNombre, string $asunto, string $cuerpoTexto, string $cuerpoHtml = ''): array {
    $host = trim($config['smtp_host'] ?? 'smtp.gmail.com');
    $port = (int)($config['smtp_port'] ?? 465);
    $user = trim($config['smtp_user'] ?? '');
    $pass = trim($config['smtp_pass'] ?? '');
    $from = trim($config['smtp_from'] ?? ($user ?: 'info@fundacionamas.org.co'));
    $fromName = trim($config['smtp_from_name'] ?? 'Fundación A+');
    $secure = strtolower(trim($config['smtp_secure'] ?? 'ssl'));

    if (!$host || !$user || !$pass) {
        return ['ok' => false, 'error' => 'Faltan parámetros de configuración SMTP (servidor, usuario o contraseña). Configúralos en el panel de Configuración.'];
    }

    $timeout = 15;
    $address = ($secure === 'ssl' ? 'ssl://' : '') . $host;
    
    $socket = @fsockopen($address, $port, $errno, $errstr, $timeout);
    if (!$socket) {
        return ['ok' => false, 'error' => "No se pudo conectar al servidor SMTP ($address:$port): $errstr ($errno)"];
    }

    stream_set_timeout($socket, $timeout);

    $leer = function() use ($socket) {
        $resp = '';
        while ($str = fgets($socket, 515)) {
            $resp .= $str;
            if (substr($str, 3, 1) === ' ') break;
        }
        return $resp;
    };

    $escribir = function(string $cmd) use ($socket) {
        fputs($socket, $cmd . "\r\n");
    };

    $r = $leer(); // Bienvenida 220
    if (substr($r, 0, 3) !== '220') {
        fclose($socket);
        return ['ok' => false, 'error' => 'Respuesta inesperada del servidor SMTP: ' . trim($r)];
    }

    $escribir('EHLO ' . gethostname());
    $r = $leer();

    if ($secure === 'tls') {
        $escribir('STARTTLS');
        $r = $leer();
        if (substr($r, 0, 3) !== '220') {
            fclose($socket);
            return ['ok' => false, 'error' => 'Fallo al iniciar TLS: ' . trim($r)];
        }
        stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        $escribir('EHLO ' . gethostname());
        $r = $leer();
    }

    $escribir('AUTH LOGIN');
    $r = $leer();
    if (substr($r, 0, 3) !== '334') {
        fclose($socket);
        return ['ok' => false, 'error' => 'El servidor no aceptó AUTH LOGIN: ' . trim($r)];
    }

    $escribir(base64_encode($user));
    $r = $leer();
    if (substr($r, 0, 3) !== '334') {
        fclose($socket);
        return ['ok' => false, 'error' => 'Usuario SMTP rechazado: ' . trim($r)];
    }

    $escribir(base64_encode($pass));
    $r = $leer();
    if (substr($r, 0, 3) !== '235') {
        fclose($socket);
        return ['ok' => false, 'error' => 'Contraseña SMTP incorrecta o autenticación rechazada: ' . trim($r)];
    }

    $escribir("MAIL FROM: <$from>");
    $r = $leer();
    if (substr($r, 0, 3) !== '250') {
        fclose($socket);
        return ['ok' => false, 'error' => 'Remitente rechazado por el servidor: ' . trim($r)];
    }

    $escribir("RCPT TO: <$destinatarioEmail>");
    $r = $leer();
    if (substr($r, 0, 3) !== '250') {
        fclose($socket);
        return ['ok' => false, 'error' => 'Destinatario rechazado por el servidor: ' . trim($r)];
    }

    $escribir('DATA');
    $r = $leer();
    if (substr($r, 0, 3) !== '354') {
        fclose($socket);
        return ['ok' => false, 'error' => 'Error al iniciar DATA: ' . trim($r)];
    }

    $boundary = 'b1_' . md5(uniqid((string)time()));
    $headers = [];
    $headers[] = 'From: ' . "=?UTF-8?B?" . base64_encode($fromName) . "?=" . " <$from>";
    $headers[] = 'To: ' . "=?UTF-8?B?" . base64_encode($destinatarioNombre) . "?=" . " <$destinatarioEmail>";
    $headers[] = 'Subject: =?UTF-8?B?' . base64_encode($asunto) . '?=';
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Date: ' . date('r');
    
    if ($cuerpoHtml) {
        $headers[] = "Content-Type: multipart/alternative; boundary=\"$boundary\"";
        $mensaje = implode("\r\n", $headers) . "\r\n\r\n";
        $mensaje .= "--$boundary\r\n";
        $mensaje .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $mensaje .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $mensaje .= chunk_split(base64_encode($cuerpoTexto)) . "\r\n";
        $mensaje .= "--$boundary\r\n";
        $mensaje .= "Content-Type: text/html; charset=UTF-8\r\n";
        $mensaje .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $mensaje .= chunk_split(base64_encode($cuerpoHtml)) . "\r\n";
        $mensaje .= "--$boundary--\r\n";
    } else {
        $headers[] = 'Content-Type: text/plain; charset=UTF-8';
        $headers[] = 'Content-Transfer-Encoding: base64';
        $mensaje = implode("\r\n", $headers) . "\r\n\r\n" . chunk_split(base64_encode($cuerpoTexto));
    }

    $escribir($mensaje . "\r\n.");
    $r = $leer();
    if (substr($r, 0, 3) !== '250') {
        fclose($socket);
        return ['ok' => false, 'error' => 'Error al finalizar mensaje: ' . trim($r)];
    }

    $escribir('QUIT');
    $leer();
    fclose($socket);

    return ['ok' => true];
}
