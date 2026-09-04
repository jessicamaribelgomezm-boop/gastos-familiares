GASTOS FAMILIARES - PWA CON SUPABASE

Esta versión está configurada para tu proyecto de Supabase y permite que dos celulares compartan el mismo hogar, gastos y categorías.

IMPORTANTE
- La aplicación usa la Project URL base de Supabase (sin /rest/v1/) y la Publishable key.
- La Publishable key puede estar en una aplicación web; la seguridad depende de Auth + RLS.
- Nunca publiques una Secret key ni una service_role key.

BASE DE DATOS
La base de datos, funciones RPC y políticas RLS deben ser las creadas previamente en el SQL de Supabase.

USO
1. Sube todos estos archivos a la raíz de tu repositorio de GitHub Pages, reemplazando la versión anterior.
2. Abre la página publicada.
3. Pulsa “Crear nuestro hogar”, crea tu cuenta y luego crea el hogar.
4. Comparte el código de invitación con tu esposo.
5. En su celular, él entra en “Tengo una invitación”, crea su cuenta e introduce el código.

La aplicación sincroniza los gastos y categorías del hogar mediante Supabase.
