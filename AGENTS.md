<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Actividades: cada fila de `actividades` es independiente (empresa + tipo_clave + periodo); fechas, responsable e historial los fija el servidor con triggers y `revertir_actividad`. Why: auditoría confiable sin depender del navegador.
- Acceso a empresas vía `empresa_usuarios` + `puede_ver_empresa()` en RLS (staff ve todo). Why: permisos reales en backend.
- Asistente IA del CEO: `src/lib/asistente.functions.ts` (server fn, valida CEO) + `asistente.server.ts` (AI Gateway, Responses). Why: claves y prompts solo en servidor.
