<?php
/**
 * test_helper.php — Utilidades compartidas para la suite de pruebas
 */

class TestRunner {
    public static int $total = 0;
    public static int $passed = 0;
    public static int $failed = 0;
    public static array $failures = [];

    public static function assert(string $nombre, bool $condicion, string $detalle = ''): void {
        self::$total++;
        if ($condicion) {
            self::$passed++;
            echo "  \033[32m✔ PASS\033[0m: $nombre" . ($detalle ? " ($detalle)" : "") . "\n";
        } else {
            self::$failed++;
            self::$failures[] = "$nombre: $detalle";
            echo "  \033[31m✖ FAIL\033[0m: $nombre" . ($detalle ? " ($detalle)" : "") . "\n";
        }
    }

    public static function section(string $titulo): void {
        echo "\n\033[1;36m▶ $titulo\033[0m\n";
        echo str_repeat("─", 60) . "\n";
    }
}
