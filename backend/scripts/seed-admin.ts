/* eslint-disable no-console */
import bcrypt from 'bcrypt';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import Admin from '../src/models/Admin.model';

/**
 * Creates the first super_admin account. There is deliberately no public
 * admin-registration endpoint (see docs/architecture/ARCHITECTURE.md §12),
 * so this script — run once per environment — is how the very first admin
 * gets in. Every admin created afterwards can be added via the (Phase 7)
 * admin-management endpoints, gated to super_admin.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@safesathi.app ADMIN_PASSWORD=change-me-immediately npm run seed:admin
 */
async function seedAdmin(): Promise<void> {
  const name = process.env.ADMIN_NAME ?? 'Super Admin';
  const email = process.env.ADMIN_EMAIL ?? 'admin@safesathi.app';
  const password = process.env.ADMIN_PASSWORD;

  if (!password || password.length < 8) {
    console.error('❌ Set ADMIN_PASSWORD (8+ characters) — and optionally ADMIN_NAME, ADMIN_EMAIL — before running this script.');
    process.exit(1);
  }

  await connectDatabase();

  const existing = await Admin.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log(`ℹ️  Admin ${email} already exists — nothing to do.`);
    await disconnectDatabase();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await Admin.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: 'super_admin',
    permissions: ['*'],
    isActive: true,
  });

  console.log(`✅ Super admin created: ${email}`);
  await disconnectDatabase();
}

seedAdmin().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
