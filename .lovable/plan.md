# Plan técnico definitivo: actividades por empresa, historial, reversión y reportes del CEO

Se conservan sin cambios: diseño, navegación, login, roles (CEO, Supervisor, Empleado), Dashboard, Usuarios, Empresas, páginas de periodos, "Todas las actividades" y "Mis actividades". Todo lo nuevo se guarda en la base de datos y se protege con reglas de acceso del servidor (RLS), no solo en pantalla.

## 0. Estado actual revisado

- `empresas`, `profiles`, `user_roles`, `registros_mensuales` (un registro por empresa+mes+año con ISR, IVA y opinión compartidos), `actividades` (siempre ligada a un registro, tipo fijo de 4 valores, única por registro+tipo, solo `fecha_actualizacion`).
- Datos reales hoy: 1 registro (PRUEBA Comercial ABC, septiembre 2026, ISR 15,400, IVA pagado 8,200, opinión positiva) y 4 actividades: Contabilidad mensual (Pendiente, con responsable), Conciliación bancaria (En proceso, con responsable), Pagos provisionales y DIOT (Pendiente, sin responsable).
- Hoy todos los usuarios activos ven todas las empresas; el empleado solo edita actividades donde es responsable.

## 1. Cambios de base de datos (solo agregar, nada se borra)

- **`empresa_usuarios`** (id, empresa_id, user_id, created_at, único empresa+usuario): relación Usuario → Empresa, varias empresas por usuario.
- **`actividad_tipos`** (clave, nombre, orden, activo): catálogo con los 13 tipos iniciales; agregar un tipo nuevo = agregar una fila.
- **`actividades`** — se reutiliza la tabla (sin duplicar). Columnas nuevas:
  `empresa_id`, `tipo_clave` (→ catálogo), `periodo_mes` (1-12), `periodo_anio`, `fecha_inicio`, `fecha_realizacion`, `updated_at` (última modificación), `comentarios`, `creado_por`, `isr_pagado`, `iva_pagado`, `iva_a_favor` (numeric(14,2), ≥ 0, regla que impide IVA pagado y a favor a la vez), `opinion_resultado`, `opinion_fecha`, `datos` (jsonb para campos no monetarios como banco, cuenta, saldo conciliado, descripción, y futuros campos).
  Fechas con fecha y hora (timestamptz). `created_at` ya existe.
- Se quita la regla "una sola actividad por registro+tipo" y `registro_mensual_id` y `tipo` pasan a opcionales. Las columnas viejas `tipo` y `fecha_actualizacion` se siguen llenando para que las páginas actuales funcionen; se marcan como obsoletas.
- **`actividad_historial`** (id, actividad_id, empresa_id, usuario_id, fecha, accion: CREACION / CAMBIO_ESTADO / EDICION / REVERSION, estado_anterior, estado_nuevo, snapshot_anterior jsonb con estado, responsable, fecha_inicio y fecha_realizacion previos, detalle jsonb con campos cambiados).

## 2. Migración de datos existentes (una sola vez, sin duplicar)

Un solo `UPDATE` sobre las 4 filas existentes (mismos IDs, no se insertan filas nuevas); la condición `WHERE empresa_id IS NULL` hace que no pueda repetirse:
- `empresa_id` y `periodo_mes/anio` (septiembre 2026) se toman del registro al que ya pertenecen: dato real, no inventado.
- `tipo_clave` = tipo actual; responsable, estado y `fecha_actualizacion` se conservan; `updated_at` = `fecha_actualizacion` o `created_at`.
- `fecha_inicio`, `fecha_realizacion`, comentarios: vacíos (no existen hoy).
- Montos: ver decisión D1.
- Historial: no se crean eventos pasados falsos; cada actividad empieza su historial con su primer cambio real.
- Acceso inicial: `empresa_usuarios` queda vacío; el CEO da acceso desde Usuarios (ver D4).

## 3. Lógica en el servidor (triggers y funciones)

- **Antes de insertar actividad**: estado forzado a Pendiente, sin fecha de inicio ni de realización, `creado_por` = usuario autenticado, valida acceso a la empresa, llena `tipo` viejo si el tipo es de los 4 originales.
- **Antes de actualizar actividad**:
  - Pendiente → En proceso: `fecha_inicio` = ahora, responsable = usuario autenticado.
  - → Realizado: `fecha_realizacion` = ahora, responsable = usuario autenticado (si nunca tuvo inicio, también se pone `fecha_inicio` = ahora).
  - Cualquier cambio: `updated_at` = ahora, `ultima_actualizacion_por` = usuario.
  - Editar comentarios, montos o datos NO toca `fecha_inicio` ni `fecha_realizacion`.
  - El navegador no puede escribir directamente `fecha_inicio`, `fecha_realizacion`, `creado_por`, `empresa_id` ni el responsable (el servidor ignora/rechaza esos valores). Excepción: CEO y Supervisor pueden reasignar responsable (D3).
- **Después de insertar/actualizar**: agrega fila al historial en la misma transacción.
- Trigger actual que crea las 4 actividades al crear un periodo: se conserva y además llena empresa y periodo.

## 4. Permisos / RLS

- Función `puede_ver_empresa(usuario, empresa)`: CEO o Supervisor → siempre; Empleado → solo si existe en `empresa_usuarios`; usuario inactivo → nunca.
- `empresas`, `registros_mensuales`, `actividades`, `actividad_historial`: lectura solo con `puede_ver_empresa`. Así un empleado no ve empresas, periodos, actividades ni historial ajenos aunque cambie la URL o la petición.
- `actividades`: crear y editar = cualquier usuario activo con acceso a esa empresa (reemplaza "solo si eres responsable", ver D2). Borrar: nadie.
- `actividad_historial`: sin permiso de insertar, editar ni borrar desde la app; solo lo escriben los triggers y la función de reversión.
- `empresa_usuarios`: leer = CEO y el propio usuario; crear/borrar = solo CEO.
- Empresas: solo CEO crea/edita (ya aplicado). Impuestos del periodo: siguen como hoy (staff).

