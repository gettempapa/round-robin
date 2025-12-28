import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration to rulesets...');

  // Get all existing rules
  const existingRules = await prisma.rule.findMany({
    include: { group: true }
  });

  console.log(`Found ${existingRules.length} existing rules`);

  if (existingRules.length > 0) {
    // Create a default ruleset
    const defaultRuleset = await prisma.ruleset.create({
      data: {
        name: 'Default Routing',
        description: 'Primary routing rules',
        isActive: true,
      },
    });

    console.log(`Created default ruleset: ${defaultRuleset.id}`);

    // Add contact_created trigger to the default ruleset
    await prisma.rulesetTrigger.create({
      data: {
        rulesetId: defaultRuleset.id,
        triggerType: 'contact_created',
      },
    });

    console.log('Added contact_created trigger to default ruleset');

    // Update all rules to point to the default ruleset
    for (const rule of existingRules) {
      await prisma.rule.update({
        where: { id: rule.id },
        data: { rulesetId: defaultRuleset.id },
      });
    }

    console.log(`Migrated ${existingRules.length} rules to default ruleset`);
  }

  console.log('Migration complete!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
