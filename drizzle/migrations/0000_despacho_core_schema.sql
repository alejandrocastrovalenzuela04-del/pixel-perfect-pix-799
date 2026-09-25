-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('CEO', 'SUPERVISOR', 'EMPLEADO');
CREATE TYPE public.actividad_tipo AS ENUM ('CONTABILIDAD_MENSUAL', 'CONCILIACION_BANCARIA', 'PAGOS_PROVISIONALES', 'DIOT');
CREATE TYPE public.actividad_estado AS ENUM ('PENDIENTE', 'EN_PROCESO', 'REALIZADO');
CREATE TYPE public.iva_tipo AS ENUM ('NO_DETERMINADO', 'PAGADO', 'A_FAVOR');
CREATE TYPE public.opinion_cumplimiento AS ENUM ('POSITIVA', 'NEGATIVA');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ HELPER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id AND ur.role = _role AND p.activo
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'CEO') OR public.has_role(_user_id, 'SUPERVISOR');
$$;

CREATE OR REPLACE FUNCTION public.is_active_user(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND activo);
$$;

-- profiles policies
CREATE POLICY "Usuarios activos pueden ver perfiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "CEO puede crear perfiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'CEO'));
CREATE POLICY "CEO puede editar perfiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'CEO'));

-- user_roles policies
CREATE POLICY "Usuarios activos pueden ver roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "CEO administra roles insert" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'CEO'));
CREATE POLICY "CEO administra roles update" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'CEO'));
CREATE POLICY "CEO administra roles delete" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'CEO'));

-- ============ EMPRESAS ============
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  rfc TEXT NOT NULL,
  regimen_fiscal TEXT NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT empresas_nombre_no_vacio CHECK (length(btrim(nombre)) > 0),
  CONSTRAINT empresas_rfc_no_vacio CHECK (length(btrim(rfc)) >= 12),
  CONSTRAINT empresas_regimen_no_vacio CHECK (length(btrim(regimen_fiscal)) > 0)
);
GRANT SELECT, INSERT, UPDATE ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO service_role;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios activos ven empresas" ON public.empresas
  FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "Staff crea empresas" ON public.empresas
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff edita empresas" ON public.empresas
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- ============ REGISTROS MENSUALES ============
CREATE TABLE public.registros_mensuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  mes SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio SMALLINT NOT NULL CHECK (anio BETWEEN 2000 AND 2100),
  isr_pagado NUMERIC(14,2) CHECK (isr_pagado IS NULL OR isr_pagado >= 0),
  iva_tipo public.iva_tipo NOT NULL DEFAULT 'NO_DETERMINADO',
  iva_monto NUMERIC(14,2) CHECK (iva_monto IS NULL OR iva_monto >= 0),
  opinion_cumplimiento public.opinion_cumplimiento,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, mes, anio),
  CONSTRAINT iva_coherente CHECK (
    (iva_tipo = 'NO_DETERMINADO' AND iva_monto IS NULL)
    OR (iva_tipo <> 'NO_DETERMINADO')
  )
);
GRANT SELECT, INSERT, UPDATE ON public.registros_mensuales TO authenticated;
GRANT ALL ON public.registros_mensuales TO service_role;
ALTER TABLE public.registros_mensuales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios activos ven registros" ON public.registros_mensuales
  FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "Staff crea registros" ON public.registros_mensuales
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff edita registros" ON public.registros_mensuales
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- ============ ACTIVIDADES ============
CREATE TABLE public.actividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_mensual_id UUID NOT NULL REFERENCES public.registros_mensuales(id) ON DELETE CASCADE,
  tipo public.actividad_tipo NOT NULL,
  estado public.actividad_estado NOT NULL DEFAULT 'PENDIENTE',
  responsable_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ultima_actualizacion_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  fecha_actualizacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (registro_mensual_id, tipo)
);
GRANT SELECT, INSERT, UPDATE ON public.actividades TO authenticated;
GRANT ALL ON public.actividades TO service_role;
ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios activos ven actividades" ON public.actividades
  FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "Staff edita actividades" ON public.actividades
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Empleado edita sus actividades" ON public.actividades
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'EMPLEADO') AND responsable_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'EMPLEADO') AND responsable_id = auth.uid());

-- ============ TRIGGERS ============
-- crear las 4 actividades al crear el registro mensual
CREATE OR REPLACE FUNCTION public.crear_actividades_por_defecto()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.actividades (registro_mensual_id, tipo)
  VALUES (NEW.id, 'CONTABILIDAD_MENSUAL'),
         (NEW.id, 'CONCILIACION_BANCARIA'),
         (NEW.id, 'PAGOS_PROVISIONALES'),
         (NEW.id, 'DIOT');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_crear_actividades
AFTER INSERT ON public.registros_mensuales
FOR EACH ROW EXECUTE FUNCTION public.crear_actividades_por_defecto();

-- updated_at en registros
CREATE OR REPLACE FUNCTION public.touch_registro()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_touch_registro
BEFORE UPDATE ON public.registros_mensuales
FOR EACH ROW EXECUTE FUNCTION public.touch_registro();

-- auditoria + reglas de actividades
CREATE OR REPLACE FUNCTION public.actividades_before_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
BEGIN
  -- el empleado no puede reasignar responsables
  IF _uid IS NOT NULL AND NOT public.is_staff(_uid)
     AND COALESCE(NEW.responsable_id::text, '') <> COALESCE(OLD.responsable_id::text, '') THEN
    RAISE EXCEPTION 'Solo CEO o Supervisor pueden asignar responsables';
  END IF;

  -- el responsable debe ser un empleado activo
  IF NEW.responsable_id IS NOT NULL
     AND COALESCE(NEW.responsable_id::text, '') <> COALESCE(OLD.responsable_id::text, '')
     AND NOT public.has_role(NEW.responsable_id, 'EMPLEADO') THEN
    RAISE EXCEPTION 'El responsable debe ser un usuario activo con rol EMPLEADO';
  END IF;

  IF NEW.estado <> OLD.estado OR COALESCE(NEW.responsable_id::text,'') <> COALESCE(OLD.responsable_id::text,'') THEN
    NEW.fecha_actualizacion := now();
    IF NEW.estado <> OLD.estado THEN
      NEW.ultima_actualizacion_por := COALESCE(_uid, NEW.ultima_actualizacion_por);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_actividades_before_update
BEFORE UPDATE ON public.actividades
FOR EACH ROW EXECUTE FUNCTION public.actividades_before_update();

-- proteger al ultimo CEO activo
CREATE OR REPLACE FUNCTION public.proteger_ultimo_ceo()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ceos INT;
BEGIN
  SELECT count(*) INTO _ceos
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'CEO' AND p.activo;
  IF _ceos = 0 THEN
    RAISE EXCEPTION 'El sistema debe conservar al menos un CEO activo';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER trg_profiles_ultimo_ceo
AFTER UPDATE ON public.profiles DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.proteger_ultimo_ceo();
CREATE CONSTRAINT TRIGGER trg_roles_ultimo_ceo
AFTER UPDATE OR DELETE ON public.user_roles DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.proteger_ultimo_ceo();

CREATE INDEX idx_registros_empresa ON public.registros_mensuales (empresa_id, anio DESC, mes DESC);
CREATE INDEX idx_actividades_registro ON public.actividades (registro_mensual_id);
CREATE INDEX idx_actividades_responsable ON public.actividades (responsable_id);