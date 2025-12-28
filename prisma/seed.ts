import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@company.com',
        status: 'active',
        dailyCapacity: 20,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Michael Chen',
        email: 'michael.chen@company.com',
        status: 'active',
        dailyCapacity: 25,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Emily Rodriguez',
        email: 'emily.rodriguez@company.com',
        status: 'active',
        dailyCapacity: 20,
      },
    }),
    prisma.user.create({
      data: {
        name: 'David Kim',
        email: 'david.kim@company.com',
        status: 'active',
        dailyCapacity: 15,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Jessica Martinez',
        email: 'jessica.martinez@company.com',
        status: 'active',
        dailyCapacity: 20,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Ryan Thompson',
        email: 'ryan.thompson@company.com',
        status: 'paused',
        dailyCapacity: 20,
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create Round Robin Groups
  const enterpriseTeam = await prisma.roundRobinGroup.create({
    data: {
      name: 'Enterprise Team',
      description: 'Handles large enterprise deals',
      distributionMode: 'equal',
      isActive: true,
    },
  });

  const smbTeam = await prisma.roundRobinGroup.create({
    data: {
      name: 'SMB Team',
      description: 'Small and medium business sales',
      distributionMode: 'equal',
      isActive: true,
    },
  });

  const inboundTeam = await prisma.roundRobinGroup.create({
    data: {
      name: 'Inbound Team',
      description: 'Website and marketing leads',
      distributionMode: 'weighted',
      isActive: true,
    },
  });

  console.log('✅ Created 3 round robin groups');

  // Add members to Enterprise Team (Sarah, Michael, Emily)
  await Promise.all([
    prisma.groupMember.create({
      data: {
        userId: users[0].id, // Sarah
        groupId: enterpriseTeam.id,
        weight: 1,
      },
    }),
    prisma.groupMember.create({
      data: {
        userId: users[1].id, // Michael
        groupId: enterpriseTeam.id,
        weight: 1,
      },
    }),
    prisma.groupMember.create({
      data: {
        userId: users[2].id, // Emily
        groupId: enterpriseTeam.id,
        weight: 1,
      },
    }),
  ]);

  // Add members to SMB Team (David, Jessica)
  await Promise.all([
    prisma.groupMember.create({
      data: {
        userId: users[3].id, // David
        groupId: smbTeam.id,
        weight: 1,
      },
    }),
    prisma.groupMember.create({
      data: {
        userId: users[4].id, // Jessica
        groupId: smbTeam.id,
        weight: 1,
      },
    }),
  ]);

  // Add members to Inbound Team (Michael with 2x weight, Emily, David)
  await Promise.all([
    prisma.groupMember.create({
      data: {
        userId: users[1].id, // Michael
        groupId: inboundTeam.id,
        weight: 2, // Higher weight
      },
    }),
    prisma.groupMember.create({
      data: {
        userId: users[2].id, // Emily
        groupId: inboundTeam.id,
        weight: 1,
      },
    }),
    prisma.groupMember.create({
      data: {
        userId: users[3].id, // David
        groupId: inboundTeam.id,
        weight: 1,
      },
    }),
  ]);

  console.log('✅ Added members to groups');

  // Create Rules
  const websiteRule = await prisma.rule.create({
    data: {
      name: 'Website Leads to Inbound',
      description: 'Route all website leads to the Inbound Team',
      groupId: inboundTeam.id,
      priority: 0,
      isActive: true,
      conditions: JSON.stringify([
        { field: 'leadSource', operator: 'equals', value: 'Website' },
      ]),
    },
  });

  const enterpriseRule = await prisma.rule.create({
    data: {
      name: 'Enterprise Deals',
      description: 'Large companies go to Enterprise Team',
      groupId: enterpriseTeam.id,
      priority: 1,
      isActive: true,
      conditions: JSON.stringify([
        { field: 'companySize', operator: 'equals', value: 'Enterprise' },
      ]),
    },
  });

  const smbRule = await prisma.rule.create({
    data: {
      name: 'SMB Leads',
      description: 'Small/medium businesses to SMB Team',
      groupId: smbTeam.id,
      priority: 2,
      isActive: true,
      conditions: JSON.stringify([
        { field: 'companySize', operator: 'equals', value: 'SMB' },
      ]),
    },
  });

  console.log('✅ Created 3 routing rules');

  // Create Sample Contacts
  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        name: 'John Anderson',
        email: 'john.anderson@acmecorp.com',
        phone: '+1-555-0101',
        company: 'Acme Corporation',
        jobTitle: 'VP of Sales',
        leadSource: 'Website',
        industry: 'Technology',
        country: 'United States',
        companySize: 'Enterprise',
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Lisa Chen',
        email: 'lisa.chen@techstartup.io',
        phone: '+1-555-0102',
        company: 'TechStartup Inc',
        jobTitle: 'CEO',
        leadSource: 'Referral',
        industry: 'SaaS',
        country: 'United States',
        companySize: 'SMB',
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Marcus Johnson',
        email: 'marcus.j@globalent.com',
        phone: '+1-555-0103',
        company: 'Global Enterprises',
        jobTitle: 'Director of Operations',
        leadSource: 'Conference',
        industry: 'Manufacturing',
        country: 'United States',
        companySize: 'Enterprise',
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Sarah Williams',
        email: 'sarah.w@boutique.co',
        phone: '+1-555-0104',
        company: 'Boutique Solutions',
        jobTitle: 'Founder',
        leadSource: 'Website',
        industry: 'Consulting',
        country: 'United States',
        companySize: 'SMB',
      },
    }),
    prisma.contact.create({
      data: {
        name: 'David Park',
        email: 'dpark@innovatecorp.com',
        phone: '+1-555-0105',
        company: 'Innovate Corp',
        jobTitle: 'CTO',
        leadSource: 'Website',
        industry: 'Technology',
        country: 'Canada',
        companySize: 'Enterprise',
      },
    }),
  ]);

  console.log(`✅ Created ${contacts.length} sample contacts`);

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log('   • 6 users created (5 active, 1 paused)');
  console.log('   • 3 groups created:');
  console.log('      - Enterprise Team (Sarah, Michael, Emily)');
  console.log('      - SMB Team (David, Jessica)');
  console.log('      - Inbound Team (Michael 2x, Emily, David)');
  console.log('   • 3 routing rules created');
  console.log('   • 5 sample contacts created');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
