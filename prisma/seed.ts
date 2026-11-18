import { PrismaClient, Role, Stream } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds staff accounts (passwordless — OTP is sent to the phone below) and
 * annual budget envelopes. Run with: npm run seed
 * Replace the demo phone numbers before any non-development deployment.
 */
const staff: Array<{ phone: string; fullName: string; role: Role; email?: string }> = [
  { phone: '+94770000001', fullName: 'Admin Officer', role: 'ADMIN_OFFICER', email: 'admin@nwef.example' },
  { phone: '+94770000002', fullName: 'Screening Reviewer', role: 'SCREENING_REVIEWER', email: 'screening@nwef.example' },
  { phone: '+94770000003', fullName: 'Interview Panel Member', role: 'INTERVIEW_PANEL', email: 'panel@nwef.example' },
  { phone: '+94770000004', fullName: 'Trustee', role: 'TRUSTEE', email: 'trustee@nwef.example' },
  { phone: '+94770000005', fullName: 'Finance Officer', role: 'FINANCE_OFFICER', email: 'finance@nwef.example' },
  { phone: '+94770000006', fullName: 'Super Admin', role: 'SUPER_ADMIN', email: 'superadmin@nwef.example' },
];

async function main() {
  for (const member of staff) {
    await prisma.user.upsert({
      where: { phone: member.phone },
      update: { fullName: member.fullName, role: member.role, isActive: true, email: member.email },
      create: {
        phone: member.phone,
        fullName: member.fullName,
        role: member.role,
        isActive: true,
        email: member.email,
        consents: {
          create: {
            purpose: 'staff_account',
            version: '1.0',
            text: 'Staff account created under the NWEF data protection policy.',
          },
        },
      },
    });
  }

  const year = new Date().getFullYear();
  for (const stream of [Stream.OLD_TINITIAN_SUPPORT, Stream.SPORTS_SCHOLARSHIP]) {
    await prisma.budget.upsert({
      where: { year_stream: { year, stream } },
      update: {},
      create: {
        year,
        stream,
        totalBudget: stream === Stream.OLD_TINITIAN_SUPPORT ? 5000000 : 3000000,
      },
    });
  }

  console.log(`Seeded ${staff.length} staff accounts and budgets for ${year}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
