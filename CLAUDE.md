# Instrucciones para Claude

## Reglas de trabajo con Git

**IMPORTANTE:** Antes de modificar cualquier archivo del proyecto, verificar en qué rama está el repositorio.

- ✅ Permitido modificar código en rama: `dev`
- ❌ NO modificar código si la rama actual es `main` u otra rama distinta a `dev`

Si se detecta que la rama actual NO es `dev`, informar al usuario y solicitar que cambie a `dev` antes de continuar con cualquier modificación de código.

## Stack técnico
- Next.js 16 con Turbopack
- Supabase (base de datos y autenticación)
- TypeScript
- Tailwind CSS + shadcn/ui
- Deployado en Vercel (rama main)