## 5. Reversión

- Función del servidor `revertir_actividad(id)` en una sola transacción: toma el último cambio de estado no revertido del historial, restaura estado, responsable, `fecha_inicio` y `fecha_realizacion` desde su snapshot, actualiza `updated_at`, y agrega una fila REVERSION con quién y cuándo.
- Ejemplo: Realizado 12/09 → revertir → En proceso; la actividad queda sin fecha de realización, pero el historial conserva "12/09 María En proceso → Realizado" y "13/09 María Revirtió". Nada se borra.
- Botón "Revertir" visible solo si hay un cambio de estado revertible; pide confirmación. Permiso: el mismo que para editar la actividad.

## 6. Frontend

- **Usuarios** (CEO): por cada empleado, casillas por empresa para dar/quitar acceso.
- **Empresas**: la lista muestra solo lo que el servidor permite.
- **Pantalla de empresa**: encabezado (nombre, régimen, RFC) → tarjetas Total / Pendientes / En proceso / Realizadas → "Actividades" + botón "+ Agregar actividad" → filtros → tabla (Actividad, Estado, Responsable, Fecha de realización, Periodo correspondiente, Información principal, Acciones Ver/Revertir) → lista de periodos actual sin cambios.
- **Cambio de estado** en la tabla con el selector actual; el responsable nunca se escribe a mano.
- **Ver actividad** (ventana lateral): empresa, tipo, estado, responsable, periodo, creación, inicio, realización, última modificación, campos específicos editables, comentarios e historial completo.
- **Página de periodo**: sigue igual; muestra las actividades ligadas a ese periodo. El botón PDF de esa página pasa a ser solo CEO.
- **Nuevo "Reportes"** en el menú, visible solo para CEO.

## 7. Formularios dinámicos

Configuración en un solo archivo (tipo → campos). Campos generales: tipo, periodo (selector de mes + año libre, p. ej. 2020–2035), comentarios.
- IVA: selector "IVA pagado / IVA a favor" + un monto (imposible llenar ambos).
- ISR: ISR pagado.
- Pagos provisionales: ISR pagado + selector IVA pagado / a favor + monto.
- Opinión de cumplimiento: resultado Positiva/Negativa + fecha.
- Conciliación bancaria: banco, cuenta, saldo conciliado.
- Otra: descripción.
- Demás tipos: solo campos generales.
Montos validados como números ≥ 0 en pantalla y en la base.

## 8. Filtros de la tabla

Actividad, Estado, Responsable, Periodo correspondiente, Fecha de realización (desde/hasta; un día = mismo valor en ambos), combinables, con "Limpiar filtros". Afectan tabla y tarjetas; solo filtran la vista, nunca modifican datos.

## 9. Reportes y PDF (solo CEO)

- Formulario: tipo de reporte, año (cualquiera), mes, y filtros opcionales empresa, tipo, responsable, estado.
- **Realizadas por el despacho**: `fecha_realizacion` entre el día 1 y el último del mes (hora de México, D5), sin importar el periodo.
- **Correspondientes al periodo**: `periodo_mes/anio` = mes elegido, sin importar cuándo se realizaron.
- Son dos consultas distintas sobre las mismas filas: una actividad de agosto realizada en septiembre aparece en ambos reportes sin duplicarse.
- PDF: título del tipo de reporte + mes, fecha/hora de generación, y por cada empresa incluida: nombre, RFC, régimen y tabla (Actividad, Estado, Responsable, Fecha de realización, Periodo, Información principal). Se consulta a la base en el momento de generarlo.

## 10. Pruebas y criterios de aceptación

Con Playwright y consultas a la base, como CEO, Supervisor y Empleado: los 24 criterios de tu documento, en especial: empleado entra a empresa autorizada sin actividades y no puede leer otra ni por petición directa; dos "IVA" de distintos ejercicios; Pendiente sin fechas; inicio y realización automáticos; editar comentario no cambia la realización; historial acumulativo; revertir sin borrar; filtros y tarjetas; los dos reportes con la actividad de agosto realizada en septiembre; las 4 actividades siguen presentes y sin duplicar; página de periodo funcionando.

## Decisiones que necesito que confirmes

- **D1 Montos migrados**: hoy ISR 15,400 / IVA pagado 8,200 están en el periodo, no en cada actividad. Propuesta: copiarlos solo a "Pagos provisionales" de septiembre 2026 (es el tipo que los contiene) y dejar los demás vacíos; el periodo conserva sus valores originales.
- **D2 Empleado**: hoy solo edita actividades donde es responsable. Con la nueva lógica, cualquier empleado con acceso a la empresa podrá cambiar el estado de cualquier actividad de esa empresa. Esto reemplaza la regla anterior.
- **D3 Asignación manual**: propongo que CEO y Supervisor conserven la opción de elegir responsable de una lista (no escribirlo); el cambio de estado siempre registra al usuario automáticamente.
- **D4 Acceso inicial**: los empleados de prueba no tendrán acceso a ninguna empresa hasta que el CEO lo dé. ¿Doy acceso inicial a Juan y María a la empresa ABC para no dejarlos sin nada?
- **D5 Zona horaria**: los meses de los reportes se calculan con la hora de México (Mazatlán, UTC-7). ¿Correcto, o usar la hora del centro (CDMX)?
- **D6 Supervisor**: puede crear y editar actividades y revertir en todas las empresas; no ve Reportes. Confirmar.
