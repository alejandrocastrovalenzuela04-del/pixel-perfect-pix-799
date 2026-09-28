DROP POLICY IF EXISTS "Staff crea empresas" ON public.empresas;
DROP POLICY IF EXISTS "Staff edita empresas" ON public.empresas;
CREATE POLICY "CEO crea empresas" ON public.empresas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'CEO'::app_role) AND public.is_active_user(auth.uid()));
CREATE POLICY "CEO edita empresas" ON public.empresas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'CEO'::app_role) AND public.is_active_user(auth.uid())) WITH CHECK (public.has_role(auth.uid(), 'CEO'::app_role));