# Parsers para correos MACHBANK

Guía para configurar los parsers de **Integración email** con los correos que envía MACHBANK (contacto@mail.machbank.cl y no-reply@mail.machbank.cl). Usa **Configuración → Integración email** y crea un parser por cada tipo de correo.

---

## 1. Compras con tarjeta — "Tu compra con MACHBANK"

**Correo:** Comprobante de pago con Comercio, Monto CLP, Últimos 4 dígitos de la tarjeta (ej. SUPER GANGA, $ 7.778 CLP, 9558).

| Campo | Valor |
|-------|--------|
| **Nombre del banco** | MACHBANK |
| **Patrón remitente** | `mail.machbank.cl` |
| **Patrón asunto** | `Tu compra con MACHBANK` |
| **Tipo de email** | Alerta de compra |
| **Monto (regex)** | `Monto CLP[^$]*\$?\s*([\d.]+)` |
| **Comercio (regex)** | `Comercio[^:]*:\s*([^\n*<]+)` |
| **Últimos 4 dígitos tarjeta (regex)** | `Últimos 4 dígitos[^:]*:\s*(\d{4})` |

**Notas:**  
- Con este tipo la app puede crear la transacción automáticamente si la confianza es alta.  
- En **Finanzas → Cuentas** pon en tu tarjeta de débito/crédito los **Últimos 4 dígitos** (ej. 9558) para que la transacción se asocie a esa cuenta.

---

## 2. Pagos a otra persona — "Le pagaste a [nombre]"

**Correo:** "Le pagaste **$2.000** a **NICOL IGNACIA MEDEL VARGAS**".

| Campo | Valor |
|-------|--------|
| **Nombre del banco** | MACHBANK |
| **Patrón remitente** | `mail.machbank.cl` |
| **Patrón asunto** | `Le pagaste a` |
| **Tipo de email** | Confirmación de pago |
| **Monto (regex)** | `(?:pagaste|pagó)\s*\*{0,2}\$?\s*([\d.]+)` |
| **Comercio (regex)** | `(?:a|a)\s*\*{0,2}([^*\n]+)\*{0,2}` |

**Nota:** Configura la **Cuenta por defecto** en el parser para que se cree la transacción automáticamente en esa cuenta.

---

## 3. Transferencias — "Realizaste una transferencia a [nombre]"

**Correo:** Detalle con Fecha, Nombre destinatario, Banco destino, Monto (ej. $4.000).

| Campo | Valor |
|-------|--------|
| **Nombre del banco** | MACHBANK |
| **Patrón remitente** | `mail.machbank.cl` |
| **Patrón asunto** | `Realizaste una transferencia` |
| **Tipo de email** | Confirmación de pago |
| **Monto (regex)** | `Monto[^:]*:\s*\$?\s*([\d.]+)` |
| **Comercio (regex)** | `Nombre destinatario[^:]*:\s*([^\n]+)` |

**Nota:** Configura la **Cuenta por defecto** para crear la transacción automáticamente. El “comercio” será el nombre del destinatario.

---

## 4. Ingresos — "Te pagaron por MACH"

**Correo:** "NICOL IGNACIA MEDEL VARGAS te pagó $4.000".

| Campo | Valor |
|-------|--------|
| **Nombre del banco** | MACHBANK |
| **Patrón remitente** | `mail.machbank.cl` |
| **Patrón asunto** | `Te pagaron por MACH` |
| **Tipo de email** | Pago recibido |
| **Monto (regex)** | `te pagó\s*\$?\s*([\d.]+)` |
| **Comercio (regex)** | `([A-ZÁÉÍÓÚÑ\s]+)\s+te pagó` |

**Nota:** Es un **ingreso**. Configura la **Cuenta por defecto** en el parser para que se cree automáticamente en esa cuenta.

---

## Orden recomendado

En la tabla de parsers, el orden puede influir en cuál se aplica primero si varios coinciden. Orden sugerido:

1. Tu compra con MACHBANK (alerta de compra)  
2. Le pagaste a (confirmación de pago)  
3. Realizaste una transferencia (confirmación de pago)  
4. Te pagaron por MACH (confirmación de pago)  

Así las compras con tarjeta se matchean primero y el resto por asunto.

---

## Cómo crear cada parser en la app

1. Ve a **Configuración → Integración email**.  
2. Clic en **Nuevo parser**.  
3. Rellena los campos con los valores de la tabla (copia/pega los regex tal cual).  
4. Guarda.  
5. Repite para los otros tres tipos.

**Patrón remitente:** Con `mail.machbank.cl` valen tanto `contacto@mail.machbank.cl` como `no-reply@mail.machbank.cl` (el sistema hace coincidencia por substring).

Si algún correo real tiene el texto ligeramente distinto (espacios, saltos de línea, HTML), puede que haya que ajustar el regex. Puedes probar las expresiones en [regex101.com](https://regex101.com) pegando un fragmento del cuerpo del correo.
