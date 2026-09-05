import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';

/** Promove a ADMIN utilizadores cujo email está em ADMIN_EMAILS (lista separada por vírgulas). */
export async function applyAdminEmailsFromEnv(): Promise<void> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  const emails = [...new Set(raw.split(',').map((e) => e.trim()).filter(Boolean))];
  if (emails.length === 0) return;

  // Igual ao registo/login: comparação sem distinguir maiúsculas (evita falhar se na BD está Pedro@… e no .env pedro@…)
  let promoted = 0;
  for (const email of emails) {
    const r = await prisma.user.updateMany({
      where: { email: { equals: email, mode: 'insensitive' } },
      data: { role: UserRole.ADMIN },
    });
    promoted += r.count;
  }

  if (promoted > 0) {
    console.log(`[admin] ${promoted} conta(s) promovida(s) a ADMIN (ADMIN_EMAILS).`);
  } else {
    console.warn(
      `[admin] ADMIN_EMAILS definido mas nenhuma conta correspondeu na BD: ${emails.join(', ')}. ` +
        'Confirma o email da conta em "User" ou cria a conta antes de reiniciar o backend.'
    );
  }
}
