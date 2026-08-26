GASTOS FAMILIARES - PWA V1

Esta es una primera versión visual y funcional de la PWA.
Incluye:
- Resumen mensual
- Registro de gastos
- Categorías personalizables
- Historial
- Instalación como PWA
- Diseño responsive para Android

IMPORTANTE:
Esta V1 guarda los datos localmente en cada dispositivo (localStorage).
Por tanto, todavía NO sincroniza los datos entre dos celulares.

Para convertirla en la versión compartida:
1. Crear un proyecto Supabase.
2. Añadir autenticación para dos usuarios.
3. Crear tablas de hogares, miembros, categorías y gastos.
4. Aplicar Row Level Security para que ambos usuarios puedan acceder únicamente al hogar compartido.
5. Reemplazar la persistencia local del archivo app.js por Supabase.
6. Publicar la PWA en un dominio HTTPS.

La PWA necesita HTTPS (o localhost durante desarrollo) para su instalación.
