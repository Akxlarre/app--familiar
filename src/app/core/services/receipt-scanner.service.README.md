# ReceiptScannerService

Servicio especializado para el escaneo detallado de boletas para inventario.

## Responsabilidades
- Invocar el motor de escaneo detallado de Gemini para extraer items estructurados.

## Diferencia con ReceiptService
Mientras que `ReceiptService` se enfoca en la gestión del archivo y datos de cabecera (monto/fecha) para finanzas, `ReceiptScannerService` se enfoca en la extracción profunda de cada producto consumible para el módulo de inventario.

## Métodos

| Método | Descripción |
|--------|-------------|
| `scanReceipt` | Extrae una lista de productos (`ReceiptScanResult`) desde una imagen. |
