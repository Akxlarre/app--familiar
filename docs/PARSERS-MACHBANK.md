# Parsers para correos MACHBANK

Guía para configurar los parsers de **Integración email** con los correos que envía MACHBANK (contacto@mail.machbank.cl y no-reply@mail.machbank.cl). Usa **Configuración → Integración email** y crea un parser por cada tipo de correo.

---

## Por qué una transacción queda en "Pendiente"

Una transacción va a **Pendiente** (`pending_review`) en lugar de crearse automáticamente cuando:

1. **No hay cuenta vinculada**: En **Finanzas → Cuentas** debes tener una cuenta con el mismo **Nombre del banco** (ej. "Mach") y el **Email vinculado** igual a tu Gmail. Sin eso, la app no sabe en qué cuenta crear la transacción.
2. **El asunto no coincide**: El patrón de asunto debe estar **contenido** en el asunto real. Ejemplo: si el correo dice "Tu compra con MACH" y tu parser tiene "Tu compra con MACHBANK", no coincide (el asunto real no incluye "MACHBANK"). Usa un patrón más corto como `Tu compra con MACH` para que coincida con ambos.
3. **El regex del monto no extrae el valor**: Si el cuerpo del correo usa "Total" en lugar de "Monto CLP", el regex `Monto CLP[^$]*\$?\s*([\d.]+)` no hará match. Añade un regex alternativo que capture "Total" (ver sección 1b).
4. **El parser no está activo** o hay otro parser que matchea primero (el orden importa).

Para reprocesar pendientes: **Correos procesados** → botón "Reprocesar pendientes".

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

### 1b. Variante "Tu compra con MACH" (asunto corto)

Algunos correos usan asunto **"Tu compra con MACH"** (sin "BANK"). El cuerpo puede tener **"Total $4.600"** (sin dos puntos) o **"Total: $4.500"** (con dos puntos).

| Campo | Valor |
|-------|--------|
| **Patrón asunto** | `Tu compra con MACH` |
| **Monto (regex)** | `(?:Total|Monto\s*CLP)[^0-9]*\$?\s*([\d.]+)` |
| **Comercio (regex)** | `Comercio[^:]*:?\s*([^\n*<]+)` |

Este regex de monto cubre: "Total $4.600", "Total: $4.500", "Monto CLP $4.500", "Total 4.500".

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
