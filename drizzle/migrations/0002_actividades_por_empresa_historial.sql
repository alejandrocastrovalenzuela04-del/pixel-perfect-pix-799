-- 1. Acceso usuario -> empresa
CREATE TABLE public.empresa_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.empresa_usuarios TO authenticated;
GRANT ALL ON public.empresa_usuarios TO service_role;
ALTER TABLE public.empresa_usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CEO o el propio usuario ven accesos" ON public.empresa_usuarios FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'CEO') OR user_id = auth.uid());
CREATE POLICY "CEO da accesos" ON public.empresa_usuarios FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'CEO'));
CREATE POLICY "CEO quita accesos" ON public.empresa_usuarios FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'CEO'));

CREATE OR REPLACE FUNCTION public.puede_ver_empresa(_user_id uuid, _empresa_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_active_user(_user_id) AND (
    public.is_staff(_user_id)
    OR EXISTS (SELECT 1 FROM public.empresa_usuarios WHERE user_id = _user_id AND empresa_id = _empresa_id)
  );
$$;

-- 2. Catálogo de tipos
CREATE TABLE public.actividad_tipos (
  clave text PRIMARY KEY,
  nombre text NOT NULL,
  orden int NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.actividad_tipos TO authenticated;
GRANT ALL ON public.actividad_tipos TO service_role;
ALTER TABLE public.actividad_tipos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios activos ven tipos" ON public.actividad_tipos FOR SELECT TO authenticated
  USING (public.is_active_user(auth.uid()));
INSERT INTO public.actividad_tipos (clave, nombre, orden) VALUES
 ('CONTABILIDAD_MENSUAL','Contabilidad mensual',1),
 ('CONCILIACION_BANCARIA','Conciliación bancaria',2),
 ('PAGOS_PROVISIONALES','Pagos provisionales',3),
 ('DIOT','DIOT',4),
 ('IVA','IVA',5),
 ('ISR','ISR',6),
 ('DECLARACION_ANUAL','Declaración anual',7),
 ('OPINION_CUMPLIMIENTO','Opinión de cumplimiento',8),
 ('REVISION_CFDI','Revisión de CFDI',9),
 ('NOMINA','Nómina',10),
 ('POLIZAS_CONTABLES','Pólizas contables',11),
 ('ESTADOS_FINANCIEROS','Estados financieros',12),
 ('OTRA','Otra',13);

-- 3. Actividades: columnas nuevas
ALTER TABLE public.actividades
  ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  ADD COLUMN tipo_clave text REFERENCES public.actividad_tipos(clave),
  ADD COLUMN periodo_mes smallint,
  ADD COLUMN periodo_anio smallint,
  ADD COLUMN fecha_inicio timestamptz,
  ADD COLUMN fecha_realizacion timestamptz,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN comentarios text,
  ADD COLUMN creado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN isr_pagado numeric(14,2),
  ADD COLUMN iva_pagado numeric(14,2),
  ADD COLUMN iva_a_favor numeric(14,2),
  ADD COLUMN opinion_resultado public.opinion_cumplimiento,
  ADD COLUMN opinion_fecha date,
  ADD COLUMN datos jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.actividades ALTER COLUMN registro_mensual_id DROP NOT NULL;
ALTER TABLE public.actividades ALTER COLUMN tipo DROP NOT NULL;
ALTER TABLE public.actividades DROP CONSTRAINT actividades_registro_mensual_id_tipo_key;
COMMENT ON COLUMN public.actividades.tipo IS 'DEPRECATED: replaced by tipo_clave (se sigue llenando para los 4 tipos originales)';
COMMENT ON COLUMN public.actividades.fecha_actualizacion IS 'DEPRECATED: replaced by updated_at';

-- Migración única de las actividades existentes
UPDATE public.actividades a SET
  empresa_id = r.empresa_id,
  periodo_mes = r.mes,
  periodo_anio = r.anio,
  tipo_clave = a.tipo::text,
  updated_at = COALESCE(a.fecha_actualizacion, a.created_at)
FROM public.registros_mensuales r
WHERE r.id = a.registro_mensual_id AND a.empresa_id IS NULL;

-- D1: montos del periodo solo a Pagos provisionales
UPDATE public.actividades a SET
  isr_pagado = r.isr_pagado,
  iva_pagado = CASE WHEN r.iva_tipo = 'PAGADO' THEN r.iva_monto END,
  iva_a_favor = CASE WHEN r.iva_tipo = 'A_FAVOR' THEN r.iva_monto END
FROM public.registros_mensuales r
WHERE r.id = a.registro_mensual_id AND a.tipo = 'PAGOS_PROVISIONALES'
  AND a.isr_pagado IS NULL AND a.iva_pagado IS NULL AND a.iva_a_favor IS NULL;

ALTER TABLE public.actividades
  ALTER COLUMN empresa_id SET NOT NULL,
  ALTER COLUMN tipo_clave SET NOT NULL,
  ALTER COLUMN periodo_mes SET NOT NULL,
  ALTER COLUMN periodo_anio SET NOT NULL,
  ADD CONSTRAINT actividades_periodo_mes_chk CHECK (periodo_mes BETWEEN 1 AND 12),
  ADD CONSTRAINT actividades_periodo_anio_chk CHECK (periodo_anio BETWEEN 2000 AND 2100),
  ADD CONSTRAINT actividades_montos_chk CHECK (
    COALESCE(isr_pagado,0) >= 0 AND COALESCE(iva_pagado,0) >= 0 AND COALESCE(iva_a_favor,0) >= 0),
  ADD CONSTRAINT actividades_iva_excluyente_chk CHECK (NOT (iva_pagado IS NOT NULL AND iva_a_favor IS NOT NULL));

CREATE INDEX actividades_empresa_idx ON public.actividades(empresa_id);
CREATE INDEX actividades_periodo_idx ON public.actividades(periodo_anio, periodo_mes);
CREATE INDEX actividades_realizacion_idx ON public.actividades(fecha_realizacion);

GRANT SELECT, INSERT, UPDATE ON public.actividades TO authenticated;

-- 4. Historial
CREATE TABLE public.actividad_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actividad_id uuid NOT NULL REFERENCES public.actividades(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  fecha timestamptz NOT NULL DEFAULT clock_timestamp(),
  accion text NOT NULL CHECK (accion IN ('CREACION','CAMBIO_ESTADO','EDICION','REVERSION','ASIGNACION')),
  estado_anterior public.actividad_estado,
  estado_nuevo public.actividad_estado,
  snapshot_anterior jsonb,
  detalle jsonb,
  revierte_id uuid REFERENCES public.actividad_historial(id)
);
GRANT SELECT ON public.actividad_historial TO authenticated;
GRANT ALL ON public.actividad_historial TO service_role;
ALTER TABLE public.actividad_historial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios con acceso ven historial" ON public.actividad_historial FOR SELECT TO authenticated
  USING (public.puede_ver_empresa(auth.uid(), empresa_id));
CREATE INDEX actividad_historial_act_idx ON public.actividad_historial(actividad_id, fecha);

-- 5. Triggers
CREATE OR REPLACE FUNCTION public.actividades_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); r record;
BEGIN
  IF NEW.registro_mensual_id IS NOT NULL THEN
    SELECT empresa_id, mes, anio INTO r FROM public.registros_mensuales WHERE id = NEW.registro_mensual_id;
    NEW.empresa_id := COALESCE(NEW.empresa_id, r.empresa_id);
    NEW.periodo_mes := COALESCE(NEW.periodo_mes, r.mes);
    NEW.periodo_anio := COALESCE(NEW.periodo_anio, r.anio);
  END IF;
  IF NEW.tipo_clave IS NULL AND NEW.tipo IS NOT NULL THEN NEW.tipo_clave := NEW.tipo::text; END IF;
  IF NEW.tipo IS NULL AND NEW.tipo_clave IN ('CONTABILIDAD_MENSUAL','CONCILIACION_BANCARIA','PAGOS_PROVISIONALES','DIOT') THEN
    NEW.tipo := NEW.tipo_clave::public.actividad_tipo;
  END IF;
  IF _uid IS NOT NULL AND NOT public.puede_ver_empresa(_uid, NEW.empresa_id) THEN
    RAISE EXCEPTION 'No tienes acceso a esta empresa';
  END IF;
  NEW.estado := 'PENDIENTE';
  NEW.fecha_inicio := NULL;
  NEW.fecha_realizacion := NULL;
  NEW.responsable_id := NULL;
  NEW.creado_por := _uid;
  NEW.ultima_actualizacion_por := NULL;
  NEW.fecha_actualizacion := NULL;
  NEW.created_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_actividades_before_insert BEFORE INSERT ON public.actividades
  FOR EACH ROW EXECUTE FUNCTION public.actividades_before_insert();

CREATE OR REPLACE FUNCTION public.actividades_before_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  -- campos que nunca cambia el navegador
  NEW.empresa_id := OLD.empresa_id;
  NEW.creado_por := OLD.creado_por;
  NEW.created_at := OLD.created_at;
  NEW.registro_mensual_id := OLD.registro_mensual_id;

  IF COALESCE(current_setting('app.revirtiendo', true), '') = '1' THEN
    NEW.updated_at := now();
    NEW.fecha_actualizacion := now();
    NEW.ultima_actualizacion_por := COALESCE(_uid, NEW.ultima_actualizacion_por);
    RETURN NEW;
  END IF;

  NEW.fecha_inicio := OLD.fecha_inicio;
  NEW.fecha_realizacion := OLD.fecha_realizacion;

  IF COALESCE(NEW.responsable_id::text,'') <> COALESCE(OLD.responsable_id::text,'') THEN
    IF _uid IS NOT NULL AND NOT public.is_staff(_uid) THEN
      RAISE EXCEPTION 'Solo CEO o Supervisor pueden asignar responsables';
    END IF;
    IF NEW.responsable_id IS NOT NULL AND NOT public.puede_ver_empresa(NEW.responsable_id, NEW.empresa_id) THEN
      RAISE EXCEPTION 'El responsable debe ser un usuario activo con acceso a la empresa';
    END IF;
  END IF;

  IF NEW.estado <> OLD.estado THEN
    IF NEW.estado = 'EN_PROCESO' THEN
      NEW.fecha_inicio := COALESCE(CASE WHEN OLD.estado = 'PENDIENTE' THEN now() END, OLD.fecha_inicio, now());
      NEW.fecha_realizacion := NULL;
    ELSIF NEW.estado = 'REALIZADO' THEN
      NEW.fecha_inicio := COALESCE(OLD.fecha_inicio, now());
      NEW.fecha_realizacion := now();
    ELSE
      NEW.fecha_inicio := NULL;
      NEW.fecha_realizacion := NULL;
    END IF;
    IF _uid IS NOT NULL AND NEW.estado IN ('EN_PROCESO','REALIZADO') THEN
      NEW.responsable_id := _uid;
    END IF;
  END IF;

  IF NEW.iva_pagado IS NOT NULL AND NEW.iva_a_favor IS NOT NULL THEN
    RAISE EXCEPTION 'IVA pagado e IVA a favor no pueden tener valor al mismo tiempo';
  END IF;

  NEW.updated_at := now();
  NEW.fecha_actualizacion := now();
  NEW.ultima_actualizacion_por := COALESCE(_uid, NEW.ultima_actualizacion_por);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.actividades_historial_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _cambios jsonb; _campo text;
  _campos text[] := ARRAY['tipo_clave','periodo_mes','periodo_anio','comentarios','isr_pagado','iva_pagado','iva_a_favor','opinion_resultado','opinion_fecha','datos'];
BEGIN
  IF COALESCE(current_setting('app.revirtiendo', true), '') = '1' THEN RETURN NULL; END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.actividad_historial (actividad_id, empresa_id, usuario_id, accion, estado_nuevo)
    VALUES (NEW.id, NEW.empresa_id, _uid, 'CREACION', NEW.estado);
    RETURN NULL;
  END IF;
  IF NEW.estado <> OLD.estado THEN
    INSERT INTO public.actividad_historial (actividad_id, empresa_id, usuario_id, accion, estado_anterior, estado_nuevo, snapshot_anterior)
    VALUES (NEW.id, NEW.empresa_id, _uid, 'CAMBIO_ESTADO', OLD.estado, NEW.estado,
      jsonb_build_object('estado', OLD.estado, 'responsable_id', OLD.responsable_id,
        'fecha_inicio', OLD.fecha_inicio, 'fecha_realizacion', OLD.fecha_realizacion));
  ELSIF COALESCE(NEW.responsable_id::text,'') <> COALESCE(OLD.responsable_id::text,'') THEN
    INSERT INTO public.actividad_historial (actividad_id, empresa_id, usuario_id, accion, estado_anterior, estado_nuevo, detalle)
    VALUES (NEW.id, NEW.empresa_id, _uid, 'ASIGNACION', OLD.estado, NEW.estado,
      jsonb_build_object('responsable_anterior', OLD.responsable_id, 'responsable_nuevo', NEW.responsable_id));
  END IF;
  _cambios := '{}'::jsonb;
  FOREACH _campo IN ARRAY _campos LOOP
    IF (to_jsonb(OLD) -> _campo) IS DISTINCT FROM (to_jsonb(NEW) -> _campo) THEN
      _cambios := _cambios || jsonb_build_object(_campo, jsonb_build_object('antes', to_jsonb(OLD) -> _campo, 'despues', to_jsonb(NEW) -> _campo));
    END IF;
  END LOOP;
  IF _cambios <> '{}'::jsonb THEN
    INSERT INTO public.actividad_historial (actividad_id, empresa_id, usuario_id, accion, estado_anterior, estado_nuevo, detalle)
    VALUES (NEW.id, NEW.empresa_id, _uid, 'EDICION', OLD.estado, NEW.estado, _cambios);
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_actividades_historial AFTER INSERT OR UPDATE ON public.actividades
  FOR EACH ROW EXECUTE FUNCTION public.actividades_historial_trigger();

-- 6. Reversión atómica
CREATE OR REPLACE FUNCTION public.revertir_actividad(_actividad_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); a public.actividades; h public.actividad_historial; s jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO a FROM public.actividades WHERE id = _actividad_id FOR UPDATE;
  IF NOT FOUND OR NOT public.puede_ver_empresa(_uid, a.empresa_id) THEN
    RAISE EXCEPTION 'No tienes acceso a esta actividad';
  END IF;
  SELECT * INTO h FROM public.actividad_historial x
   WHERE x.actividad_id = _actividad_id AND x.accion = 'CAMBIO_ESTADO'
     AND NOT EXISTS (SELECT 1 FROM public.actividad_historial y WHERE y.revierte_id = x.id)
   ORDER BY x.fecha DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No hay cambios de estado para revertir'; END IF;
  s := h.snapshot_anterior;
  PERFORM set_config('app.revirtiendo', '1', true);
  UPDATE public.actividades SET
    estado = (s->>'estado')::public.actividad_estado,
    responsable_id = NULLIF(s->>'responsable_id','')::uuid,
    fecha_inicio = NULLIF(s->>'fecha_inicio','')::timestamptz,
    fecha_realizacion = NULLIF(s->>'fecha_realizacion','')::timestamptz
  WHERE id = _actividad_id;
  PERFORM set_config('app.revirtiendo', '', true);
  INSERT INTO public.actividad_historial (actividad_id, empresa_id, usuario_id, accion, estado_anterior, estado_nuevo, snapshot_anterior, revierte_id)
  VALUES (_actividad_id, a.empresa_id, _uid, 'REVERSION', a.estado, (s->>'estado')::public.actividad_estado,
    jsonb_build_object('estado', a.estado, 'responsable_id', a.responsable_id, 'fecha_inicio', a.fecha_inicio, 'fecha_realizacion', a.fecha_realizacion),
    h.id);
END; $$;
REVOKE ALL ON FUNCTION public.revertir_actividad(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revertir_actividad(uuid) TO authenticated;

-- 7. RLS por acceso a empresa
DROP POLICY IF EXISTS "Usuarios activos ven empresas" ON public.empresas;
CREATE POLICY "Usuarios con acceso ven empresas" ON public.empresas FOR SELECT TO authenticated
  USING (public.puede_ver_empresa(auth.uid(), id));

DROP POLICY IF EXISTS "Usuarios activos ven registros" ON public.registros_mensuales;
CREATE POLICY "Usuarios con acceso ven registros" ON public.registros_mensuales FOR SELECT TO authenticated
  USING (public.puede_ver_empresa(auth.uid(), empresa_id));

DROP POLICY IF EXISTS "Usuarios activos ven actividades" ON public.actividades;
DROP POLICY IF EXISTS "Empleado edita sus actividades" ON public.actividades;
CREATE POLICY "Usuarios con acceso ven actividades" ON public.actividades FOR SELECT TO authenticated
  USING (public.puede_ver_empresa(auth.uid(), empresa_id));
CREATE POLICY "Usuarios con acceso crean actividades" ON public.actividades FOR INSERT TO authenticated
  WITH CHECK (public.puede_ver_empresa(auth.uid(), empresa_id));
CREATE POLICY "Usuarios con acceso editan actividades" ON public.actividades FOR UPDATE TO authenticated
  USING (public.puede_ver_empresa(auth.uid(), empresa_id))
  WITH CHECK (public.puede_ver_empresa(auth.uid(), empresa_id));