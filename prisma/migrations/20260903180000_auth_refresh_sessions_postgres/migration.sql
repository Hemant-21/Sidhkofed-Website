CREATE TABLE "auth_refresh_sessions" (
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "current_jti" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_refresh_sessions_pkey" PRIMARY KEY ("session_id")
);

CREATE INDEX "auth_refresh_sessions_user_id_idx" ON "auth_refresh_sessions"("user_id");
CREATE INDEX "auth_refresh_sessions_expires_at_idx" ON "auth_refresh_sessions"("expires_at");
CREATE INDEX "auth_refresh_sessions_revoked_at_idx" ON "auth_refresh_sessions"("revoked_at");

ALTER TABLE "auth_refresh_sessions"
ADD CONSTRAINT "auth_refresh_sessions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
