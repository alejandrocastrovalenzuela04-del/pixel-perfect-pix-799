# Actividades por empresa, historial y reportes del CEO

Se conserva el diseño, la navegación, el login, los roles, el dashboard y las páginas de periodos actuales. Los datos existentes (incluidas las 4 actividades de septiembre 2026) se migran una sola vez al nuevo esquema: no se borran ni se duplican, y los datos que no existen hoy quedan vacíos (sin inventar información).

## Lo que verás

**1. Acceso de usuarios a empresas**
- En "Usuarios", solo el CEO administra el acceso: cada persona tendrá una casilla por empresa para dar o quitar acceso.
- CEO y Supervisor ven todas las empresas. El empleado ve solo las empresas a las que tiene acceso, aunque no tenga ninguna actividad asignada. El acceso nunca depende de la asignación de actividades.

**2. Pantalla de la empresa (el espacio de trabajo)**
- Arriba: nombre de la empresa, régimen fiscal y RFC.
- Resumen: Total, Pendientes, En proceso, Realizadas (responde a los filtros activos).
- Sección "Actividades" con el botón **+ Agregar actividad** y la tabla principal:
  Actividad | Estado | Responsable | Fecha de realización | Periodo correspondiente | Información principal | Acciones (Ver / Revertir).
- Filtros por columna que se pueden combinar: actividad, estado, responsable, periodo (mes/año), fecha o rango de fecha de realización, y "Limpiar filtros".
- La lista de periodos mensuales actual se conserva debajo. Las nuevas actividades no dependen de ella: se puede crear "IVA — Diciembre 2025" sin crear antes una página de periodo.

**3. Agregar actividad (ventana con formulario que cambia según el tipo)**
- Primer campo, tipo de actividad: Contabilidad mensual, Conciliación bancaria, Pagos provisionales, DIOT, IVA, ISR, Declaración anual, Opinión de cumplimiento, Revisión de CFDI, Nómina, Pólizas contables, Estados financieros, Otra. Se pueden agregar más tipos y campos después.
- Campos generales: tipo, periodo correspondiente (cualquier mes y año, p. ej. Enero 2024) y comentarios. Estado inicial siempre Pendiente, sin fecha de realización. Fecha de inicio, fecha de realización, última modificación y responsable los registra el sistema.
- Campos específicos solo cuando aplican:
  - IVA: IVA pagado **o** IVA a favor (nunca ambos, monto).
  - ISR: ISR pagado (monto).
  - Pagos provisionales: ISR pagado + IVA pagado o IVA a favor (excluyentes).
  - Opinión de cumplimiento: resultado (positiva/negativa), fecha correspondiente y comentarios.
  - Conciliación bancaria: banco, cuenta y saldo conciliado.
  - Otra: descripción.
- Los montos se guardan como números y se muestran como moneda.
- Cada actividad es un registro propio con su ID: pueden existir a la vez "IVA — Agosto 2025", "IVA — Agosto 2026" e "IVA — Septiembre 2026".

**4. Estados, fechas y responsable automático**
- Al cambiar a "En proceso": responsable = quien hizo el cambio, fecha de inicio = hoy.
- Al cambiar a "Realizado": responsable = quien hizo el cambio, fecha de realización = hoy.
- Si alguien solo edita un comentario o monto, cambia la "Última modificación" y la fecha de realización se queda igual.
- Cualquier usuario con acceso a la empresa puede trabajar sus actividades y cambiar su estado. CEO y Supervisor pueden además asignar un responsable a mano.

**5. Ver detalle, historial y revertir**
- "Ver" abre toda la información de la actividad, sus campos específicos (editables) y su historial: fecha y hora, usuario, estado anterior → nuevo y tipo de acción.
- "Revertir" pide confirmación, regresa la actividad al estado anterior con sus fechas, y deja anotada la reversión en el historial. No borra nada.

**6. Reportes PDF (nueva sección "Reportes", solo CEO)**
- Tipo 1: "Actividades realizadas por el despacho — [mes año]" (según la fecha de realización).
- Tipo 2: "Actividades correspondientes al periodo — [mes año]" (según el periodo correspondiente).
- Eliges año y mes (cualquier año anterior), y filtros opcionales: empresa, tipo, responsable, estado.
- El PDF agrupa por empresa (nombre, RFC, régimen), e incluye tipo de reporte, periodo, fecha de generación y la tabla con montos.
- El PDF actual de cada periodo pasa a ser solo para el CEO.

## Detalles técnicos

- Nueva tabla `empresa_usuarios (empresa_id, user_id)` con función `puede_ver_empresa(uid, empresa)` (staff = todas). RLS de empresas, registros y actividades cambian a esa función para los empleados.
- Catálogo `actividad_tipos (clave, nombre, orden)` para poder extender tipos. En `actividades` se agregan: `empresa_id`, `tipo_clave`, `periodo_mes`, `periodo_anio`, `fecha_inicio`, `fecha_realizacion`, `updated_at`, `comentarios`, `isr_pagado`, `iva_pagado`, `iva_a_favor` (numeric, CHECK de exclusión), `opinion_resultado`, `opinion_fecha`, `datos jsonb`, `creado_por`. Relleno automático desde los registros actuales. `registro_mensual_id` pasa a opcional y se quita la restricción de un tipo por registro (la columna vieja `tipo` queda marcada como obsoleta y se sigue llenando para no romper las páginas de periodos).
- Nueva tabla `actividad_historial` llenada por trigger (creación, cambio de estado, edición, reversión) con snapshot del estado y fechas anteriores. Función `revertir_actividad(id)` SECURITY DEFINER que restaura el último snapshot.
- Trigger de actividades: responsable automático, fecha_inicio / fecha_realizacion, updated_at, validación de acceso a la empresa.
- Nueva ruta `/reportes` (solo CEO) y generador PDF extendido en `src/lib/pdf.ts`.
- Verificación con Playwright como CEO y como empleado sobre los criterios de aceptación del documento.
