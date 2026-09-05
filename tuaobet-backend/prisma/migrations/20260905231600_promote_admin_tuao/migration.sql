-- One-shot: promove a conta admin criada em produção.
UPDATE "User"
SET role = 'ADMIN'
WHERE email = 'admin@tuao.dev.br';
