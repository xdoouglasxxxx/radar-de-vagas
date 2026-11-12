-- Auth (Google OAuth). Não guardamos token de acesso nem refresh token do Google.
-- Toda tabela futura com dados do usuário (CV, extrações...) deve referenciar users(id)
-- com ON DELETE CASCADE, para que a exclusão de conta seja remoção real.
CREATE TABLE users (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    google_sub         text        NOT NULL UNIQUE,
    email              text        NOT NULL,
    name               text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    terms_version      text,
    terms_accepted_at  timestamptz
);

CREATE TABLE sessions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  bytea       NOT NULL UNIQUE,   -- SHA-256 do token; o token em si nunca é salvo
    created_at  timestamptz NOT NULL DEFAULT now(),
    expires_at  timestamptz NOT NULL,
    revoked_at  timestamptz
);

CREATE INDEX sessions_user_idx ON sessions (user_id);
