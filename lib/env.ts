import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY es requerida'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const missing = parsed.error.errors.map((e) => `  • ${e.path.join('.')}: ${e.message}`).join('\n')
  throw new Error(`Variables de entorno inválidas o faltantes:\n${missing}\n\nVer .env.example para referencia.`)
}

export const env = parsed.data
